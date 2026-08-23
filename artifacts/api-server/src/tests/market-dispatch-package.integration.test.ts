import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import {
  db,
  accountsTable,
  dealsTable,
  marketsTable,
  dealMarketsTable,
  submissionAnswersTable,
  dealDocumentsTable,
  dispatchBatchesTable,
  dispatchItemsTable,
  activityLogTable,
} from "@workspace/db";
import {
  cannabisApplicationAnswersSchema,
  routableCannabisApplicationAnswersSchema,
} from "@workspace/cannabis-application";
import {
  buildSubmissionAttachments,
  queueMarketDispatch,
} from "../lib/market-dispatch.js";
import { hashCanonicalApplicationAnswers } from "../lib/canonical-routing-package.js";

const fixtureId = randomUUID().replaceAll("-", "").slice(0, 12);
let accountId: string | null = null;
let dealId: string | null = null;
let marketId: string | null = null;
let secondMarketId: string | null = null;
let dealMarketId: string | null = null;

const yesNoAnswers = {
  q1_aircraftWatercraft: "no",
  q2_hazardousMaterial: "no",
  q3_undergroundOrAbove15ft: "no",
  q4_workOnWater: "no",
  q5_otherBusiness: "no",
  q6_subcontractorsUsed: "no",
  q7_workSubletWithoutCoi: "no",
  q8_writtenSafetyProgram: "yes",
  q9_groupTransportation: "no",
  q10_employeesUnder16OrOver60: "no",
  q11_seasonalEmployees: "no",
  q12_volunteerLabor: "no",
  q13_employeesWithHandicaps: "no",
  q14_outOfStateTravel: "no",
  q15_athleticTeamsSponsored: "no",
  q16_physicalsRequired: "yes",
  q17_otherInsurance: "no",
  q18_priorCoverageDeclined: "no",
  q19_employeeHealthPlans: "yes",
  q20_workForOtherBusinesses: "no",
  q21_leasedEmployees: "no",
  q22_workFromHome: "no",
  q23_taxLiensOrBankruptcy: "no",
  q24_unpaidWcPremium: "no",
} as const;

const completedAnswers = cannabisApplicationAnswersSchema.parse({
  legalBusinessName: `Dispatch Package Fixture ${fixtureId}`,
  fein: "12-3456789",
  entityType: "LLC",
  businessStreetAddress: "100 Test Street",
  businessCity: "Los Angeles",
  businessState: "CA",
  businessZip: "90001",
  primaryContactName: "Test Contact",
  contactEmail: "dispatch-package@example.test",
  contactPhone: "555-555-0100",
  primaryClassOfBusiness: "Clerical Office",
  totalEmployeesAll: "3",
  annualPayroll: "150000",
  locations: [
    {
      loc: "1",
      streetAddress: "100 Test Street",
      suite: "",
      city: "Los Angeles",
      state: "CA",
      zip: "90001",
    },
  ],
  classCodes: [
    {
      loc: "1",
      classCode: "8810",
      description: "Clerical Office",
      fullTime: "3",
      partTime: "0",
      annualPayroll: "150000",
    },
  ],
  signatoryName: "Test Contact",
  signatoryDate: "2026-08-22",
  ...yesNoAnswers,
});
const completedApplicationHash =
  hashCanonicalApplicationAnswers(completedAnswers);

describe("market dispatch package gate (database integration)", () => {
  before(async () => {
    assert.equal(
      routableCannabisApplicationAnswersSchema.safeParse(completedAnswers).success,
      true,
      "fixture must satisfy the final-submission package contract",
    );

    const [account] = await db
      .insert(accountsTable)
      .values({ businessName: `Dispatch Package Fixture ${fixtureId}` })
      .returning({ id: accountsTable.id });
    accountId = account.id;

    const [deal] = await db
      .insert(dealsTable)
      .values({
        referenceCode: `T-DP-${fixtureId}`,
        accountId,
        businessName: `Dispatch Package Fixture ${fixtureId}`,
        productType: "WC",
        vertical: "Cannabis",
        state: "CA",
        annualPayroll: "150000",
        employeeCountFt: 3,
        stage: "UW_REVIEW",
        submissionStatus: "submitted",
      })
      .returning({ id: dealsTable.id });
    dealId = deal.id;

    const [market] = await db
      .insert(marketsTable)
      .values({
        name: `Dispatch Package Market ${fixtureId}`,
        marketType: "WC_CARRIER",
        productLane: "WC",
        isActive: true,
        isAppointed: true,
      })
      .returning({ id: marketsTable.id });
    marketId = market.id;

    const [dealMarket] = await db
      .insert(dealMarketsTable)
      .values({
        dealId,
        marketId,
        marketType: "WC_CARRIER",
        generatedRate: "2500",
        rateBreakdownSnapshot: {
          totalPremium: 2500,
          routingPackageSnapshot: {
            version: 1,
            applicationHash: completedApplicationHash,
            ratingInput: {
              productLane: "WC",
              states: ["CA"],
              ratingUnits: [
                {
                  state: "CA",
                  classCode: "8810",
                  annualPayroll: 150000,
                },
              ],
              annualPayroll: 150000,
              headcount: 3,
              eMod: 1,
              scheduleRating: 1,
            },
          },
        },
        rank: 1,
        isPrimary: true,
        isRouted: true,
        appetiteOutcome: "MATCHED",
        rankingState: "PROVISIONAL",
        sendStatus: "PENDING",
      })
      .returning({ id: dealMarketsTable.id });
    dealMarketId = dealMarket.id;
  });

  after(async () => {
    if (dealId) {
      await db
        .delete(activityLogTable)
        .where(eq(activityLogTable.dealId, dealId));
      await db
        .delete(dispatchBatchesTable)
        .where(eq(dispatchBatchesTable.dealId, dealId));
      await db.delete(dealsTable).where(eq(dealsTable.id, dealId));
    }
    if (marketId) {
      await db.delete(marketsTable).where(eq(marketsTable.id, marketId));
    }
    if (secondMarketId) {
      await db
        .delete(marketsTable)
        .where(eq(marketsTable.id, secondMarketId));
    }
    if (accountId) {
      await db.delete(accountsTable).where(eq(accountsTable.id, accountId));
    }
  });

  it("refuses to create a dispatch batch without persisted completed answers", async () => {
    assert.ok(dealId);
    await assert.rejects(
      queueMarketDispatch(dealId),
      /persisted, completed application package/,
    );
    const batches = await db
      .select({ id: dispatchBatchesTable.id })
      .from(dispatchBatchesTable)
      .where(eq(dispatchBatchesTable.dealId, dealId));
    assert.equal(batches.length, 0);
  });

  it("refuses an incomplete persisted application", async () => {
    assert.ok(dealId);
    await db.insert(submissionAnswersTable).values({
      dealId,
      answers: cannabisApplicationAnswersSchema.parse({}),
      status: "submitted",
      submittedAt: new Date(),
    });
    await assert.rejects(
      queueMarketDispatch(dealId),
      /persisted, completed application package/,
    );
    const batches = await db
      .select({ id: dispatchBatchesTable.id })
      .from(dispatchBatchesTable)
      .where(eq(dispatchBatchesTable.dealId, dealId));
    assert.equal(batches.length, 0);
  });

  it("refuses to queue when carrier document records are incomplete", async () => {
    assert.ok(dealId);
    await db
      .update(submissionAnswersTable)
      .set({ answers: completedAnswers, updatedAt: new Date() })
      .where(eq(submissionAnswersTable.dealId, dealId));
    await assert.rejects(
      queueMarketDispatch(dealId),
      /missing required documents/,
    );
    const batches = await db
      .select({ id: dispatchBatchesTable.id })
      .from(dispatchBatchesTable)
      .where(eq(dispatchBatchesTable.dealId, dealId));
    assert.equal(batches.length, 0);
  });

  it("refuses a complete package that differs from the ranked pricing snapshot", async () => {
    assert.ok(dealId);
    const divergentAnswers = {
      ...completedAnswers,
      businessState: "TX",
      locations: completedAnswers.locations.map((location) => ({
        ...location,
        state: "TX",
      })),
    };
    assert.equal(
      routableCannabisApplicationAnswersSchema.safeParse(divergentAnswers)
        .success,
      true,
    );
    await db
      .update(submissionAnswersTable)
      .set({ answers: divergentAnswers, updatedAt: new Date() })
      .where(eq(submissionAnswersTable.dealId, dealId));
    await assert.rejects(
      queueMarketDispatch(dealId),
      /does not match the ranked pricing snapshot/,
    );
    const batches = await db
      .select({ id: dispatchBatchesTable.id })
      .from(dispatchBatchesTable)
      .where(eq(dispatchBatchesTable.dealId, dealId));
    assert.equal(batches.length, 0);

    await db
      .update(submissionAnswersTable)
      .set({ answers: completedAnswers, updatedAt: new Date() })
      .where(eq(submissionAnswersTable.dealId, dealId));
  });

  it("queues exactly one ranked item after the complete package is persisted", async () => {
    assert.ok(dealId);
    await db.insert(dealDocumentsTable).values(
      [
        "axel_cannabis_application",
        "acord_130",
        "trean_cannabis_supp",
      ].map((documentType) => ({
        dealId,
        name: `${documentType} fixture`,
        documentType,
        metadata: {
          generatedBy: "integration-test",
          applicationSnapshotHash: completedApplicationHash,
        },
      })),
    );

    const queued = await queueMarketDispatch(dealId);
    assert.ok("batchId" in queued);
    assert.equal("itemCount" in queued ? queued.itemCount : null, 1);

    const [persistedBatch] = await db
      .select({
        applicationSnapshot: dispatchBatchesTable.applicationSnapshot,
        applicationSnapshotHash:
          dispatchBatchesTable.applicationSnapshotHash,
        routingInputSnapshot: dispatchBatchesTable.routingInputSnapshot,
      })
      .from(dispatchBatchesTable)
      .where(eq(dispatchBatchesTable.id, queued.batchId));
    assert.equal(
      persistedBatch.applicationSnapshotHash,
      completedApplicationHash,
    );
    assert.deepEqual(persistedBatch.applicationSnapshot, completedAnswers);
    assert.ok(persistedBatch.routingInputSnapshot);

    const items = await db
      .select({ id: dispatchItemsTable.id })
      .from(dispatchItemsTable)
      .where(eq(dispatchItemsTable.batchId, queued.batchId));
    assert.equal(items.length, 1);
  });

  it("builds a retried failed batch from its own snapshots when unrelated ranking rows exist", async () => {
    assert.ok(dealId);
    assert.ok(dealMarketId);
    const [originalBatch] = await db
      .select()
      .from(dispatchBatchesTable)
      .where(eq(dispatchBatchesTable.dealId, dealId))
      .orderBy(desc(dispatchBatchesTable.createdAt))
      .limit(1);
    assert.ok(originalBatch.applicationSnapshot);
    assert.ok(originalBatch.applicationSnapshotHash);
    assert.ok(originalBatch.routingInputSnapshot);

    await db
      .update(dispatchBatchesTable)
      .set({ status: "CANCELLED", cancelledAt: new Date() })
      .where(eq(dispatchBatchesTable.id, originalBatch.id));
    await db
      .update(dealMarketsTable)
      .set({ rankingState: "FAILED", sendStatus: "FAILED" })
      .where(eq(dealMarketsTable.id, dealMarketId));

    const [newerMarket] = await db
      .insert(marketsTable)
      .values({
        name: `Dispatch Re-rate Market ${fixtureId}`,
        marketType: "WC_CARRIER",
        productLane: "WC",
        isActive: true,
        isAppointed: true,
      })
      .returning({ id: marketsTable.id });
    secondMarketId = newerMarket.id;
    await db.insert(dealMarketsTable).values({
      dealId,
      marketId: newerMarket.id,
      marketType: "WC_CARRIER",
      generatedRate: "2400",
      rateBreakdownSnapshot: {
        totalPremium: 2400,
        routingPackageSnapshot: {
          version: 1,
          applicationHash: "b".repeat(64),
          ratingInput: { productLane: "WC", states: ["TX"] },
        },
      },
      rank: 5,
      isPrimary: false,
      isRouted: false,
      appetiteOutcome: "MATCHED",
      rankingState: "PROVISIONAL",
      sendStatus: "PENDING",
    });

    const [retryBatch] = await db
      .insert(dispatchBatchesTable)
      .values({
        dealId,
        status: "QUEUED",
        applicationSnapshot: originalBatch.applicationSnapshot,
        applicationSnapshotHash: originalBatch.applicationSnapshotHash,
        routingInputSnapshot: originalBatch.routingInputSnapshot,
      })
      .returning({ id: dispatchBatchesTable.id });
    await db.insert(dispatchItemsTable).values({
      batchId: retryBatch.id,
      dealMarketId,
      rank: 1,
      status: "PENDING",
    });

    const attachments = await buildSubmissionAttachments(
      retryBatch.id,
      dealId,
    );
    assert.equal(attachments.length, 4);
    assert.equal(
      attachments.every((attachment) => attachment.content.length > 0),
      true,
    );
  });
});