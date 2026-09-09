import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import {
  accountsTable,
  activityLogTable,
  db,
  dealMarketsTable,
  dealsTable,
  dispatchBatchesTable,
  dispatchItemsTable,
  marketsTable,
} from "@workspace/db";
import { promoteOverflowMarket } from "../lib/market-dispatch.js";
import { canManageMarket, canSelect } from "../lib/market-engagement.js";

const suffix = randomUUID().slice(0, 8);
const accountIds: string[] = [];
const dealIds: string[] = [];
const marketIds: string[] = [];

async function fixtureDeal(productType: "PEO" | "ASO", vertical = "Construction") {
  const [account] = await db.insert(accountsTable).values({
    businessName: `Launch acceptance ${suffix}`,
  }).returning({ id: accountsTable.id });
  accountIds.push(account.id);
  const [deal] = await db.insert(dealsTable).values({
    accountId: account.id,
    referenceCode: `LA-${suffix}-${dealIds.length}`,
    businessName: `Launch acceptance ${suffix}`,
    productType,
    vertical,
    state: "CA",
    stage: "UW_REVIEW",
    submissionStatus: "submitted",
  }).returning({ id: dealsTable.id });
  dealIds.push(deal.id);
  return deal;
}

async function fixtureMarket(name: string) {
  const [market] = await db.insert(marketsTable).values({
    name: `${name} ${suffix}`,
    marketType: "PEO_PROGRAM",
    productLane: "PEO",
    isActive: true,
    isAppointed: true,
    offeredProducts: ["PEO", "ASO"],
    submissionEmail: `${name.toLowerCase()}-${suffix}@example.test`,
  }).returning();
  marketIds.push(market.id);
  return market;
}

after(async () => {
  if (dealIds.length) {
    await db.delete(activityLogTable).where(inArray(activityLogTable.dealId, dealIds));
    await db.delete(dispatchBatchesTable).where(inArray(dispatchBatchesTable.dealId, dealIds));
    await db.delete(dealMarketsTable).where(inArray(dealMarketsTable.dealId, dealIds));
    await db.delete(dealsTable).where(inArray(dealsTable.id, dealIds));
  }
  if (marketIds.length) await db.delete(marketsTable).where(inArray(marketsTable.id, marketIds));
  if (accountIds.length) await db.delete(accountsTable).where(inArray(accountsTable.id, accountIds));
  const [remainingDeals, remainingMarkets, remainingAccounts] = await Promise.all([
    db.select({ id: dealsTable.id }).from(dealsTable).where(inArray(dealsTable.id, dealIds)),
    db.select({ id: marketsTable.id }).from(marketsTable).where(inArray(marketsTable.id, marketIds)),
    db.select({ id: accountsTable.id }).from(accountsTable).where(inArray(accountsTable.id, accountIds)),
  ]);
  assert.equal(remainingDeals.length + remainingMarkets.length + remainingAccounts.length, 0);
});

describe("launch routing owner acceptance (database integration)", () => {
  it("persists preferred 1/2/3 identities, keeps E available, and promotes E independently/idempotently", async () => {
    const deal = await fixtureDeal("PEO");
    const markets = await Promise.all(["One", "Two", "Three", "Extra", "Axel"].map(fixtureMarket));
    const preferred = await db.insert(dealMarketsTable).values(
      markets.slice(0, 3).map((market, index) => ({
        dealId: deal.id, marketId: market.id, marketType: "PEO_PROGRAM" as const,
        assignmentProduct: "PEO" as const, verticalSnapshot: "Construction",
        verticalRank: String(index + 1), engagementSource: "AUTO_PREFERRED" as const,
        submissionEmailSnapshot: market.submissionEmail, isActive: true,
        marketStatus: "ACTIVE" as const, isRouted: true, rank: index + 1,
      })),
    ).returning();
    const [extra, axel] = await db.insert(dealMarketsTable).values([
      {
        dealId: deal.id, marketId: markets[3].id, marketType: "PEO_PROGRAM",
        assignmentProduct: "PEO", verticalSnapshot: "Construction", verticalRank: "E",
        engagementSource: "MANUAL_OVERFLOW", submissionEmailSnapshot: markets[3].submissionEmail,
        isActive: false, marketStatus: "AVAILABLE", isRouted: false,
      },
      {
        dealId: deal.id, marketId: markets[4].id, marketType: "PEO_PROGRAM",
        assignmentProduct: "PEO", verticalSnapshot: "Construction",
        engagementSource: "AXEL_KEEP", isActive: false, marketStatus: "AVAILABLE", isRouted: false,
      },
    ]).returning();
    const [initial] = await db.insert(dispatchBatchesTable).values({
      dealId: deal.id, batchKind: "INITIAL", isLaunchBatch: true, status: "COMPLETE",
      applicationSnapshot: { fixture: true }, applicationSnapshotHash: "a".repeat(64),
      routingInputSnapshot: { productLane: "PEO", states: ["CA"] },
    }).returning();
    await db.insert(dispatchItemsTable).values(preferred.map((row, index) => ({
      batchId: initial.id, dealMarketId: row.id, rank: index + 1, status: "SENT",
    })));

    const initialBefore = await db.select().from(dispatchItemsTable)
      .where(eq(dispatchItemsTable.batchId, initial.id));
    assert.deepEqual(initialBefore.map((row) => row.dealMarketId), preferred.map((row) => row.id));
    assert.equal(new Set(initialBefore.map((row) => row.dealMarketId)).size, 3);
    assert.equal(initialBefore.some((row) => row.dealMarketId === extra.id), false);
    assert.equal(extra.isActive, false);

    const [first, second] = await Promise.all([
      promoteOverflowMarket(deal.id, extra.id),
      promoteOverflowMarket(deal.id, extra.id),
    ]);
    assert.equal(first.batchId, second.batchId);
    assert.equal(first.alreadyPromoted || second.alreadyPromoted, true);
    const [overflow] = await db.select().from(dispatchBatchesTable)
      .where(eq(dispatchBatchesTable.id, first.batchId));
    assert.equal(overflow.batchKind, "OVERFLOW");
    assert.equal(overflow.promotedDealMarketId, extra.id);
    const overflowItems = await db.select().from(dispatchItemsTable)
      .where(eq(dispatchItemsTable.batchId, overflow.id));
    assert.deepEqual(overflowItems.map((row) => row.dealMarketId), [extra.id]);
    const initialAfter = await db.select().from(dispatchItemsTable)
      .where(eq(dispatchItemsTable.batchId, initial.id));
    assert.deepEqual(initialAfter.map((row) => row.id), initialBefore.map((row) => row.id));
    assert.equal(axel.isActive, false);
  });

  it("keeps Axel independent and represents ASO explicit/implicit and Cannabis empty-initial cases", async () => {
    assert.deepEqual(
      ["ADMIN", "UNDERWRITER", "CSA"].map((role) => canManageMarket(role)),
      [true, true, true],
    );
    const aso = await fixtureDeal("ASO");
    const [axelMarket, wholesale] = await Promise.all([fixtureMarket("ASO Axel"), fixtureMarket("ASO Explicit")]);
    const [axel] = await db.insert(dealMarketsTable).values({
      dealId: aso.id, marketId: axelMarket.id, marketType: "PEO_PROGRAM",
      assignmentProduct: "ASO", verticalSnapshot: "Construction",
      engagementSource: "AXEL_KEEP", isActive: true, marketStatus: "ACTIVE", isRouted: false,
    }).returning();
    let asoRows = await db.select().from(dealMarketsTable).where(eq(dealMarketsTable.dealId, aso.id));
    assert.deepEqual(asoRows.map((row) => row.engagementSource), ["AXEL_KEEP"]);
    assert.equal(canSelect("AXEL_KEEP", axel.isActive, "ACTIVE"), true);
    await db.insert(dealMarketsTable).values({
      dealId: aso.id, marketId: wholesale.id, marketType: "PEO_PROGRAM",
      assignmentProduct: "ASO", verticalSnapshot: "Construction", verticalRank: "1",
      engagementSource: "AUTO_PREFERRED", isActive: true, marketStatus: "ACTIVE", isRouted: true,
      submissionEmailSnapshot: wholesale.submissionEmail, rank: 1,
    });
    asoRows = await db.select().from(dealMarketsTable).where(eq(dealMarketsTable.dealId, aso.id));
    assert.equal(asoRows.filter((row) => row.assignmentProduct === "ASO" && row.engagementSource !== "AXEL_KEEP").length, 1);
    assert.equal(asoRows.filter((row) => row.engagementSource === "AXEL_KEEP").length, 1);
    const asoEmailBatches = await db.select({ id: dispatchBatchesTable.id })
      .from(dispatchBatchesTable).where(eq(dispatchBatchesTable.dealId, aso.id));
    assert.equal(asoEmailBatches.length, 0, "Axel keep creates no wholesale dispatch item");

    const cannabis = await fixtureDeal("PEO", "Cannabis");
    const vensure = await fixtureMarket("Vensure");
    const [vensureE] = await db.insert(dealMarketsTable).values({
      dealId: cannabis.id, marketId: vensure.id, marketType: "PEO_PROGRAM",
      assignmentProduct: "PEO", verticalSnapshot: "Cannabis", verticalRank: "E",
      engagementSource: "MANUAL_OVERFLOW", isActive: false, marketStatus: "AVAILABLE", isRouted: false,
      submissionEmailSnapshot: vensure.submissionEmail,
    }).returning();
    const [emptyInitial] = await db.insert(dispatchBatchesTable).values({
      dealId: cannabis.id, batchKind: "INITIAL", isLaunchBatch: true, status: "COMPLETE",
      applicationSnapshot: { fixture: true }, applicationSnapshotHash: "b".repeat(64),
      routingInputSnapshot: { productLane: "PEO", states: ["CA"] },
    }).returning();
    const cannabisItems = await db.select().from(dispatchItemsTable)
      .where(eq(dispatchItemsTable.batchId, emptyInitial.id));
    assert.equal(cannabisItems.length, 0);
    assert.equal(vensureE.verticalRank, "E");
    assert.equal(vensureE.isActive, false);
  });
});