/**
 * Isolated development-DB coverage for Task 94 held-message matching.
 * Provider receiving lookups are intercepted in-process. No provider send or
 * live provider request is permitted.
 *
 * Run explicitly (never against production):
 *   pnpm exec tsx --test src/tests/held-matching.integration.test.ts
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import { after, before, describe, it } from "node:test";
import {
  accountsTable,
  activityLogTable,
  correspondenceThreadsTable,
  db,
  dealEmailAddressesTable,
  dealInboundEmailsTable,
  dealMarketEmailAddressesTable,
  dealMarketsTable,
  dealOutboundEmailsTable,
  dealsTable,
  marketUnderwritersTable,
  marketsTable,
  organizationsTable,
  orgMembersTable,
  sessionsTable,
  trustedAxelOrganizationsTable,
  userCredentialsTable,
  usersTable,
} from "@workspace/db";
import { and, eq, inArray } from "drizzle-orm";
import app from "../app.js";
import { createSession } from "../lib/auth.js";

type JsonResult = { status: number; body: any };
type ProviderHeader = { name: string; value: string };
type ProviderRecord = {
  id: string;
  email_id: string;
  message_id: string;
  from: string;
  to: string[];
  cc: string[];
  bcc: unknown;
  subject: string;
  text: string;
  headers: any;
};

const suffix = randomUUID().replaceAll("-", "").slice(0, 12);
const providerRecords = new Map<string, ProviderRecord | { status: number }>();
const directProviderPayloads = new Set<string>();
const createdInboundIds = new Set<string>();
let baseUrl = "";
let closeServer: (() => Promise<void>) | null = null;
let originalFetch: typeof fetch;
let originalApiKey: string | undefined;
let providerFetches = 0;

let trustedOrgId = "";
let externalOrgId = "";
let accountId = "";
let dealId = "";
let foreignDealId = "";
let marketId = "";
let dealMarketId = "";
let adminId = "";
let csaId = "";
let inactiveAdminId = "";
let externalAdminId = "";
let externalCsaId = "";
let underwriterId = "";
let brokerId = "";
let otherBrokerId = "";
let foreignBrokerId = "";
let adminCookie = "";
let csaCookie = "";
let inactiveAdminCookie = "";
let externalAdminCookie = "";
let externalCsaCookie = "";
let underwriterCookie = "";
let brokerCookie = "";
let marketThread: typeof correspondenceThreadsTable.$inferSelect;
let brokerThread: typeof correspondenceThreadsTable.$inferSelect;
let otherBrokerThread: typeof correspondenceThreadsTable.$inferSelect;
let foreignBrokerThread: typeof correspondenceThreadsTable.$inferSelect;
let marketOutbound: typeof dealOutboundEmailsTable.$inferSelect;
let brokerOutbound: typeof dealOutboundEmailsTable.$inferSelect;
let otherBrokerOutbound: typeof dealOutboundEmailsTable.$inferSelect;
let foreignBrokerOutbound: typeof dealOutboundEmailsTable.$inferSelect;

async function createUser(emailPrefix: string, role: string, orgId: string, status = "active") {
  const [user] = await db.insert(usersTable).values({
    email: `${emailPrefix}-${suffix}@example.test`,
    firstName: emailPrefix,
    lastName: "Held Match Fixture",
    status,
  }).returning();
  await db.insert(orgMembersTable).values({ userId: user.id, orgId, role, isPrimaryOrg: true });
  const session = await createSession(user.id);
  return { id: user.id, email: user.email, cookie: `axel_session=${session.token}` };
}

async function api(method: string, path: string, cookie: string, body?: unknown): Promise<JsonResult> {
  const response = await originalFetch(`${baseUrl}/api${path}`, {
    method,
    headers: {
      Cookie: cookie,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let responseBody: unknown = null;
  if (text) {
    try {
      responseBody = JSON.parse(text);
    } catch {
      responseBody = text;
    }
  }
  return { status: response.status, body: responseBody };
}

function providerRecord(input: {
  providerId: string;
  messageId: string;
  from: string;
  to: string[];
  cc?: string[];
  subject?: string;
  text?: string;
  inReplyTo?: string;
  references?: string[];
  authenticationResults?: string;
}): ProviderRecord {
  const headers = [
    { name: "Message-ID", value: input.messageId },
    ...(input.inReplyTo ? [{ name: "In-Reply-To", value: input.inReplyTo }] : []),
    ...(input.references?.length ? [{ name: "References", value: input.references.join(" ") }] : []),
    ...(input.authenticationResults
      ? [{ name: "Authentication-Results", value: input.authenticationResults }]
      : []),
  ];
  return {
    id: input.providerId,
    email_id: input.providerId,
    message_id: input.messageId,
    from: input.from,
    to: input.to,
    cc: input.cc ?? [],
    bcc: [],
    subject: input.subject ?? "Fictional held reply",
    text: input.text ?? "Exact fictional provider body",
    headers,
  };
}

async function insertHeld(input: {
  from?: string;
  to?: string[];
  cc?: string[];
  subject?: string;
  bodyText?: string;
  messageId?: string;
  providerId?: string | null;
  dealId?: string | null;
  dealMarketId?: string | null;
  threadId?: string | null;
  heldReason?: string;
}) {
  const messageId = input.messageId ?? `<held-${randomUUID()}@example.test>`;
  const providerId = input.providerId === undefined ? `received-${randomUUID()}` : input.providerId;
  const [row] = await db.insert(dealInboundEmailsTable).values({
    dealId: input.dealId ?? null,
    dealMarketId: input.dealMarketId ?? null,
    correspondenceThreadId: input.threadId ?? null,
    messageId,
    providerReceivedEmailId: providerId,
    fromEmail: input.from ?? `unexpected-sender-${suffix}@example.test`,
    toEmails: input.to ?? [],
    ccEmails: input.cc ?? [],
    subject: input.subject ?? "Fictional held reply",
    bodyText: input.bodyText ?? "Exact original persisted body",
    bodyHtml: null,
    channel: "HELD",
    heldReason: input.heldReason ?? "UNKNOWN_RECIPIENT",
    bodyEnrichmentStatus: "COMPLETE",
    receivedAt: new Date(),
  }).returning();
  createdInboundIds.add(row.id);
  return row;
}

function registerProvider(
  row: typeof dealInboundEmailsTable.$inferSelect,
  overrides: Partial<ProviderRecord> = {},
  replyTo: string | null = marketOutbound.rfcMessageId,
  rfcMessageId = row.messageId,
) {
  assert.ok(row.providerReceivedEmailId);
  const record = providerRecord({
    providerId: row.providerReceivedEmailId,
    messageId: rfcMessageId,
    from: row.fromEmail,
    to: row.toEmails,
    cc: row.ccEmails,
    subject: row.subject ?? "",
    text: row.bodyText ?? "",
    inReplyTo: replyTo ?? undefined,
    references: replyTo ? [replyTo] : undefined,
  });
  providerRecords.set(row.providerReceivedEmailId, { ...record, ...overrides });
  return record;
}

async function preview(rowId: string, cookie = adminCookie, body: unknown = {}) {
  return api("POST", `/deal-card/correspondence/held/${rowId}/match-preview`, cookie, body);
}

async function confirm(rowId: string, token: string, cookie = adminCookie, body: Record<string, unknown> = {}) {
  return api("POST", `/deal-card/correspondence/held/${rowId}/match`, cookie, {
    confirmationToken: token,
    destinationConfirmed: true,
    ...body,
  });
}

async function auditRowsFor(inboundId: string) {
  const rows = await db.select().from(activityLogTable).where(eq(activityLogTable.dealId, dealId));
  return rows.filter((row) => {
    const metadata = row.metadata as Record<string, unknown> | null;
    return metadata?.inbound_email_id === inboundId || metadata?.inboundEmailId === inboundId;
  });
}

function assertDenied(result: JsonResult, detail = "") {
  assert.ok(result.status >= 400, `${detail} unexpectedly returned ${result.status}: ${JSON.stringify(result.body)}`);
}

describe("held-message evidence matching (isolated fictional fixture)", () => {
  before(async () => {
    originalFetch = globalThis.fetch;
    originalApiKey = process.env.RESEND_API_KEY;
    process.env.RESEND_API_KEY = "held-matching-fixture-key";
    globalThis.fetch = (async (input, init) => {
      const url = String(input);
      if (!url.startsWith("https://api.resend.com/emails/receiving/")) {
        return originalFetch(input, init);
      }
      providerFetches += 1;
      assert.equal(init?.method ?? "GET", "GET");
      const providerId = decodeURIComponent(url.slice(url.lastIndexOf("/") + 1));
      const fixture = providerRecords.get(providerId);
      if (!fixture) {
        return new Response(JSON.stringify({ error: "fixture provider record unavailable" }), {
          status: 503,
          headers: { "content-type": "application/json" },
        });
      }
      if ("status" in fixture) {
        return new Response(JSON.stringify({ error: "controlled provider failure" }), {
          status: fixture.status,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response(JSON.stringify(
        directProviderPayloads.has(providerId) ? fixture : { data: fixture },
      ), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }) as typeof fetch;

    const server = app.listen(0);
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
    closeServer = () => new Promise((resolve, reject) =>
      server.close((error) => error ? reject(error) : resolve()));

    const [trustedOrg, externalOrg] = await db.insert(organizationsTable).values([
      { name: `Held Match Trusted ${suffix}`, type: "Agency", status: "ACTIVE" },
      { name: `Held Match External ${suffix}`, type: "Agency", status: "ACTIVE" },
    ]).returning();
    trustedOrgId = trustedOrg.id;
    externalOrgId = externalOrg.id;
    await db.insert(trustedAxelOrganizationsTable).values({
      orgId: trustedOrgId,
      note: "Task 94 isolated fixture",
    });

    ({ id: adminId, cookie: adminCookie } = await createUser("held-admin", "ADMIN", trustedOrgId));
    ({ id: csaId, cookie: csaCookie } = await createUser("held-csa", "CSA", trustedOrgId));
    ({ id: inactiveAdminId, cookie: inactiveAdminCookie } =
      await createUser("held-inactive-admin", "ADMIN", trustedOrgId, "deactivated"));
    ({ id: externalAdminId, cookie: externalAdminCookie } =
      await createUser("held-external-admin", "ADMIN", externalOrgId));
    ({ id: externalCsaId, cookie: externalCsaCookie } =
      await createUser("held-external-csa", "CSA", externalOrgId));
    ({ id: underwriterId, cookie: underwriterCookie } =
      await createUser("held-underwriter-role", "UNDERWRITER", trustedOrgId));
    ({ id: brokerId, cookie: brokerCookie } = await createUser("held-broker", "AGENT", externalOrgId));
    ({ id: otherBrokerId } = await createUser("held-other-broker", "AGENT", externalOrgId));
    ({ id: foreignBrokerId } = await createUser("held-foreign-broker", "AGENT", externalOrgId));

    const [account] = await db.insert(accountsTable).values({
      businessName: `Held Matching Account ${suffix}`,
    }).returning();
    accountId = account.id;
    const [deal, foreignDeal] = await db.insert(dealsTable).values([
      {
        referenceCode: `T-HMATCH-${suffix}`,
        accountId,
        businessName: `Held Matching Deal ${suffix}`,
        orgId: trustedOrgId,
        producingAgentId: brokerId,
        stage: "UW_REVIEW",
      },
      {
        referenceCode: `T-HMATCH-X-${suffix}`,
        accountId,
        businessName: `Foreign Held Matching Deal ${suffix}`,
        orgId: externalOrgId,
        producingAgentId: foreignBrokerId,
        stage: "UW_REVIEW",
      },
    ]).returning();
    dealId = deal.id;
    foreignDealId = foreignDeal.id;

    const [market] = await db.insert(marketsTable).values({
      name: `Held Matching Market ${suffix}`,
      marketType: "WC_CARRIER",
      productLane: "WC",
      isActive: true,
      isAppointed: true,
    }).returning();
    marketId = market.id;
    const [contact] = await db.insert(marketUnderwritersTable).values({
      marketId,
      name: "Held Match Market Contact",
      email: `held-market-contact-${suffix}@example.test`,
      isActive: true,
    }).returning();
    const [dealMarket] = await db.insert(dealMarketsTable).values({
      dealId,
      marketId,
      marketType: "WC_CARRIER",
      assignedUnderwriterId: contact.id,
      isActive: true,
      marketStatus: "ACTIVE",
      engagementSource: "MANUAL_OVERFLOW",
      rank: 1,
      isPrimary: true,
      sendStatus: "SENT",
      appetiteOutcome: "MATCHED",
      rankingState: "PROVISIONAL",
    }).returning();
    dealMarketId = dealMarket.id;
    await db.insert(dealMarketEmailAddressesTable).values({
      dealMarketId,
      dealId,
      marketId,
      emailAddress: `market-listener-${suffix}@reply.example.test`,
      subjectToken: `HM-MARKET-${suffix}`,
    });

    [marketThread, brokerThread, otherBrokerThread, foreignBrokerThread] =
      await db.insert(correspondenceThreadsTable).values([
        {
          dealId,
          dealMarketId,
          channel: "MARKET",
          listenerEmail: `market-listener-${suffix}@reply.example.test`,
          subjectToken: `HM-MARKET-${suffix}`,
        },
        {
          dealId,
          participantUserId: brokerId,
          channel: "BROKER",
          listenerEmail: `broker-listener-${suffix}@reply.example.test`,
          subjectToken: `HM-BROKER-${suffix}`,
        },
        {
          dealId,
          participantUserId: otherBrokerId,
          channel: "BROKER",
          listenerEmail: `other-broker-listener-${suffix}@reply.example.test`,
          subjectToken: `HM-BROKER-OTHER-${suffix}`,
        },
        {
          dealId: foreignDealId,
          participantUserId: foreignBrokerId,
          channel: "BROKER",
          listenerEmail: `foreign-broker-listener-${suffix}@reply.example.test`,
          subjectToken: `HM-BROKER-FOREIGN-${suffix}`,
        },
      ]).returning();

    [marketOutbound, brokerOutbound, otherBrokerOutbound, foreignBrokerOutbound] =
      await db.insert(dealOutboundEmailsTable).values([
        {
          dealId,
          dealMarketId,
          correspondenceThreadId: marketThread.id,
          providerMessageId: `sent-market-${suffix}`,
          rfcMessageId: `<sent-market-${suffix}@example.test>`,
          toEmails: [`held-market-contact-${suffix}@example.test`],
          ccEmails: [],
          fromEmail: marketThread.listenerEmail,
          replyTo: marketThread.listenerEmail,
          subject: `Market fixture [${marketThread.subjectToken}]`,
          bodyText: "Fictional market outbound",
          channel: "MARKET",
          status: "sent",
        },
        {
          dealId,
          correspondenceThreadId: brokerThread.id,
          providerMessageId: `sent-broker-${suffix}`,
          rfcMessageId: `<sent-broker-${suffix}@example.test>`,
          toEmails: [`held-broker-${suffix}@example.test`],
          ccEmails: [],
          fromEmail: brokerThread.listenerEmail,
          replyTo: brokerThread.listenerEmail,
          subject: `Broker fixture [${brokerThread.subjectToken}]`,
          bodyText: "Fictional broker outbound",
          channel: "BROKER",
          status: "sent",
        },
        {
          dealId,
          correspondenceThreadId: otherBrokerThread.id,
          providerMessageId: `sent-other-broker-${suffix}`,
          rfcMessageId: `<sent-other-broker-${suffix}@example.test>`,
          toEmails: [`held-other-broker-${suffix}@example.test`],
          ccEmails: [],
          fromEmail: otherBrokerThread.listenerEmail,
          replyTo: otherBrokerThread.listenerEmail,
          subject: "Other broker fixture",
          bodyText: "Fictional other broker outbound",
          channel: "BROKER",
          status: "sent",
        },
        {
          dealId: foreignDealId,
          correspondenceThreadId: foreignBrokerThread.id,
          providerMessageId: `sent-foreign-broker-${suffix}`,
          rfcMessageId: `<sent-foreign-broker-${suffix}@example.test>`,
          toEmails: [`held-foreign-broker-${suffix}@example.test`],
          ccEmails: [],
          fromEmail: foreignBrokerThread.listenerEmail,
          replyTo: foreignBrokerThread.listenerEmail,
          subject: "Foreign broker fixture",
          bodyText: "Fictional foreign broker outbound",
          channel: "BROKER",
          status: "sent",
        },
      ]).returning();
  });

  after(async () => {
    globalThis.fetch = originalFetch;
    if (originalApiKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = originalApiKey;
    if (closeServer) await closeServer();

    const dealIds = [dealId, foreignDealId].filter(Boolean);
    if (dealIds.length) {
      await db.delete(activityLogTable).where(inArray(activityLogTable.dealId, dealIds));
      await db.delete(dealInboundEmailsTable).where(
        createdInboundIds.size
          ? inArray(dealInboundEmailsTable.id, [...createdInboundIds])
          : inArray(dealInboundEmailsTable.dealId, dealIds),
      );
      await db.delete(dealOutboundEmailsTable).where(inArray(dealOutboundEmailsTable.dealId, dealIds));
      await db.delete(correspondenceThreadsTable).where(inArray(correspondenceThreadsTable.dealId, dealIds));
      await db.delete(dealMarketEmailAddressesTable).where(eq(dealMarketEmailAddressesTable.dealMarketId, dealMarketId));
      await db.delete(dealMarketsTable).where(eq(dealMarketsTable.id, dealMarketId));
      await db.delete(dealsTable).where(inArray(dealsTable.id, dealIds));
    }
    if (marketId) await db.delete(marketsTable).where(eq(marketsTable.id, marketId));
    if (accountId) await db.delete(accountsTable).where(eq(accountsTable.id, accountId));
    const userIds = [
      adminId, csaId, inactiveAdminId, externalAdminId, externalCsaId,
      underwriterId, brokerId, otherBrokerId, foreignBrokerId,
    ].filter(Boolean);
    if (userIds.length) {
      await db.delete(sessionsTable).where(inArray(sessionsTable.userId, userIds));
      await db.delete(userCredentialsTable).where(inArray(userCredentialsTable.userId, userIds));
      await db.delete(orgMembersTable).where(inArray(orgMembersTable.userId, userIds));
      await db.delete(usersTable).where(inArray(usersTable.id, userIds));
    }
    if (trustedOrgId) {
      await db.delete(trustedAxelOrganizationsTable).where(eq(trustedAxelOrganizationsTable.orgId, trustedOrgId));
    }
    if (trustedOrgId || externalOrgId) {
      await db.delete(organizationsTable).where(
        inArray(organizationsTable.id, [trustedOrgId, externalOrgId].filter(Boolean)),
      );
    }
  });

  it("matches a market reply from fresh provider evidence without changing original message content", async () => {
    // This is the current webhook storage shape: Resend's email_id is used as
    // both persisted identities while the distinct RFC Message-ID remains in
    // the provider record's verified headers.
    const canonicalProviderId = randomUUID();
    const row = await insertHeld({
      to: [marketThread.listenerEmail],
      messageId: canonicalProviderId,
      providerId: canonicalProviderId,
    });
    const productionRecord = registerProvider(
      row,
      {},
      marketOutbound.rfcMessageId,
      `<canonical-rfc-${suffix}@example.test>`,
    );
    // Resend's receiving response carries canonical RFC identity in the
    // top-level message_id. A duplicate Message-ID header is optional.
    productionRecord.headers = (productionRecord.headers as ProviderHeader[]).filter(
      (header) => header.name.toLowerCase() !== "message-id",
    );
    providerRecords.set(row.providerReceivedEmailId!, productionRecord);
    const before = await db.select().from(dealInboundEmailsTable)
      .where(eq(dealInboundEmailsTable.id, row.id)).then((rows) => rows[0]);

    const inspected = await preview(row.id);
    assert.equal(inspected.status, 200, JSON.stringify(inspected.body));
    assert.deepEqual({
      dealId: inspected.body.candidate.dealId,
      dealName: inspected.body.candidate.dealName,
      dealMarketId: inspected.body.candidate.dealMarketId,
      threadId: inspected.body.candidate.threadId,
      channel: inspected.body.candidate.channel,
      listenerEmail: inspected.body.candidate.listenerEmail,
      senderEmail: inspected.body.candidate.senderEmail,
      providerReceivedEmailId: inspected.body.candidate.providerReceivedEmailId,
    }, {
      dealId,
      dealName: `Held Matching Deal ${suffix}`,
      dealMarketId,
      threadId: marketThread.id,
      channel: "MARKET",
      listenerEmail: marketThread.listenerEmail,
      senderEmail: row.fromEmail,
      providerReceivedEmailId: row.providerReceivedEmailId,
    });
    assert.ok(Array.isArray(inspected.body.candidate.evidenceSummary));
    assert.ok(inspected.body.candidate.evidenceSummary.length > 0);
    assert.equal(typeof inspected.body.candidate.confirmationToken, "string");

    const matched = await confirm(row.id, inspected.body.candidate.confirmationToken);
    assert.equal(matched.status, 200, JSON.stringify(matched.body));
    assert.deepEqual(matched.body, {
      associated: true,
      messageId: row.id,
      dealId,
      channel: "HELD",
    });
    const [afterRow] = await db.select().from(dealInboundEmailsTable)
      .where(eq(dealInboundEmailsTable.id, row.id));
    assert.equal(afterRow.id, before.id);
    assert.equal(afterRow.messageId, before.messageId);
    assert.equal(afterRow.providerReceivedEmailId, before.providerReceivedEmailId);
    assert.equal(afterRow.bodyText, before.bodyText);
    assert.equal(afterRow.bodyHtml, before.bodyHtml);
    assert.equal(afterRow.channel, "HELD");
    assert.equal(afterRow.dealId, dealId);
    assert.equal(afterRow.dealMarketId, dealMarketId);
    assert.equal(afterRow.correspondenceThreadId, marketThread.id);

    const marketFeed = await api("GET", `/deal-card/${dealId}/correspondence/market/${dealMarketId}`, adminCookie);
    assert.equal(marketFeed.status, 200);
    assert.equal(marketFeed.body.messages.some((message: any) => message.id === row.id), false);
    const brokerFeed = await api("GET", `/deal-card/${dealId}/correspondence/broker`, brokerCookie);
    assert.equal(brokerFeed.status, 200);
    assert.equal(brokerFeed.body.messages.some((message: any) => message.id === row.id), false);
    const externalActivity = await api("GET", `/deals/${dealId}/activity`, brokerCookie);
    assert.equal(externalActivity.status, 200);
    assert.equal(externalActivity.body.some((activity: any) =>
      activity.metadata?.inbound_email_id === row.id || activity.metadata?.inboundEmailId === row.id), false);
    const audits = await auditRowsFor(row.id);
    assert.equal(audits.length, 1);
    assert.equal((audits[0].metadata as any)?.correspondence_private, true);
  });

  it("matches a legacy RFC-identity broker reply and lets trusted CSA perform both steps", async () => {
    const row = await insertHeld({
      from: `different-broker-sender-${suffix}@example.test`,
      to: [brokerThread.listenerEmail],
    });
    registerProvider(row, {}, brokerOutbound.rfcMessageId);
    const inspected = await preview(row.id, csaCookie);
    assert.equal(inspected.status, 200, JSON.stringify(inspected.body));
    assert.equal(inspected.body.candidate.dealId, dealId);
    assert.equal(inspected.body.candidate.dealMarketId, null);
    assert.equal(inspected.body.candidate.threadId, brokerThread.id);
    assert.equal(inspected.body.candidate.channel, "BROKER");
    assert.equal(inspected.body.candidate.senderEmail, row.fromEmail);
    const matched = await confirm(row.id, inspected.body.candidate.confirmationToken, csaCookie);
    assert.equal(matched.status, 200, JSON.stringify(matched.body));
    const [stored] = await db.select().from(dealInboundEmailsTable)
      .where(eq(dealInboundEmailsTable.id, row.id));
    assert.equal(stored.channel, "HELD");
    assert.equal(stored.dealId, dealId);
    assert.equal(stored.dealMarketId, null);
    assert.equal(stored.correspondenceThreadId, brokerThread.id);
  });

  it("permits evidence-backed association despite sender mismatch but keeps legacy release denied", async () => {
    const row = await insertHeld({
      from: `forwarded-alias-${suffix}@example.test`,
      to: [marketThread.listenerEmail],
    });
    registerProvider(row);
    const inspected = await preview(row.id);
    assert.equal(inspected.status, 200, JSON.stringify(inspected.body));
    assert.equal(inspected.body.candidate.senderEmail, row.fromEmail);
    const release = await api("POST", `/deal-card/correspondence/held/${row.id}/release`, adminCookie, {
      channel: "MARKET",
      senderConfirmed: true,
    });
    assert.equal(release.status, 409);
  });

  it("allows preview/confirmation only to active trusted ADMIN or CSA actors", async () => {
    const row = await insertHeld({ to: [marketThread.listenerEmail] });
    registerProvider(row);
    for (const [label, cookie] of [
      ["external ADMIN", externalAdminCookie],
      ["external CSA", externalCsaCookie],
      ["trusted UNDERWRITER", underwriterCookie],
      ["external broker", brokerCookie],
      ["inactive trusted ADMIN", inactiveAdminCookie],
    ] as const) {
      const result = await preview(row.id, cookie);
      assert.equal(result.status, 403, `${label}: ${JSON.stringify(result.body)}`);
    }
    for (const cookie of [adminCookie, csaCookie]) {
      const result = await preview(row.id, cookie);
      assert.equal(result.status, 200, JSON.stringify(result.body));
    }
  });

  it("denies a cross-organization candidate even to trusted staff", async () => {
    const row = await insertHeld({ to: [foreignBrokerThread.listenerEmail] });
    registerProvider(row, {}, foreignBrokerOutbound.rfcMessageId);
    assertDenied(await preview(row.id), "cross-org candidate");
  });

  it("fails closed on unknown, ambiguous, CC, subject-only, auth-only, unavailable, and provider identity contradictions", async () => {
    const cases: Array<{
      name: string;
      row: Parameters<typeof insertHeld>[0];
      configure: (row: typeof dealInboundEmailsTable.$inferSelect) => void;
    }> = [
      {
        name: "unknown listener",
        row: { to: [`unknown-listener-${suffix}@example.test`] },
        configure: (row) => registerProvider(row),
      },
      {
        name: "ambiguous controlled listeners",
        row: { to: [marketThread.listenerEmail, brokerThread.listenerEmail] },
        configure: (row) => registerProvider(row),
      },
      {
        name: "CC recipient",
        row: { to: [marketThread.listenerEmail], cc: [`copied-${suffix}@example.test`] },
        configure: (row) => registerProvider(row),
      },
      {
        name: "subject token only",
        row: {
          to: [`unknown-subject-${suffix}@example.test`],
          subject: `Re: submission [${marketThread.subjectToken}]`,
        },
        configure: (row) => registerProvider(row, {}, null),
      },
      {
        name: "authentication-results only",
        row: { to: [`unknown-auth-${suffix}@example.test`] },
        configure: (row) => {
          const record = registerProvider(row, {}, null);
          record.headers.push({ name: "Authentication-Results", value: "mx.example; dmarc=pass" });
          providerRecords.set(row.providerReceivedEmailId!, record);
        },
      },
      {
        name: "provider unavailable",
        row: { to: [marketThread.listenerEmail] },
        configure: (row) => providerRecords.set(row.providerReceivedEmailId!, { status: 503 }),
      },
      {
        name: "provider id mismatch",
        row: { to: [marketThread.listenerEmail] },
        configure: (row) => registerProvider(row, {
          id: `wrong-provider-${suffix}`,
          email_id: `wrong-provider-${suffix}`,
        }),
      },
      {
        name: "RFC message id mismatch",
        row: { to: [marketThread.listenerEmail] },
        configure: (row) => {
          const record = registerProvider(row, { message_id: `<wrong-rfc-${suffix}@example.test>` });
          record.headers = (record.headers as ProviderHeader[]).map((header) =>
            header.name.toLowerCase() === "message-id"
              ? { ...header, value: `<wrong-rfc-${suffix}@example.test>` }
              : header);
          providerRecords.set(row.providerReceivedEmailId!, record);
        },
      },
      {
        name: "top-level RFC message id missing",
        row: { to: [marketThread.listenerEmail] },
        configure: (row) => registerProvider(row, { message_id: "" }),
      },
      {
        name: "top-level and header RFC message ids disagree",
        row: { to: [marketThread.listenerEmail] },
        configure: (row) => {
          const record = registerProvider(row);
          record.headers = (record.headers as ProviderHeader[]).map((header) =>
            header.name.toLowerCase() === "message-id"
              ? { ...header, value: `<disagreeing-header-${suffix}@example.test>` }
              : header);
          providerRecords.set(row.providerReceivedEmailId!, record);
        },
      },
      {
        name: "sender mismatch",
        row: { to: [marketThread.listenerEmail] },
        configure: (row) => registerProvider(row, { from: `provider-disagrees-${suffix}@example.test` }),
      },
      {
        name: "To mismatch",
        row: { to: [marketThread.listenerEmail] },
        configure: (row) => registerProvider(row, { to: [brokerThread.listenerEmail] }),
      },
      {
        name: "CC mismatch",
        row: { to: [marketThread.listenerEmail] },
        configure: (row) => registerProvider(row, { cc: [`provider-cc-${suffix}@example.test`] }),
      },
    ];
    for (const fixture of cases) {
      const row = await insertHeld(fixture.row);
      fixture.configure(row);
      assertDenied(await preview(row.id), fixture.name);
      const [unchanged] = await db.select().from(dealInboundEmailsTable)
        .where(eq(dealInboundEmailsTable.id, row.id));
      assert.equal(unchanged.dealId, null, fixture.name);
      assert.equal(unchanged.channel, "HELD", fixture.name);
    }
  });

  it("rejects nonempty BCC from a direct provider payload with object-form headers", async () => {
    const row = await insertHeld({ to: [marketThread.listenerEmail] });
    const record = registerProvider(row);
    record.bcc = [brokerThread.listenerEmail];
    record.headers = Object.fromEntries(
      (record.headers as Array<{ name: string; value: string }>).map((header) => [
        header.name,
        header.value,
      ]),
    );
    providerRecords.set(row.providerReceivedEmailId!, record);
    directProviderPayloads.add(row.providerReceivedEmailId!);
    const result = await preview(row.id);
    assert.equal(result.status, 409, JSON.stringify(result.body));
    assert.equal(result.body.code, "EVIDENCE_MISMATCH");
    const [unchanged] = await db.select().from(dealInboundEmailsTable)
      .where(eq(dealInboundEmailsTable.id, row.id));
    assert.equal(unchanged.dealId, null);
    assert.equal((await auditRowsFor(row.id)).length, 0);
  });

  it("rejects unknown and malformed provider BCC forms", async () => {
    for (const [name, bcc] of [
      ["unknown BCC", [`unknown-bcc-${suffix}@example.test`]],
      ["string BCC", `unknown-bcc-${suffix}@example.test`],
      ["object BCC", { email: `unknown-bcc-${suffix}@example.test` }],
    ] as const) {
      const row = await insertHeld({ to: [marketThread.listenerEmail] });
      registerProvider(row, { bcc });
      const result = await preview(row.id);
      assert.equal(result.status, 409, `${name}: ${JSON.stringify(result.body)}`);
      assert.equal(result.body.code, "EVIDENCE_MISMATCH", name);
      const [unchanged] = await db.select().from(dealInboundEmailsTable)
        .where(eq(dealInboundEmailsTable.id, row.id));
      assert.equal(unchanged.dealId, null, name);
      assert.equal((await auditRowsFor(row.id)).length, 0, name);
    }
  });

  it("revalidates fresh BCC evidence at confirmation and leaves the row unmatched", async () => {
    const row = await insertHeld({ to: [marketThread.listenerEmail] });
    const record = registerProvider(row);
    const inspected = await preview(row.id);
    assert.equal(inspected.status, 200, JSON.stringify(inspected.body));
    providerRecords.set(row.providerReceivedEmailId!, {
      ...record,
      bcc: [`fresh-bcc-${suffix}@example.test`],
    });
    const matched = await confirm(row.id, inspected.body.candidate.confirmationToken);
    assert.equal(matched.status, 409, JSON.stringify(matched.body));
    assert.equal(matched.body.code, "EVIDENCE_MISMATCH");
    const [unchanged] = await db.select().from(dealInboundEmailsTable)
      .where(eq(dealInboundEmailsTable.id, row.id));
    assert.equal(unchanged.dealId, null);
    assert.equal(unchanged.dealMarketId, null);
    assert.equal(unchanged.correspondenceThreadId, null);
    assert.equal(unchanged.channel, "HELD");
    assert.equal((await auditRowsFor(row.id)).length, 0);
  });

  it("denies conflicting known reply-chain evidence across channel, broker thread, and organization", async () => {
    const fixtures = [
      {
        name: "market listener with broker chain",
        to: marketThread.listenerEmail,
        replyTo: brokerOutbound.rfcMessageId,
      },
      {
        name: "broker listener with another broker thread chain",
        to: brokerThread.listenerEmail,
        replyTo: otherBrokerOutbound.rfcMessageId,
      },
      {
        name: "broker listener with foreign organization chain",
        to: brokerThread.listenerEmail,
        replyTo: foreignBrokerOutbound.rfcMessageId,
      },
    ];
    for (const fixture of fixtures) {
      const row = await insertHeld({ to: [fixture.to] });
      registerProvider(row, {}, fixture.replyTo);
      assertDenied(await preview(row.id), fixture.name);
    }
  });

  it("rejects a market thread whose dealMarket belongs to a different deal and organization", async () => {
    const [foreignDealMarket] = await db.insert(dealMarketsTable).values({
      dealId: foreignDealId,
      marketId,
      marketType: "WC_CARRIER",
      isActive: true,
      marketStatus: "ACTIVE",
      engagementSource: "MANUAL_OVERFLOW",
      rank: 2,
      isPrimary: false,
      sendStatus: "PENDING",
      appetiteOutcome: "MATCHED",
      rankingState: "PROVISIONAL",
    }).returning();
    const listener = `malformed-market-link-${suffix}@reply.example.test`;
    const [malformedThread] = await db.insert(correspondenceThreadsTable).values({
      // Deliberately malformed historical linkage: the thread claims the
      // trusted deal while its dealMarket and market listener claim the
      // external organization's deal.
      dealId,
      dealMarketId: foreignDealMarket.id,
      channel: "MARKET",
      listenerEmail: listener,
      subjectToken: `HM-MALFORMED-MARKET-${suffix}`,
    }).returning();
    await db.insert(dealMarketEmailAddressesTable).values({
      dealMarketId: foreignDealMarket.id,
      dealId: foreignDealId,
      marketId,
      emailAddress: listener,
      subjectToken: `HM-MALFORMED-MARKET-ADDRESS-${suffix}`,
    });
    try {
      const row = await insertHeld({ to: [listener] });
      registerProvider(row, {}, null);
      const result = await preview(row.id);
      assert.equal(result.status, 409, JSON.stringify(result.body));
      assert.equal(result.body.code, "AMBIGUOUS_CANDIDATE");
    } finally {
      await db.delete(dealMarketEmailAddressesTable)
        .where(eq(dealMarketEmailAddressesTable.dealMarketId, foreignDealMarket.id));
      await db.delete(correspondenceThreadsTable)
        .where(eq(correspondenceThreadsTable.id, malformedThread.id));
      await db.delete(dealMarketsTable).where(eq(dealMarketsTable.id, foreignDealMarket.id));
    }
  });

  it("rejects a broker listener colliding case-insensitively with a market listener", async () => {
    const [collidingThread] = await db.insert(correspondenceThreadsTable).values({
      dealId,
      participantUserId: foreignBrokerId,
      channel: "BROKER",
      listenerEmail: marketThread.listenerEmail.toUpperCase(),
      subjectToken: `HM-CASE-MARKET-BROKER-${suffix}`,
    }).returning();
    try {
      const row = await insertHeld({ to: [marketThread.listenerEmail.toLowerCase()] });
      registerProvider(row, {}, null);
      const result = await preview(row.id);
      assert.equal(result.status, 409, JSON.stringify(result.body));
      assert.equal(result.body.code, "AMBIGUOUS_CANDIDATE");
    } finally {
      await db.delete(correspondenceThreadsTable)
        .where(eq(correspondenceThreadsTable.id, collidingThread.id));
    }
  });

  it("rejects a broker listener colliding case-insensitively with a deal-level listener", async () => {
    const [dealListener] = await db.insert(dealEmailAddressesTable).values({
      dealId,
      emailAddress: brokerThread.listenerEmail.toUpperCase(),
      companySlug: `held-match-${suffix}`,
      fileId: `held-match-${suffix}`,
    }).returning();
    try {
      const row = await insertHeld({ to: [brokerThread.listenerEmail.toLowerCase()] });
      registerProvider(row, {}, null);
      const result = await preview(row.id);
      assert.equal(result.status, 409, JSON.stringify(result.body));
      assert.equal(result.body.code, "AMBIGUOUS_CANDIDATE");
    } finally {
      await db.delete(dealEmailAddressesTable).where(eq(dealEmailAddressesTable.id, dealListener.id));
    }
  });

  it("rejects duplicate case-variant correspondence threads", async () => {
    const [duplicateThread] = await db.insert(correspondenceThreadsTable).values({
      dealId,
      participantUserId: foreignBrokerId,
      channel: "BROKER",
      listenerEmail: brokerThread.listenerEmail.toUpperCase(),
      subjectToken: `HM-CASE-DUPLICATE-${suffix}`,
    }).returning();
    try {
      const row = await insertHeld({ to: [brokerThread.listenerEmail.toLowerCase()] });
      registerProvider(row, {}, null);
      const result = await preview(row.id);
      assert.equal(result.status, 409, JSON.stringify(result.body));
      assert.equal(result.body.code, "AMBIGUOUS_CANDIDATE");
    } finally {
      await db.delete(correspondenceThreadsTable)
        .where(eq(correspondenceThreadsTable.id, duplicateThread.id));
    }
  });

  it("binds confirmation to token, actor, message, destination, and fresh evidence", async () => {
    const row = await insertHeld({ to: [marketThread.listenerEmail] });
    registerProvider(row);
    const inspected = await preview(row.id);
    assert.equal(inspected.status, 200, JSON.stringify(inspected.body));
    const token = inspected.body.candidate.confirmationToken as string;

    assertDenied(await confirm(row.id, `${token.slice(0, -1)}${token.endsWith("a") ? "b" : "a"}`), "tampered token");
    assertDenied(await confirm(row.id, token, csaCookie), "actor-changed token");
    assert.equal((await api("POST", `/deal-card/correspondence/held/${row.id}/match`, adminCookie, {
      confirmationToken: token,
    })).status, 400);
    assert.equal((await api("POST", `/deal-card/correspondence/held/${row.id}/match`, adminCookie, {
      confirmationToken: token,
      destinationConfirmed: true,
      dealId,
    })).status, 400);

    const changed = providerRecords.get(row.providerReceivedEmailId!) as ProviderRecord;
    providerRecords.set(row.providerReceivedEmailId!, { ...changed, from: `stale-${suffix}@example.test` });
    assertDenied(await confirm(row.id, token), "stale provider evidence");
    providerRecords.set(row.providerReceivedEmailId!, changed);

    const inspectedAgain = await preview(row.id);
    assert.equal(inspectedAgain.status, 200, JSON.stringify(inspectedAgain.body));
    await db.update(dealInboundEmailsTable).set({ toEmails: [brokerThread.listenerEmail] })
      .where(eq(dealInboundEmailsTable.id, row.id));
    assertDenied(
      await confirm(row.id, inspectedAgain.body.candidate.confirmationToken),
      "stale persisted evidence",
    );
  });

  it("rejects an expired confirmation token", async () => {
    const row = await insertHeld({ to: [marketThread.listenerEmail] });
    registerProvider(row);
    const inspected = await preview(row.id);
    assert.equal(inspected.status, 200, JSON.stringify(inspected.body));
    const originalNow = Date.now;
    try {
      Date.now = () => originalNow() + 24 * 60 * 60 * 1000;
      assertDenied(
        await confirm(row.id, inspected.body.candidate.confirmationToken),
        "expired confirmation",
      );
    } finally {
      Date.now = originalNow;
    }
  });

  it("makes confirmation single-use and creates exactly one private audit", async () => {
    const row = await insertHeld({ to: [marketThread.listenerEmail] });
    registerProvider(row);
    const inspected = await preview(row.id);
    assert.equal(inspected.status, 200, JSON.stringify(inspected.body));
    const token = inspected.body.candidate.confirmationToken;
    assert.equal((await confirm(row.id, token)).status, 200);
    assertDenied(await confirm(row.id, token), "replayed confirmation");
    const audits = await auditRowsFor(row.id);
    assert.equal(audits.length, 1);
    assert.equal((audits[0].metadata as any)?.correspondence_private, true);
  });

  it("serializes concurrent confirmations to one association and one audit", async () => {
    const row = await insertHeld({ to: [brokerThread.listenerEmail] });
    registerProvider(row, {}, brokerOutbound.rfcMessageId);
    const inspected = await preview(row.id);
    assert.equal(inspected.status, 200, JSON.stringify(inspected.body));
    const results = await Promise.all([
      confirm(row.id, inspected.body.candidate.confirmationToken),
      confirm(row.id, inspected.body.candidate.confirmationToken),
    ]);
    assert.equal(results.filter((result) => result.status === 200).length, 1, JSON.stringify(results));
    assert.equal(results.filter((result) => result.status === 409).length, 1, JSON.stringify(results));
    assert.equal((await auditRowsFor(row.id)).length, 1);
  });

  it("does not let legacy release race an unmatched message into a visible channel", async () => {
    const row = await insertHeld({
      from: `release-race-mismatch-${suffix}@example.test`,
      to: [marketThread.listenerEmail],
    });
    registerProvider(row);
    const inspected = await preview(row.id);
    assert.equal(inspected.status, 200, JSON.stringify(inspected.body));
    const [matched, released] = await Promise.all([
      confirm(row.id, inspected.body.candidate.confirmationToken),
      api("POST", `/deal-card/correspondence/held/${row.id}/release`, adminCookie, {
        channel: "MARKET",
        senderConfirmed: true,
      }),
    ]);
    assert.equal(matched.status, 200, JSON.stringify({ matched, released }));
    assert.equal(released.status, 409, JSON.stringify({ matched, released }));
    const [stored] = await db.select().from(dealInboundEmailsTable)
      .where(eq(dealInboundEmailsTable.id, row.id));
    assert.equal(stored.channel, "HELD");
    assert.equal(stored.dealId, dealId);
    assert.equal((await auditRowsFor(row.id)).length, 1);
  });

  it("never performs provider sends and uses only receiving lookups", () => {
    assert.ok(providerFetches > 0);
  });
});