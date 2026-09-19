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
import { ensureCorrespondenceThread, ensureDealMarketEmailAddress, sendDealEmail } from "../services/emailService.js";

const suffix = randomUUID().replaceAll("-", "").slice(0, 12);
let baseUrl = "";
let closeServer: (() => Promise<void>) | null = null;
let axelOrgId = "";
let externalOrgId = "";
let accountId = "";
let dealId = "";
let secondDealId = "";
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
    const [deal, secondDeal, foreignDeal] = await db.insert(dealsTable).values([
      {
        referenceCode: `T-CORR-${suffix}`, accountId, businessName: `Correspondence Fixture ${suffix}`,
        orgId: axelOrgId, producingAgentId: agentId, stage: "UW_REVIEW",
      },
      {
        referenceCode: `T-CORR-2-${suffix}`, accountId, businessName: `Second Correspondence Fixture ${suffix}`,
        orgId: axelOrgId, producingAgentId: agentId, stage: "UW_REVIEW",
      },
      {
        referenceCode: `T-CORR-X-${suffix}`, accountId, businessName: `Foreign Fixture ${suffix}`,
        orgId: externalOrgId, producingAgentId: agentId, stage: "UW_REVIEW",
      },
    ]).returning();
    dealId = deal.id;
    secondDealId = secondDeal.id;
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
    if (dealId || secondDealId || foreignDealId) {
      const ids = [dealId, secondDealId, foreignDealId].filter(Boolean);
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

  it("reports held-review capability without granting external role lookalikes", async () => {
    for (const cookie of [adminCookie, csaCookie]) {
      const result = await api("GET", "/deal-card/correspondence/capabilities", cookie);
      assert.equal(result.status, 200);
      assert.deepEqual(result.body, { canReviewHeld: true });
    }
    for (const cookie of [externalAdminCookie, externalCsaCookie, agentCookie, underwriterCookie]) {
      const result = await api("GET", "/deal-card/correspondence/capabilities", cookie);
      assert.equal(result.status, 200);
      assert.deepEqual(result.body, { canReviewHeld: false });
      assert.equal((await api("GET", "/deal-card/correspondence/held", cookie)).status, 403);
      assert.equal((await api("GET", `/deal-card/${dealId}/correspondence/held`, cookie)).status, 403);
    }
  });

  it("matches only a provider-proven unique controlled destination, stays held, and releases separately", async () => {
    const originalFetch = globalThis.fetch;
    const originalApiKey = process.env.RESEND_API_KEY;
    const ownAddress = await ensureDealMarketEmailAddress(dealMarketId, dealId, marketId);
    await ensureCorrespondenceThread({
      channel: "MARKET",
      dealId,
      dealMarketId,
      marketListener: ownAddress.emailAddress,
      marketSubjectToken: ownAddress.subjectToken,
    });
    const [foreignMarket] = await db.insert(dealMarketsTable).values({
      dealId: foreignDealId, marketId, marketType: "WC_CARRIER",
      isActive: true, marketStatus: "ACTIVE", engagementSource: "MANUAL_OVERFLOW",
      rank: 1, isPrimary: true, sendStatus: "PENDING", appetiteOutcome: "MATCHED", rankingState: "PROVISIONAL",
    }).returning();
    const foreignAddress = await ensureDealMarketEmailAddress(foreignMarket.id, foreignDealId, marketId);
    await ensureCorrespondenceThread({
      channel: "MARKET",
      dealId: foreignDealId,
      dealMarketId: foreignMarket.id,
      marketListener: foreignAddress.emailAddress,
      marketSubjectToken: foreignAddress.subjectToken,
    });
    const brokerThread = await ensureCorrespondenceThread({
      channel: "BROKER",
      dealId,
      participantUserId: agentId,
    });
    const providerIds = {
      success: `provider-success-${suffix}`,
      concurrent: `provider-concurrent-${suffix}`,
      ambiguous: `provider-ambiguous-${suffix}`,
      foreign: `provider-foreign-${suffix}`,
      mismatch: `provider-mismatch-${suffix}`,
      contradiction: `provider-contradiction-${suffix}`,
      broker: `provider-broker-${suffix}`,
    };
    const inserted = await db.insert(dealInboundEmailsTable).values([
      {
        messageId: providerIds.success, providerReceivedEmailId: providerIds.success,
        fromEmail: `market-${suffix}@example.test`, toEmails: [ownAddress.emailAddress], ccEmails: [],
        channel: "HELD", heldReason: "UNMATCHED_RECIPIENT_OR_HEADER",
        bodyEnrichmentStatus: "COMPLETE", receivedAt: new Date(),
      },
      {
        messageId: providerIds.concurrent, providerReceivedEmailId: providerIds.concurrent,
        fromEmail: `market-${suffix}@example.test`, toEmails: [ownAddress.emailAddress], ccEmails: [], channel: "HELD",
        heldReason: "UNMATCHED_RECIPIENT_OR_HEADER", bodyEnrichmentStatus: "COMPLETE", receivedAt: new Date(),
      },
      {
        messageId: providerIds.ambiguous, providerReceivedEmailId: providerIds.ambiguous,
        fromEmail: `market-${suffix}@example.test`, toEmails: [ownAddress.emailAddress], ccEmails: [], channel: "HELD",
        heldReason: "UNMATCHED_RECIPIENT_OR_HEADER", bodyEnrichmentStatus: "COMPLETE", receivedAt: new Date(),
      },
      {
        messageId: `match-no-evidence-${suffix}`, fromEmail: `market-${suffix}@example.test`,
        channel: "HELD", heldReason: "UNMATCHED_RECIPIENT_OR_HEADER",
        bodyEnrichmentStatus: "COMPLETE", receivedAt: new Date(),
      },
      {
        messageId: providerIds.foreign, providerReceivedEmailId: providerIds.foreign,
        fromEmail: `market-${suffix}@example.test`, toEmails: [foreignAddress.emailAddress], ccEmails: [], channel: "HELD",
        heldReason: "UNMATCHED_RECIPIENT_OR_HEADER", bodyEnrichmentStatus: "COMPLETE", receivedAt: new Date(),
      },
      {
        messageId: providerIds.mismatch, providerReceivedEmailId: providerIds.mismatch,
        fromEmail: `market-${suffix}@example.test`, toEmails: [ownAddress.emailAddress], ccEmails: [], channel: "HELD",
        heldReason: "UNMATCHED_RECIPIENT_OR_HEADER", bodyEnrichmentStatus: "COMPLETE", receivedAt: new Date(),
      },
      {
        messageId: providerIds.contradiction, providerReceivedEmailId: providerIds.contradiction,
        fromEmail: `market-${suffix}@example.test`, toEmails: ["contradictory-destination@example.test"], ccEmails: [], channel: "HELD",
        heldReason: "HEADER_IDENTITY_CONTRADICTION", bodyEnrichmentStatus: "COMPLETE", receivedAt: new Date(),
      },
      {
        messageId: providerIds.broker, providerReceivedEmailId: providerIds.broker,
        fromEmail: `broker-agent-${suffix}@example.test`, toEmails: [brokerThread.listenerEmail], ccEmails: [],
        channel: "HELD", heldReason: "UNMATCHED_RECIPIENT_OR_HEADER",
        bodyText: "Fictional broker reply for provider-evidence matching.",
        bodyEnrichmentStatus: "COMPLETE", receivedAt: new Date(),
      },
    ]).returning({ id: dealInboundEmailsTable.id, providerId: dealInboundEmailsTable.providerReceivedEmailId });
    const byProvider = new Map(inserted.map((row) => [row.providerId, row.id]));
    try {
      process.env.RESEND_API_KEY = "fictional-provider-key";
      globalThis.fetch = (async (url, init) => {
        const value = String(url);
        if (!value.startsWith("https://api.resend.com/emails/receiving/")) return originalFetch(url, init);
        const providerId = decodeURIComponent(value.split("/").pop()!);
        const to = providerId === providerIds.foreign
          ? [foreignAddress.emailAddress]
          : providerId === providerIds.broker
            ? [brokerThread.listenerEmail]
          : providerId === providerIds.ambiguous
            ? [ownAddress.emailAddress, "second@example.test"]
            : [ownAddress.emailAddress];
        const messageId = `<rfc-${providerId}@example.test>`;
        return new Response(JSON.stringify({
          data: {
            id: providerId === providerIds.mismatch ? "different-provider-record" : providerId,
            message_id: messageId,
            from: providerId === providerIds.broker
              ? `broker-agent-${suffix}@example.test`
              : `market-${suffix}@example.test`,
            to,
            cc: [],
            bcc: [],
            headers: [{ name: "Message-ID", value: messageId }],
          },
        }), {
          status: 200, headers: { "Content-Type": "application/json" },
        });
      }) as typeof fetch;

      const successId = byProvider.get(providerIds.success)!;
      assert.equal((await api("POST", `/deal-card/correspondence/held/${successId}/match-preview`, externalAdminCookie, {})).status, 403);
      const candidate = await api("POST", `/deal-card/correspondence/held/${successId}/match-preview`, adminCookie, {});
      assert.equal(candidate.status, 200);
      assert.equal((candidate.body as any).candidate.dealId, dealId);
      assert.equal((candidate.body as any).candidate.dealName, `Correspondence Fixture ${suffix}`);
      assert.equal((candidate.body as any).candidate.channel, "MARKET");
      assert.equal((candidate.body as any).candidate.dealMarketId, dealMarketId);
      assert.equal((candidate.body as any).candidate.listenerEmail, ownAddress.emailAddress);
      assert.equal(typeof (candidate.body as any).candidate.confirmationToken, "string");
      assert.ok((candidate.body as any).candidate.evidenceSummary.length >= 3);

      const confirmation = {
        confirmationToken: (candidate.body as any).candidate.confirmationToken,
        destinationConfirmed: true,
      };
      assert.equal((await api("POST", `/deal-card/correspondence/held/${successId}/match`, adminCookie, {
        ...confirmation, confirmationToken: `${confirmation.confirmationToken}invalid`,
      })).status, 409);
      assert.deepEqual((await api("POST", `/deal-card/correspondence/held/${successId}/match`, adminCookie, confirmation)), {
        status: 200, body: { associated: true, messageId: successId, dealId, channel: "HELD" },
      });
      const [matched] = await db.select().from(dealInboundEmailsTable).where(eq(dealInboundEmailsTable.id, successId));
      assert.equal(matched.channel, "HELD");
      assert.equal(matched.dealId, dealId);
      assert.equal((await api("POST", `/deal-card/correspondence/held/${successId}/match`, adminCookie, confirmation)).status, 409);
      assert.equal((await api("POST", `/deal-card/correspondence/held/${successId}/release`, adminCookie, {
        channel: "BROKER", senderConfirmed: true,
      })).status, 409);
      const [stillHeld] = await db.select().from(dealInboundEmailsTable).where(eq(dealInboundEmailsTable.id, successId));
      assert.equal(stillHeld.channel, "HELD");
      assert.equal(stillHeld.heldReason, "SENDER_NOT_APPROVED_FOR_THREAD");
      assert.equal((await api("POST", `/deal-card/correspondence/held/${successId}/release`, adminCookie, {
        channel: "MARKET", senderConfirmed: true,
      })).status, 200);

      const noEvidenceId = inserted.find((row) => row.providerId === null)!.id;
      const noEvidence = await api("POST", `/deal-card/correspondence/held/${noEvidenceId}/match-preview`, adminCookie, {});
      assert.equal(noEvidence.status, 503);
      assert.equal((noEvidence.body as any).code, "PROVIDER_UNAVAILABLE");
      assert.equal((await api("POST", `/deal-card/correspondence/held/${noEvidenceId}/match`, adminCookie, confirmation)).status, 409);
      const ambiguous = await api("POST", `/deal-card/correspondence/held/${byProvider.get(providerIds.ambiguous)}/match-preview`, adminCookie, {});
      assert.equal(ambiguous.status, 409);
      assert.equal((ambiguous.body as any).code, "EVIDENCE_MISMATCH");
      const mismatch = await api("POST", `/deal-card/correspondence/held/${byProvider.get(providerIds.mismatch)}/match-preview`, adminCookie, {});
      assert.equal(mismatch.status, 409);
      assert.equal((mismatch.body as any).code, "EVIDENCE_MISMATCH");
      const contradictionId = byProvider.get(providerIds.contradiction)!;
      assert.equal(
        (await api("POST", `/deal-card/correspondence/held/${contradictionId}/match-preview`, adminCookie, {})).status,
        409,
      );
      assert.equal((await api("POST", `/deal-card/correspondence/held/${contradictionId}/match`, adminCookie, confirmation)).status, 409);
      const [contradiction] = await db.select({ reason: dealInboundEmailsTable.heldReason })
        .from(dealInboundEmailsTable).where(eq(dealInboundEmailsTable.id, contradictionId));
      assert.equal(contradiction.reason, "HEADER_IDENTITY_CONTRADICTION");
      const foreignId = byProvider.get(providerIds.foreign)!;
      assert.equal((await api("POST", `/deal-card/correspondence/held/${foreignId}/match-preview`, adminCookie, {})).status, 403);

      const concurrentId = byProvider.get(providerIds.concurrent)!;
      const [adminPreview, csaPreview] = await Promise.all([
        api("POST", `/deal-card/correspondence/held/${concurrentId}/match-preview`, adminCookie, {}),
        api("POST", `/deal-card/correspondence/held/${concurrentId}/match-preview`, csaCookie, {}),
      ]);
      assert.equal(adminPreview.status, 200);
      assert.equal(csaPreview.status, 200);
      const results = await Promise.all([
        api("POST", `/deal-card/correspondence/held/${concurrentId}/match`, adminCookie, {
          confirmationToken: (adminPreview.body as any).candidate.confirmationToken,
          destinationConfirmed: true,
        }),
        api("POST", `/deal-card/correspondence/held/${concurrentId}/match`, csaCookie, {
          confirmationToken: (csaPreview.body as any).candidate.confirmationToken,
          destinationConfirmed: true,
        }),
      ]);
      assert.deepEqual(results.map((result) => result.status).sort(), [200, 409]);

      const brokerId = byProvider.get(providerIds.broker)!;
      const brokerCandidate = await api("POST", `/deal-card/correspondence/held/${brokerId}/match-preview`, csaCookie, {});
      assert.equal(brokerCandidate.status, 200);
      assert.equal((brokerCandidate.body as any).candidate.dealId, dealId);
      assert.equal((brokerCandidate.body as any).candidate.channel, "BROKER");
      assert.equal((brokerCandidate.body as any).candidate.dealMarketId, null);
      assert.equal((brokerCandidate.body as any).candidate.threadId, brokerThread.id);
      const brokerConfirmation = {
        confirmationToken: (brokerCandidate.body as any).candidate.confirmationToken,
        destinationConfirmed: true,
      };
      for (const cookie of [agentCookie, underwriterCookie, externalCsaCookie]) {
        assert.equal(
          (await api("POST", `/deal-card/correspondence/held/${brokerId}/match`, cookie, brokerConfirmation)).status,
          403,
        );
      }
      assert.deepEqual(
        await api("POST", `/deal-card/correspondence/held/${brokerId}/match`, csaCookie, brokerConfirmation),
        { status: 200, body: { associated: true, messageId: brokerId, dealId, channel: "HELD" } },
      );
      const [matchedBroker] = await db.select().from(dealInboundEmailsTable)
        .where(eq(dealInboundEmailsTable.id, brokerId));
      assert.equal(matchedBroker.channel, "HELD");
      assert.equal(matchedBroker.correspondenceThreadId, brokerThread.id);
      assert.equal(
        (await api("POST", `/deal-card/correspondence/held/${brokerId}/release`, csaCookie, {
          channel: "BROKER", senderConfirmed: true,
        })).status,
        200,
      );
      const brokerFeed = await api("GET", `/deal-card/${dealId}/correspondence/broker`, agentCookie);
      assert.equal(brokerFeed.status, 200);
      assert.equal((brokerFeed.body as any).messages.some((message: any) => message.id === brokerId), true);

      const matchingAudits = await db.select().from(activityLogTable).where(and(
        eq(activityLogTable.dealId, dealId),
        eq(activityLogTable.eventType, "inbound_email_matched"),
      ));
      const brokerAudit = matchingAudits.find((audit) =>
        (audit.metadata as any)?.inbound_email_id === brokerId
      );
      assert.ok(brokerAudit);
      assert.equal((brokerAudit.metadata as any).correspondence_private, true);
      const generalActivity = await api("GET", `/deal-card/${dealId}/activity`, agentCookie);
      assert.equal(generalActivity.status, 200);
      assert.equal((generalActivity.body as any).activity.some((event: any) =>
        (event.metadata as any)?.inbound_email_id === brokerId
      ), false);
    } finally {
      globalThis.fetch = originalFetch;
      if (originalApiKey === undefined) delete process.env.RESEND_API_KEY;
      else process.env.RESEND_API_KEY = originalApiKey;
      await db.delete(dealInboundEmailsTable).where(inArray(
        dealInboundEmailsTable.id,
        inserted.map((row) => row.id),
      ));
    }
  });

  it("scopes, filters, counts, enriches, and pages both held queue views", async () => {
    const baseline = await api("GET", "/deal-card/correspondence/held?filter=all&limit=1", adminCookie);
    assert.equal(baseline.status, 200);
    const baselineCounts = (baseline.body as any).counts;
    const inserted = await db.insert(dealInboundEmailsTable).values([
      {
        dealId,
        messageId: `held-own-a-${suffix}`,
        fromEmail: `own-a-${suffix}@example.test`,
        subject: "Own deal A",
        channel: "HELD",
        heldReason: "UNVERIFIED_SENDER",
        bodyEnrichmentStatus: "COMPLETE",
        receivedAt: new Date("2099-01-03T00:00:00.000Z"),
      },
      {
        dealId: secondDealId,
        messageId: `held-own-b-${suffix}`,
        fromEmail: `own-b-${suffix}@example.test`,
        subject: "Own deal B",
        channel: "HELD",
        heldReason: "UNVERIFIED_SENDER",
        bodyEnrichmentStatus: "COMPLETE",
        receivedAt: new Date("2099-01-02T00:00:00.000Z"),
      },
      {
        dealId: null,
        messageId: `held-unmatched-${suffix}`,
        fromEmail: `unmatched-${suffix}@example.test`,
        subject: "Unmatched",
        channel: "HELD",
        heldReason: "UNKNOWN_RECIPIENT",
        bodyEnrichmentStatus: "COMPLETE",
        receivedAt: new Date("2099-01-01T00:00:00.000Z"),
      },
      {
        dealId: foreignDealId,
        messageId: `held-foreign-${suffix}`,
        fromEmail: `foreign-${suffix}@example.test`,
        subject: "Other organization",
        channel: "HELD",
        heldReason: "UNVERIFIED_SENDER",
        bodyEnrichmentStatus: "COMPLETE",
        receivedAt: new Date("2099-01-04T00:00:00.000Z"),
      },
    ]).returning({ id: dealInboundEmailsTable.id });
    try {
      const all = await api("GET", "/deal-card/correspondence/held?filter=all&limit=2&offset=0", adminCookie);
      assert.equal(all.status, 200);
      const allBody = all.body as any;
      assert.equal(allBody.counts.all, baselineCounts.all + 3);
      assert.equal(allBody.counts.matched, baselineCounts.matched + 2);
      assert.equal(allBody.counts.unmatched, baselineCounts.unmatched + 1);
      assert.equal(allBody.total, allBody.counts.all);
      assert.equal(allBody.messages.length, 2);
      assert.equal(allBody.messages.some((message: any) => message.subject === "Other organization"), false);
      assert.equal(allBody.messages[0].dealName, `Correspondence Fixture ${suffix}`);
      assert.equal(allBody.messages[0].dealId, dealId);
      assert.equal(allBody.messages[0].marketName, null);
      assert.equal(allBody.messages[0].threadLabel, null);
      assert.equal(allBody.messages[0].isReleasable, false);

      const matchedPage = await api("GET", "/deal-card/correspondence/held?filter=matched&limit=1&offset=1", adminCookie);
      assert.equal(matchedPage.status, 200);
      assert.equal((matchedPage.body as any).total, baselineCounts.matched + 2);
      assert.equal((matchedPage.body as any).messages.length, 1);

      const unmatched = await api("GET", "/deal-card/correspondence/held?filter=unmatched&limit=100&offset=0", csaCookie);
      assert.equal(unmatched.status, 200);
      assert.equal((unmatched.body as any).total, baselineCounts.unmatched + 1);
      assert.equal((unmatched.body as any).messages.some((message: any) => message.subject === "Unmatched" && message.dealId === null), true);

      const scoped = await api("GET", `/deal-card/${secondDealId}/correspondence/held?filter=all&limit=50&offset=0`, adminCookie);
      assert.equal(scoped.status, 200);
      assert.equal((scoped.body as any).total, 1);
      assert.deepEqual((scoped.body as any).counts, { all: 1, matched: 1, unmatched: 0 });
      assert.equal((scoped.body as any).messages[0].dealId, secondDealId);

      for (const path of [
        "/deal-card/correspondence/held?filter=invalid",
        "/deal-card/correspondence/held?limit=101",
        "/deal-card/correspondence/held?limit=0",
        "/deal-card/correspondence/held?offset=-1",
      ]) {
        assert.equal((await api("GET", path, adminCookie)).status, 400);
      }
    } finally {
      await db.delete(dealInboundEmailsTable).where(inArray(dealInboundEmailsTable.id, inserted.map((row) => row.id)));
    }
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
       const held = await api("GET", "/deal-card/correspondence/held", adminCookie);
       assert.equal(held.status, 200);
       const heldBody = held.body as {
         messages: Array<{
           id: string;
           isReleasable: boolean;
           releasableTarget: {
             channel: string;
             threadId: string;
             listenerEmail: string;
             senderEmail: string;
           } | null;
         }>;
       };
       const heldMessage = heldBody.messages.find((message) => message.id === stored.id);
       assert.ok(heldMessage);
       assert.equal(heldMessage.isReleasable, true);
       assert.deepEqual(heldMessage.releasableTarget, {
         channel: "MARKET",
         threadId: thread.id,
         listenerEmail: thread.listenerEmail,
         senderEmail: `market-${suffix}@example.test`,
       });
       const scopedHeld = await api("GET", `/deal-card/${dealId}/correspondence/held`, csaCookie);
       assert.equal(scopedHeld.status, 200);
       const scopedMessage = (scopedHeld.body as any).messages.find((message: any) => message.id === stored.id);
       assert.ok(scopedMessage);
       assert.equal(scopedMessage.dealName, `Correspondence Fixture ${suffix}`);
       assert.equal(scopedMessage.marketName, `Fictional Market ${suffix}`);
       assert.equal(scopedMessage.threadLabel, `Fictional Market ${suffix}`);
       assert.equal(scopedMessage.isReleasable, true);
       assert.deepEqual(scopedMessage.releasableTarget, heldMessage.releasableTarget);
      const released = await api("POST", `/deal-card/correspondence/held/${stored.id}/release`, adminCookie, {
        channel: "MARKET", senderConfirmed: true,
      });
      assert.equal(released.status, 200);
      const [releasedRow] = await db.select().from(dealInboundEmailsTable).where(eq(dealInboundEmailsTable.id, stored.id));
      assert.equal(releasedRow.channel, "MARKET", JSON.stringify({ released: released.body, row: releasedRow }));
       assert.equal(releasedRow.dealMarketId, dealMarketId);
       assert.equal(releasedRow.correspondenceThreadId, thread.id);
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

  it("serializes fresh manual compose UUIDs while the first private-thread send is pending", async () => {
    const originalFetch = globalThis.fetch;
    const originalApiKey = process.env.RESEND_API_KEY;
    let releaseProvider!: () => void;
    const providerStarted = new Promise<void>((resolve) => {
      releaseProvider = resolve;
    });
    let providerCalls = 0;
    const baseInput = {
      channel: "MARKET" as const,
      dealId,
      dealMarketId,
      to: [`market-${suffix}@example.test`],
      subject: "Serialized manual compose fixture",
      text: "Only one provider call is permitted.",
    };
    try {
      process.env.RESEND_API_KEY = "fixture-key";
      globalThis.fetch = (async (url, init) => {
        if (!String(url).startsWith("https://api.resend.com/")) return originalFetch(url, init);
        providerCalls += 1;
        await providerStarted;
        return new Response(JSON.stringify({ id: `provider-${randomUUID()}` }), { status: 200 });
      }) as typeof fetch;

      const firstPromise = sendDealEmail({
        ...baseInput,
        idempotencyKey: `manual-${randomUUID()}`,
      });
      // fetch only starts after the first PENDING row commits.
      await new Promise<void>((resolve) => {
        const wait = () => providerCalls === 1 ? resolve() : setTimeout(wait, 1);
        wait();
      });
      const freshWhilePending = await sendDealEmail({
        ...baseInput,
        idempotencyKey: `manual-${randomUUID()}`,
      });
      assert.equal(freshWhilePending.ok, false);
      assert.equal(freshWhilePending.failureKind, "DELIVERY_UNKNOWN");
      assert.equal(freshWhilePending.deliveryState, "PENDING");
      assert.equal(providerCalls, 1);

      releaseProvider();
      assert.equal((await firstPromise).ok, true);
      assert.equal(providerCalls, 1);
    } finally {
      globalThis.fetch = originalFetch;
      if (originalApiKey === undefined) delete process.env.RESEND_API_KEY;
      else process.env.RESEND_API_KEY = originalApiKey;
    }
  });

  it("returns the durable pending row after terminal persistence fails and denies a fresh compose ID", async () => {
    const originalFetch = globalThis.fetch;
    const originalApiKey = process.env.RESEND_API_KEY;
    const originalTransaction = db.transaction.bind(db);
    const requestId = randomUUID();
    const input = {
      channel: "MARKET" as const,
      dealId,
      dealMarketId,
      to: [`market-${suffix}@example.test`],
      subject: "Post-provider persistence fixture",
      text: "This fixture must never send twice.",
      idempotencyKey: `manual-${requestId}`,
    };
    let providerCalls = 0;
    let transactionCalls = 0;
    try {
      process.env.RESEND_API_KEY = "fixture-key";
      globalThis.fetch = (async (url, init) => {
        if (!String(url).startsWith("https://api.resend.com/")) return originalFetch(url, init);
        providerCalls += 1;
        return new Response(JSON.stringify({ id: `provider-${requestId}` }), { status: 200 });
      }) as typeof fetch;
      (db as any).transaction = async (...args: any[]) => {
        transactionCalls += 1;
        // The first transaction persists PENDING. Fail only the terminal
        // update/audit transaction after mocked provider acceptance.
        if (transactionCalls === 2) throw new Error("injected terminal persistence failure");
        return (originalTransaction as any)(...args);
      };

      const first = await sendDealEmail(input);
      assert.equal(first.ok, false);
      assert.equal(first.failureKind, "DELIVERY_UNKNOWN");
      assert.equal(first.deliveryState, "PENDING");
      assert.ok(first.outboundId);
      assert.equal(providerCalls, 1);

      (db as any).transaction = originalTransaction;
      const sameRequest = await sendDealEmail(input);
      assert.equal(sameRequest.outboundId, first.outboundId);
      assert.equal(sameRequest.failureKind, "DELIVERY_UNKNOWN");
      assert.equal(sameRequest.deliveryState, "PENDING");
      assert.equal(providerCalls, 1);

      const freshRequest = await sendDealEmail({
        ...input,
        idempotencyKey: `manual-${randomUUID()}`,
      });
      assert.equal(freshRequest.ok, false);
      assert.equal(freshRequest.failureKind, "DELIVERY_UNKNOWN");
      assert.equal(freshRequest.outboundId, first.outboundId);
      assert.equal(providerCalls, 1);
    } finally {
      (db as any).transaction = originalTransaction;
      globalThis.fetch = originalFetch;
      if (originalApiKey === undefined) delete process.env.RESEND_API_KEY;
      else process.env.RESEND_API_KEY = originalApiKey;
    }
  });
});
