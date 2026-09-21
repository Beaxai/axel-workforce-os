import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { trustedAxelOrganizationsTable } from "./organizations";
import { producerRegistrationsTable } from "./producer-registrations";

export const producerCalendlyEventsTable = pgTable(
  "producer_calendly_events",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    orgId: uuid("org_id").notNull().references(
      () => trustedAxelOrganizationsTable.orgId,
      { onDelete: "restrict" },
    ),
    registrationId: uuid("registration_id").references(
      () => producerRegistrationsTable.id,
      { onDelete: "set null" },
    ),
    eventName: text("event_name").notNull(),
    payloadHash: text("payload_hash").notNull(),
    inviteeUri: text("invitee_uri"),
    scheduledEventUri: text("scheduled_event_uri"),
    sourceEventAt: timestamp("source_event_at", { withTimezone: true }).notNull(),
    outcome: text("outcome").notNull(),
    sanitizedData: jsonb("sanitized_data").notNull().default(sql`'{}'::jsonb`),
    staffNeedsReview: boolean("staff_needs_review").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("uq_producer_calendly_events_hash").on(table.payloadHash),
    index("idx_producer_calendly_events_invitee_time").on(
      table.inviteeUri,
      table.sourceEventAt,
    ),
    index("idx_producer_calendly_events_review").on(
      table.staffNeedsReview,
      table.createdAt,
    ),
    check(
      "chk_producer_calendly_events_hash",
      sql`${table.payloadHash} ~ '^[0-9a-f]{64}$'`,
    ),
  ],
);

export const producerCalendlyBookingsTable = pgTable(
  "producer_calendly_bookings",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    registrationId: uuid("registration_id").notNull().references(
      () => producerRegistrationsTable.id,
      { onDelete: "cascade" },
    ),
    orgId: uuid("org_id").notNull().references(
      () => trustedAxelOrganizationsTable.orgId,
      { onDelete: "restrict" },
    ),
    eventUri: text("event_uri").notNull(),
    inviteeUri: text("invitee_uri").notNull(),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }).notNull(),
    meetingUrl: text("meeting_url"),
    sourceEventAt: timestamp("source_event_at", { withTimezone: true }).notNull(),
    active: boolean("active").notNull().default(true),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("uq_producer_calendly_bookings_registration").on(table.registrationId),
    index("idx_producer_calendly_bookings_org_active").on(table.orgId, table.active),
  ],
);

export const insertProducerCalendlyEventSchema = createInsertSchema(
  producerCalendlyEventsTable,
).omit({ id: true, createdAt: true });
export const insertProducerCalendlyBookingSchema = createInsertSchema(
  producerCalendlyBookingsTable,
).omit({ id: true, updatedAt: true });

export type InsertProducerCalendlyEvent = z.infer<typeof insertProducerCalendlyEventSchema>;
export type ProducerCalendlyEvent = typeof producerCalendlyEventsTable.$inferSelect;
export type InsertProducerCalendlyBooking = z.infer<typeof insertProducerCalendlyBookingSchema>;
export type ProducerCalendlyBooking = typeof producerCalendlyBookingsTable.$inferSelect;