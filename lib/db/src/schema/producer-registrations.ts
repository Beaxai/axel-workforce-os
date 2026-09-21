import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { agenciesTable } from "./agencies";
import { agentRegistrationsTable } from "./agent-registrations";
import { organizationsTable } from "./organizations";
import { partnersTable } from "./partners";
import { usersTable } from "./users";

export const producerRegistrationDecisionEnum = pgEnum(
  "producer_registration_decision",
  ["pending", "approved", "declined"],
);

export const producerRegistrationDocumentTypeEnum = pgEnum(
  "producer_registration_document_type",
  [
    "agency_license",
    "eo_certificate",
    "section_1033_consent",
    "other",
    "executed_packet",
    "w9",
    "ach_authorization",
  ],
);

export const producerRegistrationDocumentSourceEnum = pgEnum(
  "producer_registration_document_source",
  ["applicant_upload", "signwell"],
);

export const producerRegistrationIngestionStatusEnum = pgEnum(
  "producer_registration_ingestion_status",
  ["pending", "processing", "blocked", "completed", "failed"],
);

export const producerRegistrationJobTypeEnum = pgEnum(
  "producer_registration_job_type",
  ["ingest", "send_packet", "notify_staff"],
);

export const producerRegistrationJobStatusEnum = pgEnum(
  "producer_registration_job_status",
  ["pending", "processing", "blocked", "completed", "failed"],
);

export const producerRegistrationsTable = pgTable(
  "producer_registrations",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizationsTable.id, { onDelete: "restrict" }),
    legacyRegistrationId: uuid("legacy_registration_id").references(
      () => agentRegistrationsTable.id,
      { onDelete: "restrict" },
    ),
    reference: text("reference").notNull(),
    source: text("source").notNull(),
    payload: jsonb("payload").notNull(),
    agencyId: uuid("agency_id").references(() => agenciesTable.id, {
      onDelete: "restrict",
    }),
    principalPartnerId: uuid("principal_partner_id").references(
      () => partnersTable.id,
      { onDelete: "restrict" },
    ),
    signwellEnvelopeId: text("signwell_envelope_id"),
    calendlyEventUri: text("calendly_event_uri"),
    calendlyInviteeUri: text("calendly_invitee_uri"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull(),
    packetSentAt: timestamp("packet_sent_at", { withTimezone: true }),
    packetSignedAt: timestamp("packet_signed_at", { withTimezone: true }),
    callScheduledFor: timestamp("call_scheduled_for", { withTimezone: true }),
    callCompletedAt: timestamp("call_completed_at", { withTimezone: true }),
    callNotes: text("call_notes"),
    decision: producerRegistrationDecisionEnum("decision")
      .notNull()
      .default("pending"),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    decidedBy: uuid("decided_by").references(() => usersTable.id, {
      onDelete: "restrict",
    }),
    countersignedAt: timestamp("countersigned_at", { withTimezone: true }),
    credentialsIssuedAt: timestamp("credentials_issued_at", {
      withTimezone: true,
    }),
    declineReason: text("decline_reason"),
    flags: text("flags").array().notNull().default(sql`ARRAY[]::text[]`),
    createdBy: uuid("created_by").references(() => usersTable.id, {
      onDelete: "restrict",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("uq_producer_registrations_reference").on(table.reference),
    uniqueIndex("uq_producer_registrations_legacy_registration")
      .on(table.legacyRegistrationId)
      .where(sql`${table.legacyRegistrationId} IS NOT NULL`),
    index("idx_producer_registrations_org").on(table.orgId),
    check(
      "chk_producer_registration_reference",
      sql`${table.reference} ~ '^AXR-[0-9]{8}-[A-Za-z0-9]{6}$'`,
    ),
    check(
      "chk_producer_registration_decision_fields",
      sql`(
        (${table.decision} = 'pending' AND ${table.decidedAt} IS NULL AND ${table.decidedBy} IS NULL AND ${table.declineReason} IS NULL)
        OR
        (${table.decision} = 'approved' AND ${table.decidedAt} IS NOT NULL AND ${table.decidedBy} IS NOT NULL AND ${table.declineReason} IS NULL AND ${table.packetSignedAt} IS NOT NULL AND ${table.callCompletedAt} IS NOT NULL)
        OR
        (${table.decision} = 'declined' AND ${table.decidedAt} IS NOT NULL AND ${table.decidedBy} IS NOT NULL AND nullif(btrim(${table.declineReason}), '') IS NOT NULL)
      )`,
    ),
    check(
      "chk_producer_registration_countersign_gate",
      sql`${table.countersignedAt} IS NULL OR (${table.decision} = 'approved' AND ${table.packetSignedAt} IS NOT NULL AND ${table.callCompletedAt} IS NOT NULL)`,
    ),
    check(
      "chk_producer_registration_credentials_gate",
      sql`${table.credentialsIssuedAt} IS NULL OR (${table.decision} = 'approved' AND ${table.callCompletedAt} IS NOT NULL AND ${table.countersignedAt} IS NOT NULL)`,
    ),
    check(
      "chk_producer_registration_approval_links",
      sql`(${table.agencyId} IS NULL AND ${table.principalPartnerId} IS NULL) OR ${table.decision} = 'approved'`,
    ),
    check(
      "chk_producer_registration_call_notes",
      sql`${table.callCompletedAt} IS NULL OR nullif(btrim(${table.callNotes}), '') IS NOT NULL`,
    ),
  ],
);

export const producerRegistrationOwnersTable = pgTable(
  "producer_registration_owners",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    registrationId: uuid("registration_id")
      .notNull()
      .references(() => producerRegistrationsTable.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    title: text("title"),
    ownershipPct: numeric("ownership_pct", { precision: 5, scale: 2 }).notNull(),
    npn: text("npn"),
    residentState: text("resident_state"),
    email: text("email").notNull(),
    signwellRecipientId: text("signwell_recipient_id"),
    exhibitASignedAt: timestamp("exhibit_a_signed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_producer_registration_owners_registration").on(
      table.registrationId,
    ),
    check(
      "chk_producer_registration_owner_pct",
      sql`${table.ownershipPct} >= 0 AND ${table.ownershipPct} <= 100`,
    ),
  ],
);

export const producerRegistrationDocumentsTable = pgTable(
  "producer_registration_documents",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    registrationId: uuid("registration_id")
      .notNull()
      .references(() => producerRegistrationsTable.id, { onDelete: "cascade" }),
    docType: producerRegistrationDocumentTypeEnum("doc_type").notNull(),
    storageKey: text("storage_key"),
    filename: text("filename"),
    contentType: text("content_type"),
    size: bigint("size", { mode: "number" }),
    sha256: text("sha256"),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }),
    source: producerRegistrationDocumentSourceEnum("source").notNull(),
    ingestionStatus: producerRegistrationIngestionStatusEnum("ingestion_status")
      .notNull()
      .default("pending"),
    ingestionErrorCode: text("ingestion_error_code"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_producer_registration_documents_registration").on(
      table.registrationId,
    ),
    check(
      "chk_producer_registration_document_size",
      sql`${table.size} IS NULL OR ${table.size} >= 0`,
    ),
    check(
      "chk_producer_registration_document_sha256",
      sql`${table.sha256} IS NULL OR ${table.sha256} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      "chk_producer_registration_document_ingested",
      sql`${table.ingestionStatus} <> 'completed' OR (${table.storageKey} IS NOT NULL AND ${table.filename} IS NOT NULL AND ${table.contentType} IS NOT NULL AND ${table.size} IS NOT NULL AND ${table.sha256} IS NOT NULL AND ${table.uploadedAt} IS NOT NULL)`,
    ),
    check(
      "chk_producer_registration_document_error_code",
      sql`${table.ingestionErrorCode} IS NULL OR ${table.ingestionErrorCode} ~ '^[A-Z0-9_]{1,80}$'`,
    ),
  ],
);

export const producerRegistrationJobIntentsTable = pgTable(
  "producer_registration_job_intents",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    registrationId: uuid("registration_id")
      .notNull()
      .references(() => producerRegistrationsTable.id, { onDelete: "cascade" }),
    jobType: producerRegistrationJobTypeEnum("job_type").notNull(),
    status: producerRegistrationJobStatusEnum("status")
      .notNull()
      .default("pending"),
    attemptCount: integer("attempt_count").notNull().default(0),
    availableAt: timestamp("available_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    leaseExpiresAt: timestamp("lease_expires_at", { withTimezone: true }),
    nextRetryAt: timestamp("next_retry_at", { withTimezone: true }),
    lastErrorCode: text("last_error_code"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("uq_producer_registration_job_intent").on(
      table.registrationId,
      table.jobType,
    ),
    index("idx_producer_registration_job_claim").on(
      table.status,
      table.availableAt,
      table.nextRetryAt,
    ),
    check(
      "chk_producer_registration_job_attempts",
      sql`${table.attemptCount} >= 0`,
    ),
    check(
      "chk_producer_registration_job_lease",
      sql`${table.status} = 'processing' OR ${table.leaseExpiresAt} IS NULL`,
    ),
    check(
      "chk_producer_registration_job_completion",
      sql`(${table.status} = 'completed') = (${table.completedAt} IS NOT NULL)`,
    ),
    check(
      "chk_producer_registration_job_error_code",
      sql`${table.lastErrorCode} IS NULL OR ${table.lastErrorCode} ~ '^[A-Z0-9_]{1,80}$'`,
    ),
  ],
);

export const insertProducerRegistrationSchema = createInsertSchema(
  producerRegistrationsTable,
).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProducerRegistrationOwnerSchema = createInsertSchema(
  producerRegistrationOwnersTable,
).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProducerRegistrationDocumentSchema = createInsertSchema(
  producerRegistrationDocumentsTable,
).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProducerRegistrationJobIntentSchema = createInsertSchema(
  producerRegistrationJobIntentsTable,
).omit({ id: true, createdAt: true, updatedAt: true });

export type InsertProducerRegistration = z.infer<
  typeof insertProducerRegistrationSchema
>;
export type ProducerRegistration =
  typeof producerRegistrationsTable.$inferSelect;
export type ProducerRegistrationOwner =
  typeof producerRegistrationOwnersTable.$inferSelect;
export type ProducerRegistrationDocument =
  typeof producerRegistrationDocumentsTable.$inferSelect;
export type ProducerRegistrationJobIntent =
  typeof producerRegistrationJobIntentsTable.$inferSelect;