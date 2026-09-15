import { pgTable, uuid, text, timestamp, jsonb, uniqueIndex, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { dealsTable } from "./deals";
import { dealMarketsTable } from "./markets";

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
  // Nullable: identifies the market thread when resolved; null = general deal correspondence.
  dealMarketId: uuid("deal_market_id").references(() => dealMarketsTable.id),
  // Unique: provider message id — DB-enforced idempotency for webhook retries.
  messageId: text("message_id").notNull().unique(),
  fromEmail: text("from_email").notNull(),
  fromName: text("from_name"),
  toEmails: jsonb("to_emails").$type<string[]>().notNull().default([]),
  ccEmails: jsonb("cc_emails").$type<string[]>().notNull().default([]),
  subject: text("subject"),
  bodyHtml: text("body_html"),
  bodyText: text("body_text"),
  // MARKET and BROKER messages are separately authorized. HELD is private
  // staff-review material; it is never a general correspondence fallback.
  channel: text("channel").notNull().default("HELD"),
  correspondenceThreadId: uuid("correspondence_thread_id"),
  providerReceivedEmailId: text("provider_received_email_id"),
  bodyEnrichmentStatus: text("body_enrichment_status").notNull().default("PENDING"),
  bodyEnrichmentError: text("body_enrichment_error"),
  heldReason: text("held_reason"),
  senderAuthEvidence: text("sender_auth_evidence"),
  aiSummary: text("ai_summary"),
  aiIntent: text("ai_intent"),
  aiActionItems: jsonb("ai_action_items"),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
}, (t) => [
  index("idx_inbound_correspondence_channel").on(t.dealId, t.channel, t.receivedAt),
  uniqueIndex("uq_inbound_provider_received_id").on(t.providerReceivedEmailId).where(sql`${t.providerReceivedEmailId} IS NOT NULL`),
]);

/** Opaque, persisted identities keep the market and broker mail channels
 * distinct even when they concern the same deal. */
export const correspondenceThreadsTable = pgTable("correspondence_threads", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  dealId: uuid("deal_id").references(() => dealsTable.id, { onDelete: "cascade" }).notNull(),
  dealMarketId: uuid("deal_market_id").references(() => dealMarketsTable.id, { onDelete: "cascade" }),
  participantUserId: uuid("participant_user_id"),
  channel: text("channel").notNull(),
  listenerEmail: text("listener_email").notNull().unique(),
  subjectToken: text("subject_token").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
}, (t) => [
  uniqueIndex("uq_correspondence_market_thread").on(t.dealMarketId).where(sql`${t.channel} = 'MARKET' AND ${t.dealMarketId} IS NOT NULL`),
  uniqueIndex("uq_correspondence_broker_thread").on(t.dealId, t.participantUserId).where(sql`${t.channel} = 'BROKER' AND ${t.participantUserId} IS NOT NULL`),
  index("idx_correspondence_thread_listener").on(t.listenerEmail),
]);
