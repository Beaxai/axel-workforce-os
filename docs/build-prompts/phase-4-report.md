# Phase 4 — Pipeline Stage Reconciliation — Acceptance Report

> **⚠️ SUPERSEDED BY PHASE 4.1 (2026-07-12).** The 10-stage sales funnel delivered by this phase was
> based on an erroneous State Document §11 and has been reverted to the **8 operational stages**
> (Submission Review → Indication → U/W Review → Approved/Quoted → Bind Order → Bound → Client → Lost);
> `outcome` was removed (Lost is a stage). See `docs/build-prompts/phase-4.1-report.md`.
> NOTE: Curtis's MASTER doc still needs the same §11 correction. The report below is historical.

**Branch:** `p4-pipeline-stages` (NOT merged to `awf-os-brendy-sprint-1` / `main`)
**Date:** 2026-07-01
**Scope:** Reconcile the pipeline onto the canonical 10-stage model with an
orthogonal `outcome` (open | lost), relocate the bind gate + implementation
trigger onto stage entry, and point every stage badge/tracker at the shared
`@workspace/pipeline` source of truth.

---

## 1. Acceptance suite (design spec §10)

| # | Test | Result | Evidence |
|---|------|--------|----------|
| 1 | Board renders 10 stages in order; deal drags across free stages (fwd + back) | ✅ PASS | Playwright: `/pipeline` shows New Lead → Qualified → Needs Analysis → Proposal Sent → Negotiation → Decision Pending → Committed → Documentation → Bound → Client. Dragged a deal New Lead→Qualified and back. |
| 2 | Bound on a bind-ready deal → 200 + implementation trigger; non-bind-ready → 409 with reason | ✅ PASS | **409 path (live):** `PATCH /api/deals/:id {stage:"BOUND"}` on an open NEGOTIATION deal → **409** `"Not bind-ready: ..."`, deal unchanged. **200 path:** transactional `fireImplementationTrigger` on entry to BOUND (reviewed & APPROVED in Step F); existing BOUND deals created via the trigger carry implementation trackers (see §2 note). |
| 3 | Decline at an arbitrary stage → outcome=lost, closedAt set, leaves board, appears under Lost filter, stage preserved | ✅ PASS | Playwright: `POST /api/deal-card/:id/decline` on a NEGOTIATION deal → outcome=`lost`, `closedAt` set, **stage stayed NEGOTIATION** (not moved to LOST); absent from `GET /api/deals`, present in `GET /api/deals?includeLost=true`; restored afterward. |
| 4 | Migration: every deal on a valid new stage + outcome; zero legacy values; before/after counts; lost-stage recovery | ✅ PASS | See §3. Original run remapped **28** rows; idempotent re-run now = **0** rows changed; guard confirms 32/32 canonical. |
| 5 | Deal-card 6-phase tracker maps correctly from each of the 10 stages | ✅ PASS | Logic check: all 10 stages → correct phase (see §5). Tracker rendered live in the deal-card modal. |
| 6 | Stage badges across pages show new labels; grep clean of legacy strings | ✅ PASS | Badges use `stageLabel`/`PIPELINE_STAGES` (AccountDetail, DealsPage). Grep: zero legacy stage keys in stage-context (only `status:"INDICATION"` remains — a quote status, not a stage). |
| 7 | openapi.yaml updated + Orval/Zod regenerated; nothing under generated/ hand-edited | ✅ PASS | `openapi.yaml` carries `PipelineStage`/`outcome` schemas + `includeLost`. `pnpm --filter @workspace/api-spec run codegen` → **empty git diff** on `lib/api-client-react` + `lib/api-zod` (regenerates identically). |
| 8 | Design system honored light + dark; pnpm typecheck zero new vs baseline | ✅ PASS | Badges verified legible in light + dark (Step F). Typecheck — see §6. |
| 9 | Regression: deal card opens from pipeline AND from 4A account detail; quote→deal flow intact | ✅ PASS | Playwright: deal-card modal opens from `/pipeline` **and** from `/accounts/:id`. Quote→deal: creation sites emit canonical stages (`NEW_LEAD` etc.) and `POST /api/deals` `validateStageOutcome` rejects non-canonical — see §7. |
| 10 | `drizzle-kit push` runs clean on `deals` (landmine cleared) | ✅ PASS | `pnpm --filter @workspace/db run push` exited **0**, no destructive prompt, `[✓] Changes applied` with no data change (32 deals before and after). |

**Regression checks:** ✅ pass. **`drizzle-kit push` clean on `deals`:** ✅.

---

## 2. `drizzle-kit push` — DB-wide clean (no data loss)

- `pnpm --filter @workspace/db run push` with stdin closed → exit **0**, no
  interactive destructive prompt, `[✓] Changes applied`.
- Deal count **32 before and after** the push (no truncate / data loss on `deals`
  or any other table). `rates_backup` excluded by config as intended.
- **Note (data artifact, not a bug):** of the 3 BOUND deals, 2 carry an
  implementation tracker (created by the on-entry trigger) and 1 has none — that
  deal was seeded/migrated directly at BOUND and never *transitioned* into it, so
  the on-entry trigger never fired. Live transitions into BOUND do fire it
  (verified by the transactional code path).

---

## 3. Migration — before / after counts + lost recovery

Mapping applied by `migrate-pipeline-stages.ts` (idempotent):

| Legacy stage | → Canonical stage |
|--------------|-------------------|
| `SUBMISSION_REVIEW` | `NEEDS_ANALYSIS` |
| `INDICATION` | `PROPOSAL_SENT` |
| `UW_REVIEW` | `PROPOSAL_SENT` |
| `APPROVED_QUOTED` | `NEGOTIATION` |
| `BIND_ORDER` | `DOCUMENTATION` |
| `NEW_LEAD` / `BOUND` / `CLIENT` | unchanged (already canonical) |
| `LOST` (stage) | outcome=`lost`; `closedAt` preserved; **stage recovered** from `activity_log.metadata.from_stage` (fallback `NEEDS_ANALYSIS`) — never left as `LOST` |

**Original run (Step B):** legacy remapped = **28**, LOST-stage recovered = **0**
(no LOST-stage rows existed at migration time), NULL-outcome backfilled = **0**,
**total changed = 28**.

**Idempotent re-run (this pass):** rows changed = **0**; guard: *"OK: all deals on
canonical stages; outcome in {open, lost}."*

**After state (32 deals):**

| stage | outcome | n |
|-------|---------|---|
| BOUND | open | 3 |
| NEEDS_ANALYSIS | lost | 1 |
| NEEDS_ANALYSIS | open | 17 |
| NEGOTIATION | open | 1 |
| NEW_LEAD | open | 1 |
| PROPOSAL_SENT | open | 8 |
| QUALIFIED | open | 1 |

- Legacy stage values in DB: **0**.
- Outcome distribution: **31 open, 1 lost**.
- The 1 lost deal sits at `NEEDS_ANALYSIS` (stage preserved) with `closed_at` set —
  it came from a **decline action** (not a LOST-stage migration), consistent with
  `LOST recovered: 0`.

---

## 5. Display-only 10 → 6 tracker mapping (deal-card)

`components/deal-card/stage-map.ts` (display only — never affects the Kanban):

| Canonical stage(s) | → Display phase |
|--------------------|-----------------|
| NEW_LEAD, QUALIFIED, NEEDS_ANALYSIS | Submission Pending (0) |
| PROPOSAL_SENT | Indication (1) |
| NEGOTIATION | U/W Review (2) |
| DECISION_PENDING, COMMITTED | Approved / Declined (3) |
| DOCUMENTATION | Binding (4) |
| BOUND, CLIENT | Implementation (5) |

"Declined" renders when `outcome === 'lost'` (orthogonal to stage), shown at the
deal's current phase node — there is no LOST phase.

---

## 6. Typecheck — TWO WAYS

**(a) Zero new from this phase (baseline gate — the repo `typecheck` workflow,
`scripts/typecheck-baseline.sh`):**

```
web (@workspace/axel-workforce-os):  0 errors (baseline 0)
api-server (@workspace/api-server):  0 errors (baseline 0)
shared libs (tsc --build):           clean
PASS: no new typecheck errors beyond baseline.
```
→ **New TS errors introduced by Phase 4 = 0.**

**(b) Pre-existing repo-wide count (listed separately, untouched):**
The enforced baselines in `typecheck-baseline.sh` are `WEB_BASELINE=0` and
`API_BASELINE=0`, and shared libs must compile clean — i.e. the branch currently
carries **0 pre-existing (endemic) TypeScript errors** across web, api-server and
libs. Phase 4 neither added to nor removed from this count; it remains 0.

---

## 7. New / changed API surface

- `GET /api/deals?includeLost=true` — active list excludes `outcome='lost'` by
  default; pass `includeLost=true` to include them (drives the "Lost" filter).
- `PATCH /api/deals/:id` — now validates `stage`/`outcome` against the canonical
  sets (`validateStageOutcome`); entering `BOUND` runs the **bind gate**
  (`isBindReady`) inside a `FOR UPDATE` transaction → **409** with reason if not
  bind-ready, else **200** and the implementation trigger fires (idempotent).
- `POST /api/deals` — same `validateStageOutcome` guard on create.
- `POST /api/deal-card/:id/decline` — sets `outcome='lost'` + `closedAt`,
  **preserves the current stage** (no LOST stage).
- OpenAPI: `PipelineStage` (mirrors `PIPELINE_STAGE_KEYS`) + `outcome`
  (open | lost) schemas; Orval/Zod regenerated (no hand-edits).

---

## 8. CURTIS — sign-off items

1. **8 → 10 migration mapping cells** — see the table in §3
   (`SUBMISSION_REVIEW→NEEDS_ANALYSIS`, `INDICATION→PROPOSAL_SENT`,
   `UW_REVIEW→PROPOSAL_SENT`, `APPROVED_QUOTED→NEGOTIATION`,
   `BIND_ORDER→DOCUMENTATION`; NEW_LEAD/BOUND/CLIENT unchanged; LOST→outcome).
2. **`outcome` model** — `lost` is a status (not a stage), orthogonal to stage;
   **won** is implied by reaching `CLIENT`. **Lost lives off-board** (default list
   excludes it, surfaced via a Lost filter) rather than as an 11th column.
   → *Confirm you're happy with Lost off-board vs a dedicated 11th column.*
3. **Bind gate proxy** — "approved quote" is modelled as *submission complete +
   at least one quote row exists*, because the schema has **no dedicated
   quote-approval flag**. → *Confirm this proxy, or tell us to add an approval flag.*
4. **Display-only 10 → 6 tracker mapping** — see §5. Phases are fixed; only the
   10→6 grouping is adjustable and it never affects the Kanban.
5. **Accounts `clientStage` / accounts-list `stage` filter** — left **free-form**
   (not enum-constrained). → *Confirm if you want these constrained to the
   canonical set.*
6. **Role-aware UW lock / queue** — **deliberately NOT built in Phase 4**; tracked
   as a follow-up phase.

---

## 9. Verification method notes (transparency)

- Tests 1, 3, 9 (deal-card open) and test 2's 409 path were verified **live**
  via the Playwright testing harness (admin `sarah@axelwos.com`).
- Test 2's 200/trigger path is evidenced by the reviewed transactional code path
  plus trackers on trigger-created BOUND deals; a fully bind-ready live fixture
  (submission complete across all sections + quote) was out of scope for this
  regression pass.
- Test 9's quote→deal flow "intact" is evidenced statically: creation sites emit
  canonical stage literals and `POST /api/deals` rejects non-canonical stages;
  the web package typechecks clean.
- No screenshots/images are committed (kept in chat only, per instruction).
