import { pgTable, uuid, text, numeric, date, boolean, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sql } from "drizzle-orm";

export const rateTablesTable = pgTable("rate_tables", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  carrier: text("carrier").notNull(),
  state: text("state").notNull(),
  classCode: text("class_code").notNull(),
  classDescription: text("class_description").notNull(),
  baseRate: numeric("base_rate", { precision: 8, scale: 4 }).notNull(),
  effectiveDate: date("effective_date").notNull(),
  expirationDate: date("expiration_date"),
  vertical: text("vertical"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
});

export const pepmRatesTable = pgTable("pepm_rates", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  vertical: text("vertical").notNull(),
  employeeBandMin: integer("employee_band_min").notNull(),
  employeeBandMax: integer("employee_band_max"),
  pepmRate: numeric("pepm_rate", { precision: 10, scale: 2 }).notNull(),
  productType: text("product_type").notNull(),
  effectiveDate: date("effective_date").notNull(),
  isActive: boolean("is_active").default(true),
});

export const insertRateTableSchema = createInsertSchema(rateTablesTable).omit({ id: true, createdAt: true });
export type InsertRateTable = z.infer<typeof insertRateTableSchema>;
export type RateTable = typeof rateTablesTable.$inferSelect;

export const insertPepmRateSchema = createInsertSchema(pepmRatesTable).omit({ id: true });
export type InsertPepmRate = z.infer<typeof insertPepmRateSchema>;
export type PepmRate = typeof pepmRatesTable.$inferSelect;
