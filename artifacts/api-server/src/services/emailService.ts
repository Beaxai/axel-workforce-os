import {
  db,
  dealEmailAddressesTable,
  dealOutboundEmailsTable,
  activityLogTable,
  dealsTable,
  accountsTable,
  dealMarketEmailAddressesTable,
  dealMarketsTable,
  marketUnderwritersTable,
  usersTable,
  orgMembersTable,
  correspondenceThreadsTable,
} from "@workspace/db";
import { and, eq, sql } from "drizzle-orm";
import crypto from "crypto";
import { logger } from "../lib/logger";
import { hasControlledEnvelopeShape } from "../lib/correspondence-envelope";

// ---------------------------------------------------------------------------
// Outbound email service (Resend) with per-deal and per-deal-market reply routing.
//
// Every outbound email tied to a deal:
//   1. Sets Reply-To to the deal's unique listener address
//      (`{company-slug}-{fileId}@LISTENER_EMAIL_DOMAIN`) — routing layer 1.
//   2. Appends an `[AXL-{fileId}]` token to the subject — routing layer 2.
//   3. Records the RFC Message-ID so replies can be matched via
//      In-Reply-To / References headers — routing layer 3.
//
// When dealMarketId is provided (market-scoped outbound):
//   1. Reply-To is the market-specific listener address under LISTENER_EMAIL_DOMAIN.
//   2. Subject token is the opaque market subject token (not the deal fileId token).
//   3. dealMarketId is persisted on outbound + activity rows.
//
// If RESEND_API_KEY is not set, sends are recorded with status "dev_logged"
// instead of hitting the provider, so the full pipeline is testable before
// keys/domain exist. When the key lands, no code changes are needed.
// ---------------------------------------------------------------------------

export const LISTENER_EMAIL_DOMAIN =
  process.env.LISTENER_EMAIL_DOMAIN || "submissions.axelins.com";

const DEFAULT_FROM =
  process.env.OUTBOUND_EMAIL_FROM || "submissions@axelins.com";

export function subjectToken(fileId: string): string {
  return `[AXL-${fileId}]`;
}

export function marketSubjectToken(opaqueToken: string): string {
  return `[AXM-${opaqueToken}]`;
}

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "deal"
  );
}

/** Get or lazily create the deal's unique listener address. */
export async function ensureDealEmailAddress(dealId: string) {
  const [existing] = await db
    .select()
    .from(dealEmailAddressesTable)
    .where(eq(dealEmailAddressesTable.dealId, dealId));
  if (existing) return existing;

  const [deal] = await db
    .select({ id: dealsTable.id, accountId: dealsTable.accountId, businessName: dealsTable.businessName })
    .from(dealsTable)
    .where(eq(dealsTable.id, dealId));
  if (!deal) throw new Error(`Deal ${dealId} not found`);

  let name = deal.businessName as string | null;
  if (!name && deal.accountId) {
    const [account] = await db
      .select({ businessName: accountsTable.businessName })
      .from(accountsTable)
      .where(eq(accountsTable.id, deal.accountId));
    name = account?.businessName ?? null;
  }

  const companySlug = slugify(name || "deal");
  const fileId = dealId.slice(0, 8);
  const emailAddress = `${companySlug}-${fileId}@${LISTENER_EMAIL_DOMAIN}`;

  const [row] = await db
    .insert(dealEmailAddressesTable)
    .values({ dealId, emailAddress, companySlug, fileId })
    .onConflictDoNothing()
    .returning();
  if (row) return row;
  // Lost a race — fetch the winner.
  const [winner] = await db
    .select()
    .from(dealEmailAddressesTable)
    .where(eq(dealEmailAddressesTable.dealId, dealId));
  return winner!;
}

/**
 * Get or lazily create the per-deal-market listener address and opaque subject token.
 * The address and token are opaque — they do NOT expose rank or competitor information.
 */
export async function ensureDealMarketEmailAddress(
  dealMarketId: string,
  dealId: string,
  marketId: string,
) {
  const [existing] = await db
    .select()
    .from(dealMarketEmailAddressesTable)
    .where(eq(dealMarketEmailAddressesTable.dealMarketId, dealMarketId));
  if (existing) return existing;

  // Generate opaque tokens — no rank or market name embedded.
  const opaqueListenerToken = crypto.randomBytes(12).toString("hex");
  const opaqueSubjectToken = crypto.randomBytes(8).toString("hex");

  const emailAddress = `mkt-${opaqueListenerToken}@${LISTENER_EMAIL_DOMAIN}`;
  const subjectToken = opaqueSubjectToken;

  const [row] = await db
    .insert(dealMarketEmailAddressesTable)
    .values({
      dealMarketId,
      dealId,
      marketId,
      emailAddress,
      subjectToken,
    })
    .onConflictDoNothing()
    .returning();

  if (row) return row;

  // Lost a race — fetch the winner.
  const [winner] = await db
    .select()
    .from(dealMarketEmailAddressesTable)
    .where(eq(dealMarketEmailAddressesTable.dealMarketId, dealMarketId));
  return winner!;
}

export interface SendDealEmailInput {
  dealId: string;
  /** When provided, routes this email through the market-specific listener/token. */
  dealMarketId?: string | null;
  to: string[];
  cc?: string[];
  bcc?: string[];
  /** Explicit channel for controlled correspondence. A dealMarketId is always
   * MARKET, even when a legacy caller omits this field. */
  channel?: "MARKET" | "BROKER";
  /** Required for BROKER channel; recipient is resolved from this user record. */
  recipientUserId?: string | null;
  /**
   * Narrow escape hatch for audited, non-correspondence system notices. This
   * is deliberately not an arbitrary "legacy" opt-in.
   */
  systemNotice?: "BROKER_FEE_DUNNING";
  subject: string;
  html?: string;
  text?: string;
  /** Actor name for the activity log entry. */
  sentBy?: string | null;
  /**
   * Stable idempotency key for the provider (e.g. Resend).
   * Included as an Idempotency-Key HTTP header on the Resend request.
   */
  idempotencyKey?: string | null;
  attachments?: Array<{
    filename: string;
    content: string;
  }>;
}

function normalizeEmail(value: string): string {
  const bracket = value.match(/<([^>]+)>/);
  return (bracket?.[1] ?? value).trim().toLowerCase();
}

export type OutboundChannel = "MARKET" | "BROKER" | "SYSTEM_NOTICE";

const MARKET_ROUTING_MATERIAL =
  /\[AX[MLB]-[^\]]+\]|(?:mkt|brk)-[a-z0-9]+@|<axl-[^>]+@|(?:in-reply-to|references|reply-to|message-id)\s*:|---+\s*forwarded message|(?:^|\n)\s*>?\s*(?:from|to|cc|bcc|subject|date)\s*:/i;

function hasCallerSuppliedRoutingField(input: SendDealEmailInput): boolean {
  const untypedInput = input as SendDealEmailInput & Record<string, unknown>;
  // These fields are never part of the public service contract. Checking the
  // actual runtime object closes the JavaScript/direct-service path too, not
  // only TypeScript callers or strict HTTP schemas.
  return [
    "from",
    "fromEmail",
    "replyTo",
    "reply_to",
    "headers",
    "threadId",
    "correspondenceThreadId",
    "inReplyTo",
    "references",
    "messageId",
    "subjectToken",
  ].some((field) => Object.hasOwn(untypedInput, field));
}

function systemNoticeScope(input: SendDealEmailInput): SendDealEmailInput["systemNotice"] | null {
  if (input.systemNotice === "BROKER_FEE_DUNNING") return input.systemNotice;
  // Preserve the existing system-only dunning caller while it is migrated to
  // the typed field above. This exact audited sender is not a general legacy
  // escape hatch and no request route can supply it.
  return input.sentBy === "System (broker-fee dunning)" ? "BROKER_FEE_DUNNING" : null;
}

/**
 * This is intentionally a final-send-boundary classification, rather than an
 * optional caller convention. It has no database access so its invariants can
 * be tested without constructing a provider client.
 */
export function classifyOutboundEmail(input: SendDealEmailInput): OutboundChannel {
  // A market identity is authoritative; a caller cannot downgrade it into a
  // channel-less or BROKER send.
  if (input.dealMarketId) {
    if (input.channel && input.channel !== "MARKET") {
      throw new Error("MARKET_CHANNEL_REQUIRED");
    }
    return "MARKET";
  }
  if (input.channel === "MARKET") throw new Error("MARKET_DEAL_MARKET_REQUIRED");
  if (input.channel === "BROKER") return "BROKER";
  if (systemNoticeScope(input)) return "SYSTEM_NOTICE";
  throw new Error("CORRESPONDENCE_CHANNEL_REQUIRED");
}

function hasBrokerMarketRoutingMaterial(input: SendDealEmailInput): boolean {
  return [
    input.subject,
    input.text,
    input.html,
    ...((input.attachments ?? []).flatMap((attachment) => [attachment.filename, attachment.content])),
  ].some((value) => typeof value === "string" && MARKET_ROUTING_MATERIAL.test(value));
}

const UUID_V4_OR_V5 = /^[0-9a-f]{8}-[0-9a-f]{4}-[45][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * A compose request ID identifies one click/retry cycle, not its content.
 * Reusing it makes a network retry safe; omitting it deliberately creates a
 * fresh compose operation so users may send the same wording again later.
 */
export function manualComposeIdempotencyKey(requestId?: string | null): string {
  if (requestId != null && !UUID_V4_OR_V5.test(requestId)) {
    throw new Error("INVALID_COMPOSE_REQUEST_ID");
  }
  return `manual-${requestId ?? crypto.randomUUID()}`;
}

function assertValidManualIdempotencyKey(idempotencyKey: string): void {
  if (!idempotencyKey.startsWith("manual-")) return;
  if (!UUID_V4_OR_V5.test(idempotencyKey.slice("manual-".length))) {
    throw new Error("INVALID_COMPOSE_REQUEST_ID");
  }
}

/** Reject structurally unsafe envelopes before any database or provider I/O. */
export function validateOutboundEnvelope(input: SendDealEmailInput): OutboundChannel {
  const channel = classifyOutboundEmail(input);
  if (input.idempotencyKey) assertValidManualIdempotencyKey(input.idempotencyKey);
  if (channel === "MARKET" && !hasControlledEnvelopeShape({ ...input, channel: "MARKET" })) {
    throw new Error("MARKET_RECIPIENT_POLICY_REJECTED");
  }
  if (channel === "BROKER") {
    if (!hasControlledEnvelopeShape({ ...input, channel: "BROKER" })) {
      throw new Error("BROKER_RECIPIENT_POLICY_REJECTED");
    }
    if (
      (input.attachments?.length ?? 0) > 0 ||
      hasCallerSuppliedRoutingField(input) ||
      hasBrokerMarketRoutingMaterial(input)
    ) {
      throw new Error("BROKER_ROUTING_POLICY_REJECTED");
    }
  }
  if (
    channel === "SYSTEM_NOTICE" &&
    (!input.to.length || input.cc?.length || input.bcc?.length || input.dealMarketId || input.recipientUserId)
  ) {
    throw new Error("SYSTEM_NOTICE_RECIPIENT_POLICY_REJECTED");
  }
  return channel;
}

function resultForExistingOutbound(row: {
  id: string;
  providerMessageId: string | null;
  status: string;
  error: string | null;
}): SendDealEmailResult {
  if (row.status === "sent" || row.status === "dev_logged") {
    return {
      ok: true,
      status: row.status,
      deliveryState: row.status,
      outboundId: row.id,
      providerMessageId: row.providerMessageId,
    };
  }
  // A stale pending write may have died immediately before or after provider
  // I/O. It is therefore just as unsafe to automatically resend as an
  // explicit network exception.
  const deliveryUnknown = row.status === "PENDING" || row.status === "DELIVERY_UNKNOWN";
  return {
    ok: false,
    status: "failed",
    deliveryState: deliveryUnknown
      ? row.status as "PENDING" | "DELIVERY_UNKNOWN"
      : "failed",
    outboundId: row.id,
    providerMessageId: row.providerMessageId,
    error: deliveryUnknown
      ? row.error ?? "Existing outbound delivery state is unknown; manual review is required."
      : `${row.error ?? "Existing provider failure."} Submit a new compose request ID to create an explicit retry attempt.`,
    failureKind: deliveryUnknown ? "DELIVERY_UNKNOWN" : "PERMANENT",
  };
}

async function approvedMarketRecipient(dealId: string, dealMarketId: string): Promise<string> {
  const [row] = await db
    .select({
      submissionEmailSnapshot: dealMarketsTable.submissionEmailSnapshot,
      underwriterEmail: marketUnderwritersTable.email,
    })
    .from(dealMarketsTable)
    .leftJoin(marketUnderwritersTable, eq(dealMarketsTable.assignedUnderwriterId, marketUnderwritersTable.id))
    .where(and(eq(dealMarketsTable.id, dealMarketId), eq(dealMarketsTable.dealId, dealId)))
    .limit(1);
  const email = row?.submissionEmailSnapshot ?? row?.underwriterEmail;
  if (!email) throw new Error("MARKET_RECIPIENT_UNAVAILABLE");
  return normalizeEmail(email);
}

async function approvedBrokerRecipient(dealId: string, userId: string): Promise<string> {
  // Do not infer a broker from an address: only a deal participant with an
  // AGENT membership may receive broker-channel correspondence.
  const [actualDeal] = await db
    .select({
      ownerId: dealsTable.ownerId,
      producingAgentId: dealsTable.producingAgentId,
      referralPartnerId: dealsTable.referralPartnerId,
    })
    .from(dealsTable)
    .where(eq(dealsTable.id, dealId))
    .limit(1);
  if (
    !actualDeal ||
    ![
      actualDeal.ownerId,
      actualDeal.producingAgentId,
      actualDeal.referralPartnerId,
    ].includes(userId)
  ) {
    throw new Error("BROKER_RECIPIENT_NOT_AUTHORIZED");
  }
  const [user] = await db
    .select({ email: usersTable.email, role: orgMembersTable.role })
    .from(usersTable)
    .innerJoin(orgMembersTable, eq(orgMembersTable.userId, usersTable.id))
    .where(and(eq(usersTable.id, userId), eq(orgMembersTable.isPrimaryOrg, true)))
    .limit(1);
  if (user?.role.toUpperCase() !== "AGENT") throw new Error("BROKER_RECIPIENT_NOT_AUTHORIZED");
  if (!user?.email) throw new Error("BROKER_RECIPIENT_UNAVAILABLE");
  return normalizeEmail(user.email);
}

export async function ensureCorrespondenceThread(input: {
  channel: "MARKET" | "BROKER";
  dealId: string;
  dealMarketId?: string | null;
  participantUserId?: string | null;
  marketListener?: string | null;
  marketSubjectToken?: string | null;
}) {
  const existingRows = await db
    .select()
    .from(correspondenceThreadsTable)
    .where(
      input.channel === "MARKET"
        ? and(
            eq(correspondenceThreadsTable.channel, "MARKET"),
            eq(correspondenceThreadsTable.dealMarketId, input.dealMarketId!),
          )
        : and(
            eq(correspondenceThreadsTable.channel, "BROKER"),
            eq(correspondenceThreadsTable.dealId, input.dealId),
            eq(correspondenceThreadsTable.participantUserId, input.participantUserId!),
          ),
    )
    .limit(1);
  if (existingRows[0]) return existingRows[0];

  const opaque = crypto.randomBytes(16).toString("hex");
  const listenerEmail =
    input.marketListener ?? `brk-${opaque}@${LISTENER_EMAIL_DOMAIN}`;
  const token = input.marketSubjectToken ?? crypto.randomBytes(12).toString("hex");
  const [created] = await db
    .insert(correspondenceThreadsTable)
    .values({
      dealId: input.dealId,
      dealMarketId: input.dealMarketId ?? null,
      participantUserId: input.participantUserId ?? null,
      channel: input.channel,
      listenerEmail,
      subjectToken: token,
    })
    .onConflictDoNothing()
    .returning();
  if (created) return created;
  const [winner] = await db
    .select()
    .from(correspondenceThreadsTable)
    .where(
      input.channel === "MARKET"
        ? and(eq(correspondenceThreadsTable.channel, "MARKET"), eq(correspondenceThreadsTable.dealMarketId, input.dealMarketId!))
        : and(eq(correspondenceThreadsTable.channel, "BROKER"), eq(correspondenceThreadsTable.dealId, input.dealId), eq(correspondenceThreadsTable.participantUserId, input.participantUserId!)),
    )
    .limit(1);
  if (!winner) throw new Error("Unable to create correspondence thread");
  return winner;
}

export interface SendDealEmailResult {
  ok: boolean;
  status: "sent" | "dev_logged" | "failed";
  /** Durable, un-normalized state for API/UI error serialization. */
  deliveryState: "PENDING" | "sent" | "dev_logged" | "failed" | "DELIVERY_UNKNOWN";
  outboundId: string;
  providerMessageId?: string | null;
  error?: string;
  failureKind?: "TRANSIENT" | "PERMANENT" | "DELIVERY_UNKNOWN";
}

export async function sendDealEmail(input: SendDealEmailInput): Promise<SendDealEmailResult> {
  const channel = validateOutboundEnvelope(input);
  const isControlled = channel === "MARKET" || channel === "BROKER";
  const addr = await ensureDealEmailAddress(input.dealId);

  // Determine reply-to and subject token based on whether this is market-scoped.
  let replyTo: string;
  let subjectTokenStr: string;
  let marketEmailAddr: Awaited<ReturnType<typeof ensureDealMarketEmailAddress>> | null = null;
  let correspondenceThread: Awaited<ReturnType<typeof ensureCorrespondenceThread>> | null = null;

  // This is the final provider-send boundary. A caller cannot use a market
  // thread to add a broker (or vice versa) through direct service use, retry
  // workers, CC/BCC, or a forged recipient field.
  let recipients: string[];
  if (channel === "MARKET") {
    const approved = await approvedMarketRecipient(input.dealId, input.dealMarketId!);
    if (normalizeEmail(input.to[0]) !== approved) throw new Error("MARKET_RECIPIENT_POLICY_REJECTED");
    // Do not carry the caller's display-name/string form to the provider.
    recipients = [approved];
  } else if (channel === "BROKER") {
    const approved = await approvedBrokerRecipient(input.dealId, input.recipientUserId!);
    if (normalizeEmail(input.to[0]) !== approved) throw new Error("BROKER_RECIPIENT_POLICY_REJECTED");
    recipients = [approved];
  } else {
    // System notices are allowed only through a named, independently audited
    // notice scope. They never acquire MARKET or BROKER thread material.
    recipients = input.to.map(normalizeEmail);
  }

  if (input.dealMarketId) {
    // Load the deal_market and verify it belongs to this deal.
    const [dmRow] = await db
      .select({ marketId: dealMarketsTable.marketId })
      .from(dealMarketsTable)
      .where(
        and(
          eq(dealMarketsTable.id, input.dealMarketId),
          eq(dealMarketsTable.dealId, input.dealId),
        ),
      );

    if (!dmRow) {
      throw new Error(`deal_market ${input.dealMarketId} not found`);
    }

    marketEmailAddr = await ensureDealMarketEmailAddress(
      input.dealMarketId,
      input.dealId,
      dmRow.marketId,
    );
    replyTo = marketEmailAddr.emailAddress;
    subjectTokenStr = marketSubjectToken(marketEmailAddr.subjectToken);
    if (channel === "MARKET") {
      correspondenceThread = await ensureCorrespondenceThread({
        channel: "MARKET",
        dealId: input.dealId,
        dealMarketId: input.dealMarketId,
        marketListener: replyTo,
        marketSubjectToken: marketEmailAddr.subjectToken,
      });
    }
  } else if (channel === "BROKER") {
    correspondenceThread = await ensureCorrespondenceThread({
      channel: "BROKER",
      dealId: input.dealId,
      participantUserId: input.recipientUserId!,
    });
    replyTo = correspondenceThread.listenerEmail;
    subjectTokenStr = `[AXB-${correspondenceThread.subjectToken}]`;
  } else {
    replyTo = addr.emailAddress;
    subjectTokenStr = subjectToken(addr.fileId);
  }

  const subject = input.subject.includes(subjectTokenStr)
    ? input.subject
    : `${input.subject} ${subjectTokenStr}`;

  // RFC Message-ID we ask the provider to use.
  const rfcMessageId = `<axl-${addr.fileId}-${crypto.randomUUID()}@${LISTENER_EMAIL_DOMAIN}>`;

  // Every provider attempt gets a durable stable key before I/O. Explicit
  // worker keys remain stable across that worker attempt. A client may send
  // manual-<UUID> for one compose/retry cycle; identical later content without
  // that same key is intentionally a new send.
  const idempotencyKey = input.idempotencyKey ??
    (isControlled
      ? manualComposeIdempotencyKey()
      : `system-${crypto.randomUUID()}`);
  const outboundStatus = channel === "SYSTEM_NOTICE" ? "LEGACY" : channel;
  type ExistingOutbound = {
    id: string;
    providerMessageId: string | null;
    status: string;
    error: string | null;
  };
  const isManualControlledCompose =
    isControlled && (!input.idempotencyKey || input.idempotencyKey.startsWith("manual-"));
  type PendingInsert = { id: string };
  type PendingResult =
    | { kind: "existing"; row: ExistingOutbound }
    | { kind: "blocked"; row: ExistingOutbound }
    | { kind: "inserted"; row: PendingInsert };

  // The check for an uncertain predecessor and creation of this PENDING row
  // share a transaction-scoped advisory lock. Without it, two fresh browser
  // UUIDs can both observe an empty thread and create simultaneous sends.
  const pendingResult = await db.transaction(async (tx): Promise<PendingResult> => {
    if (isManualControlledCompose && correspondenceThread) {
      await tx.execute(sql`
        SELECT pg_advisory_xact_lock(hashtext(${`manual-correspondence:${correspondenceThread.id}`}))
      `);
    }

    const existingQuery = await tx.execute(sql`
      SELECT id, provider_message_id AS "providerMessageId", status, error
      FROM deal_outbound_emails
      WHERE idempotency_key = ${idempotencyKey}
      LIMIT 1
    `);
    const existing = (existingQuery as unknown as { rows: ExistingOutbound[] }).rows[0];
    // Exact-key lookup precedes the thread state gate: a browser retry of the
    // original compose receives its known durable state, never a new send.
    if (existing) return { kind: "existing", row: existing };

    if (isManualControlledCompose && correspondenceThread) {
      const uncertainQuery = await tx.execute(sql`
        SELECT id, provider_message_id AS "providerMessageId", status, error
        FROM deal_outbound_emails
        WHERE correspondence_thread_id = ${correspondenceThread.id}
          AND status IN (${"PENDING"}, ${"DELIVERY_UNKNOWN"})
        ORDER BY created_at DESC
        LIMIT 1
        FOR UPDATE
      `);
      const uncertain = (uncertainQuery as unknown as { rows: ExistingOutbound[] }).rows[0];
      if (uncertain) return { kind: "blocked", row: uncertain };
    }

    // This insert is the durable pre-provider record. Raw SQL is used for the
    // rollout-only idempotency columns so this safety boundary remains correct
    // while the shared DB schema package is updated independently.
    const pendingQuery = await tx.execute(sql`
      INSERT INTO deal_outbound_emails (
        deal_id, deal_market_id, provider_message_id, rfc_message_id,
        to_emails, cc_emails, from_email, reply_to, subject, body_html, body_text,
        channel, correspondence_thread_id, recipient_user_id, idempotency_key, status, error
      ) VALUES (
        ${input.dealId}, ${input.dealMarketId ?? null}, ${null}, ${rfcMessageId},
        ${JSON.stringify(recipients)}::jsonb, ${JSON.stringify(input.cc ?? [])}::jsonb,
        ${DEFAULT_FROM}, ${replyTo}, ${subject}, ${input.html ?? null}, ${input.text ?? null},
        ${outboundStatus}, ${correspondenceThread?.id ?? null}, ${input.recipientUserId ?? null},
        ${idempotencyKey}, ${"PENDING"}, ${null}
      )
      ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING
      RETURNING id
    `);
    const pending = (pendingQuery as unknown as { rows: PendingInsert[] }).rows[0];
    if (pending) return { kind: "inserted", row: pending };

    // This can occur only for a caller not covered by the advisory lock (for
    // example a dispatch worker); it still must never issue another send.
    const concurrentQuery = await tx.execute(sql`
      SELECT id, provider_message_id AS "providerMessageId", status, error
      FROM deal_outbound_emails
      WHERE idempotency_key = ${idempotencyKey}
      LIMIT 1
    `);
    const concurrent = (concurrentQuery as unknown as { rows: ExistingOutbound[] }).rows[0];
    if (concurrent) return { kind: "existing", row: concurrent };
    throw new Error("OUTBOUND_IDEMPOTENCY_PERSISTENCE_FAILED");
  });
  if (pendingResult.kind === "existing") return resultForExistingOutbound(pendingResult.row);
  if (pendingResult.kind === "blocked") {
    const result = resultForExistingOutbound(pendingResult.row);
    return {
      ...result,
      error: "A prior message in this private thread has an unresolved delivery state. Review it before creating a new compose request.",
      failureKind: "DELIVERY_UNKNOWN",
    };
  }
  const pending = pendingResult.row;

  const apiKey = process.env.RESEND_API_KEY;
  let status: SendDealEmailResult["status"] = "dev_logged";
  let providerMessageId: string | null = null;
  let error: string | undefined;
  let failureKind: SendDealEmailResult["failureKind"];

  if (apiKey) {
    try {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      };
        headers["Idempotency-Key"] = idempotencyKey;

      const resp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers,
        body: JSON.stringify({
          from: DEFAULT_FROM,
          to: recipients,
          cc: channel === "SYSTEM_NOTICE" ? input.cc : undefined,
          bcc: channel === "SYSTEM_NOTICE" ? input.bcc : undefined,
          subject,
          html: input.html,
          text: input.text,
          reply_to: replyTo,
          headers: { "Message-ID": rfcMessageId },
          attachments: input.attachments,
        }),
      });
      const data: unknown = await resp.json().catch(() => ({}));
      if (resp.ok) {
        status = "sent";
        providerMessageId = (data as { id?: string })?.id ?? null;
      } else {
        status = "failed";
        error = `Resend ${resp.status}: ${JSON.stringify(data)}`;
        failureKind =
          resp.status === 408 || resp.status === 429 || resp.status >= 500
            ? "TRANSIENT"
            : "PERMANENT";
      }
    } catch (e: unknown) {
      status = "failed";
      error = e instanceof Error ? e.message : String(e);
      // A network exception can happen after the provider accepted the request.
      // Do not retry automatically because doing so could duplicate a submission.
      failureKind = "DELIVERY_UNKNOWN";
    }
  } else {
    logger.info(
      {
        to: recipients.join(", "),
        subject,
        replyTo,
        dealMarketId: input.dealMarketId ?? null,
      },
      "[emailService] DEV MODE (no RESEND_API_KEY) — would send email",
    );
  }

  const persistedStatus = failureKind === "DELIVERY_UNKNOWN" ? "DELIVERY_UNKNOWN" : status;
  // The terminal row update and audit event commit together. If this
  // transaction cannot commit after provider I/O, the durable PENDING row is
  // intentionally conservative and must be manually reviewed rather than
  // retried as a fresh send.
  try {
    await db.transaction(async (tx) => {
      await tx
        .update(dealOutboundEmailsTable)
        .set({
          providerMessageId,
          status: persistedStatus,
          error: error ?? null,
        })
        .where(eq(dealOutboundEmailsTable.id, pending.id));

      await tx.insert(activityLogTable).values({
        dealId: input.dealId,
        dealMarketId: input.dealMarketId ?? null,
        entityType: "deal",
        entityId: input.dealId,
        eventType: failureKind === "DELIVERY_UNKNOWN" ? "email_delivery_unknown" : "email_sent",
        description:
          status === "sent"
            ? `Email sent to ${recipients.join(", ")}: "${subject}"`
            : status === "dev_logged"
              ? `Email recorded (dev mode, not delivered) to ${recipients.join(", ")}: "${subject}"`
              : failureKind === "DELIVERY_UNKNOWN"
                ? `Email delivery status UNKNOWN for ${recipients.join(", ")}: "${subject}". Manual review required; do not retry automatically.`
                : `Email FAILED to ${recipients.join(", ")}: "${subject}"`,
        metadata: {
          outbound_email_id: pending.id,
          idempotency_key: idempotencyKey,
          status: persistedStatus,
          reply_to: replyTo,
          provider_message_id: providerMessageId,
          error: error ?? null,
          sent_by: input.sentBy ?? null,
          deal_market_id: input.dealMarketId ?? null,
          correspondence_channel: outboundStatus,
          correspondence_private: isControlled,
          system_notice: systemNoticeScope(input),
        },
      });
    });
  } catch (persistenceError) {
    // Provider I/O already occurred. Never throw this into an HTTP handler:
    // generic route error mapping would invite the UI to rotate its UUID and
    // send again. The original PENDING row is durable and becomes the manual
    // review record if the terminal update/audit transaction could not commit.
    logger.error(
      { outboundId: pending.id, persistenceError },
      "[emailService] terminal outbound persistence failed after provider I/O; delivery is unknown",
    );
    return {
      ok: false,
      status: "failed",
      deliveryState: "PENDING",
      outboundId: pending.id,
      providerMessageId,
      error: "Provider delivery completed but local status persistence failed. Review the existing pending message; do not retry automatically.",
      failureKind: "DELIVERY_UNKNOWN",
    };
  }

  return {
    ok: status !== "failed",
    status,
    deliveryState: persistedStatus,
    outboundId: pending.id,
    providerMessageId,
    error,
    failureKind,
  };
}
