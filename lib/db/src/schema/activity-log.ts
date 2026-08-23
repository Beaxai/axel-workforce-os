import { pgTable, uuid, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sql } from "drizzle-orm";
import { dealsTable } from "./deals";
import { dealMarketsTable } from "./markets";

export const activityLogTable = pgTable("activity_log", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  dealId: uuid("deal_id").references(() => dealsTable.id),
  // Nullable: scopes this activity record to a specific market thread;
  // null = general deal activity.
  dealMarketId: uuid("deal_market_id").references(() => dealMarketsTable.id),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id").notNull(),
  eventType: text("event_type").notNull(),
  description: text("description").notNull(),
  metadata: jsonb("metadata"),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
});

export const insertActivityLogSchema = createInsertSchema(activityLogTable).omit({ id: true, createdAt: true });
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ActivityLog = typeof activityLogTable.$inferSelect;
