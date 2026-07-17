/**
 * Seeds Curtis's WC Implementation Tracker (v2.4 §6D) as a system template.
 * Idempotent: re-running makes no changes.
 * Run: pnpm --filter @workspace/api-server seed:wc-tracker
 */
import {
  db,
  journeyTemplatesTable,
  journeyTemplatePhasesTable,
  journeyTemplateTasksTable,
} from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { WC_TEMPLATE_NAME, WC_PHASE_KEYS, WC_TASK_KEYS } from "../lib/wc-tracker";

const PHASES = [
  { key: WC_PHASE_KEYS.CARRIER_ACCEPTANCE, taskKey: WC_TASK_KEYS.CARRIER_ACCEPTANCE, name: "Carrier acceptance", task: "Binder or policy received from carrier", sortOrder: 1, targetOffsetDays: 1, offsetDays: 1, isMilestone: true },
  { key: WC_PHASE_KEYS.POLICY_ISSUANCE, taskKey: WC_TASK_KEYS.POLICY_ISSUANCE, name: "Policy issuance", task: "Policy document on file", sortOrder: 2, targetOffsetDays: 7, offsetDays: 7, isMilestone: true },
  { key: WC_PHASE_KEYS.KIT_DELIVERY, taskKey: WC_TASK_KEYS.KIT_DELIVERY, name: "Policy & claims kit delivery", task: "Deliver policy + WC claims kit to client via My Program", sortOrder: 3, targetOffsetDays: 10, offsetDays: 10, isMilestone: false },
  { key: WC_PHASE_KEYS.BILLING_SETUP, taskKey: WC_TASK_KEYS.BILLING_SETUP, name: "Carrier billing setup", task: "Client directed to establish carrier billing; CSA marks instructions delivered", sortOrder: 4, targetOffsetDays: 14, offsetDays: 14, isMilestone: true },
];

export async function seedWcTracker(dbc: typeof db = db): Promise<{ templateId: string; created: boolean }> {
  const [existing] = await dbc
    .select({ id: journeyTemplatesTable.id })
    .from(journeyTemplatesTable)
    .where(and(eq(journeyTemplatesTable.isSystem, true), eq(journeyTemplatesTable.productType, "WC")))
    .limit(1);
  if (existing) return { templateId: existing.id, created: false };

  const [tpl] = await dbc
    .insert(journeyTemplatesTable)
    .values({ name: WC_TEMPLATE_NAME, type: "IMPLEMENTATION", productType: "WC", isActive: true, isSystem: true })
    .returning();

  for (const p of PHASES) {
    const [phase] = await dbc
      .insert(journeyTemplatePhasesTable)
      .values({ templateId: tpl!.id, name: p.name, sortOrder: p.sortOrder, targetOffsetDays: p.targetOffsetDays, systemKey: p.key })
      .returning();
    await dbc.insert(journeyTemplateTasksTable).values({
      templateId: tpl!.id,
      phaseId: phase!.id,
      name: p.task,
      ownerType: "INTERNAL_SPECIALIST",
      isMilestone: p.isMilestone,
      offsetDays: p.offsetDays,
      sortOrder: p.sortOrder,
      systemKey: p.taskKey,
    });
  }
  return { templateId: tpl!.id, created: true };
}

async function main() {
  const r = await seedWcTracker();
  console.log(r.created ? `Seeded WC tracker ${r.templateId}` : `WC tracker already present (${r.templateId}) — no change`);
  process.exit(0);
}

void main();
