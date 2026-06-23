/**
 * Phase 4C — 6-phase macro tracker (DISPLAY-ONLY).
 *
 * The pipeline has 8 binding stages (Pipeline.tsx). The deal-card header shows a
 * calmer 6-phase journey mapped from those stages. This NEVER changes the
 * Kanban — it is purely a visual rollup (ruling #1).
 */

export const PHASES = [
  "Submission Pending",
  "Indication",
  "U/W Review",
  "Approved / Declined",
  "Binding",
  "Implementation",
] as const;

const STAGE_TO_PHASE: Record<string, number> = {
  SUBMISSION_REVIEW: 0,
  INDICATION: 1,
  UW_REVIEW: 2,
  APPROVED_QUOTED: 3,
  BIND_ORDER: 4,
  BOUND: 5,
  CLIENT: 5,
  LOST: 3,
};

export function phaseIndex(stage?: string): number {
  if (!stage) return 0;
  return STAGE_TO_PHASE[stage] ?? 0;
}

/** LOST maps to "Approved / Declined" but in its declined state. */
export function isDeclined(stage?: string): boolean {
  return stage === "LOST";
}
