import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizationsTable } from "./organizations";
import { producerRegistrationsTable } from "./producer-registrations";

export const producerNotificationEventEnum = pgEnum(
  "producer_notification_event",
  [
    "registration_received",
    "packet_sent",
    "exhibit_a_request",
    "call_reminder",
    "scheduling_nudge",
    "approved_countersigned",
    "credentials_issued",
    "declined",
    "new_registration",
    "ready_for_decision",
    "packet_declined_or_expired",
    "unmatched_booking",
    "countersign_needed",
    "scheduling_link",
    "booking_canceled",
  ],
);

export const producerNotificationStatusEnum = pgEnum(
  "producer_notification_status",
  ["blocked", "pending", "sending", "sent", "failed"],
);

export const producerNotificationsTable = pgTable(
  "producer_notifications",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizationsTable.id, { onDelete: "restrict" }),
    registrationId: uuid("registration_id").references(
      () => producerRegistrationsTable.id,
      { onDelete: "cascade" },
    ),
    event: producerNotificationEventEnum("event").notNull(),
    dedupeKey: text("dedupe_key").notNull(),
    recipientEmails: text("recipient_emails").array().notNull(),
    templateData: jsonb("template_data").notNull(),
    subject: text("subject").notNull(),
    html: text("html").notNull(),
    text: text("text").notNull(),
    status: producerNotificationStatusEnum("status")
      .notNull()
      .default("blocked"),
    failureCode: text("failure_code"),
    attemptCount: integer("attempt_count").notNull().default(0),
    availableAt: timestamp("available_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    nextRetryAt: timestamp("next_retry_at", { withTimezone: true }),
    sendingStartedAt: timestamp("sending_started_at", { withTimezone: true }),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("uq_producer_notifications_org_dedupe").on(
      table.orgId,
      table.dedupeKey,
    ),
    index("idx_producer_notifications_registration").on(table.registrationId),
    index("idx_producer_notifications_delivery").on(
      table.status,
      table.availableAt,
      table.nextRetryAt,
    ),
    check(
      "chk_producer_notifications_dedupe_key",
      sql`nullif(btrim(${table.dedupeKey}), '') IS NOT NULL`,
    ),
    check(
      "chk_producer_notifications_recipients",
      sql`cardinality(${table.recipientEmails}) > 0`,
    ),
    check(
      "chk_producer_notifications_attempt_count",
      sql`${table.attemptCount} >= 0`,
    ),
    check(
      "chk_producer_notifications_failure_code",
      sql`${table.failureCode} IS NULL OR ${table.failureCode} ~ '^[A-Z0-9_]{1,80}$'`,
    ),
    check(
      "chk_producer_notifications_sent_at",
      sql`(${table.status} = 'sent') = (${table.sentAt} IS NOT NULL)`,
    ),
    check(
      "chk_producer_notifications_sending_started",
      sql`${table.status} = 'sending' OR ${table.sendingStartedAt} IS NULL`,
    ),
  ],
);

export const insertProducerNotificationSchema = createInsertSchema(
  producerNotificationsTable,
).omit({ id: true, createdAt: true, updatedAt: true });

export type InsertProducerNotification = z.infer<
  typeof insertProducerNotificationSchema
>;
export type ProducerNotification = typeof producerNotificationsTable.$inferSelect;