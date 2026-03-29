import { pgTable, uuid, text, integer, boolean, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sql } from "drizzle-orm";
import { dealsTable } from "./deals";
import { policiesTable } from "./policies";
import { usersTable } from "./users";

export const implementationTrackersTable = pgTable("implementation_trackers", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  dealId: uuid("deal_id").references(() => dealsTable.id).unique(),
  policyId: uuid("policy_id").references(() => policiesTable.id),
  productType: text("product_type").notNull(),
  goLiveDate: date("go_live_date").notNull(),
  status: text("status").default("IN_PROGRESS"),
  assignedSpecialist: uuid("assigned_specialist").references(() => usersTable.id),
  overallProgress: integer("overall_progress").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const implementationPhasesTable = pgTable("implementation_phases", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  trackerId: uuid("tracker_id").references(() => implementationTrackersTable.id),
  phaseNumber: integer("phase_number").notNull(),
  phaseName: text("phase_name").notNull(),
  targetDate: date("target_date").notNull(),
  status: text("status").default("PENDING"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const implementationTasksTable = pgTable("implementation_tasks", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  phaseId: uuid("phase_id").references(() => implementationPhasesTable.id),
  trackerId: uuid("tracker_id").references(() => implementationTrackersTable.id),
  taskName: text("task_name").notNull(),
  taskType: text("task_type").notNull(),
  ownerType: text("owner_type").notNull(),
  ownerId: uuid("owner_id"),
  status: text("status").default("PENDING"),
  isMilestone: boolean("is_milestone").default(false),
  milestoneTriggers: text("milestone_triggers"),
  blockedSince: timestamp("blocked_since", { withTimezone: true }),
  reminderSentAt: timestamp("reminder_sent_at", { withTimezone: true }),
  dueDate: date("due_date"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  completedBy: uuid("completed_by").references(() => usersTable.id),
  sortOrder: integer("sort_order").notNull(),
});

export const insertImplementationTrackerSchema = createInsertSchema(implementationTrackersTable).omit({ id: true, createdAt: true });
export type InsertImplementationTracker = z.infer<typeof insertImplementationTrackerSchema>;
export type ImplementationTracker = typeof implementationTrackersTable.$inferSelect;
