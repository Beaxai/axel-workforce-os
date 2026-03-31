import { pgTable, uuid, text, integer, boolean, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sql } from "drizzle-orm";
import { dealsTable } from "./deals";
import { quotesTable } from "./quotes";
import { usersTable } from "./users";

export const submissionQuestionSetsTable = pgTable("submission_question_sets", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  verticalId: text("vertical_id").notNull(),
  verticalLabel: text("vertical_label").notNull(),
  version: integer("version").notNull().default(1),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
});

export const submissionQuestionsTable = pgTable("submission_questions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  questionSetId: uuid("question_set_id").references(() => submissionQuestionSetsTable.id, { onDelete: "cascade" }),
  section: text("section").notNull(),
  displayOrder: integer("display_order").notNull(),
  answerKey: text("answer_key").notNull(),
  questionText: text("question_text").notNull(),
  helpText: text("help_text"),
  inputType: text("input_type").notNull(),
  options: jsonb("options"),
  isRequired: boolean("is_required").default(true),
  conditionalOnKey: text("conditional_on_key"),
  conditionalOnValue: text("conditional_on_value"),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
}, (t) => [
  index("idx_submission_questions_set").on(t.questionSetId, t.displayOrder),
]);

export const submissionAnswersTable = pgTable("submission_answers", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  dealId: uuid("deal_id").references(() => dealsTable.id, { onDelete: "cascade" }),
  quoteId: uuid("quote_id").references(() => quotesTable.id),
  questionSetId: uuid("question_set_id").references(() => submissionQuestionSetsTable.id),
  answers: jsonb("answers").notNull().default({}),
  submittedBy: uuid("submitted_by").references(() => usersTable.id),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  status: text("status").notNull().default("draft"),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql`now()`),
}, (t) => [
  index("idx_submission_answers_deal").on(t.dealId),
]);

export const formFieldMappingsTable = pgTable("form_field_mappings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  answerKey: text("answer_key").notNull(),
  documentType: text("document_type").notNull(),
  pdfFieldName: text("pdf_field_name").notNull(),
  transform: text("transform"),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
}, (t) => [
  index("idx_form_field_mappings_key").on(t.answerKey, t.documentType),
]);

export const lossHistoryDocumentsTable = pgTable("loss_history_documents", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  dealId: uuid("deal_id").references(() => dealsTable.id, { onDelete: "cascade" }),
  quoteId: uuid("quote_id").references(() => quotesTable.id),
  fileName: text("file_name").notNull(),
  storagePath: text("storage_path").notNull(),
  fileSizeBytes: integer("file_size_bytes"),
  uploadedBy: uuid("uploaded_by").references(() => usersTable.id),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).default(sql`now()`),
  yearsCovered: text("years_covered"),
  notes: text("notes"),
}, (t) => [
  index("idx_loss_history_deal").on(t.dealId),
]);

export const bindDocumentPackagesTable = pgTable("bind_document_packages", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  dealId: uuid("deal_id").references(() => dealsTable.id, { onDelete: "cascade" }),
  quoteId: uuid("quote_id").references(() => quotesTable.id),
  requestedBy: uuid("requested_by").references(() => usersTable.id),
  requestedAt: timestamp("requested_at", { withTimezone: true }).default(sql`now()`),
  status: text("status").notNull().default("generating"),
  documents: jsonb("documents"),
  lossHistoryIncluded: boolean("loss_history_included").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql`now()`),
}, (t) => [
  index("idx_bind_packages_deal").on(t.dealId),
]);

export const insertSubmissionQuestionSetSchema = createInsertSchema(submissionQuestionSetsTable).omit({ id: true, createdAt: true });
export type InsertSubmissionQuestionSet = z.infer<typeof insertSubmissionQuestionSetSchema>;
export type SubmissionQuestionSet = typeof submissionQuestionSetsTable.$inferSelect;

export const insertSubmissionQuestionSchema = createInsertSchema(submissionQuestionsTable).omit({ id: true, createdAt: true });
export type InsertSubmissionQuestion = z.infer<typeof insertSubmissionQuestionSchema>;
export type SubmissionQuestion = typeof submissionQuestionsTable.$inferSelect;

export const insertSubmissionAnswerSchema = createInsertSchema(submissionAnswersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSubmissionAnswer = z.infer<typeof insertSubmissionAnswerSchema>;
export type SubmissionAnswer = typeof submissionAnswersTable.$inferSelect;

export const insertLossHistoryDocSchema = createInsertSchema(lossHistoryDocumentsTable).omit({ id: true, uploadedAt: true });
export type InsertLossHistoryDoc = z.infer<typeof insertLossHistoryDocSchema>;
export type LossHistoryDoc = typeof lossHistoryDocumentsTable.$inferSelect;

export const dealDocumentsTable = pgTable("deal_documents", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  dealId: uuid("deal_id").references(() => dealsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  documentType: text("document_type").notNull(),
  status: text("status").notNull().default("generated"),
  metadata: jsonb("metadata"),
  generatedAt: timestamp("generated_at", { withTimezone: true }).default(sql`now()`),
}, (t) => [
  index("idx_deal_documents_deal").on(t.dealId),
]);

export const insertBindDocPackageSchema = createInsertSchema(bindDocumentPackagesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBindDocPackage = z.infer<typeof insertBindDocPackageSchema>;
export type BindDocPackage = typeof bindDocumentPackagesTable.$inferSelect;

export const insertDealDocumentSchema = createInsertSchema(dealDocumentsTable).omit({ id: true, generatedAt: true });
export type InsertDealDocument = z.infer<typeof insertDealDocumentSchema>;
export type DealDocument = typeof dealDocumentsTable.$inferSelect;
