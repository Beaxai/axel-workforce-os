import { pgTable, uuid, text, integer, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sql } from "drizzle-orm";
import { dealsTable } from "./deals";

/** P5-WC §6A — the bind subjectivities checklist. System-owned like the WC tracker:
 *  admins may not edit the 10 spec items (Curtis 2026-07-16). */
export const subjectivityTemplatesTable = pgTable("subjectivity_templates", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  productType: text("product_type").notNull(), // WC | PEO | ASO | ASO_CAPTIVE | ANY
  isActive: boolean("is_active").notNull().default(true),
  isSystem: boolean("is_system").notNull().default(false),
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql`now()`),
});

export const subjectivityTemplateItemsTable = pgTable("subjectivity_template_items", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  templateId: uuid("template_id").notNull().references(() => subjectivityTemplatesTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull(),
  systemKey: text("system_key"),
  /** True when inclusion/flagging is decided at generation time (item 9). */
  isConditional: boolean("is_conditional").notNull().default(false),
  /** False for items that never prevent binding (item 10, the broker fee). */
  isBlocking: boolean("is_blocking").notNull().default(true),
  notes: text("notes"),
});

export const dealSubjectivitiesTable = pgTable("deal_subjectivities", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  dealId: uuid("deal_id").notNull().references(() => dealsTable.id, { onDelete: "cascade" }),
  templateId: uuid("template_id").references(() => subjectivityTemplatesTable.id),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull(),
  systemKey: text("system_key"),
  /** OPEN | SATISFIED | WAIVED | NOT_APPLICABLE */
  status: text("status").notNull().default("OPEN"),
  isBlocking: boolean("is_blocking").notNull().default(true),
  /** Why a conditional item was auto-opened (e.g. the staleness reason). */
  autoFlagReason: text("auto_flag_reason"),
  notes: text("notes"),
  satisfiedAt: timestamp("satisfied_at", { withTimezone: true }),
  satisfiedBy: uuid("satisfied_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql`now()`),
}, (t) => [
  index("idx_deal_subjectivities_deal").on(t.dealId),
]);

export const insertSubjectivityTemplateSchema = createInsertSchema(subjectivityTemplatesTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSubjectivityTemplateItemSchema = createInsertSchema(subjectivityTemplateItemsTable).omit({ id: true });
export const insertDealSubjectivitySchema = createInsertSchema(dealSubjectivitiesTable).omit({ id: true, createdAt: true, updatedAt: true });

export type SubjectivityTemplate = typeof subjectivityTemplatesTable.$inferSelect;
export type SubjectivityTemplateItem = typeof subjectivityTemplateItemsTable.$inferSelect;
export type DealSubjectivity = typeof dealSubjectivitiesTable.$inferSelect;

export const SUBJECTIVITY_STATUSES = ["OPEN", "SATISFIED", "WAIVED", "NOT_APPLICABLE"] as const;
