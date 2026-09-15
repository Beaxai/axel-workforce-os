/**
 * Development-only browser fixture for controlled correspondence review.
 * Setup writes opaque session cookies only to .local/browser-correspondence-
 * fixture.json; never copy that private file into source control or chat.
 *
 *   pnpm exec tsx src/scripts/browser-correspondence-fixture.ts setup
 *   pnpm exec tsx src/scripts/browser-correspondence-fixture.ts cleanup
 */
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
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
  sessionsTable,
  trustedAxelOrganizationsTable,
  usersTable,
} from "@workspace/db";
import { createSession } from "../lib/auth.js";

const AUTHORIZED_AXEL_ORG_ID = "00000000-0000-0000-0000-000000000001";
const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const fixturePath = resolve(workspaceRoot, ".local/browser-correspondence-fixture.json");

type Fixture = {
  fixtureTag: string;
  accountId: string;
  dealId: string;
  marketIds: string[];
  underwriterIds: string[];
  threadIds: string[];
  heldMessageId: string;
  userIds: string[];
  // Kept private so the browser tester can set the development cookie without
  // emitting secrets to stdout or storing a password.
  adminCookie: string;
  csaCookie: string;
};

async function cleanup(fixture: Fixture) {
  await db.delete(activityLogTable).where(eq(activityLogTable.dealId, fixture.dealId));
  await db.delete(dealInboundEmailsTable).where(eq(dealInboundEmailsTable.dealId, fixture.dealId));
  await db.delete(dealOutboundEmailsTable).where(eq(dealOutboundEmailsTable.dealId, fixture.dealId));
  await db.delete(correspondenceThreadsTable).where(eq(correspondenceThreadsTable.dealId, fixture.dealId));
  await db.delete(dealMarketsTable).where(eq(dealMarketsTable.dealId, fixture.dealId));
  await db.delete(dealsTable).where(eq(dealsTable.id, fixture.dealId));
  if (fixture.marketIds.length) await db.delete(marketsTable).where(inArray(marketsTable.id, fixture.marketIds));
  if (fixture.userIds.length) {
    await db.delete(sessionsTable).where(inArray(sessionsTable.userId, fixture.userIds));
    await db.delete(orgMembersTable).where(inArray(orgMembersTable.userId, fixture.userIds));
    await db.delete(usersTable).where(inArray(usersTable.id, fixture.userIds));
  }
  await db.delete(accountsTable).where(eq(accountsTable.id, fixture.accountId));
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("This fixture script is Development-only and refuses production.");
  }
  const action = process.argv[2];
  if (action === "cleanup") {
    await cleanup(JSON.parse(await readFile(fixturePath, "utf8")) as Fixture);
    await rm(fixturePath, { force: true });
    process.stdout.write("Private browser fixture cleaned up.\n");
    return;
  }
  if (action !== "setup") throw new Error("Usage: browser-correspondence-fixture.ts setup|cleanup");

  // Idempotent setup replaces only a previous fixture recorded in the private
  // file. It never alters an existing organization, real deal, or trust row.
  try {
    await cleanup(JSON.parse(await readFile(fixturePath, "utf8")) as Fixture);
  } catch {
    // No prior private fixture is normal.
  }
  const [orgRows, trustedRows] = await Promise.all([
    db.select({ id: organizationsTable.id, status: organizationsTable.status }).from(organizationsTable)
      .where(eq(organizationsTable.id, AUTHORIZED_AXEL_ORG_ID)).limit(1),
    db.select({ orgId: trustedAxelOrganizationsTable.orgId }).from(trustedAxelOrganizationsTable)
      .where(eq(trustedAxelOrganizationsTable.orgId, AUTHORIZED_AXEL_ORG_ID)).limit(1),
  ]);
  const org = orgRows[0];
  const trusted = trustedRows[0];
  if (!org || org.status !== "ACTIVE" || !trusted) {
    throw new Error("The authorized active Axel Development organization/trust anchor is unavailable.");
  }

  const fixtureTag = `browser-correspondence-${randomUUID().replaceAll("-", "").slice(0, 12)}`;
  const [account] = await db.insert(accountsTable).values({
    businessName: `Fictional Browser Correspondence ${fixtureTag}`,
  }).returning({ id: accountsTable.id });
  const [deal] = await db.insert(dealsTable).values({
    referenceCode: `T-BROWSER-${fixtureTag.slice(-8).toUpperCase()}`,
    accountId: account.id,
    businessName: `Fictional Browser Correspondence ${fixtureTag}`,
    orgId: AUTHORIZED_AXEL_ORG_ID,
    stage: "UW_REVIEW",
    submissionStatus: "submitted",
  }).returning({ id: dealsTable.id });

  const [admin, csa] = await db.insert(usersTable).values([
    { email: `${fixtureTag}-admin@example.test`, firstName: "Fictional", lastName: "Admin", status: "active" },
    { email: `${fixtureTag}-csa@example.test`, firstName: "Fictional", lastName: "CSA", status: "active" },
  ]).returning({ id: usersTable.id });
  await db.insert(orgMembersTable).values([
    { userId: admin.id, orgId: AUTHORIZED_AXEL_ORG_ID, role: "ADMIN", isPrimaryOrg: true },
    { userId: csa.id, orgId: AUTHORIZED_AXEL_ORG_ID, role: "CSA", isPrimaryOrg: true },
  ]);
  const [adminSession, csaSession] = await Promise.all([createSession(admin.id), createSession(csa.id)]);

  const markets = await db.insert(marketsTable).values([1, 2].map((rank) => ({
    name: `Fictional Browser Market ${rank} ${fixtureTag}`,
    marketType: "WC_CARRIER",
    productLane: "WC",
    isActive: true,
    isAppointed: true,
  }))).returning({ id: marketsTable.id });
  const underwriters = await db.insert(marketUnderwritersTable).values(markets.map((market, index) => ({
    marketId: market.id,
    name: `Fictional Contact ${index + 1}`,
    email: `${fixtureTag}-market-${index + 1}@example.test`,
    isActive: true,
  }))).returning({ id: marketUnderwritersTable.id, email: marketUnderwritersTable.email });
  const dealMarkets = await db.insert(dealMarketsTable).values(markets.map((market, index) => ({
    dealId: deal.id,
    marketId: market.id,
    marketType: "WC_CARRIER",
    assignedUnderwriterId: underwriters[index].id,
    submissionEmailSnapshot: underwriters[index].email,
    engagementSource: "MANUAL_OVERFLOW",
    isActive: true,
    marketStatus: "ACTIVE",
    appetiteOutcome: "MATCHED",
    rankingState: "PROVISIONAL",
    sendStatus: "PENDING",
    rank: index + 1,
    isPrimary: index === 0,
  }))).returning({ id: dealMarketsTable.id });
  const threads = await db.insert(correspondenceThreadsTable).values(dealMarkets.map((market, index) => ({
    dealId: deal.id,
    dealMarketId: market.id,
    channel: "MARKET",
    listenerEmail: `${fixtureTag}-listener-${index + 1}@example.test`,
    subjectToken: `T${fixtureTag.slice(-10)}${index + 1}`,
  }))).returning({ id: correspondenceThreadsTable.id, listenerEmail: correspondenceThreadsTable.listenerEmail });

  await db.insert(dealOutboundEmailsTable).values(dealMarkets.map((market, index) => ({
    dealId: deal.id,
    dealMarketId: market.id,
    channel: "MARKET",
    correspondenceThreadId: threads[index].id,
    toEmails: [underwriters[index].email],
    ccEmails: [],
    fromEmail: "noreply@example.test",
    replyTo: threads[index].listenerEmail,
    subject: `Fictional text message ${index + 1}`,
    bodyText: `Fictional controlled text message for market ${index + 1}.`,
    status: "dev_logged",
  })));
  const [held] = await db.insert(dealInboundEmailsTable).values({
    dealId: deal.id,
    dealMarketId: dealMarkets[0].id,
    correspondenceThreadId: threads[0].id,
    messageId: `<${fixtureTag}-held@example.test>`,
    fromEmail: underwriters[0].email,
    fromName: "Fictional Contact 1",
    toEmails: [threads[0].listenerEmail],
    ccEmails: [],
    subject: "Fictional held reply",
    bodyText: "Fictional held text that matches the persisted market contact.",
    bodyHtml: null,
    channel: "HELD",
    heldReason: "SENDER_NOT_APPROVED_FOR_THREAD",
    senderAuthEvidence: "informational fixture evidence only",
    bodyEnrichmentStatus: "COMPLETE",
    receivedAt: new Date(),
    processedAt: new Date(),
  }).returning({ id: dealInboundEmailsTable.id });

  const fixture: Fixture = {
    fixtureTag,
    accountId: account.id,
    dealId: deal.id,
    marketIds: markets.map((market) => market.id),
    underwriterIds: underwriters.map((underwriter) => underwriter.id),
    threadIds: threads.map((thread) => thread.id),
    heldMessageId: held.id,
    userIds: [admin.id, csa.id],
    adminCookie: `axel_session=${adminSession.token}`,
    csaCookie: `axel_session=${csaSession.token}`,
  };
  await mkdir(dirname(fixturePath), { recursive: true, mode: 0o700 });
  await writeFile(fixturePath, `${JSON.stringify(fixture, null, 2)}\n`, { mode: 0o600 });
  process.stdout.write("Private browser fixture prepared.\n");
}

await main();