import {
  db,
  dealEmailAddressesTable,
  dealInboundEmailsTable,
  dealOutboundEmailsTable,
  dealMarketEmailAddressesTable,
  correspondenceThreadsTable,
  dealMarketsTable,
  marketUnderwritersTable,
  usersTable,
  activityLogTable,
} from "@workspace/db";
import { and, eq, inArray } from "drizzle-orm";
import { logger } from "./logger";
import { ensureCorrespondenceThread, ensureDealMarketEmailAddress } from "../services/emailService";

// ---------------------------------------------------------------------------
// Inbound email routing — resolves an incoming email only through opaque,
// server-issued identities:
//
//   1. Recipient address matches a deal-market-specific listener address.
//   2. In-Reply-To / References match a market-scoped outbound Message-ID
//      (returns stored dealMarketId).
//   3. Dedicated broker listener address matches a persisted broker thread.
//   4. Deal-level listener matches are held for review.
//   5. Unmatched — stored in the held queue, never dropped silently.
//
// The resolver returns { dealId, dealMarketId, method }.
// Webhook replay protection is DB-enforced via unique messageId constraint.
// ---------------------------------------------------------------------------

export interface InboundEmail {
  messageId: string;
  to: string[];
  cc?: string[];
  from: string;
  fromName?: string | null;
  subject?: string | null;
  bodyHtml?: string | null;
  bodyText?: string | null;
  inReplyTo?: string | null;
  references?: string[]; // parsed References header message-ids
  receivedAt?: Date;
  providerReceivedEmailId?: string | null;
  senderAuthEvidence?: string | null;
}

export type RouteMethod =
  | "market_recipient_address"
  | "market_subject_token"
  | "market_message_id"
  | "recipient_address"
  | "subject_token"
  | "message_id"
  | null;

export interface InboundResolution {
  dealId: string | null;
  dealMarketId: string | null;
  correspondenceThreadId: string | null;
  channel: "MARKET" | "BROKER" | "HELD";
  method: RouteMethod;
}

function addressOnly(value: string): string {
  return (value.match(/<([^>]+)>/)?.[1] ?? value).trim().toLowerCase();
}

export async function resolveDealForInbound(
  email: InboundEmail,
): Promise<InboundResolution> {
  const recipients = [...email.to, ...(email.cc ?? [])].map((a) => a.trim().toLowerCase()).filter(Boolean);
  // A controlled listener is single-recipient only. A copied listener in CC,
  // a second broker listener, or any unknown companion recipient is ambiguous
  // and must enter the held queue rather than choosing a convenient match.
  if (recipients.length !== 1) {
    return { dealId: null, dealMarketId: null, correspondenceThreadId: null, channel: "HELD", method: null };
  }

  // Layer 1: Market-specific listener recipient address.
  if (recipients.length === 1) {
    const rows = await db
      .select({
        dealMarketId: dealMarketEmailAddressesTable.dealMarketId,
        dealId: dealMarketEmailAddressesTable.dealId,
        emailAddress: dealMarketEmailAddressesTable.emailAddress,
      })
      .from(dealMarketEmailAddressesTable)
      .where(inArray(dealMarketEmailAddressesTable.emailAddress, recipients));

    if (rows.length === 1 && rows[0].dealId) {
      return {
        dealId: rows[0].dealId,
        dealMarketId: rows[0].dealMarketId,
        correspondenceThreadId: null,
        channel: "MARKET",
        method: "market_recipient_address",
      };
    }
  }

  // Broker routing requires the dedicated opaque listener address. Subject
  // tokens are intentionally not a routing authority; they are user-visible
  // and can be copied into a spoofed message.
  if (recipients.length === 1) {
    const rows = await db
      .select({
        id: correspondenceThreadsTable.id,
        dealId: correspondenceThreadsTable.dealId,
        dealMarketId: correspondenceThreadsTable.dealMarketId,
      })
      .from(correspondenceThreadsTable)
      .where(and(
        inArray(correspondenceThreadsTable.listenerEmail, recipients),
        eq(correspondenceThreadsTable.channel, "BROKER"),
      ));
    if (rows.length === 1) {
      return {
        dealId: rows[0].dealId,
        dealMarketId: rows[0].dealMarketId,
        correspondenceThreadId: rows[0].id,
        channel: "BROKER",
        method: "recipient_address",
      };
    }
  }

  // Do not let a reply-chain token override an unknown recipient. It is a
  // contradiction unless the addressed controlled listener itself identified
  // the deal/thread above.
  if (recipients.length === 1) {
    const rows = await db
      .select({ dealId: dealEmailAddressesTable.dealId })
      .from(dealEmailAddressesTable)
      .where(inArray(dealEmailAddressesTable.emailAddress, recipients));
    if (rows.length === 1 && rows[0].dealId) {
      return { dealId: rows[0].dealId, dealMarketId: null, correspondenceThreadId: null, channel: "HELD", method: "recipient_address" };
    }
  }
  return { dealId: null, dealMarketId: null, correspondenceThreadId: null, channel: "HELD", method: null };
}

async function headerContradictsResolvedListener(email: InboundEmail, resolution: InboundResolution) {
  const ids = [email.inReplyTo, ...(email.references ?? [])]
    .filter((id): id is string => typeof id === "string" && id.trim().length > 0)
    .map((id) => id.trim());
  if (!ids.length || !resolution.dealId) return false;
  const rows = await db.select({
    dealId: dealOutboundEmailsTable.dealId,
    dealMarketId: dealOutboundEmailsTable.dealMarketId,
  }).from(dealOutboundEmailsTable).where(inArray(dealOutboundEmailsTable.rfcMessageId, ids));
  // A known reply-chain identity must agree with the listener-derived deal and
  // market. Unknown headers do not authorize routing, and mismatches are held.
  return rows.some((row) =>
    row.dealId !== resolution.dealId ||
    (row.dealMarketId ?? null) !== (resolution.dealMarketId ?? null),
  );
}

async function senderAuthorizedForResolution(
  _email: InboundEmail,
  _resolution: InboundResolution,
): Promise<boolean> {
  // A signed webhook attests the provider event, not the SMTP From address.
  // Authentication-Results is message header material and can be injected by
  // an upstream sender; Resend's received-email response does not presently
  // expose an independently authenticated structured sender verdict. It is
  // retained as informational review evidence only. Fail closed: no external
  // email enters a MARKET/BROKER thread until such an attestation exists.
  return false;
}

/** Inbound rich markup is never retained for rendering. Convert it to inert
 * text rather than relying on a regex sanitizer for hostile HTML/CSS. */
export function sanitizeInboundHtml(html: string): string {
  return html
    .replace(/<\s*(script|style|iframe|object|embed|form)[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/<\s*br\s*\/?\s*>/gi, "\n")
    .replace(/<\s*\/\s*(p|div|li|tr|h[1-6])\s*>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .trim();
}

export async function processInboundEmail(email: InboundEmail) {
  const resolution = await resolveDealForInbound(email);
  const headerContradiction = await headerContradictsResolvedListener(email, resolution);
  const authorized = !headerContradiction && await senderAuthorizedForResolution(email, resolution);
  // An address/header match plus an unauthorized sender is held, not routed.
  // It remains available only to trusted staff review, never to a broker or
  // the general activity feed.
  const channel = authorized ? resolution.channel : "HELD";
  const dealId = resolution.dealId;
  // Keep the server-derived candidate identity on HELD rows. It is visible
  // only in the trusted held queue and enables a later explicit staff release;
  // it never makes the row appear in a market/broker feed by itself.
  const dealMarketId = resolution.dealMarketId;
  let correspondenceThreadId = resolution.correspondenceThreadId;
  if (resolution.channel === "MARKET" && resolution.dealMarketId && resolution.dealId) {
    const [market] = await db
      .select({ marketId: dealMarketsTable.marketId })
      .from(dealMarketsTable)
      .where(eq(dealMarketsTable.id, resolution.dealMarketId))
      .limit(1);
    if (market) {
      const address = await ensureDealMarketEmailAddress(resolution.dealMarketId, resolution.dealId, market.marketId);
      correspondenceThreadId = (await ensureCorrespondenceThread({
        channel: "MARKET",
        dealId: resolution.dealId,
        dealMarketId: resolution.dealMarketId,
        marketListener: address.emailAddress,
        marketSubjectToken: address.subjectToken,
      })).id;
    }
  }
  const method = resolution.method;
  const hasBody = Boolean(email.bodyHtml || email.bodyText);
  const heldReason = channel === "HELD"
    ? (headerContradiction
      ? "HEADER_IDENTITY_CONTRADICTION"
      : !resolution.dealId
      ? (email.to.length + (email.cc?.length ?? 0) > 1 ? "AMBIGUOUS_RECIPIENT_IDENTITIES" : "UNMATCHED_RECIPIENT_OR_HEADER")
      : "SENDER_NOT_APPROVED_FOR_THREAD")
    : null;

  // Idempotency is DB-enforced: message_id is unique, so concurrent webhook
  // retries collapse to a single row (ON CONFLICT DO NOTHING returns no row
  // for the loser, and the activity log below is only written by the winner).
  let row: typeof dealInboundEmailsTable.$inferSelect | undefined;
  await db.transaction(async (tx) => {
    const [inserted] = await tx
    .insert(dealInboundEmailsTable)
    .values({
      dealId,
      dealMarketId: dealMarketId ?? null,
      messageId: email.messageId,
      fromEmail: email.from,
      fromName: email.fromName ?? null,
       toEmails: email.to.map(addressOnly),
       ccEmails: (email.cc ?? []).map(addressOnly),
      subject: email.subject ?? null,
       bodyHtml: null,
       bodyText: email.bodyText ?? (email.bodyHtml ? sanitizeInboundHtml(email.bodyHtml) : null),
      channel,
      correspondenceThreadId,
      providerReceivedEmailId: email.providerReceivedEmailId ?? null,
      bodyEnrichmentStatus: hasBody ? "COMPLETE" : "PENDING",
      bodyEnrichmentError: null,
       heldReason,
       senderAuthEvidence: email.senderAuthEvidence ?? null,
      receivedAt: email.receivedAt ?? new Date(),
      processedAt: new Date(),
    })
    .onConflictDoNothing({ target: dealInboundEmailsTable.messageId })
    .returning();
    row = inserted;
    if (row && dealId && channel !== "HELD") {
      await tx.insert(activityLogTable).values({
        dealId,
        dealMarketId: dealMarketId ?? null,
        entityType: "deal",
        entityId: dealId,
        eventType: "email_received",
        description: `Email received from ${email.fromName || email.from}: "${email.subject || "(no subject)"}"`,
        metadata: {
          inbound_email_id: row.id, from: email.from, route_method: method,
          deal_market_id: dealMarketId ?? null, correspondence_channel: channel,
          correspondence_private: true,
        },
      });
    }
  });

  // Conflict → do not create another row/activity, but a replay is allowed to
  // backfill a body that the earlier webhook could not retrieve.
  if (!row) {
    const [existing] = await db
      .select()
      .from(dealInboundEmailsTable)
      .where(eq(dealInboundEmailsTable.messageId, email.messageId))
      .limit(1);
    if (existing && !existing.providerReceivedEmailId && email.providerReceivedEmailId) {
      await db.update(dealInboundEmailsTable)
        .set({ providerReceivedEmailId: email.providerReceivedEmailId })
        .where(eq(dealInboundEmailsTable.id, existing.id));
      existing.providerReceivedEmailId = email.providerReceivedEmailId;
    }
    if (existing && !existing.bodyHtml && !existing.bodyText) {
      await enrichInboundEmailBody(existing.id).catch(() => undefined);
    }
    return { duplicate: true as const, id: existing?.id ?? null, dealId, dealMarketId, method };
  }

  if (!dealId || channel === "HELD") {
    logger.warn(
      { from: email.from, subject: email.subject, inboundId: row.id },
      "[inbound-email] UNROUTED email stored",
    );
  }

  if (!hasBody && row.providerReceivedEmailId) {
    // Retrieval failure is persisted and intentionally does not turn this
    // verified webhook into a retry storm; staff can retry the same row.
    await enrichInboundEmailBody(row.id).catch(() => undefined);
  }
  return { duplicate: false as const, id: row.id, dealId, dealMarketId, method };
}

/** Fetch body-only data for an existing received-email row. Never sends mail. */
export async function enrichInboundEmailBody(inboundId: string): Promise<{ enriched: boolean; row: typeof dealInboundEmailsTable.$inferSelect }> {
  const [row] = await db.select().from(dealInboundEmailsTable).where(eq(dealInboundEmailsTable.id, inboundId)).limit(1);
  if (!row) throw new Error("INBOUND_NOT_FOUND");
  if (row.bodyHtml || row.bodyText) {
    if (row.bodyEnrichmentStatus !== "COMPLETE") {
      await db.update(dealInboundEmailsTable).set({ bodyEnrichmentStatus: "COMPLETE", bodyEnrichmentError: null }).where(eq(dealInboundEmailsTable.id, row.id));
    }
    return { enriched: false, row: { ...row, bodyEnrichmentStatus: "COMPLETE", bodyEnrichmentError: null } };
  }
  // Before provider_received_email_id existed, the webhook persisted
  // `String(d.email_id)` into message_id. A UUID-shaped legacy message ID is
  // therefore an evidence-based recovery candidate, not a fabricated ID.
  const legacyProviderId =
    !row.providerReceivedEmailId &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(row.messageId)
      ? row.messageId
      : null;
  const receivedEmailId = row.providerReceivedEmailId ?? legacyProviderId;
  if (!process.env.RESEND_API_KEY || !receivedEmailId) {
    await db.update(dealInboundEmailsTable).set({
      bodyEnrichmentStatus: "FAILED",
      bodyEnrichmentError: "Resend received-email retrieval is not configured for this message.",
    }).where(eq(dealInboundEmailsTable.id, row.id));
    throw new Error("RESEND_RETRIEVAL_UNAVAILABLE");
  }
  await db.update(dealInboundEmailsTable).set({ bodyEnrichmentStatus: "PENDING", bodyEnrichmentError: null }).where(eq(dealInboundEmailsTable.id, row.id));
  try {
    const response = await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(receivedEmailId)}`, {
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
    });
    const payload: any = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`Resend retrieval failed (${response.status})`);
    const data = payload.data ?? payload;
    const extractedText = typeof data.html === "string" ? sanitizeInboundHtml(data.html) : null;
    const text = typeof data.text === "string" ? data.text : null;
    const providerHeaders = Array.isArray(data.headers)
      ? data.headers
      : data.headers && typeof data.headers === "object"
        ? Object.entries(data.headers).map(([name, value]) => ({ name, value }))
        : [];
    const providerAuthEvidence = providerHeaders.find((header: any) =>
      String(header?.name ?? "").toLowerCase() === "authentication-results",
    )?.value;
    if (!extractedText && !text) throw new Error("Resend did not return an email body");
    const [updated] = await db.update(dealInboundEmailsTable).set({
      bodyHtml: null,
      bodyText: text ?? extractedText,
      bodyEnrichmentStatus: "COMPLETE",
      bodyEnrichmentError: null,
      providerReceivedEmailId: receivedEmailId,
      senderAuthEvidence: typeof providerAuthEvidence === "string"
        ? providerAuthEvidence
        : row.senderAuthEvidence,
    }).where(eq(dealInboundEmailsTable.id, row.id)).returning();
    return { enriched: true, row: updated! };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await db.update(dealInboundEmailsTable).set({ bodyEnrichmentStatus: "FAILED", bodyEnrichmentError: message.slice(0, 500) }).where(eq(dealInboundEmailsTable.id, row.id));
    throw error;
  }
}
