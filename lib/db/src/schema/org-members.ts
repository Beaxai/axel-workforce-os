import { pgTable, uuid, text, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sql } from "drizzle-orm";
import { usersTable } from "./users";
import { organizationsTable } from "./organizations";

export const orgMembersTable = pgTable("org_members", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => usersTable.id),
  orgId: uuid("org_id").references(() => organizationsTable.id),
  role: text("role").notNull(),
  permissions: jsonb("permissions"),
  isPrimaryOrg: boolean("is_primary_org").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
});

export const insertOrgMemberSchema = createInsertSchema(orgMembersTable).omit({ id: true, createdAt: true });
export type InsertOrgMember = z.infer<typeof insertOrgMemberSchema>;
export type OrgMember = typeof orgMembersTable.$inferSelect;
