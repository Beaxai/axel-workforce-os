import { pgTable, uuid, text, timestamp, jsonb, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sql } from "drizzle-orm";

export const quoteDraftsTable = pgTable("quote_drafts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  createdBy: uuid("created_by").notNull(),
  businessName: text("business_name"),
  vertical: text("vertical"),
  coverageType: text("coverage_type"),
  phase: integer("phase").default(1),
  currentStep: integer("current_step").default(1),
  state: jsonb("state").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql`now()`),
});

export const insertQuoteDraftSchema = createInsertSchema(quoteDraftsTable).omit({
  id: true,
  createdBy: true, // set server-side from the authenticated session
  createdAt: true,
  updatedAt: true,
});
export type InsertQuoteDraft = z.infer<typeof insertQuoteDraftSchema>;
export type QuoteDraft = typeof quoteDraftsTable.$inferSelect;
