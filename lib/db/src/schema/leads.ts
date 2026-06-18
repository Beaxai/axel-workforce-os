import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sql } from "drizzle-orm";
import { usersTable } from "./users";
import { accountsTable } from "./accounts";

export const LEAD_SOURCES = ["purchased_list", "inbound", "referral", "event", "other"] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

export const LEAD_STATUSES = ["new", "working", "qualified", "converted", "dead"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const leadsTable = pgTable("leads", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  companyName: text("company_name").notNull(),
  contactName: text("contact_name"),
  email: text("email"),
  phone: text("phone"),
  state: text("state"),
  vertical: text("vertical"),
  source: text("source").default("other"),
  sourceDetail: text("source_detail"),
  status: text("status").default("new"),
  notes: text("notes"),
  assignedTo: uuid("assigned_to").references(() => usersTable.id),
  convertedAccountId: uuid("converted_account_id").references(() => accountsTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql`now()`),
});

export const insertLeadSchema = createInsertSchema(leadsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Lead = typeof leadsTable.$inferSelect;
