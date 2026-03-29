import { pgTable, uuid, text, integer, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { dealsTable } from "./deals";

export const onboardingChecklistTable = pgTable("onboarding_checklist", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  dealId: uuid("deal_id").references(() => dealsTable.id).unique(),
  step1Status: text("step_1_status").default("NOT_STARTED"),
  step1CompletedAt: timestamp("step_1_completed_at", { withTimezone: true }),
  step2Status: text("step_2_status").default("NOT_STARTED"),
  step2CompletedAt: timestamp("step_2_completed_at", { withTimezone: true }),
  step3Status: text("step_3_status").default("NOT_STARTED"),
  step3ScheduledAt: timestamp("step_3_scheduled_at", { withTimezone: true }),
  step3CompletedAt: timestamp("step_3_completed_at", { withTimezone: true }),
  step4Status: text("step_4_status").default("NOT_STARTED"),
  step4CompletedAt: timestamp("step_4_completed_at", { withTimezone: true }),
  step5Status: text("step_5_status").default("NOT_STARTED"),
  step5CompletedAt: timestamp("step_5_completed_at", { withTimezone: true }),
  step6Status: text("step_6_status").default("NOT_STARTED"),
  step6CompletedAt: timestamp("step_6_completed_at", { withTimezone: true }),
  currentStep: integer("current_step").default(1),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});
