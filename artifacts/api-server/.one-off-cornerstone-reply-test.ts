import assert from "node:assert/strict";
import { and, eq, inArray, sql } from "drizzle-orm";
import {
  correspondenceThreadsTable,
  db,
  dealMarketEmailAddressesTable,
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
import {
  ensureDealMarketEmailAddress,
  manualComposeIdempotencyKey,
  sendDealEmail,
} from "./src/services/emailService.js";

const dealId = process.env.TEST_DEAL_ID;
const recipient = process.env.TEST_RECIPIENT?.trim().toLowerCase();
const requestId = process.env.TEST_REQUEST_ID;
const expectedMarketName = "Cornerstone (Demo)";
const expectedDealName = "Fictional Market Tab Isolation Demo";
const expectedOrgId = "00000000-0000-0000-0000-000000000001";
const baseSubject = "[DEVELOPMENT FICTIONAL TEST] Cornerstone reply-routing test";
const marker = "CORNERSTONE-REPLY-TEST-8EAA36C3-B973";

assert.equal(process.env.NODE_ENV, "development", "This one-off send requires NODE_ENV=development");
assert.ok(dealId && /^[0-9a-f-]{36}$/i.test(dealId), "Valid TEST_DEAL_ID required");
assert.ok(recipient && /^[^@\s,]+@[^@\s,]+\.[^@\s,]+$/.test(recipient), "Exactly one valid TEST_RECIPIENT required");
assert.ok(requestId, "TEST_REQUEST_ID required");
const idempotencyKey = manualComposeIdempotencyKey(requestId);
assert.ok(process.env.RESEND_API_KEY, "RESEND_API_KEY missing");
assert.ok(process.env.RESEND_DEV_WEBHOOK_SECRET, "RESEND_DEV_WEBHOOK_SECRET missing");
assert.ok(process.env.REPLIT_DEV_DOMAIN, "REPLIT_DEV_DOMAIN missing");
assert.ok(process.env.LISTENER_EMAIL_DOMAIN, "LISTENER_EMAIL_DOMAIN missing");
assert.ok(process.env.OUTBOUND_EMAIL_FROM, "OUTBOUND_EMAIL_FROM missing");

// GET-only provider preflight: exact receiving domain and exact Development webhook + signing secret.
const providerHeaders = { Authorization: `Bearer ${process.env.RESEND_API_KEY}` };
const domainsResponse = await fetch("https://api.resend.com/domains", { method: "GET", headers: providerHeaders });
assert.equal(domainsResponse.ok, true, `Resend domains GET failed (${domainsResponse.status})`);
const domainsBody = await domainsResponse.json() as { data?: Array<{ id: string; name: string }> };
const domain = domainsBody.data?.find((row) => row.name === process.env.LISTENER_EMAIL_DOMAIN);
assert.ok(domain, "Configured listener domain is absent from Resend");
const domainResponse = await fetch(`https://api.resend.com/domains/${domain.id}`, { method: "GET", headers: providerHeaders });
assert.equal(domainResponse.ok, true, `Resend domain detail GET failed (${domainResponse.status})`);
const domainBody = await domainResponse.json() as { status?: string; records?: Array<{ record?: string; status?: string }> };
assert.equal(domainBody.status, "verified", "Resend listener domain is not verified");
assert.ok(domainBody.records?.some((record) => record.record === "Receiving" && record.status === "verified"), "Resend receiving MX is not verified");

const expectedWebhook = `https://${process.env.REPLIT_DEV_DOMAIN}/api/webhooks/resend-inbound`;
const webhooksResponse = await fetch("https://api.resend.com/webhooks", { method: "GET", headers: providerHeaders });
assert.equal(webhooksResponse.ok, true, `Resend webhooks GET failed (${webhooksResponse.status})`);
const webhooksBody = await webhooksResponse.json() as { data?: Array<{ id: string; endpoint: string; status: string; events: string[] }> };
const webhook = webhooksBody.data?.find((row) => row.endpoint === expectedWebhook);
assert.ok(webhook, "Exact Development Resend webhook destination is absent");
assert.equal(webhook.status, "enabled", "Development Resend webhook is not enabled");
assert.ok(webhook.events.includes("email.received"), "Development webhook does not subscribe to email.received");
const webhookResponse = await fetch(`https://api.resend.com/webhooks/${webhook.id}`, { method: "GET", headers: providerHeaders });
assert.equal(webhookResponse.ok, true, `Resend webhook detail GET failed (${webhookResponse.status})`);
const webhookBody = await webhookResponse.json() as { signing_secret?: string };
assert.ok(webhookBody.signing_secret, "Resend webhook detail did not return a signing secret");
assert.equal(webhookBody.signing_secret, process.env.RESEND_DEV_WEBHOOK_SECRET, "Development webhook signing secret does not match app runtime");

const [target] = await db.select({
  dealId: dealsTable.id,
  dealName: dealsTable.businessName,
  orgId: dealsTable.orgId,
  dealMarketId: dealMarketsTable.id,
  marketId: marketsTable.id,
  marketName: marketsTable.name,
  dealMarketActive: dealMarketsTable.isActive,
  marketStatus: dealMarketsTable.marketStatus,
  underwriterId: marketUnderwritersTable.id,
  underwriterActive: marketUnderwritersTable.isActive,
  threadId: correspondenceThreadsTable.id,
  threadChannel: correspondenceThreadsTable.channel,
}).from(dealsTable)
  .innerJoin(dealMarketsTable, eq(dealMarketsTable.dealId, dealsTable.id))
  .innerJoin(marketsTable, eq(marketsTable.id, dealMarketsTable.marketId))
  .innerJoin(marketUnderwritersTable, eq(marketUnderwritersTable.id, dealMarketsTable.assignedUnderwriterId))
  .innerJoin(correspondenceThreadsTable, and(
    eq(correspondenceThreadsTable.dealMarketId, dealMarketsTable.id),
    eq(correspondenceThreadsTable.channel, "MARKET"),
  ))
  .where(and(eq(dealsTable.id, dealId), eq(marketsTable.name, expectedMarketName)))
  .limit(1);
assert.ok(target, "Exact Cornerstone demo target/thread not found");
assert.equal(target.dealName, expectedDealName);
assert.equal(target.orgId, expectedOrgId);
assert.equal(target.dealMarketActive, true);
assert.equal(target.marketStatus, "ACTIVE");
assert.equal(target.underwriterActive, true);
assert.equal(target.threadChannel, "MARKET");

const [admin] = await db.select({
  id: usersTable.id,
  firstName: usersTable.firstName,
  lastName: usersTable.lastName,
  role: orgMembersTable.role,
  orgId: orgMembersTable.orgId,
}).from(orgMembersTable)
  .innerJoin(usersTable, eq(usersTable.id, orgMembersTable.userId))
  .innerJoin(organizationsTable, eq(organizationsTable.id, orgMembersTable.orgId))
  .innerJoin(trustedAxelOrganizationsTable, eq(trustedAxelOrganizationsTable.orgId, orgMembersTable.orgId))
  .where(and(
    eq(orgMembersTable.orgId, expectedOrgId),
    eq(orgMembersTable.role, "ADMIN"),
    eq(orgMembersTable.isPrimaryOrg, true),
    eq(usersTable.status, "active"),
    eq(organizationsTable.status, "ACTIVE"),
  )).limit(1);
assert.ok(admin, "No trusted active primary Axel ADMIN actor");
assert.equal(admin.orgId, target.orgId, "Trusted actor membership does not match deal org");

const allDemoMarketsBefore = await db.select({
  id: dealMarketsTable.id,
  marketName: marketsTable.name,
  snapshot: dealMarketsTable.submissionEmailSnapshot,
  underwriterId: marketUnderwritersTable.id,
  underwriterEmail: marketUnderwritersTable.email,
  threadId: correspondenceThreadsTable.id,
  listenerEmail: correspondenceThreadsTable.listenerEmail,
  subjectToken: correspondenceThreadsTable.subjectToken,
}).from(dealMarketsTable)
  .innerJoin(marketsTable, eq(marketsTable.id, dealMarketsTable.marketId))
  .leftJoin(marketUnderwritersTable, eq(marketUnderwritersTable.id, dealMarketsTable.assignedUnderwriterId))
  .leftJoin(correspondenceThreadsTable, eq(correspondenceThreadsTable.dealMarketId, dealMarketsTable.id))
  .where(eq(dealMarketsTable.dealId, dealId));
const untouchedBefore = allDemoMarketsBefore.filter((row) => row.id !== target.dealMarketId);

const existingUncertain = await db.execute(sql`
  SELECT id FROM deal_outbound_emails
  WHERE correspondence_thread_id = ${target.threadId}
    AND status IN ('PENDING', 'DELIVERY_UNKNOWN')
  LIMIT 1
`);
assert.equal((existingUncertain as unknown as { rows: unknown[] }).rows.length, 0, "Target thread has unresolved outbound state; stop before send");
const existingKey = await db.execute(sql`SELECT id FROM deal_outbound_emails WHERE idempotency_key = ${idempotencyKey} LIMIT 1`);
assert.equal((existingKey as unknown as { rows: unknown[] }).rows.length, 0, "Stable one-off idempotency key already exists; stop before send");

// Existing helper creates/reuses the valid opaque per-market listener identity.
const marketAddress = await ensureDealMarketEmailAddress(target.dealMarketId, dealId, target.marketId);
const listenerPattern = new RegExp(`^mkt-[a-f0-9]{24}@${process.env.LISTENER_EMAIL_DOMAIN!.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`);
assert.ok(listenerPattern.test(marketAddress.emailAddress), "Opaque market listener is invalid or on the wrong domain");

await db.transaction(async (tx) => {
  await tx.update(marketUnderwritersTable)
    .set({ email: recipient, updatedAt: new Date() })
    .where(and(eq(marketUnderwritersTable.id, target.underwriterId), eq(marketUnderwritersTable.marketId, target.marketId)));
  await tx.update(dealMarketsTable)
    .set({ submissionEmailSnapshot: recipient })
    .where(and(eq(dealMarketsTable.id, target.dealMarketId), eq(dealMarketsTable.dealId, dealId)));
  await tx.update(correspondenceThreadsTable)
    .set({ listenerEmail: marketAddress.emailAddress, subjectToken: marketAddress.subjectToken })
    .where(and(eq(correspondenceThreadsTable.id, target.threadId), eq(correspondenceThreadsTable.dealMarketId, target.dealMarketId), eq(correspondenceThreadsTable.channel, "MARKET")));
});

const [updatedTarget] = await db.select({
  snapshot: dealMarketsTable.submissionEmailSnapshot,
  contactEmail: marketUnderwritersTable.email,
  threadId: correspondenceThreadsTable.id,
  listenerEmail: correspondenceThreadsTable.listenerEmail,
  threadToken: correspondenceThreadsTable.subjectToken,
}).from(dealMarketsTable)
  .innerJoin(marketUnderwritersTable, eq(marketUnderwritersTable.id, dealMarketsTable.assignedUnderwriterId))
  .innerJoin(correspondenceThreadsTable, eq(correspondenceThreadsTable.dealMarketId, dealMarketsTable.id))
  .where(eq(dealMarketsTable.id, target.dealMarketId)).limit(1);
assert.ok(updatedTarget);
assert.equal(updatedTarget.snapshot, recipient);
assert.equal(updatedTarget.contactEmail, recipient);
assert.equal(updatedTarget.listenerEmail, marketAddress.emailAddress);
assert.equal(updatedTarget.threadToken, marketAddress.subjectToken);

const untouchedAfter = await db.select({
  id: dealMarketsTable.id,
  marketName: marketsTable.name,
  snapshot: dealMarketsTable.submissionEmailSnapshot,
  underwriterId: marketUnderwritersTable.id,
  underwriterEmail: marketUnderwritersTable.email,
  threadId: correspondenceThreadsTable.id,
  listenerEmail: correspondenceThreadsTable.listenerEmail,
  subjectToken: correspondenceThreadsTable.subjectToken,
}).from(dealMarketsTable)
  .innerJoin(marketsTable, eq(marketsTable.id, dealMarketsTable.marketId))
  .leftJoin(marketUnderwritersTable, eq(marketUnderwritersTable.id, dealMarketsTable.assignedUnderwriterId))
  .leftJoin(correspondenceThreadsTable, eq(correspondenceThreadsTable.dealMarketId, dealMarketsTable.id))
  .where(and(eq(dealMarketsTable.dealId, dealId), inArray(dealMarketsTable.id, untouchedBefore.map((row) => row.id))));
assert.deepEqual(untouchedAfter.sort((a,b) => a.id.localeCompare(b.id)), untouchedBefore.sort((a,b) => a.id.localeCompare(b.id)), "A non-Cornerstone demo tab changed");

const text = [
  "Development fictional test — no production business.",
  "",
  "This is the single authorized Cornerstone (Demo) reply-routing test for the Fictional Market Tab Isolation Demo.",
  "Please reply to this email and include this distinct marker in your reply:",
  marker,
  "",
  "No attachment is expected. The reply will be held for trusted staff confirmation in Development.",
].join("\n");

// Exactly one provider-send call. Never retry automatically on any result.
const result = await sendDealEmail({
  dealId,
  dealMarketId: target.dealMarketId,
  channel: "MARKET",
  to: [recipient],
  cc: [],
  subject: baseSubject,
  text,
  sentBy: `${admin.firstName ?? ""} ${admin.lastName ?? ""}`.trim() || "Trusted Axel Development ADMIN",
  idempotencyKey,
});

const [stored] = await db.select({
  id: dealOutboundEmailsTable.id,
  providerMessageId: dealOutboundEmailsTable.providerMessageId,
  status: dealOutboundEmailsTable.status,
  subject: dealOutboundEmailsTable.subject,
  replyTo: dealOutboundEmailsTable.replyTo,
  dealId: dealOutboundEmailsTable.dealId,
  dealMarketId: dealOutboundEmailsTable.dealMarketId,
  channel: dealOutboundEmailsTable.channel,
  correspondenceThreadId: dealOutboundEmailsTable.correspondenceThreadId,
  toEmails: dealOutboundEmailsTable.toEmails,
  ccEmails: dealOutboundEmailsTable.ccEmails,
}).from(dealOutboundEmailsTable).where(eq(dealOutboundEmailsTable.id, result.outboundId)).limit(1);
assert.ok(stored, "Outbound row missing after send call");
assert.equal(stored.dealId, dealId);
assert.equal(stored.dealMarketId, target.dealMarketId);
assert.equal(stored.channel, "MARKET");
assert.equal(stored.correspondenceThreadId, target.threadId);
assert.deepEqual(stored.toEmails, [recipient]);
assert.deepEqual(stored.ccEmails, []);
assert.equal(stored.replyTo, marketAddress.emailAddress);

console.log(JSON.stringify({
  preflight: {
    listenerDomain: process.env.LISTENER_EMAIL_DOMAIN,
    receivingVerified: true,
    developmentWebhook: expectedWebhook,
    webhookEnabled: true,
    webhookSecretMatched: true,
    trustedActorId: admin.id,
    trustedActorRole: admin.role,
    trustedActorOrgMatchesDeal: admin.orgId === target.orgId,
  },
  send: {
    ok: result.ok,
    deliveryState: result.deliveryState,
    providerAccepted: result.status === "sent" && Boolean(result.providerMessageId),
    providerMessageId: result.providerMessageId ?? null,
    outboundId: result.outboundId,
    subject: stored.subject,
    replyTo: stored.replyTo,
    dealId: stored.dealId,
    dealMarketId: stored.dealMarketId,
    correspondenceThreadId: stored.correspondenceThreadId,
    channel: stored.channel,
    ccCount: (stored.ccEmails as unknown[]).length,
    marker,
  },
}, null, 2));
