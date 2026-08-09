import { db, dealEmailAddressesTable, dealOutboundEmailsTable, activityLogTable, dealsTable, accountsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import crypto from "crypto";

// ---------------------------------------------------------------------------
// Outbound email service (Resend) with per-deal reply routing.
//
// Every outbound email tied to a deal:
//   1. Sets Reply-To to the deal's unique listener address
//      (`{company-slug}-{fileId}@LISTENER_EMAIL_DOMAIN`) — routing layer 1.
//   2. Appends an `[AXL-{fileId}]` token to the subject — routing layer 2.
//   3. Records the RFC Message-ID so replies can be matched via
//      In-Reply-To / References headers — routing layer 3.
//
// If RESEND_API_KEY is not set, sends are recorded with status "dev_logged"
// instead of hitting the provider, so the full pipeline is testable before
// keys/domain exist. When the key lands, no code changes are needed.
// ---------------------------------------------------------------------------

export const LISTENER_EMAIL_DOMAIN =
  process.env.LISTENER_EMAIL_DOMAIN || "listener.axel.io";

const DEFAULT_FROM =
  process.env.OUTBOUND_EMAIL_FROM || "onboarding@resend.dev";

export function subjectToken(fileId: string): string {
  return `[AXL-${fileId}]`;
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

export interface SendDealEmailInput {
  dealId: string;
  to: string[];
  cc?: string[];
  subject: string;
  html?: string;
  text?: string;
  /** Actor name for the activity log entry. */
  sentBy?: string | null;
}

export interface SendDealEmailResult {
  ok: boolean;
  status: "sent" | "dev_logged" | "failed";
  outboundId: string;
  providerMessageId?: string | null;
  error?: string;
}

export async function sendDealEmail(input: SendDealEmailInput): Promise<SendDealEmailResult> {
  const addr = await ensureDealEmailAddress(input.dealId);
  const token = subjectToken(addr.fileId);
  const subject = input.subject.includes(token)
    ? input.subject
    : `${input.subject} ${token}`;

  // RFC Message-ID we ask the provider to use; even if the provider rewrites
  // it, replies via Reply-To (layer 1) and subject token (layer 2) still route.
  const rfcMessageId = `<axl-${addr.fileId}-${crypto.randomUUID()}@${LISTENER_EMAIL_DOMAIN}>`;

  const apiKey = process.env.RESEND_API_KEY;
  let status: SendDealEmailResult["status"] = "dev_logged";
  let providerMessageId: string | null = null;
  let error: string | undefined;

  if (apiKey) {
    try {
      const resp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: DEFAULT_FROM,
          to: input.to,
          cc: input.cc,
          subject,
          html: input.html,
          text: input.text,
          reply_to: addr.emailAddress,
          headers: { "Message-ID": rfcMessageId },
        }),
      });
      const data: any = await resp.json().catch(() => ({}));
      if (resp.ok) {
        status = "sent";
        providerMessageId = data?.id ?? null;
      } else {
        status = "failed";
        error = `Resend ${resp.status}: ${JSON.stringify(data)}`;
      }
    } catch (e: any) {
      status = "failed";
      error = e?.message || String(e);
    }
  } else {
    console.log(
      `[emailService] DEV MODE (no RESEND_API_KEY) — would send to ${input.to.join(", ")} | subject: ${subject} | reply-to: ${addr.emailAddress}`,
    );
  }

  const [outbound] = await db
    .insert(dealOutboundEmailsTable)
    .values({
      dealId: input.dealId,
      providerMessageId,
      rfcMessageId,
      toEmails: input.to,
      ccEmails: input.cc ?? null,
      fromEmail: DEFAULT_FROM,
      replyTo: addr.emailAddress,
      subject,
      bodyHtml: input.html ?? null,
      bodyText: input.text ?? null,
      status,
      error: error ?? null,
    })
    .returning();

  await db.insert(activityLogTable).values({
    dealId: input.dealId,
    entityType: "deal",
    entityId: input.dealId,
    eventType: "email_sent",
    description:
      status === "sent"
        ? `Email sent to ${input.to.join(", ")}: "${subject}"`
        : status === "dev_logged"
          ? `Email recorded (dev mode, not delivered) to ${input.to.join(", ")}: "${subject}"`
          : `Email FAILED to ${input.to.join(", ")}: "${subject}"`,
    metadata: {
      outbound_email_id: outbound.id,
      status,
      reply_to: addr.emailAddress,
      provider_message_id: providerMessageId,
      error: error ?? null,
      sent_by: input.sentBy ?? null,
    },
  });

  return {
    ok: status !== "failed",
    status,
    outboundId: outbound.id,
    providerMessageId,
    error,
  };
}
