import { pgTable, uuid, text, numeric, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sql } from "drizzle-orm";

export const appetiteTable = pgTable("appetite", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  state: text("state").notNull(),
  classCode: text("class_code").notNull(),
  description: text("description"),
  baseRate: numeric("base_rate", { precision: 10, scale: 4 }),
  uwDetermination: text("uw_determination").notNull().default("Unknown"),
  uwConsiderations: text("uw_considerations"),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql`now()`),
}, (table) => [
  uniqueIndex("uq_appetite_state_code").on(table.state, table.classCode),
  index("idx_appetite_determination").on(table.uwDetermination),
]);

export const insertAppetiteSchema = createInsertSchema(appetiteTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAppetite = z.infer<typeof insertAppetiteSchema>;
export type Appetite = typeof appetiteTable.$inferSelect;
