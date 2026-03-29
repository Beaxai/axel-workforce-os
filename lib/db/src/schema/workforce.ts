import { pgTable, uuid, text, integer, numeric, date, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { organizationsTable } from "./organizations";

export const workforceSummariesTable = pgTable("workforce_summaries", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: uuid("org_id").references(() => organizationsTable.id).unique(),
  snapshotDate: date("snapshot_date").notNull(),
  totalEmployees: integer("total_employees").default(0),
  ftEmployees: integer("ft_employees").default(0),
  ptEmployees: integer("pt_employees").default(0),
  totalAnnualPayroll: numeric("total_annual_payroll", { precision: 18, scale: 2 }).default("0"),
  ytdPayroll: numeric("ytd_payroll", { precision: 18, scale: 2 }).default("0"),
  newHiresMtd: integer("new_hires_mtd").default(0),
  terminationsMtd: integer("terminations_mtd").default(0),
  openClaimsCount: integer("open_claims_count").default(0),
  experienceModifier: numeric("experience_modifier", { precision: 4, scale: 3 }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql`now()`),
});

export const verticalWorkforceRollupsTable = pgTable("vertical_workforce_rollups", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  vertical: text("vertical").notNull(),
  snapshotDate: date("snapshot_date").notNull(),
  clientCount: integer("client_count").default(0),
  totalEmployees: integer("total_employees").default(0),
  totalPayroll: numeric("total_payroll", { precision: 18, scale: 2 }).default("0"),
  totalPremium: numeric("total_premium", { precision: 18, scale: 2 }).default("0"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql`now()`),
});
