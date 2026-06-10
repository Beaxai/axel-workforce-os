import { pgTable, serial, integer, text, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const caTerritorialRatesTable = pgTable("ca_territorial_rates", {
  id: serial("id").primaryKey(),
  zipPrefixMin: integer("zip_prefix_min").notNull(),
  zipPrefixMax: integer("zip_prefix_max").notNull(),
  territory: integer("territory").notNull(),
  counties: text("counties"),
  multiplier: numeric("multiplier", { precision: 4, scale: 2 }).notNull(),
});

export const insertCaTerritorialRateSchema = createInsertSchema(caTerritorialRatesTable).omit({ id: true });
export type InsertCaTerritorialRate = z.infer<typeof insertCaTerritorialRateSchema>;
export type CaTerritorialRate = typeof caTerritorialRatesTable.$inferSelect;
