---
name: Pipeline canonical stages (single source of truth)
description: All pipeline stage keys must come from @workspace/pipeline; 8 operational stages incl. LOST
---

The pipeline has exactly 8 canonical operational stages defined ONCE in
`lib/pipeline/src/index.ts` (`PIPELINE_STAGES` / `PIPELINE_STAGE_KEYS`):
SUBMISSION_REVIEW, INDICATION, UW_REVIEW, APPROVED_QUOTED, BIND_ORDER, BOUND,
CLIENT, LOST. Both the api-server (stage validation on deal create/patch) and
the web board (`Pipeline.tsx`) consume this constant — never re-declare the list.

**Why:** The stage model was reverted from a 10-stage sales funnel (NEW_LEAD,
QUALIFIED, PROPOSAL_SENT, …) back to these 8 operational stages (Phase 4.1).
The server rejects any stage outside the 8 canonical keys, so a lingering
legacy literal is a live bug: creating a deal with a legacy stage 400s, and a
legacy fallback in bucketing hides deals in a non-existent column.

**How to apply:** When touching stage logic, import from `@workspace/pipeline`.
Use `DEFAULT_STAGE` (= SUBMISSION_REVIEW, the first canonical stage) for
new-deal creation and as the board-bucketing fallback — never a hardcoded
legacy key. `LOST` IS a normal stage/board column; the old orthogonal
`deals.outcome` column and `?includeLost=` param were removed.

## Display-only 6-phase macro tracker (deal-card)
`components/deal-card/stage-map.ts` rolls the 8 canonical stages up to 6
display phases (Submission Pending / Indication / U/W Review / Approved-Declined
/ Binding / Implementation). Semantics are Curtis-locked (Phase 4C): do NOT add,
remove, or reorder phases — only the 8->6 mapping may be adjusted, and it is
display-only (never affects the Kanban). "Declined" is driven by
`stage === "LOST"` and renders as a red marker at phase node 3.
