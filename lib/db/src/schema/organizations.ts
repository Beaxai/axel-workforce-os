import { pgTable, uuid, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sql } from "drizzle-orm";

export const organizationsTable = pgTable("organizations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type").notNull(),
  vertical: text("vertical"),
  naicsCode: text("naics_code"),
  status: text("status").default("ACTIVE"),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
  metadata: jsonb("metadata"),
});

/**
 * Explicit, fail-closed trust anchor for Axel-owned organizations.  This is
 * deliberately not inferred from an organization name, type, seed ID, or a
 * user's role.  There is no application CRUD route for this table: changes
 * require an audited privileged database migration/operation.
 */
export const trustedAxelOrganizationsTable = pgTable("trusted_axel_organizations", {
  orgId: uuid("org_id").primaryKey().references(() => organizationsTable.id, { onDelete: "restrict" }),
  configuredByUserId: uuid("configured_by_user_id"),
  configuredAt: timestamp("configured_at", { withTimezone: true }).notNull().default(sql`now()`),
  note: text("note"),
});

export const insertOrganizationSchema = createInsertSchema(organizationsTable).omit({ id: true, createdAt: true });
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type Organization = typeof organizationsTable.$inferSelect;
