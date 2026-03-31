import { pgTable, uuid, text, numeric, timestamp, jsonb, date, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sql } from "drizzle-orm";
import { dealsTable } from "./deals";
import { quotesTable } from "./quotes";

export const proposalsTable = pgTable("proposals", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  dealId: uuid("deal_id").references(() => dealsTable.id, { onDelete: "cascade" }),
  quoteId: uuid("quote_id").references(() => quotesTable.id),
  createdBy: uuid("created_by"),
  status: text("status").notNull().default("draft"),

  wcAnnualPremium: numeric("wc_annual_premium", { precision: 18, scale: 2 }),
  wcMonthlyPremium: numeric("wc_monthly_premium", { precision: 18, scale: 2 }),
  wfsMonthlyPepm: numeric("wfs_monthly_pepm", { precision: 10, scale: 2 }),
  wfsAnnualTotal: numeric("wfs_annual_total", { precision: 18, scale: 2 }),
  totalMonthly: numeric("total_monthly", { precision: 18, scale: 2 }),
  totalAnnual: numeric("total_annual", { precision: 18, scale: 2 }),
  emod: numeric("emod", { precision: 4, scale: 3 }),
  scheduleRating: numeric("schedule_rating", { precision: 4, scale: 2 }),

  ratingBreakdown: jsonb("rating_breakdown"),

  effectiveDate: date("effective_date"),
  expirationDate: date("expiration_date"),
  carrierName: text("carrier_name"),
  programName: text("program_name"),
  verticalId: text("vertical_id"),

  proposalPdfPath: text("proposal_pdf_path"),

  uwNotifiedAt: timestamp("uw_notified_at", { withTimezone: true }),
  uwNotifiedBy: uuid("uw_notified_by"),
  uwNotificationTrigger: text("uw_notification_trigger"),

  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql`now()`),
}, (t) => [
  index("idx_proposals_deal").on(t.dealId),
]);

export const underwritingPackagesTable = pgTable("underwriting_packages", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  dealId: uuid("deal_id").references(() => dealsTable.id, { onDelete: "cascade" }),
  proposalId: uuid("proposal_id").references(() => proposalsTable.id),
  triggeredBy: uuid("triggered_by"),
  triggerType: text("trigger_type").notNull(),
  status: text("status").notNull().default("pending"),

  documents: jsonb("documents"),

  emailSentTo: text("email_sent_to").array(),
  emailSentAt: timestamp("email_sent_at", { withTimezone: true }),
  emailMessageId: text("email_message_id"),

  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql`now()`),
}, (t) => [
  index("idx_uw_packages_deal").on(t.dealId),
  index("idx_uw_packages_proposal").on(t.proposalId),
]);

export const insertProposalSchema = createInsertSchema(proposalsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProposal = z.infer<typeof insertProposalSchema>;
export type Proposal = typeof proposalsTable.$inferSelect;

export const insertUwPackageSchema = createInsertSchema(underwritingPackagesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUwPackage = z.infer<typeof insertUwPackageSchema>;
export type UwPackage = typeof underwritingPackagesTable.$inferSelect;
