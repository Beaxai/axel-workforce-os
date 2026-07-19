/**
 * P5-WC — Curtis's WC Implementation Tracker (State Doc v2.4 §6D).
 * The four phases are system-owned: admins may add tasks around them but cannot
 * delete or rename them. Code targets them via these stable keys.
 */
export const WC_TEMPLATE_NAME = "WC Implementation Tracker";

export const WC_PHASE_KEYS = {
  CARRIER_ACCEPTANCE: "WC_PHASE_CARRIER_ACCEPTANCE",
  POLICY_ISSUANCE: "WC_PHASE_POLICY_ISSUANCE",
  KIT_DELIVERY: "WC_PHASE_KIT_DELIVERY",
  BILLING_SETUP: "WC_PHASE_BILLING_SETUP",
} as const;

export const WC_TASK_KEYS = {
  CARRIER_ACCEPTANCE: "WC_TASK_CARRIER_ACCEPTANCE",
  POLICY_ISSUANCE: "WC_TASK_POLICY_ISSUANCE",
  KIT_DELIVERY: "WC_TASK_KIT_DELIVERY",
  BILLING_SETUP: "WC_TASK_BILLING_SETUP",
} as const;

import {
  db,
  implementationTrackersTable,
  implementationTasksTable,
} from "@workspace/db";
import { and, eq, inArray } from "drizzle-orm";
import { recomputeProgress } from "../routes/journeys";

type DbOrTx = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * §6D: a binder OR a policy auto-satisfies Phase 1 (carrier acceptance) — either document
 * is de facto carrier acceptance of all subjectivities. A direct policy release (carrier
 * skipped the binder) additionally satisfies Phase 2 (policy issuance), so Phases 1 and 2
 * complete together.
 *
 * Only PENDING tasks are touched: a task a human already completed is never overwritten,
 * and re-uploading the same document type is a no-op.
 */
export async function applyWcDocumentUpload(
  dealId: string,
  documentType: "binder" | "policy",
  actorId: string | undefined,
  dbc: DbOrTx = db,
): Promise<{ completed: string[]; trackerId: string | null }> {
  const [tracker] = await dbc
    .select({ id: implementationTrackersTable.id })
    .from(implementationTrackersTable)
    .where(and(eq(implementationTrackersTable.dealId, dealId), eq(implementationTrackersTable.productType, "WC")))
    .limit(1);
  if (!tracker) return { completed: [], trackerId: null };

  const keys =
    documentType === "policy"
      ? [WC_TASK_KEYS.CARRIER_ACCEPTANCE, WC_TASK_KEYS.POLICY_ISSUANCE]
      : [WC_TASK_KEYS.CARRIER_ACCEPTANCE];

  const updated = await dbc
    .update(implementationTasksTable)
    .set({ status: "COMPLETE", completedAt: new Date(), completedBy: actorId ?? null })
    .where(
      and(
        eq(implementationTasksTable.trackerId, tracker.id),
        inArray(implementationTasksTable.systemKey, keys),
        eq(implementationTasksTable.status, "PENDING"),
      ),
    )
    .returning({ id: implementationTasksTable.id });

  if (updated.length > 0) await recomputeProgress(tracker.id, dbc);
  return { completed: updated.map((u) => u.id), trackerId: tracker.id };
}
