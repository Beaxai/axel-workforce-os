import { pgTable, uuid, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sql } from "drizzle-orm";

export const taskLibraryTable = pgTable("task_library", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  category: text("category").notNull(),
  taskName: text("task_name").notNull(),
  defaultAssigneeRole: text("default_assignee_role"),
  isActive: boolean("is_active").default(true),
  usageCount: integer("usage_count").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
});

export const insertTaskLibrarySchema = createInsertSchema(taskLibraryTable).omit({ id: true, createdAt: true });
export type InsertTaskLibrary = z.infer<typeof insertTaskLibrarySchema>;
export type TaskLibrary = typeof taskLibraryTable.$inferSelect;
