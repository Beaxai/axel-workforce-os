import { sql } from "drizzle-orm";
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { partnersTable } from "./partners";

export const nameReviewTable = pgTable("name_review", {
  partnerId: uuid("partner_id")
    .primaryKey()
    .references(() => partnersTable.id),
  originalValue: text("original_value").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
});

export const insertNameReviewSchema = createInsertSchema(nameReviewTable).omit({
  createdAt: true,
});
export type InsertNameReview = z.infer<typeof insertNameReviewSchema>;
export type NameReview = typeof nameReviewTable.$inferSelect;