import { pgTable, uuid, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sql } from "drizzle-orm";
import { agenciesTable } from "./agencies";

export const partnersTable = pgTable("partners", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  partnerType: text("partner_type").notNull(),
  name: text("name").notNull(),
  agencyName: text("agency_name"),
  agencyId: uuid("agency_id").references(() => agenciesTable.id),
  licenseStates: text("license_states").array(),
  npn: text("npn"),
  contactName: text("contact_name"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  status: text("status").default("Active"),
  notes: text("notes"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql`now()`),
});

export const insertPartnerSchema = createInsertSchema(partnersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPartner = z.infer<typeof insertPartnerSchema>;
export type Partner = typeof partnersTable.$inferSelect;
