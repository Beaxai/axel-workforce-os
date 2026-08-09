import { pgTable, uuid, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { dealsTable } from "./deals";

// Outbound emails sent on behalf of a deal (carrier/UW correspondence).
// providerMessageId + rfcMessageId are stored so inbound replies can be
// routed back to the deal via In-Reply-To / References header matching
// (routing layer 3 — see services/emailService.ts and lib/inbound-email.ts).
export const dealOutboundEmailsTable = pgTable("deal_outbound_emails", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  dealId: uuid("deal_id").references(() => dealsTable.id).notNull(),
  // Resend's own id for the send (provider-scoped).
  providerMessageId: text("provider_message_id"),
  // RFC 5322 Message-ID header value, used for In-Reply-To/References matching.
  rfcMessageId: text("rfc_message_id"),
  toEmails: jsonb("to_emails").notNull(), // string[]
  ccEmails: jsonb("cc_emails"), // string[] | null
  fromEmail: text("from_email").notNull(),
  replyTo: text("reply_to"),
  subject: text("subject").notNull(),
  bodyHtml: text("body_html"),
  bodyText: text("body_text"),
  // sent | dev_logged | failed
  status: text("status").notNull().default("sent"),
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
});
