/**
 * Isolated development-DB API coverage for Task 93. It uses randomly named
 * fictional org/deal fixtures and an in-process provider mock; no real email
 * is sent. Run explicitly (never against production):
 *   pnpm exec tsx --test src/tests/correspondence-api.integration.test.ts
 */
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import {
  db,
  accountsTable,
  activityLogTable,
  correspondenceThreadsTable,
  dealEmailAddressesTable,
  dealInboundEmailsTable,
  dealMarketEmailAddressesTable,
  dealMarketsTable,
  dealOutboundEmailsTable,
  dealsTable,
  marketUnderwritersTable,
  marketsTable,
  orgMembersTable,
  organizationsTable,
  sessionsTable,
  trustedAxelOrganizationsTable,
  userCredentialsTable,
  usersTable,
} from "@workspace/db";
import { and, eq, inArray } from "drizzle-orm";
import app from "../app.js";
import { createSession } from "../lib/auth.js";
import { processInboundEmail } from "../lib/inbound-email.js";
import { sendDealEmail } from "../services/emailService.js";

const suffix = randomUUID().replaceAll("-", "").slice(0, 12);
let baseUrl = "";
let closeServer: (() => Promise<void>) | null = null;
let axelOrgId = "";
let externalOrgId = "";
let accountId = "";
let dealId = "";
let foreignDealId = "";
let marketId = "";
let dealMarketId = "";
let adminId = "";
let csaId = "";
let externalCsaId = "";
let externalAdminId = "";
let underwriterId = "";
let agentId = "";
let adminCookie = "";
let csaCookie = "";
let externalCsaCookie = "";
let externalAdminCookie = "";
let underwriterCookie = "";
let agentCookie = "";

async function createUser(emailPrefix: string, role: string, orgId: string) {
  const [user] = await db.insert(usersTable).values({
    email: `${emailPrefix}-${suffix}@example.test`,
    firstName: emailPrefix,
    lastName: "Fixture",
    status: "active",
  }).returning();
  await db.insert(orgMembersTable).values({ userId: user.id, orgId, role, isPrimaryOrg: true });
  const session = await createSession(user.id);
  return { id: user.id, cookie: `axel_session=${session.token}` };
}

async function api(method: string, path: string, cookie: string, body?: unknown) {
  const response = await fetch(`${baseUrl}/api${path}`, {
    method,
    headers: {
      Cookie: cookie,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}

describe("Axel-controlled correspondence API (isolated fictional fixture)", () => {
  before(async () => {
    // This binds only an ephemeral in-process test listener, never a workflow.
    const server = app.listen(0);
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
    closeServer = () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));

    const [axelOrg, externalOrg] = await db.insert(organizationsTable).values([
      { name: `Fictional Axel ${suffix}`, type: "Agency", status: "ACTIVE" },
      { name: `Fictional External ${suffix}`, type: "Agency", status: "ACTIVE" },
    ]).returning();
    axelOrgId = axelOrg.id;
    externalOrgId = externalOrg.id;
    // Explicit fixture trust anchor; this is intentionally never inferred.
    await db.insert(trustedAxelOrganizationsTable).values({ orgId: axelOrgId, note: "test fixture only" });

    ({ id: adminId, cookie: adminCookie } = await createUser("admin", "ADMIN", axelOrgId));
    ({ id: csaId, cookie: csaCookie } = await createUser("csa", "CSA", axelOrgId));
    ({ id: externalCsaId, cookie: externalCsaCookie } = await createUser("external-csa", "CSA", externalOrgId));
    ({ id: externalAdminId, cookie: externalAdminCookie } = await createUser("external-admin", "ADMIN", externalOrgId));
    ({ id: underwriterId, cookie: underwriterCookie } = await createUser("underwriter", "UNDERWRITER", axelOrgId));
    ({ id: agentId, cookie: agentCookie } = await createUser("broker-agent", "AGENT", externalOrgId));

    const [account] = await db.insert(accountsTable).values({ businessName: `Correspondence Fixture ${suffix}` }).returning();
    accountId = account.id;
    const [deal, foreignDeal] = await db.insert(dealsTable).values([
      {
        referenceCode: `T-CORR-${suffix}`, accountId, businessName: `Correspondence Fixture ${suffix}`,
        orgId: axelOrgId, producingAgentId: agentId, stage: "UW_REVIEW",
      },
      {
        referenceCode: `T-CORR-X-${suffix}`, accountId, businessName: `Foreign Fixture ${suffix}`,
        orgId: externalOrgId, producingAgentId: agentId, stage: "UW_REVIEW",
      },
    ]).returning();
    dealId = deal.id;
    foreignDealId = foreignDeal.id;
    const [market] = await db.insert(marketsTable).values({
      name: `Fictional Market ${suffix}`, marketType: "WC_CARRIER", productLane: "WC", isActive: true, isAppointed: true,
    }).returning();
    marketId = market.id;
    const [marketContact] = await db.insert(marketUnderwritersTable).values({
      marketId, name: "Fictional Market Contact", email: `market-${suffix}@example.test`, isActive: true,
    }).returning();
    const [dealMarket] = await db.insert(dealMarketsTable).values({
      dealId, marketId, marketType: "WC_CARRIER", assignedUnderwriterId: marketContact.id,
      isActive: true, marketStatus: "ACTIVE", engagementSource: "MANUAL_OVERFLOW",
      rank: 1, isPrimary: true, sendStatus: "PENDING", appetiteOutcome: "MATCHED", rankingState: "PROVISIONAL",
    }).returning();
    dealMarketId = dealMarket.id;
  });

  after(async () => {
    if (closeServer) await closeServer();
    const userIds = [adminId, csaId, externalCsaId, externalAdminId, underwriterId, agentId].filter(Boolean);
    if (dealId || foreignDealId) {
      const ids = [dealId, foreignDealId].filter(Boolean);
      await db.delete(activityLogTable).where(inArray(activityLogTable.dealId, ids));
      await db.delete(dealInboundEmailsTable).where(inArray(dealInboundEmailsTable.dealId, ids));
      await db.delete(dealOutboundEmailsTable).where(inArray(dealOutboundEmailsTable.dealId, ids));
      await db.delete(correspondenceThreadsTable).where(inArray(correspondenceThreadsTable.dealId, ids));
      await db.delete(dealMarketEmailAddressesTable).where(inArray(dealMarketEmailAddressesTable.dealId, ids));
      await db.delete(dealEmailAddressesTable).where(inArray(dealEmailAddressesTable.dealId, ids));
      await db.delete(dealMarketsTable).where(eq(dealMarketsTable.dealId, dealId));
      await db.delete(dealsTable).where(inArray(dealsTable.id, ids));
    }
    if (marketId) await db.delete(marketsTable).where(eq(marketsTable.id, marketId));
    if (accountId) await db.delete(accountsTable).where(eq(accountsTable.id, accountId));
    if (userIds.length) {
      await db.delete(sessionsTable).where(inArray(sessionsTable.userId, userIds));
      await db.delete(userCredentialsTable).where(inArray(userCredentialsTable.userId, userIds));
      await db.delete(orgMembersTable).where(inArray(orgMembersTable.userId, userIds));
      await db.delete(usersTable).where(inArray(usersTable.id, userIds));
    }
    if (axelOrgId) await db.delete(trustedAxelOrganizationsTable).where(eq(trustedAxelOrganizationsTable.orgId, axelOrgId));
    if (axelOrgId || externalOrgId) await db.delete(organizationsTable).where(inArray(organizationsTable.id, [axelOrgId, externalOrgId].filter(Boolean)));
  });

  it("allows only explicitly trusted ADMIN/CSA market reads and blocks cross-deal IDs", async () => {
    for (const cookie of [adminCookie, csaCookie]) {
      assert.equal((await api("GET", `/deal-card/${dealId}/correspondence/market/${dealMarketId}`, cookie)).status, 200);
    }
    for (const cookie of [externalCsaCookie, externalAdminCookie, underwriterCookie, agentCookie]) {
      assert.equal((await api("GET", `/deal-card/${dealId}/correspondence/market/${dealMarketId}`, cookie)).status, 403);
    }
    assert.equal((await api("GET", `/deal-card/${foreignDealId}/correspondence/market/${dealMarketId}`, adminCookie)).status, 403);
  });

  it("prevents an external ADMIN from mutating trusted identities", async () => {
    assert.equal((await api("PATCH", `/users/${adminId}/password`, externalAdminCookie, {
      newPassword: "Fictional-password-1",
    })).status, 403);
    assert.equal((await api("PATCH", `/users/${adminId}/status`, externalAdminCookie, {
      status: "deactivated",
    })).status, 403);
    assert.equal((await api("PATCH", `/users/${adminId}`, externalAdminCookie, {
      status: "deactivated",
    })).status, 403);
  });

  it("fails closed for inactive principals/organizations and multiple primary memberships", async () => {
    const path = `/deal-card/${dealId}/correspondence/market/${dealMarketId}`;
    await db.update(usersTable).set({ status: "deactivated" }).where(eq(usersTable.id, csaId));
    assert.equal((await api("GET", path, csaCookie)).status, 403);
    await db.update(usersTable).set({ status: "active" }).where(eq(usersTable.id, csaId));

    await db.update(organizationsTable).set({ status: "INACTIVE" }).where(eq(organizationsTable.id, axelOrgId));
    assert.equal((await api("GET", path, adminCookie)).status, 403);
    await db.update(organizationsTable).set({ status: "ACTIVE" }).where(eq(organizationsTable.id, axelOrgId));

    await db.insert(orgMembersTable).values({ userId: adminId, orgId: externalOrgId, role: "ADMIN", isPrimaryOrg: true });
    assert.equal((await api("GET", path, adminCookie)).status, 403);
    await db.delete(orgMembersTable).where(and(eq(orgMembersTable.userId, adminId), eq(orgMembersTable.orgId, externalOrgId)));
  });

  it("keeps market activity out of the generic agent feed", async () => {
    await db.insert(activityLogTable).values({
      dealId, dealMarketId, entityType: "deal_market", entityId: dealMarketId, eventType: "email_sent",
      description: "private fictional market subject", metadata: { correspondence_private: true },
    });
    const result = await api("GET", `/deals/${dealId}/activity`, agentCookie);
    assert.equal(result.status, 200);
    assert.equal((result.body as any[]).some((row: any) => row.description === "private fictional market subject"), false);
  });

  it("limits broker visibility/replies to the participant's own thread", async () => {
    const beforeThread = await api("GET", `/deal-card/${dealId}/correspondence/broker`, agentCookie);
    assert.equal(beforeThread.status, 200);
    assert.deepEqual((beforeThread.body as any).messages, []);
    const sent = await api("POST", `/deal-card/${dealId}/correspondence/broker`, adminCookie, {
      recipientUserId: agentId, subject: "Fictional update", text: "Fictional staff summary", requestId: randomUUID(),
    });
    assert.equal(sent.status, 201, JSON.stringify(sent.body));
    assert.equal((await api("GET", `/deal-card/${dealId}/correspondence/broker`, agentCookie)).status, 200);
    const reply = await api("POST", `/deal-card/${dealId}/correspondence/broker/reply`, agentCookie, {
      subject: "Fictional reply", text: "Fictional agent message",
    });
    assert.equal(reply.status, 201);
    assert.equal((reply.body as any).message.channel, "BROKER");
    assert.equal((await api("POST", `/deal-card/${dealId}/correspondence/broker/reply`, underwriterCookie, {
      subject: "spoof", text: "spoof",
    })).status, 403);
  });

  it("rejects recipient injection at the route and final market service boundary", async () => {
    const result = await api("POST", `/deal-card/${dealId}/correspondence/market/${dealMarketId}`, adminCookie, {
      subject: "Fictional", text: "Fictional", cc: ["broker@example.test"], bcc: ["broker@example.test"], replyTo: "broker@example.test",
    });
    // Strict schemas reject injected envelope fields rather than stripping
    // them silently before they reach final recipient resolution.
    assert.equal(result.status, 400);
    // Initial, overflow, and manual retry dispatches all converge at this
    // final service boundary. Prove each cannot construct a mixed envelope,
    // independent of a route's request schema.
    for (const attemptKind of ["initial", "overflow", "retry"]) {
      await assert.rejects(
        sendDealEmail({
          channel: "MARKET", dealId, dealMarketId,
          to: [`market-${suffix}@example.test`],
          cc: [`${attemptKind}-broker@example.test`],
          subject: "must not send", text: "must not send",
        }),
        /MARKET_RECIPIENT_POLICY_REJECTED/,
      );
    }
  });

  it("holds an initial provider retrieval failure then idempotently enriches on duplicate replay", async () => {
    const originalKey = process.env.RESEND_API_KEY;
    const originalFetch = globalThis.fetch;
    let fetches = 0;
    process.env.RESEND_API_KEY = "fixture-key";
    globalThis.fetch = (async (input, init) => {
      if (!String(input).startsWith("https://api.resend.com/")) return originalFetch(input, init);
      fetches += 1;
      if (fetches === 1) return new Response(JSON.stringify({ error: "temporary" }), { status: 503 });
      return new Response(JSON.stringify({ data: { html: "<script>x()</script><p>safe</p>", text: "safe" } }), { status: 200 });
    }) as typeof fetch;
    try {
      const [thread] = await db.select().from(correspondenceThreadsTable).where(and(
        eq(correspondenceThreadsTable.channel, "MARKET"), eq(correspondenceThreadsTable.dealMarketId, dealMarketId),
      )).limit(1);
      assert.ok(thread);
      const providerId = randomUUID();
      const messageId = randomUUID();
      const inbound = {
        messageId, providerReceivedEmailId: providerId, to: [thread.listenerEmail],
        from: `market-${suffix}@example.test`, subject: "[AXM-spoofed-subject-is-not-authority]",
        senderAuthEvidence: "mx.resend.com; dmarc=pass",
      };
      assert.equal((await processInboundEmail(inbound)).duplicate, false);
      assert.equal((await processInboundEmail(inbound)).duplicate, true);
      const [stored] = await db.select().from(dealInboundEmailsTable).where(eq(dealInboundEmailsTable.messageId, messageId));
      assert.equal(stored.bodyEnrichmentStatus, "COMPLETE");
      assert.equal(stored.bodyHtml, null);
      assert.match(stored.bodyText ?? "", /safe/);
      assert.doesNotMatch(stored.bodyText ?? "", /script/i);
      assert.equal(fetches, 2);
      // Before this explicit action the message is HELD and unavailable to
      // broker/market feeds; release is an audited staff classification.
      assert.equal(stored.channel, "HELD");
      const released = await api("POST", `/deal-card/correspondence/held/${stored.id}/release`, adminCookie, {
        channel: "MARKET", senderConfirmed: true,
      });
      assert.equal(released.status, 200);
      const [releasedRow] = await db.select().from(dealInboundEmailsTable).where(eq(dealInboundEmailsTable.id, stored.id));
      assert.equal(releasedRow.channel, "MARKET", JSON.stringify({ released: released.body, row: releasedRow }));
      assert.ok(releasedRow.correspondenceThreadId);
    } finally {
      process.env.RESEND_API_KEY = originalKey;
      globalThis.fetch = originalFetch;
    }
  });

  it("persists To/CC and holds mixed listener identities for staff review", async () => {
    const [thread] = await db.select().from(correspondenceThreadsTable).where(and(
      eq(correspondenceThreadsTable.channel, "MARKET"), eq(correspondenceThreadsTable.dealMarketId, dealMarketId),
    )).limit(1);
    assert.ok(thread);
    const result = await processInboundEmail({
      messageId: randomUUID(), to: [thread.listenerEmail], cc: ["unknown-recipient@example.test"],
      from: `market-${suffix}@example.test`, subject: "ambiguous", senderAuthEvidence: "mx.resend.com; dmarc=pass",
    });
    const [stored] = await db.select().from(dealInboundEmailsTable).where(eq(dealInboundEmailsTable.id, result.id!));
    assert.equal(stored.channel, "HELD");
    assert.equal(stored.heldReason, "AMBIGUOUS_RECIPIENT_IDENTITIES");
    assert.deepEqual(stored.toEmails, [thread.listenerEmail]);
    assert.deepEqual(stored.ccEmails, ["unknown-recipient@example.test"]);
    const held = await api("GET", "/deal-card/correspondence/held", adminCookie);
    assert.equal(held.status, 200);
    assert.equal((held.body as any).messages.some((m: any) => m.id === stored.id && m.heldReason === "AMBIGUOUS_RECIPIENT_IDENTITIES"), true);
  });
});
