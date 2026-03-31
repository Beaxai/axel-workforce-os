import { pgTable, uuid, text, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sql } from "drizzle-orm";
import { dealsTable } from "./deals";
import { bindDocumentPackagesTable } from "./submission";
import { proposalsTable } from "./proposals";

export const signatureRequestsTable = pgTable("signature_requests", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  bindPackageId: uuid("bind_package_id").references(() => bindDocumentPackagesTable.id, { onDelete: "cascade" }),
  dealId: uuid("deal_id").references(() => dealsTable.id, { onDelete: "cascade" }),
  proposalId: uuid("proposal_id").references(() => proposalsTable.id),
  hellosignSignatureRequestId: text("hellosign_signature_request_id").unique().notNull(),
  hellosignSigningUrl: text("hellosign_signing_url"),
  hellosignFilesUrl: text("hellosign_files_url"),
  signers: jsonb("signers").notNull().default(sql`'[]'::jsonb`),
  status: text("status").notNull().default("pending"),
  signedDocumentsPath: text("signed_documents_path"),
  signedAt: timestamp("signed_at", { withTimezone: true }),
  webhookEvents: jsonb("webhook_events").default(sql`'[]'::jsonb`),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql`now()`),
}, (t) => [
  index("idx_signature_requests_bind").on(t.bindPackageId),
  index("idx_signature_requests_hs_id").on(t.hellosignSignatureRequestId),
  index("idx_signature_requests_deal").on(t.dealId),
]);

export const uwFileViewsTable = pgTable("uw_file_views", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  dealId: uuid("deal_id").references(() => dealsTable.id, { onDelete: "cascade" }),
  viewerId: uuid("viewer_id"),
  documentType: text("document_type"),
  storagePath: text("storage_path"),
  viewedAt: timestamp("viewed_at", { withTimezone: true }).default(sql`now()`),
}, (t) => [
  index("idx_uw_file_views_deal").on(t.dealId),
]);

export const insertSignatureRequestSchema = createInsertSchema(signatureRequestsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSignatureRequest = z.infer<typeof insertSignatureRequestSchema>;
export type SignatureRequest = typeof signatureRequestsTable.$inferSelect;

export const insertUwFileViewSchema = createInsertSchema(uwFileViewsTable).omit({ id: true, viewedAt: true });
export type InsertUwFileView = z.infer<typeof insertUwFileViewSchema>;
export type UwFileView = typeof uwFileViewsTable.$inferSelect;
