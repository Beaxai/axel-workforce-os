import { pgTable, uuid, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sql } from "drizzle-orm";
import { dealsTable } from "./deals";
import { policiesTable } from "./policies";
import { usersTable } from "./users";

export const policyDocumentsTable = pgTable("policy_documents", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  dealId: uuid("deal_id").references(() => dealsTable.id),
  policyId: uuid("policy_id").references(() => policiesTable.id),
  documentType: text("document_type"),
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url").notNull(),
  fileSize: integer("file_size"),
  generatedBySystem: boolean("generated_by_system").default(false),
  requiresSignature: boolean("requires_signature").default(false),
  signatureStatus: text("signature_status"),
  signatureEnvelopeId: text("signature_envelope_id"),
  signedAt: timestamp("signed_at", { withTimezone: true }),
  source: text("source").default("MANUAL"),
  senderEmail: text("sender_email"),
  uploadedBy: uuid("uploaded_by").references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
});

export const insertPolicyDocumentSchema = createInsertSchema(policyDocumentsTable).omit({ id: true, createdAt: true });
export type InsertPolicyDocument = z.infer<typeof insertPolicyDocumentSchema>;
export type PolicyDocument = typeof policyDocumentsTable.$inferSelect;
