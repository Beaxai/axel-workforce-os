import { pgTable, uuid, text, integer, numeric, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sql } from "drizzle-orm";
import { usersTable } from "./users";

export const accountsTable = pgTable("accounts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  businessName: text("business_name").notNull(),
  legalName: text("legal_name"),
  dba: text("dba"),
  fein: text("fein"),
  entityType: text("entity_type"),
  naics: text("naics"),
  vertical: text("vertical"),
  state: text("state"),
  productType: text("product_type"),
  annualPayroll: numeric("annual_payroll", { precision: 18, scale: 2 }),
  headcount: integer("headcount"),
  emod: numeric("emod", { precision: 4, scale: 3 }),
  classCodes: jsonb("class_codes"),
  locations: jsonb("locations"),
  clientStage: text("client_stage").default("Prospect"),
  primaryContact: text("primary_contact"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  notes: text("notes"),
  assignedCsa: uuid("assigned_csa").references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql`now()`),
});

/** Canonical client_stage values. Prospects tab = first two; Clients tab = last two. */
export const CLIENT_STAGES = ["Prospect", "Active Prospect", "New Client", "Active Client"] as const;
export type ClientStage = (typeof CLIENT_STAGES)[number];
export const PROSPECT_STAGES = ["Prospect", "Active Prospect"] as const;
export const CLIENT_TAB_STAGES = ["New Client", "Active Client"] as const;

export const insertAccountSchema = createInsertSchema(accountsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAccount = z.infer<typeof insertAccountSchema>;
export type Account = typeof accountsTable.$inferSelect;
