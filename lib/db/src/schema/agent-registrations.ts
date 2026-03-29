import { pgTable, uuid, text, numeric, date, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sql } from "drizzle-orm";
import { usersTable } from "./users";
import { organizationsTable } from "./organizations";
import { partnersTable } from "./partners";

export const agentRegistrationsTable = pgTable("agent_registrations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  agencyName: text("agency_name").notNull(),
  agencyDba: text("agency_dba"),
  agencyAddress: text("agency_address").notNull(),
  agencyPhone: text("agency_phone").notNull(),
  agencyWebsite: text("agency_website"),
  agencyNpn: text("agency_npn"),
  statesLicensed: jsonb("states_licensed"),
  linesOfAuthority: jsonb("lines_of_authority"),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  title: text("title"),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  individualNpn: text("individual_npn"),
  licenseNumbers: jsonb("license_numbers"),
  eoCarrier: text("eo_carrier").notNull(),
  eoPolicyNumber: text("eo_policy_number").notNull(),
  eoCoverageAmount: numeric("eo_coverage_amount", { precision: 18, scale: 2 }).notNull(),
  eoExpirationDate: date("eo_expiration_date").notNull(),
  eoCertificateUrl: text("eo_certificate_url").notNull(),
  status: text("status").default("PENDING_REVIEW"),
  reviewedBy: uuid("reviewed_by").references(() => usersTable.id),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  declineReason: text("decline_reason"),
  agreementEnvelopeId: text("agreement_envelope_id"),
  agreementSentAt: timestamp("agreement_sent_at", { withTimezone: true }),
  agreementSignedAt: timestamp("agreement_signed_at", { withTimezone: true }),
  agreementUrl: text("agreement_url"),
  zoomScheduledAt: timestamp("zoom_scheduled_at", { withTimezone: true }),
  zoomCompletedAt: timestamp("zoom_completed_at", { withTimezone: true }),
  onboardingAdminId: uuid("onboarding_admin_id").references(() => usersTable.id),
  referralSource: text("referral_source"),
  partnerId: uuid("partner_id").references(() => partnersTable.id),
  userId: uuid("user_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
});

export const agentComplianceTable = pgTable("agent_compliance", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  agencyOrgId: uuid("agency_org_id").references(() => organizationsTable.id),
  complianceType: text("compliance_type").notNull(),
  state: text("state"),
  expirationDate: date("expiration_date").notNull(),
  documentUrl: text("document_url"),
  status: text("status").default("ACTIVE"),
  reminder90Sent: boolean("reminder_90_sent").default(false),
  reminder30Sent: boolean("reminder_30_sent").default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql`now()`),
});

export const insertAgentRegistrationSchema = createInsertSchema(agentRegistrationsTable).omit({ id: true, createdAt: true });
export type InsertAgentRegistration = z.infer<typeof insertAgentRegistrationSchema>;
export type AgentRegistration = typeof agentRegistrationsTable.$inferSelect;
