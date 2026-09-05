import { sql } from "drizzle-orm";
import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { agentRegistrationsTable } from "./agent-registrations";
import { partnersTable } from "./partners";
import { usersTable } from "./users";

export const agentProfilesTable = pgTable("agent_profiles", {
  partnerId: uuid("partner_id")
    .primaryKey()
    .references(() => partnersTable.id),
  registrationId: uuid("registration_id").references(
    () => agentRegistrationsTable.id,
  ),
  userId: uuid("user_id").references(() => usersTable.id),
  firstName: text("first_name").notNull(),
  lastName: text("last_name"),
  title: text("title"),
  phoneDirect: text("phone_direct"),
  phoneMobile: text("phone_mobile"),
  individualNpn: text("individual_npn"),
  licenseNumbers: jsonb("license_numbers"),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql`now()`),
});

export const insertAgentProfileSchema = createInsertSchema(
  agentProfilesTable,
).omit({ createdAt: true, updatedAt: true });
export type InsertAgentProfile = z.infer<typeof insertAgentProfileSchema>;
export type AgentProfile = typeof agentProfilesTable.$inferSelect;