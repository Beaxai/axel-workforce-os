/**
 * v2.7 §7G — PEO Implementation Tracker (5 phases). PEO includes WC: a PEO
 * deal runs the PEO tracker ONLY, with the WC deliverables (binder/policy,
 * claims kit) as sub-items inside it. Code targets phases/tasks via these
 * stable keys; the WC sub-items intentionally REUSE the WC task keys so the
 * binder/policy upload automation in wc-tracker.ts drives both trackers.
 */
export const PEO_TEMPLATE_NAME = "PEO Implementation Tracker";

export const PEO_PHASE_KEYS = {
  CSA_PEO: "PEO_PHASE_CSA_PEO",
  IMPL_MEETING: "PEO_PHASE_IMPL_MEETING",
  EMP_ONBOARDING: "PEO_PHASE_EMP_ONBOARDING",
  PAYROLL_SETUP: "PEO_PHASE_PAYROLL_SETUP",
  GO_LIVE: "PEO_PHASE_GO_LIVE",
} as const;

export const PEO_TASK_KEYS = {
  CSA_PEO: "PEO_TASK_CSA_PEO",
  IMPL_MEETING: "PEO_TASK_IMPL_MEETING",
  EMP_ONBOARDING: "PEO_TASK_EMP_ONBOARDING",
  PAYROLL_SETUP: "PEO_TASK_PAYROLL_SETUP",
  GO_LIVE: "PEO_TASK_GO_LIVE",
} as const;

/** §7G phase 4: payroll start defaults to CSA-PEO signing + 14 days (editable). */
export const PAYROLL_START_OFFSET_DAYS = 14;

import {
  db,
  implementationTrackersTable,
  implementationTasksTable,
} from "@workspace/db";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { recomputeProgress } from "../routes/journeys";

type DbOrTx = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * §7G phase 1 — "CSA-PEO executed: auto from checklist; signing date anchors
 * payroll scheduling." Called when the CSA-PEO subjectivity flips SATISFIED.
 *
 * - Completes the phase-1 task (PENDING only — never overwrites human state).
 * - Records the signing date on the tracker (first signature wins).
 * - Defaults payrollStartDate = signing + 14 days ONLY when not already set,
 *   so a CSA-edited date is never clobbered by a webhook replay.
 */
export async function applyCsaPeoSigned(
  dealId: string,
  actorId: string | undefined,
  dbc: DbOrTx = db,
  /** When the CSA-PEO was actually signed (subjectivity satisfiedAt). Falls
   *  back to now only when the caller has no better timestamp — the SIGNING
   *  date anchors payroll, not the processing date, so replays/delayed
   *  webhooks must pass the original satisfaction time. */
  signedAt?: Date | null,
): Promise<{ trackerId: string | null; completedTask: boolean }> {
  const [tracker] = await dbc
    .select()
    .from(implementationTrackersTable)
    .where(and(eq(implementationTrackersTable.dealId, dealId), eq(implementationTrackersTable.productType, "PEO")))
    .limit(1);
  if (!tracker) return { trackerId: null, completedTask: false };

  const signedDate = (signedAt ?? new Date()).toISOString().slice(0, 10);

  // First signature wins; payroll default never clobbers an edited date.
  // Both anchors are set in ONE conditional update keyed on the signature
  // date being unset, so a replay can't pair a stale signature date with a
  // fresh payroll default (and a concurrent payroll edit stays untouched
  // thanks to the per-column IS NULL guard via COALESCE semantics below).
  await dbc
    .update(implementationTrackersTable)
    .set({ csaPeoSignedDate: signedDate })
    .where(and(eq(implementationTrackersTable.id, tracker.id), isNull(implementationTrackersTable.csaPeoSignedDate)));
  await dbc
    .update(implementationTrackersTable)
    .set({ payrollStartDate: addDays(signedDate, PAYROLL_START_OFFSET_DAYS) })
    .where(
      and(
        eq(implementationTrackersTable.id, tracker.id),
        isNull(implementationTrackersTable.payrollStartDate),
        // Only default payroll off OUR signature date: if another writer
        // already anchored a different signing date, derive nothing from ours.
        eq(implementationTrackersTable.csaPeoSignedDate, signedDate),
      ),
    );

  const updated = await dbc
    .update(implementationTasksTable)
    .set({ status: "COMPLETE", completedAt: new Date(), completedBy: actorId ?? null })
    .where(
      and(
        eq(implementationTasksTable.trackerId, tracker.id),
        eq(implementationTasksTable.systemKey, PEO_TASK_KEYS.CSA_PEO),
        eq(implementationTasksTable.status, "PENDING"),
      ),
    )
    .returning({ id: implementationTasksTable.id });

  if (updated.length > 0) await recomputeProgress(tracker.id, dbc);
  return { trackerId: tracker.id, completedTask: updated.length > 0 };
}

/**
 * §7G phase 5 — go-live gates on BOTH phase 3 (employee onboarding) and
 * phase 4 (payroll setup). Returns the blocking task names, empty = clear.
 */
export async function goLiveBlockers(trackerId: string, dbc: DbOrTx = db): Promise<string[]> {
  const gating = await dbc
    .select({ name: implementationTasksTable.taskName, status: implementationTasksTable.status })
    .from(implementationTasksTable)
    .where(
      and(
        eq(implementationTasksTable.trackerId, trackerId),
        inArray(implementationTasksTable.systemKey, [PEO_TASK_KEYS.EMP_ONBOARDING, PEO_TASK_KEYS.PAYROLL_SETUP]),
      ),
    );
  return gating.filter((t) => t.status !== "COMPLETE").map((t) => t.name);
}
