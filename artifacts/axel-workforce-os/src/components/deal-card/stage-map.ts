/**
 * Phase 4 — 6-phase macro tracker (DISPLAY-ONLY).
 *
 * The pipeline has 10 canonical binding stages (@workspace/pipeline). The
 * deal-card header shows a calmer 6-phase journey mapped from those stages.
 * This NEVER changes the Kanban — it is purely a visual rollup and its
 * semantics are Curtis-locked (Phase 4C ruling #1): do not add, remove, or
 * reorder phases. The 10 -> 6 mapping below is display-only (flag for Curtis).
 */

import type { PipelineStageKey } from "@workspace/pipeline";

export const PHASES = [
  "Submission Pending",
  "Indication",
  "U/W Review",
  "Approved / Declined",
  "Binding",
  "Implementation",
] as const;

// Display-only 10 -> 6 mapping, in board order (Curtis-locked semantics).
const STAGE_TO_PHASE: Record<PipelineStageKey, number> = {
  NEW_LEAD: 0,
  QUALIFIED: 0,
  NEEDS_ANALYSIS: 0,
  PROPOSAL_SENT: 1,
  NEGOTIATION: 2,
  DECISION_PENDING: 3,
  COMMITTED: 3,
  DOCUMENTATION: 4,
  BOUND: 5,
  CLIENT: 5,
};

export function phaseIndex(stage?: string): number {
  if (!stage) return 0;
  return STAGE_TO_PHASE[stage as PipelineStageKey] ?? 0;
}

/**
 * A deal is shown as "Declined" when its outcome is lost. Outcome is
 * orthogonal to stage (Phase 4 model), so the declined marker renders at the
 * deal's current phase node rather than a dedicated LOST stage.
 */
export function isDeclined(outcome?: string): boolean {
  return outcome === "lost";
}
