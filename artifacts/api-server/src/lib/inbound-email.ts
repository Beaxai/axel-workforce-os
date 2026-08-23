import {
  db,
  dealEmailAddressesTable,
  dealInboundEmailsTable,
  dealOutboundEmailsTable,
  dealMarketEmailAddressesTable,
  activityLogTable,
} from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import { logger } from "./logger";

// ---------------------------------------------------------------------------
// Inbound email routing — resolves an incoming email to a deal (and optionally
// a deal-market) via six layers, in order of reliability:
//
//   1. Recipient address matches a deal-market-specific listener address.
//   2. Opaque market-thread token [AXM-...] in the subject.
//   3. In-Reply-To / References match a market-scoped outbound Message-ID
//      (returns stored dealMarketId).
//   4. Recipient address matches a deal's unique deal-level listener address.
//   5. [AXL-{fileId}] subject token (deal-level).
//   6. Unmatched — stored in unrouted queue, never dropped silently.
//
// The resolver returns { dealId, dealMarketId, method }.
// Webhook replay protection is DB-enforced via unique messageId constraint.
// ---------------------------------------------------------------------------

export interface InboundEmail {
  messageId: string;
  to: string[]; // all recipient addresses (to + cc + envelope)
  from: string;
  fromName?: string | null;
  subject?: string | null;
  bodyHtml?: string | null;
  bodyText?: string | null;
  inReplyTo?: string | null;
  references?: string[]; // parsed References header message-ids
  receivedAt?: Date;
}

const SUBJECT_TOKEN_RE = /\[AXL-([a-z0-9]{8})\]/i;
const MARKET_SUBJECT_TOKEN_RE = /\[AXM-([a-z0-9]{16})\]/i;

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
  method: RouteMethod;
}

export async function resolveDealForInbound(
  email: InboundEmail,
): Promise<InboundResolution> {
  const recipients = email.to.map((a) => a.trim().toLowerCase()).filter(Boolean);

  // Layer 1: Market-specific listener recipient address.
  if (recipients.length > 0) {
    const rows = await db
      .select({
        dealMarketId: dealMarketEmailAddressesTable.dealMarketId,
        dealId: dealMarketEmailAddressesTable.dealId,
        emailAddress: dealMarketEmailAddressesTable.emailAddress,
      })
      .from(dealMarketEmailAddressesTable)
      .where(inArray(dealMarketEmailAddressesTable.emailAddress, recipients));

    if (rows.length > 0 && rows[0].dealId) {
      return {
        dealId: rows[0].dealId,
        dealMarketId: rows[0].dealMarketId,
        method: "market_recipient_address",
      };
    }
  }

  // Layer 2: Opaque market-thread subject token [AXM-...].
  const marketTokenMatch = email.subject?.match(MARKET_SUBJECT_TOKEN_RE);
  if (marketTokenMatch) {
    const opaqueToken = marketTokenMatch[1].toLowerCase();
    const [row] = await db
      .select({
        dealMarketId: dealMarketEmailAddressesTable.dealMarketId,
        dealId: dealMarketEmailAddressesTable.dealId,
      })
      .from(dealMarketEmailAddressesTable)
      .where(eq(dealMarketEmailAddressesTable.subjectToken, opaqueToken));

    if (row?.dealId) {
      return {
        dealId: row.dealId,
        dealMarketId: row.dealMarketId,
        method: "market_subject_token",
      };
    }
  }

  // Layer 3: In-Reply-To / References match a market-scoped outbound Message-ID.
  const candidateIds = [
    ...(email.inReplyTo ? [email.inReplyTo] : []),
    ...(email.references ?? []),
  ]
    .map((id) => id.trim())
    .filter(Boolean);

  if (candidateIds.length > 0) {
    const outboundRows = await db
      .select({
        dealId: dealOutboundEmailsTable.dealId,
        dealMarketId: dealOutboundEmailsTable.dealMarketId,
      })
      .from(dealOutboundEmailsTable)
      .where(inArray(dealOutboundEmailsTable.rfcMessageId, candidateIds));

    // Prefer market-scoped outbound rows.
    const marketScoped = outboundRows.find((r) => r.dealMarketId != null);
    if (marketScoped) {
      return {
        dealId: marketScoped.dealId,
        dealMarketId: marketScoped.dealMarketId ?? null,
        method: "market_message_id",
      };
    }

    // Deal-level outbound match (layer 3 / deal-level).
    if (outboundRows.length > 0) {
      return {
        dealId: outboundRows[0].dealId,
        dealMarketId: null,
        method: "message_id",
      };
    }
  }

  // Layer 4: Deal-level listener recipient address.
  if (recipients.length > 0) {
    const rows = await db
      .select({
        dealId: dealEmailAddressesTable.dealId,
        emailAddress: dealEmailAddressesTable.emailAddress,
      })
      .from(dealEmailAddressesTable)
      .where(inArray(dealEmailAddressesTable.emailAddress, recipients));
    if (rows.length > 0 && rows[0].dealId) {
      return { dealId: rows[0].dealId, dealMarketId: null, method: "recipient_address" };
    }
  }

  // Layer 5: [AXL-xxxxxxxx] deal-level subject token.
  const tokenMatch = email.subject?.match(SUBJECT_TOKEN_RE);
  if (tokenMatch) {
    const fileId = tokenMatch[1].toLowerCase();
    const [row] = await db
      .select({ dealId: dealEmailAddressesTable.dealId })
      .from(dealEmailAddressesTable)
      .where(eq(dealEmailAddressesTable.fileId, fileId));
    if (row?.dealId) return { dealId: row.dealId, dealMarketId: null, method: "subject_token" };
  }

  return { dealId: null, dealMarketId: null, method: null };
}

export async function processInboundEmail(email: InboundEmail) {
  const { dealId, dealMarketId, method } = await resolveDealForInbound(email);

  // Idempotency is DB-enforced: message_id is unique, so concurrent webhook
  // retries collapse to a single row (ON CONFLICT DO NOTHING returns no row
  // for the loser, and the activity log below is only written by the winner).
  const [row] = await db
    .insert(dealInboundEmailsTable)
    .values({
      dealId,
      dealMarketId: dealMarketId ?? null,
      messageId: email.messageId,
      fromEmail: email.from,
      fromName: email.fromName ?? null,
      subject: email.subject ?? null,
      bodyHtml: email.bodyHtml ?? null,
      bodyText: email.bodyText ?? null,
      receivedAt: email.receivedAt ?? new Date(),
      processedAt: new Date(),
    })
    .onConflictDoNothing({ target: dealInboundEmailsTable.messageId })
    .returning();

  // Conflict → another delivery already stored this message; loser writes nothing.
  if (!row) return { duplicate: true as const, id: null, dealId, dealMarketId, method };

  if (dealId) {
    await db.insert(activityLogTable).values({
      dealId,
      dealMarketId: dealMarketId ?? null,
      entityType: "deal",
      entityId: dealId,
      eventType: "email_received",
      description: `Email received from ${email.fromName || email.from}: "${email.subject || "(no subject)"}"`,
      metadata: {
        inbound_email_id: row.id,
        from: email.from,
        route_method: method,
        deal_market_id: dealMarketId ?? null,
      },
    });
  } else {
    logger.warn(
      { from: email.from, subject: email.subject, inboundId: row.id },
      "[inbound-email] UNROUTED email stored",
    );
  }

  return { duplicate: false as const, id: row.id, dealId, dealMarketId, method };
}
