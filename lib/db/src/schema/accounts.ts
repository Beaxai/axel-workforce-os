import { pgTable, uuid, text, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sql } from "drizzle-orm";
import { usersTable } from "./users";

export const accountsTable = pgTable("accounts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  businessName: text("business_name").notNull(),
  vertical: text("vertical"),
  state: text("state"),
  annualPayroll: numeric("annual_payroll", { precision: 18, scale: 2 }),
  headcount: integer("headcount"),
  accountStatus: text("account_status").default("Prospect"),
  primaryContact: text("primary_contact"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  notes: text("notes"),
  assignedCsa: uuid("assigned_csa").references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql`now()`),
});

export const insertAccountSchema = createInsertSchema(accountsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAccount = z.infer<typeof insertAccountSchema>;
export type Account = typeof accountsTable.$inferSelect;
