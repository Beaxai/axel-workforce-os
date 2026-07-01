---
name: Pipeline canonical stages (single source of truth)
description: All pipeline stage keys must come from @workspace/pipeline; legacy 8-stage keys are gone
---

The pipeline has exactly 10 canonical stages defined ONCE in
`lib/pipeline/src/index.ts` (`PIPELINE_STAGES` / `PIPELINE_STAGE_KEYS`). Both the
api-server (Step D validation) and the web board (`Pipeline.tsx`) consume this
constant — never re-declare the list.

**Why:** The old board used a local 8-stage list with legacy keys
(SUBMISSION_REVIEW, INDICATION, UW_REVIEW, APPROVED_QUOTED, BIND_ORDER, LOST).
Step D made the server reject any stage outside the 10 canonical keys, so any
lingering legacy literal is a live bug: creating a deal with a legacy stage 400s,
and a legacy fallback in bucketing hides stage-less deals in a non-existent column.

**How to apply:** When touching stage logic, import from `@workspace/pipeline`.
Use `DEFAULT_STAGE` (= NEW_LEAD, the first canonical stage) for new-deal creation
and as the board-bucketing fallback — never a hardcoded legacy key. `LOST` is NOT
a stage; it is `outcome='lost'` (orthogonal), surfaced off-board via
`GET /deals?includeLost=true`.
