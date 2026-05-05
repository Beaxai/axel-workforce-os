import { pgTable, text, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const aiClassifyCacheTable = pgTable("ai_classify_cache", {
  key: text("key").primaryKey(),
  description: text("description").notNull(),
  state: text("state").notNull(),
  suggestions: jsonb("suggestions").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`).notNull(),
}, (table) => [
  index("idx_ai_classify_cache_expires_at").on(table.expiresAt),
]);

export type AiClassifyCacheRow = typeof aiClassifyCacheTable.$inferSelect;
