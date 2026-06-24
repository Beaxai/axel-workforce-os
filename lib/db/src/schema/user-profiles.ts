import { pgTable, uuid, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sql } from "drizzle-orm";
import { usersTable } from "./users";

/**
 * 1:1 extension of `users` carrying profile/presentation fields that do not
 * belong on the thin auth `users` row. Keyed by a unique `user_id`.
 *
 * `bio` and `internal_notes` are INTERNAL-ONLY and must be stripped server-side
 * for non-internal viewers. `role_metadata` is a single jsonb bag for
 * role-specific fields that have no first-class home yet (e.g. UNDERWRITER
 * lines/states/verticals, CSA department/territory) — deliberately avoiding
 * sparse per-role columns on `users`.
 */
export const userProfilesTable = pgTable("user_profiles", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id")
    .references(() => usersTable.id, { onDelete: "cascade" })
    .unique()
    .notNull(),
  title: text("title"),
  timezone: text("timezone"),
  bio: text("bio"),
  internalNotes: text("internal_notes"),
  roleMetadata: jsonb("role_metadata"),
  dateJoined: timestamp("date_joined", { withTimezone: true }).default(sql`now()`),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql`now()`),
});

export const insertUserProfileSchema = createInsertSchema(userProfilesTable).omit({
  id: true,
  updatedAt: true,
});
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type UserProfile = typeof userProfilesTable.$inferSelect;
