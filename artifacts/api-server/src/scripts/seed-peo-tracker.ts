/**
 * Seeds the v2.7 §7G PEO Implementation Tracker (5 phases) as a system template.
 * PEO includes WC — the WC deliverables (binder/policy receipt, policy on file,
 * claims kit) live as SUB-ITEMS inside this tracker, reusing the WC task system
 * keys so the binder/policy upload automation drives them here too. No separate
 * WC tracker is created for PEO deals (journey instantiation picks exactly one
 * template by product type).
 *
 * Idempotent: re-running makes no changes.
 * Run: pnpm --filter @workspace/api-server seed:peo-tracker
 */
import {
  db,
  journeyTemplatesTable,
  journeyTemplatePhasesTable,
  journeyTemplateTasksTable,
} from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { PEO_TEMPLATE_NAME, PEO_PHASE_KEYS, PEO_TASK_KEYS } from "../lib/peo-tracker";
import { WC_TASK_KEYS } from "../lib/wc-tracker";

type TaskDef = {
  key: string;
  name: string;
  ownerType: string;
  isMilestone: boolean;
  offsetDays: number;
  sortOrder: number;
};

const PHASES: { key: string; name: string; sortOrder: number; targetOffsetDays: number; tasks: TaskDef[] }[] = [
  {
    key: PEO_PHASE_KEYS.CSA_PEO,
    name: "CSA-PEO executed",
    sortOrder: 1,
    targetOffsetDays: 3,
    tasks: [
      { key: PEO_TASK_KEYS.CSA_PEO, name: "Client Service Agreement (CSA-PEO) signed", ownerType: "CLIENT", isMilestone: true, offsetDays: 3, sortOrder: 1 },
      // WC deliverable sub-items (§7G: "WC deliverables are SUB-ITEMS inside this
      // tracker"). Binder/policy receipt is carrier acceptance — auto-completed by
      // the binder/policy upload automation, same keys as the WC tracker.
      { key: WC_TASK_KEYS.CARRIER_ACCEPTANCE, name: "WC: binder or policy received from carrier", ownerType: "INTERNAL_SPECIALIST", isMilestone: false, offsetDays: 3, sortOrder: 2 },
    ],
  },
  {
    key: PEO_PHASE_KEYS.IMPL_MEETING,
    name: "Implementation meeting",
    sortOrder: 2,
    targetOffsetDays: 7,
    tasks: [
      { key: PEO_TASK_KEYS.IMPL_MEETING, name: "Implementation meeting booked & completed (Calendly — PEO implementation team)", ownerType: "INTERNAL_SPECIALIST", isMilestone: true, offsetDays: 7, sortOrder: 1 },
    ],
  },
  {
    key: PEO_PHASE_KEYS.EMP_ONBOARDING,
    name: "Employee onboarding",
    sortOrder: 3,
    targetOffsetDays: 14,
    tasks: [
      { key: PEO_TASK_KEYS.EMP_ONBOARDING, name: "Employees onboarded in PEO systems (N of M — tracked as counts)", ownerType: "INTERNAL_SPECIALIST", isMilestone: true, offsetDays: 14, sortOrder: 1 },
    ],
  },
  {
    key: PEO_PHASE_KEYS.PAYROLL_SETUP,
    name: "Payroll setup",
    sortOrder: 4,
    targetOffsetDays: 14,
    tasks: [
      { key: PEO_TASK_KEYS.PAYROLL_SETUP, name: "Payroll configured (client provides registers; PEO configures; start = CSA-PEO signing + 14 days)", ownerType: "INTERNAL_SPECIALIST", isMilestone: true, offsetDays: 14, sortOrder: 1 },
    ],
  },
  {
    key: PEO_PHASE_KEYS.GO_LIVE,
    name: "Go-live",
    sortOrder: 5,
    targetOffsetDays: 21,
    tasks: [
      // Remaining WC deliverable sub-items — must be done before the client is live.
      { key: WC_TASK_KEYS.POLICY_ISSUANCE, name: "WC: policy document on file", ownerType: "INTERNAL_SPECIALIST", isMilestone: false, offsetDays: 14, sortOrder: 1 },
      { key: WC_TASK_KEYS.KIT_DELIVERY, name: "WC: policy + claims kit delivered to client via My Program", ownerType: "INTERNAL_SPECIALIST", isMilestone: false, offsetDays: 18, sortOrder: 2 },
      { key: PEO_TASK_KEYS.GO_LIVE, name: "Client live (gates on employee onboarding AND payroll setup)", ownerType: "INTERNAL_SPECIALIST", isMilestone: true, offsetDays: 21, sortOrder: 3 },
    ],
  },
];

export async function seedPeoTracker(dbc: typeof db = db): Promise<{ templateId: string; created: boolean }> {
  const [existing] = await dbc
    .select({ id: journeyTemplatesTable.id })
    .from(journeyTemplatesTable)
    .where(and(eq(journeyTemplatesTable.isSystem, true), eq(journeyTemplatesTable.productType, "PEO")))
    .limit(1);
  if (existing) return { templateId: existing.id, created: false };

  const [tpl] = await dbc
    .insert(journeyTemplatesTable)
    .values({ name: PEO_TEMPLATE_NAME, type: "IMPLEMENTATION", productType: "PEO", isActive: true, isSystem: true })
    .returning();

  for (const p of PHASES) {
    const [phase] = await dbc
      .insert(journeyTemplatePhasesTable)
      .values({ templateId: tpl!.id, name: p.name, sortOrder: p.sortOrder, targetOffsetDays: p.targetOffsetDays, systemKey: p.key })
      .returning();
    for (const t of p.tasks) {
      await dbc.insert(journeyTemplateTasksTable).values({
        templateId: tpl!.id,
        phaseId: phase!.id,
        name: t.name,
        ownerType: t.ownerType,
        isMilestone: t.isMilestone,
        offsetDays: t.offsetDays,
        sortOrder: (p.sortOrder - 1) * 10 + t.sortOrder,
        systemKey: t.key,
      });
    }
  }
  return { templateId: tpl!.id, created: true };
}

async function main() {
  const r = await seedPeoTracker();
  console.log(r.created ? `Seeded PEO tracker ${r.templateId}` : `PEO tracker already present (${r.templateId}) — no change`);
  process.exit(0);
}

void main();
