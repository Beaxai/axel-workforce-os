import { pgTable, uuid, text, integer, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sql } from "drizzle-orm";
import { dealsTable } from "./deals";
import { usersTable } from "./users";

export const tasksTable = pgTable("tasks", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  dealId: uuid("deal_id").references(() => dealsTable.id),
  libraryTaskId: uuid("library_task_id"),
  taskName: text("task_name").notNull(),
  category: text("category"),
  assignedTo: uuid("assigned_to").references(() => usersTable.id),
  dueDate: date("due_date"),
  priority: text("priority").default("MEDIUM"),
  status: text("status").default("OPEN"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  completedBy: uuid("completed_by").references(() => usersTable.id),
  sortOrder: integer("sort_order").default(0),
  createdBy: uuid("created_by").references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
});

export const insertTaskSchema = createInsertSchema(tasksTable).omit({ id: true, createdAt: true });
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasksTable.$inferSelect;
