/**
 * 6-phase macro tracker (DISPLAY-ONLY).
 *
 * The pipeline has 8 canonical operational stages (@workspace/pipeline). The
 * deal-card header shows a calmer 6-phase journey mapped from those stages.
 * This NEVER changes the Kanban — it is purely a visual rollup and its
 * semantics are Curtis-locked (Phase 4C ruling #1): do not add, remove, or
 * reorder phases. The 8 -> 6 mapping below is display-only (flag for Curtis).
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

// Display-only 8 -> 6 mapping, in board order (Curtis-locked semantics).
const STAGE_TO_PHASE: Record<PipelineStageKey, number> = {
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
  return STAGE_TO_PHASE[stage as PipelineStageKey] ?? 0;
}
