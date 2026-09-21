import { sql } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizationsTable } from "./organizations";
import { producerRegistrationsTable } from "./producer-registrations";
import { usersTable } from "./users";

/**
 * Values are deliberately limited by the application to milestone timestamps
 * and decision labels. Intake payloads, legal answers, document keys, and call
 * notes must never be copied into this audit table.
 */
export const producerRegistrationActivityTable = pgTable(
  "producer_registration_activity",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizationsTable.id, { onDelete: "restrict" }),
    registrationId: uuid("registration_id")
      .notNull()
      .references(() => producerRegistrationsTable.id, { onDelete: "cascade" }),
    actorId: uuid("actor_id").references(() => usersTable.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    before: jsonb("before").$type<Record<string, string | null>>(),
    after: jsonb("after").$type<Record<string, string | null>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_producer_registration_activity_feed").on(
      table.registrationId,
      table.createdAt,
    ),
    index("idx_producer_registration_activity_org").on(table.orgId),
  ],
);

export const insertProducerRegistrationActivitySchema = createInsertSchema(
  producerRegistrationActivityTable,
).omit({ id: true, createdAt: true });

export type InsertProducerRegistrationActivity = z.infer<
  typeof insertProducerRegistrationActivitySchema
>;
export type ProducerRegistrationActivity =
  typeof producerRegistrationActivityTable.$inferSelect;