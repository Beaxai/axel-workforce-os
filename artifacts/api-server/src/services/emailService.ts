import {
  db,
  dealEmailAddressesTable,
  dealOutboundEmailsTable,
  activityLogTable,
  dealsTable,
  accountsTable,
  dealMarketEmailAddressesTable,
  dealMarketsTable,
} from "@workspace/db";
import { and, eq } from "drizzle-orm";
import crypto from "crypto";
import { logger } from "../lib/logger";

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

export interface SendDealEmailResult {
  ok: boolean;
  status: "sent" | "dev_logged" | "failed";
  outboundId: string;
  providerMessageId?: string | null;
  error?: string;
  failureKind?: "TRANSIENT" | "PERMANENT" | "DELIVERY_UNKNOWN";
}

export async function sendDealEmail(input: SendDealEmailInput): Promise<SendDealEmailResult> {
  const addr = await ensureDealEmailAddress(input.dealId);

  // Determine reply-to and subject token based on whether this is market-scoped.
  let replyTo: string;
  let subjectTokenStr: string;
  let marketEmailAddr: Awaited<ReturnType<typeof ensureDealMarketEmailAddress>> | null = null;

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
  } else {
    replyTo = addr.emailAddress;
    subjectTokenStr = subjectToken(addr.fileId);
  }

  const subject = input.subject.includes(subjectTokenStr)
    ? input.subject
    : `${input.subject} ${subjectTokenStr}`;

  // RFC Message-ID we ask the provider to use.
  const rfcMessageId = `<axl-${addr.fileId}-${crypto.randomUUID()}@${LISTENER_EMAIL_DOMAIN}>`;

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
      if (input.idempotencyKey) {
        headers["Idempotency-Key"] = input.idempotencyKey;
      }

      const resp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers,
        body: JSON.stringify({
          from: DEFAULT_FROM,
          to: input.to,
          cc: input.cc,
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
        to: input.to.join(", "),
        subject,
        replyTo,
        dealMarketId: input.dealMarketId ?? null,
      },
      "[emailService] DEV MODE (no RESEND_API_KEY) — would send email",
    );
  }

  const [outbound] = await db
    .insert(dealOutboundEmailsTable)
    .values({
      dealId: input.dealId,
      dealMarketId: input.dealMarketId ?? null,
      providerMessageId,
      rfcMessageId,
      toEmails: input.to,
      ccEmails: input.cc ?? null,
      fromEmail: DEFAULT_FROM,
      replyTo,
      subject,
      bodyHtml: input.html ?? null,
      bodyText: input.text ?? null,
      status,
      error: error ?? null,
    })
    .returning();

  await db.insert(activityLogTable).values({
    dealId: input.dealId,
    dealMarketId: input.dealMarketId ?? null,
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
      reply_to: replyTo,
      provider_message_id: providerMessageId,
      error: error ?? null,
      sent_by: input.sentBy ?? null,
      deal_market_id: input.dealMarketId ?? null,
    },
  });

  return {
    ok: status !== "failed",
    status,
    outboundId: outbound.id,
    providerMessageId,
    error,
    failureKind,
  };
}
