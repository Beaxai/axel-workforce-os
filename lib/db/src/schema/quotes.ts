import { pgTable, uuid, text, numeric, timestamp, jsonb, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sql } from "drizzle-orm";
import { dealsTable } from "./deals";

export const quotesTable = pgTable("quotes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  dealId: uuid("deal_id").references(() => dealsTable.id),
  phase: text("phase"),
  status: text("status").default("DRAFT"),
  classCodes: jsonb("class_codes"),
  lossRuns: jsonb("loss_runs"),
  wcIndicationMin: numeric("wc_indication_min", { precision: 18, scale: 2 }),
  wcIndicationMid: numeric("wc_indication_mid", { precision: 18, scale: 2 }),
  wcIndicationMax: numeric("wc_indication_max", { precision: 18, scale: 2 }),
  wcFinalPremium: numeric("wc_final_premium", { precision: 18, scale: 2 }),
  peoPepm: numeric("peo_pepm", { precision: 10, scale: 2 }),
  peoAnnualTotal: numeric("peo_annual_total", { precision: 18, scale: 2 }),
  ratingBreakdown: jsonb("rating_breakdown"),
  aiRiskScore: numeric("ai_risk_score", { precision: 4, scale: 2 }),
  aiRiskFactors: jsonb("ai_risk_factors"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
  state: text("state"),
  classCode: text("class_code"),
  annualPayroll: numeric("annual_payroll", { precision: 18, scale: 2 }),
  headcount: integer("headcount"),
  eMod: numeric("e_mod", { precision: 4, scale: 2 }).default("1.0"),
  scheduleRating: numeric("schedule_rating", { precision: 4, scale: 2 }).default("1.0"),
  isPeo: boolean("is_peo").default(false),
  wcPremium: numeric("wc_premium", { precision: 18, scale: 2 }),
  monthlyWfsFee: numeric("monthly_wfs_fee", { precision: 18, scale: 2 }),
  pepm: numeric("pepm", { precision: 10, scale: 2 }),
  wcRatingBreakdown: jsonb("wc_rating_breakdown"),
  wfsRatingBreakdown: jsonb("wfs_rating_breakdown"),
  ratedAt: timestamp("rated_at", { withTimezone: true }),
});

export const insertQuoteSchema = createInsertSchema(quotesTable).omit({ id: true, createdAt: true });
export type InsertQuote = z.infer<typeof insertQuoteSchema>;
export type Quote = typeof quotesTable.$inferSelect;
