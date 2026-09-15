/**
 * Development-only, persistent demo data for inspecting market-tab isolation.
 * It creates only clearly labeled fictional records and performs no provider
 * calls or dispatch queue writes. Re-running is idempotent by reference code.
 *
 * pnpm exec tsx src/scripts/seed-persistent-market-tab-isolation-demo.ts
 */
import assert from "node:assert/strict";
import { createServer } from "node:http";
import express from "express";
import { and, eq, inArray } from "drizzle-orm";
import {
  accountsTable,
  activityLogTable,
  correspondenceThreadsTable,
  db,
  dealInboundEmailsTable,
  dealMarketsTable,
  dealOutboundEmailsTable,
  dealsTable,
  marketUnderwritersTable,
  marketsTable,
  orgMembersTable,
  organizationsTable,
  trustedAxelOrganizationsTable,
  usersTable,
} from "@workspace/db";
import type { AuthUser } from "../lib/auth.js";
import dealCardRouter from "../routes/deal-card.js";

const ORG_ID = "00000000-0000-0000-0000-000000000001";
const REFERENCE_CODE = "DEMO-MARKET-TAB-ISOLATION";
const DEAL_NAME = "Fictional Market Tab Isolation Demo";
const EXTERNAL_MARKETS = [
  { name: "Cornerstone (Demo)", contact: "Cornerstone Demo Contact", email: "cornerstone-demo@example.test" },
  { name: "Decision HR (Demo)", contact: "Decision HR Demo Contact", email: "decision-hr-demo@example.test" },
  { name: "Peoplease (Demo)", contact: "Peoplease Demo Contact", email: "peoplease-demo@example.test" },
] as const;
const AXEL_KEEP_NAME = "Axel Keep (Demo)";

async function activePrimaryAdmin(): Promise<AuthUser> {
  const [admin] = await db.select({
    id: usersTable.id,
    email: usersTable.email,
    firstName: usersTable.firstName,
    lastName: usersTable.lastName,
    avatarUrl: usersTable.avatarUrl,
    role: orgMembersTable.role,
    orgId: orgMembersTable.orgId,
    orgName: organizationsTable.name,
  }).from(orgMembersTable)
    .innerJoin(usersTable, eq(usersTable.id, orgMembersTable.userId))
    .innerJoin(organizationsTable, eq(organizationsTable.id, orgMembersTable.orgId))
    .innerJoin(trustedAxelOrganizationsTable, eq(trustedAxelOrganizationsTable.orgId, orgMembersTable.orgId))
    .where(and(
      eq(orgMembersTable.orgId, ORG_ID),
      eq(orgMembersTable.role, "ADMIN"),
      eq(orgMembersTable.isPrimaryOrg, true),
      eq(usersTable.status, "active"),
      eq(organizationsTable.status, "ACTIVE"),
    )).limit(1);
  if (!admin) throw new Error("No existing active primary ADMIN is available in the authorized Axel Development org.");
  return { ...admin, role: "ADMIN", orgId: ORG_ID };
}

async function ensureDemoMarket(
  name: string,
  contact?: { name: string; email: string },
) {
  let [market] = await db.select().from(marketsTable)
    .where(and(eq(marketsTable.name, name), eq(marketsTable.marketType, "WC_CARRIER"))).limit(1);
  if (!market) {
    [market] = await db.insert(marketsTable).values({
      name, marketType: "WC_CARRIER", productLane: "WC", orgId: ORG_ID,
      isActive: true, isAppointed: true,
      notes: "Persistent fictional Development-only market-tab-isolation demo record.",
    }).returning();
  }
  if (!contact) return { market, underwriter: null };
  let [underwriter] = await db.select().from(marketUnderwritersTable)
    .where(and(eq(marketUnderwritersTable.marketId, market.id), eq(marketUnderwritersTable.email, contact.email))).limit(1);
  if (!underwriter) {
    [underwriter] = await db.insert(marketUnderwritersTable).values({
      marketId: market.id, name: contact.name, email: contact.email, isActive: true,
    }).returning();
  }
  return { market, underwriter };
}

async function verifyThroughInProcessGet(admin: AuthUser, dealId: string, externalDealMarketIds: string[]) {
  const app = express();
  // This is an internal test context only: it deliberately injects the
  // already-existing active ADMIN identity and does not create a login/session.
  app.use((req, _res, next) => {
    (req as typeof req & { user: AuthUser }).user = admin;
    next();
  });
  app.use("/deal-card", dealCardRouter);
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}/deal-card/${dealId}`;
  try {
    const [capability, routing, ...threads] = await Promise.all([
      fetch(`${base}/correspondence`),
      fetch(`${base}/market-routing-summary`),
      ...externalDealMarketIds.map((id) => fetch(`${base}/correspondence/market/${id}`)),
    ]);
    assert.equal(capability.status, 200);
    assert.equal(routing.status, 200);
    for (const response of threads) assert.equal(response.status, 200);
    const capabilityBody = await capability.json() as { market: { canRead: boolean; canSend: boolean } };
    const routingBody = await routing.json() as { markets: Array<{ marketName: string }> };
    assert.equal(capabilityBody.market.canRead, true);
    assert.equal(capabilityBody.market.canSend, true);
    assert.deepEqual(
      new Set(routingBody.markets.map((market) => market.marketName)),
      new Set([...EXTERNAL_MARKETS.map((market) => market.name), AXEL_KEEP_NAME]),
    );
    for (const response of threads) {
      const body = await response.json() as { messages: unknown[] };
      assert.equal(body.messages.length, 2);
    }
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("Development-only demo seed refuses production.");
  const admin = await activePrimaryAdmin();
  const [existing] = await db.select().from(dealsTable).where(eq(dealsTable.referenceCode, REFERENCE_CODE)).limit(1);
  if (existing) {
    if (existing.orgId !== ORG_ID) throw new Error("The persistent demo reference code exists outside the authorized org.");
    const rows = await db.select({ id: dealMarketsTable.id, marketName: marketsTable.name })
      .from(dealMarketsTable)
      .innerJoin(marketsTable, eq(marketsTable.id, dealMarketsTable.marketId))
      .where(eq(dealMarketsTable.dealId, existing.id));
    if (rows.length !== 4) throw new Error("Existing persistent demo is incomplete; refusing to modify a nonconforming record.");
    const externalIds = EXTERNAL_MARKETS.map((market) => {
      const row = rows.find((candidate) => candidate.marketName === market.name);
      if (!row) throw new Error("Existing persistent demo does not contain all expected external market tabs.");
      return row.id;
    });
    await verifyThroughInProcessGet(admin, existing.id, externalIds);
    process.stdout.write(`${existing.id}\n`);
    return;
  }

  const [account] = await db.insert(accountsTable).values({ businessName: DEAL_NAME }).returning();
  const [deal] = await db.insert(dealsTable).values({
    referenceCode: REFERENCE_CODE, accountId: account.id, businessName: DEAL_NAME,
    orgId: ORG_ID, ownerId: admin.id, stage: "UW_REVIEW", submissionStatus: "submitted",
    productType: "WC", vertical: "Fictional Demo",
    metadata: { persistent_demo: "market_tab_isolation", fictional: true },
  }).returning();

  const external = await Promise.all(EXTERNAL_MARKETS.map((item) => ensureDemoMarket(item.name, { name: item.contact, email: item.email })));
  const axelKeep = await ensureDemoMarket(AXEL_KEEP_NAME);
  const dealMarkets = await db.insert(dealMarketsTable).values([
    ...external.map(({ market, underwriter }, index) => ({
      dealId: deal.id, marketId: market.id, marketType: "WC_CARRIER", assignedUnderwriterId: underwriter!.id,
      submissionEmailSnapshot: underwriter!.email, engagementSource: "MANUAL_OVERFLOW",
      isActive: true, marketStatus: "ACTIVE", appetiteOutcome: "MATCHED", rankingState: "PROVISIONAL",
      sendStatus: "PENDING", rank: index + 1, isPrimary: index === 0, isRouted: false,
    })),
    {
      dealId: deal.id, marketId: axelKeep.market.id, marketType: "WC_CARRIER",
      engagementSource: "AXEL_KEEP", isActive: false, marketStatus: "AVAILABLE", appetiteOutcome: "MATCHED",
      rankingState: "PROVISIONAL", sendStatus: "PENDING", rank: 4, isPrimary: false, isRouted: false,
    },
  ]).returning();
  const externalDealMarkets = dealMarkets.slice(0, EXTERNAL_MARKETS.length);
  const threads = await db.insert(correspondenceThreadsTable).values(externalDealMarkets.map((dealMarket, index) => ({
    dealId: deal.id, dealMarketId: dealMarket.id, channel: "MARKET",
    listenerEmail: `tab-isolation-${index + 1}@example.test`,
    subjectToken: `DEMO-TAB-${index + 1}-${deal.id.slice(0, 8)}`,
  }))).returning();

  await db.insert(dealOutboundEmailsTable).values(externalDealMarkets.map((dealMarket, index) => ({
    dealId: deal.id, dealMarketId: dealMarket.id, channel: "MARKET", correspondenceThreadId: threads[index].id,
    toEmails: [external[index].underwriter!.email], ccEmails: [], fromEmail: "noreply@example.test",
    replyTo: threads[index].listenerEmail, subject: `Fictional ${EXTERNAL_MARKETS[index].name} outbound`,
    bodyText: `FICTIONAL SENTINEL OUTBOUND — ${EXTERNAL_MARKETS[index].name}`, status: "dev_logged",
  })));
  await db.insert(dealInboundEmailsTable).values(externalDealMarkets.map((dealMarket, index) => ({
    dealId: deal.id, dealMarketId: dealMarket.id, channel: "MARKET", correspondenceThreadId: threads[index].id,
    messageId: `<demo-tab-inbound-${index + 1}-${deal.id}@example.test>`,
    fromEmail: external[index].underwriter!.email, fromName: EXTERNAL_MARKETS[index].contact,
    toEmails: [threads[index].listenerEmail], ccEmails: [], subject: `Fictional ${EXTERNAL_MARKETS[index].name} inbound`,
    bodyText: `FICTIONAL SENTINEL INBOUND — ${EXTERNAL_MARKETS[index].name}`, bodyHtml: null,
    bodyEnrichmentStatus: "COMPLETE", receivedAt: new Date(), processedAt: new Date(),
  })));
  await db.insert(activityLogTable).values(externalDealMarkets.map((dealMarket, index) => ({
    dealId: deal.id, dealMarketId: dealMarket.id, entityType: "deal_market", entityId: dealMarket.id,
    eventType: "demo_market_correspondence_seeded",
    description: `Fictional private correspondence seeded for ${EXTERNAL_MARKETS[index].name}.`,
    metadata: { correspondence_private: true, persistent_demo: "market_tab_isolation", fictional: true },
    createdBy: admin.id,
  })));
  await verifyThroughInProcessGet(admin, deal.id, externalDealMarkets.map((market) => market.id));
  process.stdout.write(`${deal.id}\n`);
}

await main();