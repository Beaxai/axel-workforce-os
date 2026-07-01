// Canonical pipeline stage model — single source of truth (State Document §11).
// Dependency-light and browser-safe: no server-only imports, so both the
// api-server and the web frontend can consume it. Define the 10 stages ONCE
// here; re-export elsewhere rather than duplicating the list.

export type PipelineStageKey =
  | "NEW_LEAD"
  | "QUALIFIED"
  | "NEEDS_ANALYSIS"
  | "PROPOSAL_SENT"
  | "NEGOTIATION"
  | "DECISION_PENDING"
  | "COMMITTED"
  | "DOCUMENTATION"
  | "BOUND"
  | "CLIENT";

export interface PipelineStage {
  key: PipelineStageKey;
  label: string;
  order: number;
}

/** The 10 canonical pipeline stages, in board order. */
export const PIPELINE_STAGES: readonly PipelineStage[] = [
  { key: "NEW_LEAD", label: "New Lead", order: 1 },
  { key: "QUALIFIED", label: "Qualified", order: 2 },
  { key: "NEEDS_ANALYSIS", label: "Needs Analysis", order: 3 },
  { key: "PROPOSAL_SENT", label: "Proposal Sent", order: 4 },
  { key: "NEGOTIATION", label: "Negotiation", order: 5 },
  { key: "DECISION_PENDING", label: "Decision Pending", order: 6 },
  { key: "COMMITTED", label: "Committed", order: 7 },
  { key: "DOCUMENTATION", label: "Documentation", order: 8 },
  { key: "BOUND", label: "Bound", order: 9 },
  { key: "CLIENT", label: "Client", order: 10 },
] as const;

/** A deal's outcome, orthogonal to its stage. */
export type DealOutcome = "open" | "lost";
export const DEAL_OUTCOMES: readonly DealOutcome[] = ["open", "lost"] as const;

/** Ordered list of the 10 canonical stage keys. */
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
