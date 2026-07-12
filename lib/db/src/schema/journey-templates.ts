import { pgTable, uuid, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sql } from "drizzle-orm";

export const journeyTemplatesTable = pgTable("journey_templates", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type").notNull(),                 // IMPLEMENTATION | ONBOARDING
  productType: text("product_type").notNull(),  // WC | PEO | ASO | ANY
  isActive: boolean("is_active").notNull().default(true),
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql`now()`),
});

export const journeyTemplatePhasesTable = pgTable("journey_template_phases", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  templateId: uuid("template_id").notNull().references(() => journeyTemplatesTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull(),
  targetOffsetDays: integer("target_offset_days").notNull().default(0),
});

export const journeyTemplateTasksTable = pgTable("journey_template_tasks", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  templateId: uuid("template_id").notNull().references(() => journeyTemplatesTable.id, { onDelete: "cascade" }),
  phaseId: uuid("phase_id").notNull().references(() => journeyTemplatePhasesTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  taskType: text("task_type").notNull().default("TASK"),
  ownerType: text("owner_type").notNull(),      // INTERNAL_SPECIALIST | CLIENT | AGENT | CARRIER
  isMilestone: boolean("is_milestone").notNull().default(false),
  offsetDays: integer("offset_days").notNull().default(0),
  sortOrder: integer("sort_order").notNull(),
});

export const insertJourneyTemplateSchema = createInsertSchema(journeyTemplatesTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertJourneyTemplatePhaseSchema = createInsertSchema(journeyTemplatePhasesTable).omit({ id: true });
export const insertJourneyTemplateTaskSchema = createInsertSchema(journeyTemplateTasksTable).omit({ id: true });
export type JourneyTemplate = typeof journeyTemplatesTable.$inferSelect;
export type JourneyTemplatePhase = typeof journeyTemplatePhasesTable.$inferSelect;
export type JourneyTemplateTask = typeof journeyTemplateTasksTable.$inferSelect;
