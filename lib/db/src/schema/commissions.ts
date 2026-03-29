import { pgTable, uuid, text, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sql } from "drizzle-orm";
import { dealsTable } from "./deals";
import { policiesTable } from "./policies";
import { usersTable } from "./users";
import { organizationsTable } from "./organizations";

export const commissionsTable = pgTable("commissions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  dealId: uuid("deal_id").references(() => dealsTable.id),
  policyId: uuid("policy_id").references(() => policiesTable.id),
  producerId: uuid("producer_id").references(() => usersTable.id),
  agencyId: uuid("agency_id").references(() => organizationsTable.id),
  grossPremium: numeric("gross_premium", { precision: 18, scale: 2 }),
  producerRate: numeric("producer_rate", { precision: 5, scale: 4 }),
  producerAmount: numeric("producer_amount", { precision: 18, scale: 2 }),
  agencyOverrideRate: numeric("agency_override_rate", { precision: 5, scale: 4 }).default("0"),
  agencyOverrideAmount: numeric("agency_override_amount", { precision: 18, scale: 2 }).default("0"),
  wfsOverrideMonthly: numeric("wfs_override_monthly", { precision: 10, scale: 2 }).default("0"),
  netToAis: numeric("net_to_ais", { precision: 18, scale: 2 }),
  status: text("status").default("PENDING"),
  paidDate: timestamp("paid_date", { withTimezone: true }),
  statementPeriod: text("statement_period"),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
});

export const insertCommissionSchema = createInsertSchema(commissionsTable).omit({ id: true, createdAt: true });
export type InsertCommission = z.infer<typeof insertCommissionSchema>;
export type Commission = typeof commissionsTable.$inferSelect;
