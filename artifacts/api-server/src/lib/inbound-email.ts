import {
  db,
  dealEmailAddressesTable,
  dealInboundEmailsTable,
  dealOutboundEmailsTable,
  activityLogTable,
} from "@workspace/db";
import { eq, inArray } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Inbound email routing — resolves an incoming email to a deal via three
// layers, in order of reliability:
//   1. Recipient address matches a deal's unique listener address
//      (anyone who hit Reply on our Reply-To).
//   2. `[AXL-{fileId}]` token in the subject (forwards, wrong-address replies).
//   3. In-Reply-To / References headers match a stored outbound Message-ID.
// Unmatched emails are stored with dealId = null (unrouted queue) — never
// dropped silently.
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

export type RouteMethod = "recipient_address" | "subject_token" | "message_id" | null;

export async function resolveDealForInbound(
  email: InboundEmail,
): Promise<{ dealId: string | null; method: RouteMethod }> {
  // Layer 1: recipient address
  const recipients = email.to.map((a) => a.trim().toLowerCase()).filter(Boolean);
  if (recipients.length > 0) {
    const rows = await db
      .select({ dealId: dealEmailAddressesTable.dealId, emailAddress: dealEmailAddressesTable.emailAddress })
      .from(dealEmailAddressesTable)
      .where(inArray(dealEmailAddressesTable.emailAddress, recipients));
    if (rows.length > 0 && rows[0].dealId) {
      return { dealId: rows[0].dealId, method: "recipient_address" };
    }
  }

  // Layer 2: [AXL-xxxxxxxx] subject token
  const tokenMatch = email.subject?.match(SUBJECT_TOKEN_RE);
  if (tokenMatch) {
    const fileId = tokenMatch[1].toLowerCase();
    const [row] = await db
      .select({ dealId: dealEmailAddressesTable.dealId })
      .from(dealEmailAddressesTable)
      .where(eq(dealEmailAddressesTable.fileId, fileId));
    if (row?.dealId) return { dealId: row.dealId, method: "subject_token" };
  }

  // Layer 3: In-Reply-To / References vs stored outbound Message-IDs
  const candidateIds = [
    ...(email.inReplyTo ? [email.inReplyTo] : []),
    ...(email.references ?? []),
  ]
    .map((id) => id.trim())
    .filter(Boolean);
  if (candidateIds.length > 0) {
    const rows = await db
      .select({ dealId: dealOutboundEmailsTable.dealId })
      .from(dealOutboundEmailsTable)
      .where(inArray(dealOutboundEmailsTable.rfcMessageId, candidateIds));
    if (rows.length > 0) return { dealId: rows[0].dealId, method: "message_id" };
  }

  return { dealId: null, method: null };
}

export async function processInboundEmail(email: InboundEmail) {
  const { dealId, method } = await resolveDealForInbound(email);

  // Idempotency is DB-enforced: message_id is unique, so concurrent webhook
  // retries collapse to a single row (ON CONFLICT DO NOTHING returns no row
  // for the loser, and the activity log below is only written by the winner).
  const [row] = await db
    .insert(dealInboundEmailsTable)
    .values({
      dealId,
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
  if (!row) return { duplicate: true as const, id: null, dealId, method };

  if (dealId) {
    await db.insert(activityLogTable).values({
      dealId,
      entityType: "deal",
      entityId: dealId,
      eventType: "email_received",
      description: `Email received from ${email.fromName || email.from}: "${email.subject || "(no subject)"}"`,
      metadata: {
        inbound_email_id: row.id,
        from: email.from,
        route_method: method,
      },
    });
  } else {
    console.warn(
      `[inbound-email] UNROUTED email from ${email.from} — subject "${email.subject}" (stored id ${row.id})`,
    );
  }

  return { duplicate: false as const, id: row.id, dealId, method };
}
