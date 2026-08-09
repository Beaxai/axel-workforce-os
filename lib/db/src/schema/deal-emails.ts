import { pgTable, uuid, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { dealsTable } from "./deals";

export const dealEmailAddressesTable = pgTable("deal_email_addresses", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  dealId: uuid("deal_id").references(() => dealsTable.id).unique(),
  emailAddress: text("email_address").notNull().unique(),
  companySlug: text("company_slug").notNull(),
  fileId: text("file_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
});

export const dealInboundEmailsTable = pgTable("deal_inbound_emails", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  dealId: uuid("deal_id").references(() => dealsTable.id),
  // Unique: provider message id — DB-enforced idempotency for webhook retries.
  messageId: text("message_id").notNull().unique(),
  fromEmail: text("from_email").notNull(),
  fromName: text("from_name"),
  subject: text("subject"),
  bodyHtml: text("body_html"),
  bodyText: text("body_text"),
  aiSummary: text("ai_summary"),
  aiIntent: text("ai_intent"),
  aiActionItems: jsonb("ai_action_items"),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
});
