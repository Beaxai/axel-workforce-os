import { pgTable, uuid, text, numeric, date, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sql } from "drizzle-orm";
import { dealsTable } from "./deals";
import { organizationsTable } from "./organizations";

export const policiesTable = pgTable("policies", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  dealId: uuid("deal_id").references(() => dealsTable.id),
  orgId: uuid("org_id").references(() => organizationsTable.id),
  carrierOrgId: uuid("carrier_org_id").references(() => organizationsTable.id),
  policyNumber: text("policy_number").unique(),
  policyType: text("policy_type"),
  status: text("status").default("BOUND"),
  effectiveDate: date("effective_date"),
  expirationDate: date("expiration_date"),
  estimatedPremium: numeric("estimated_premium", { precision: 18, scale: 2 }),
  currentPremium: numeric("current_premium", { precision: 18, scale: 2 }),
  wfsPepmRate: numeric("wfs_pepm_rate", { precision: 10, scale: 2 }),
  coverageData: jsonb("coverage_data"),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
});

export const insertPolicySchema = createInsertSchema(policiesTable).omit({ id: true, createdAt: true });
export type InsertPolicy = z.infer<typeof insertPolicySchema>;
export type Policy = typeof policiesTable.$inferSelect;
