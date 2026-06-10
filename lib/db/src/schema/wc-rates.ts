import { pgTable, uuid, text, date, numeric, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sql } from "drizzle-orm";

export const wcRatesTable = pgTable("wc_rates", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  state: text("state").notNull(),
  effectiveDate: date("effective_date").notNull(),
  classCode: text("class_code").notNull(),
  description: text("description"),
  baseRate: numeric("base_rate", { precision: 10, scale: 4 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
}, (table) => [
  // NOTE: no UNIQUE on (state, class_code, effective_date). The 2026 BIC rate
  // table intentionally carries duplicate State+ClassCode rows (same rate, a
  // standard NCCI description + a cannabis-specific description) that share the
  // same effective_date. Lookups always take the most-recent row (limit 1), so
  // duplicates are harmless for rating but must be importable as distinct rows.
  index("idx_wc_rates_state_class").on(table.state, table.classCode),
]);

export const insertWcRateSchema = createInsertSchema(wcRatesTable).omit({ id: true, createdAt: true });
export type InsertWcRate = z.infer<typeof insertWcRateSchema>;
export type WcRate = typeof wcRatesTable.$inferSelect;
