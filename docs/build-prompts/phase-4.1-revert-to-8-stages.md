# Phase 4.1 — Revert pipeline to the original 8 operational stages

_Branch: `p4-pipeline-stages` (continue on it) · Supersedes the 10-stage model from P4._

> **Why:** Curtis's State Document §11 documented a 10-stage sales funnel by oversight — he wants the
> **original 8 operational stages** back. P4 is NOT merged, so we revise the branch in place: swap the
> stage set back to the 8, **keep P4's engineering wins** (Drizzle drift fix, atomic Bound transition,
> bind-readiness gate, shared-constant pattern), and **drop** the P4 outcome axis (Lost becomes a column
> again).

## ⛔ EXECUTION PROTOCOL — obey exactly
1. **Do ONE lettered step, then STOP.** Run only that step's test, paste the result, WAIT for "continue".
2. No looking ahead, no batching, no refactoring beyond the step's scope.
3. If a test FAILS, STOP and report — do not proceed or work around it.
4. Ambiguity or a binding-decision touch → STOP and ask.

### Guardrails
- Branch `p4-pipeline-stages`; **NEVER** main / `awf-os-brendy-sprint-1`.
- Schema via **`drizzle-kit push`** (it works now — P4 fixed the drift). Any API change → edit
  `openapi.yaml`, regenerate Orval/Zod; never hand-edit `generated/`.
- Tokens only; verify light + dark. `pnpm typecheck` zero new vs baseline. Audit files, not memory.
  Don't commit images.

### The 8 operational stages (keys · order · labels)
`SUBMISSION_REVIEW` "Submission Review" · `INDICATION` "Indication" · `UW_REVIEW` "U/W Review" ·
`APPROVED_QUOTED` "Approved / Quoted" · `BIND_ORDER` "Bind Order" · `BOUND` "Bound" · `CLIENT` "Client" ·
`LOST` "Lost". **Lost is a column again** (not an outcome).

---

## STEP R1 — Shared constant → 8 operational stages
**Scope:** In `@workspace/pipeline` (`lib/pipeline/src/index.ts`), replace the 10 sales-funnel stages with
the **8 operational stages** above (keys, labels, order). `PipelineStageKey` becomes those 8. Keep
`stageLabel`/`PIPELINE_STAGE_KEYS`. Leave `DealOutcome`/`DEAL_OUTCOMES` exports in place **for now**
(removed in R3 once usages are gone).
**Do NOT:** touch routes, schema, UI, or OpenAPI yet.
**Test (then STOP):** `pnpm typecheck` zero new; log the export → exactly the 8 keys in order with labels.

---

## STEP R2 — Reverse data migration (10 → 8)
**Scope:** Add an idempotent script (`artifacts/api-server/src/scripts/revert-pipeline-stages.ts`) that
maps the existing deals from the 10 sales stages back to the 8 operational stages:
- `NEW_LEAD`, `QUALIFIED`, `NEEDS_ANALYSIS` → `SUBMISSION_REVIEW`
- `PROPOSAL_SENT` → `INDICATION`  *(fwd collapsed INDICATION+UW_REVIEW → PROPOSAL_SENT; recover the real
  pre-P4 stage from `activity_log.from_stage` where available, else default `INDICATION`)*
- `NEGOTIATION`, `DECISION_PENDING` → `APPROVED_QUOTED`
- `COMMITTED`, `DOCUMENTATION` → `BIND_ORDER`
- `BOUND` → `BOUND` · `CLIENT` → `CLIENT`
- **Any deal with `outcome = 'lost'` → `stage = 'LOST'`** (overrides the above; keep `closedAt`).
Idempotent (only maps sales-stage keys / outcome='lost'); report before/after counts.
**Do NOT:** drop the `outcome` column yet (R3 does). Touch only `deals`.
**Test (then STOP):** every deal on one of the 8 operational keys; **zero sales-stage values remain**;
before/after counts; re-run → 0 rows changed.

---

## STEP R3 — Schema + backend behavior (drop outcome, revert Approve/Decline)
**Scope:**
- `lib/db/src/schema/deals.ts`: **drop the `outcome` column**; change `stage` default →
  `SUBMISSION_REVIEW`. `drizzle-kit push` — the ONLY destructive op should be dropping `deals.outcome`
  (intended); confirm that and apply. If push wants to drop/truncate anything else → STOP and report.
- `deals.ts` route: validate `stage` against the 8 keys only (remove the outcome check); remove the
  `includeLost` param + the `outcome != 'lost'` GET filter (list returns all, LOST included as a stage).
  **Keep** the atomic PATCH transaction + the Bound bind-readiness gate + trigger.
- `deal-card.ts`: **Decline** → set `stage = 'LOST'` + `closedAt` (remove `outcome`); **Approve** → set
  `stage = 'APPROVED_QUOTED'` (was `NEGOTIATION`).
- `lib/user-profiles.ts`: revert the active-deals filter `ne(outcome,'lost')` → `ne(stage,'LOST')`.
- Remove `DealOutcome`/`DEAL_OUTCOMES` from `@workspace/pipeline` once no references remain.
**Do NOT:** change the board UI or OpenAPI yet.
**Test (curl, then STOP):** Decline → `stage=LOST` + `closedAt`; Approve → `APPROVED_QUOTED`; Bound on a
not-ready deal → 409 (gate intact); invalid stage → 400; `GET /deals` includes LOST-stage deals;
`drizzle-kit push` clean (only outcome dropped); typecheck zero new.

---

## STEP R4 — OpenAPI + codegen
**Scope:** `openapi.yaml`: `PipelineStage` enum → the 8 operational keys; **remove** the `DealOutcome`
schema, the deal `outcome` field, and the `includeLost` query param. Regenerate Orval/Zod.
**Do NOT:** hand-edit `generated/`.
**Test (then STOP):** codegen clean; generated enum = 8 keys, no `outcome`; typecheck zero new; git diff
shows only regenerated output under `generated/`.

---

## STEP R5 — Board UI + tracker remap
**Scope:**
- `Pipeline.tsx`: render the **8 columns** (incl. **Lost as a column**) from the shared constant; **remove
  the Show/Hide-Lost filter** and all `outcome` logic; new-deal default stage → `SUBMISSION_REVIEW`.
- `stage-map.ts`: remap the display-only 6-phase tracker from the 8 operational stages (they align ~1:1);
  remove `isDeclined(outcome)` — a Lost-stage deal is simply in the Lost column.
- Any badge/filter site still using `outcome` (e.g. `AgentDashboard` active filter) → revert to
  `stage !== 'LOST'`. All badges read the shared constant.
**Test (Playwright + visual, then STOP):** board shows the 8 columns incl. Lost, in order; drag persists;
deal card opens; Bound confirm + 409 gate still work; tracker maps from each stage; **grep clean** of
sales-stage keys (`NEW_LEAD`/`QUALIFIED`/`NEEDS_ANALYSIS`/`PROPOSAL_SENT`/`NEGOTIATION`/`DECISION_PENDING`/
`COMMITTED`/`DOCUMENTATION`) **and** of `outcome`/`includeLost`; light + dark; typecheck zero new.

---

## STEP R6 — Docs + regression + report
**Scope:**
- Correct the "10 stages" wording to the **8 operational stages** in: `docs/STATE_DOCUMENT_v2.1.md` §11
  (use the replacement text below), `CLAUDE.md`, and the P4 spec/report under `docs/`. Note in each that
  Curtis's **master** doc still needs the same §11 correction.
- Full acceptance run; write `docs/build-prompts/phase-4.1-report.md` (pass/fail, reverse-migration
  counts, typecheck two ways, changed API surface, and the flags below). Screenshots in chat only.

**§11 replacement text:**
> Pipeline — 8 stages: Submission Review → Indication → U/W Review → Approved/Quoted → Bind Order → Bound
> → Client → Lost. Bound (stage 6) triggers both implementation trackers; the Implementation Tracker owns
> everything post-bind. (Corrects the erroneously-documented 10-stage sales funnel.)

**Flags for Curtis (record in the report):** (1) the **bind-readiness gate** on entering Bound is new
(P4) — not in the original board; confirm keep. (2) the reverse data migration is best-effort where
10→8 collapses were ambiguous.

**Test (then STOP):** all acceptance tests pass; docs corrected (grep clean of "10 stage"/"10-stage" in
repo docs except historical notes); `drizzle-kit push` clean; report committed. **Then STOP** — do not
merge until instructed.
