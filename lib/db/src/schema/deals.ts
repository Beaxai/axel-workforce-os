import { pgTable, uuid, text, integer, numeric, boolean, date, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sql } from "drizzle-orm";
import { organizationsTable } from "./organizations";
import { usersTable } from "./users";

export const dealsTable = pgTable("deals", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  referenceCode: text("reference_code").unique().notNull(),
  businessName: text("business_name"),
  orgId: uuid("org_id").references(() => organizationsTable.id),
  ownerId: uuid("owner_id").references(() => usersTable.id),
  producingAgentId: uuid("producing_agent_id").references(() => usersTable.id),
  referralPartnerId: uuid("referral_partner_id").references(() => usersTable.id),
  stage: text("stage").default("SUBMISSION_REVIEW"),
  productType: text("product_type"),
  vertical: text("vertical"),
  state: text("state"),
  employeeCountFt: integer("employee_count_ft"),
  employeeCountPt: integer("employee_count_pt"),
  annualPayroll: numeric("annual_payroll", { precision: 18, scale: 2 }),
  estimatedPremium: numeric("estimated_premium", { precision: 18, scale: 2 }),
  wcPremium: numeric("wc_premium", { precision: 18, scale: 2 }),
  wfsPepmRate: numeric("wfs_pepm_rate", { precision: 10, scale: 2 }),
  wfsPepmMonthly: numeric("wfs_pepm_monthly", { precision: 10, scale: 2 }),
  wfsPepmAnnual: numeric("wfs_pepm_annual", { precision: 10, scale: 2 }),
  totalAnnualCombined: numeric("total_annual_combined", { precision: 18, scale: 2 }),
  emod: numeric("emod", { precision: 4, scale: 3 }),
  yearsInBusiness: integer("years_in_business"),
  fein: text("fein"),
  entityType: text("entity_type"),
  website: text("website"),
  descriptionOfOperations: text("description_of_operations"),
  multipleLocations: boolean("multiple_locations").default(false),
  numberOfLocations: integer("number_of_locations"),
  multipleStates: boolean("multiple_states").default(false),
  statesOfOperation: text("states_of_operation").array(),
  nonRenewed: boolean("non_renewed").default(false),
  lapseInCoverage: boolean("lapse_in_coverage").default(false),
  dateOfLapse: date("date_of_lapse"),
  dealEmailAddress: text("deal_email_address").unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
  closedAt: timestamp("closed_at", { withTimezone: true }),
  metadata: jsonb("metadata"),
});

export const insertDealSchema = createInsertSchema(dealsTable).omit({ id: true, createdAt: true });
export type InsertDeal = z.infer<typeof insertDealSchema>;
export type Deal = typeof dealsTable.$inferSelect;
