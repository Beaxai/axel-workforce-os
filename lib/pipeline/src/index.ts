// Canonical pipeline stage model — single source of truth.
// Dependency-light and browser-safe: no server-only imports, so both the
// api-server and the web frontend can consume it. Define the 8 stages ONCE
// here; re-export elsewhere rather than duplicating the list.

export type PipelineStageKey =
  | "SUBMISSION_REVIEW"
  | "INDICATION"
  | "UW_REVIEW"
  | "APPROVED_QUOTED"
  | "BIND_ORDER"
  | "BOUND"
  | "CLIENT"
  | "LOST";

export interface PipelineStage {
  key: PipelineStageKey;
  label: string;
  order: number;
}

/** The 8 canonical operational pipeline stages, in board order. */
export const PIPELINE_STAGES: readonly PipelineStage[] = [
  { key: "SUBMISSION_REVIEW", label: "Submission Review", order: 1 },
  { key: "INDICATION", label: "Indication", order: 2 },
  { key: "UW_REVIEW", label: "U/W Review", order: 3 },
  { key: "APPROVED_QUOTED", label: "Approved / Quoted", order: 4 },
  { key: "BIND_ORDER", label: "Bind Order", order: 5 },
  { key: "BOUND", label: "Bound", order: 6 },
  { key: "CLIENT", label: "Client", order: 7 },
  { key: "LOST", label: "Lost", order: 8 },
] as const;

/** A deal's outcome, orthogonal to its stage. */
export type DealOutcome = "open" | "lost";
export const DEAL_OUTCOMES: readonly DealOutcome[] = ["open", "lost"] as const;

/** Ordered list of the 8 canonical stage keys. */
export const PIPELINE_STAGE_KEYS: readonly PipelineStageKey[] = PIPELINE_STAGES.map(
  (s) => s.key,
);

const STAGE_LABEL_BY_KEY: Record<PipelineStageKey, string> = Object.fromEntries(
  PIPELINE_STAGES.map((s) => [s.key, s.label]),
) as Record<PipelineStageKey, string>;

/** key -> human label lookup. */
export function stageLabel(key: PipelineStageKey): string {
  return STAGE_LABEL_BY_KEY[key];
}
