# Phase 4 — Pipeline Stage Reconciliation — Replit Build Prompt

_Branch: `p4-pipeline-stages` (already created off `awf-os-brendy-sprint-1`) · Design spec:_
_`docs/superpowers/specs/2026-06-30-p4-pipeline-stage-reconciliation-design.md`_

---

## ⛔ EXECUTION PROTOCOL — READ FIRST, OBEY EXACTLY

You are building this phase **one lettered step at a time**. This is not optional.

1. **Do exactly ONE step, then STOP.** After finishing a step, run **only that step's acceptance
   test**, paste the result, and **WAIT for me to reply "continue"** before starting the next step.
2. **Do NOT look ahead. Do NOT batch steps. Do NOT start the next step early.**
3. **Do NOT refactor, rename, or "improve" anything outside the current step's stated scope.**
4. **If a step's acceptance test FAILS, STOP and report it.** Do not proceed, do not "work around" it,
   do not attempt later steps. Wait for instructions.
5. If something in the step is ambiguous or would touch a **binding decision**, **STOP and ask** before
   building — do not guess.

### Standing guardrails (apply to every step)
- **Branch:** all work on `p4-pipeline-stages`. **NEVER commit, merge, or push to `main`** or to
  `awf-os-brendy-sprint-1`.
- **Schema:** changes land via **`drizzle-kit push`** — but **only after Step B0** reconciles the
  pre-existing `deals` drift. **Do not run a blanket `push` before B0** (it wants to TRUNCATE `deals`).
- **API contract:** any API change edits `lib/api-spec/openapi.yaml`, then regenerate Orval + Zod
  (`pnpm --filter @workspace/api-spec codegen`). **Never hand-edit anything under `generated/`.**
- **Design system:** tokens only (pink `--accent-primary` primary / purple `--accent-support` / single
  `--gradient-cta`). No hardcoded accent hex. Verify every changed surface in **BOTH light and dark**.
- **Correctness gate:** `pnpm typecheck` must show **zero new errors** vs the baseline for any step that
  touches code. Report baseline vs after.
- **Audit actual files/DB, never agent or document memory.** Do not commit screenshots/images.

### Source of truth
State Document **§11** binds the pipeline to **10 stages**. The live 8-stage board is drift; this phase
reconciles it. Where anything conflicts with the State Document, the State Document wins.

### Items to surface for Curtis (report; do not block building on them unless noted)
- The 8→10 migration mapping cell values (Step B2) — proposed, needs Curtis's blessing.
- `outcome` model = lost-as-status, won implied (Lost leaves the board vs. an 11th column).
- The role-aware **UW lock/queue is a deliberate FOLLOW-UP phase**, not built here.

### Canonical 10 stages (keys · order)
`NEW_LEAD · QUALIFIED · NEEDS_ANALYSIS · PROPOSAL_SENT · NEGOTIATION · DECISION_PENDING · COMMITTED ·
DOCUMENTATION · BOUND · CLIENT`

---

## STEP A — Canonical stage model (pure addition, no behavior change)

**Objective:** establish a single source of truth for the 10 stages and the `outcome` type, consumed by
everything else in later steps. Nothing changes behavior yet.

**Scope (do only this):**
- Add a shared **`STAGES`** definition: an ordered list of the 10 stages, each with `key`, `label`, and
  order. Keys are exactly the 10 canonical keys above. Labels are the human display names
  (`New Lead`, `Qualified`, `Needs Analysis`, `Proposal Sent`, `Negotiation`, `Decision Pending`,
  `Committed`, `Documentation`, `Bound`, `Client`).
- Add an **`outcome`** type/enum: `'open' | 'lost'`.
- Place these where both the api-server and the frontend can import them without pulling server-only deps
  into the browser bundle (engineer's call on location — a dependency-light shared module is fine). If a
  clean shared location doesn't exist, define it once and re-export; **do not** duplicate the list in two
  files.
- Export a couple of small helpers if convenient (e.g. ordered keys array, key→label lookup). Keep it
  minimal.

**Do NOT:**
- Do NOT change `Pipeline.tsx`, the deal-card tracker, badges, routes, the DB schema, or OpenAPI yet.
- Do NOT remove the existing local 8-stage `STAGES` in `Pipeline.tsx` yet (that's Step E).
- Do NOT wire any consumer to the new constant yet.

**Acceptance test (run only this, then STOP):**
1. `pnpm typecheck` — zero new errors vs baseline (report both numbers).
2. Print/log the new `STAGES` export and confirm it lists **exactly the 10 keys in the correct order**
   with correct labels, and that `outcome` = `open | lost`.

**Then STOP and wait for "continue."**

---

## STEP B0 — Diagnose & reconcile the `deals` drift (one-time, no P4 change yet)

**Objective:** make `drizzle-kit push` run **clean on `deals`** (no TRUNCATE, no interactive prompt)
while **preserving every existing deal**. This clears the standing landmine so P4's schema change (B1)
can land the spec way (Drizzle push).

**Background:** `drizzle-kit push` currently hangs — it wants to **TRUNCATE `deals`** and add
`deals_reference_code_unique`, due to pre-existing drift between the Drizzle schema and the live DB.
(See `.agents/memory/drizzle-push-blocked.md`.)

**Scope (do only this):**
- Diagnose the drift: compare the Drizzle `deals` definition to the live table (columns, types,
  constraints). Inspect what push intends to do (dry-run / generate the SQL it would apply / verbose).
- Apply **surgical SQL** (ALTER TABLE / ADD/DROP CONSTRAINT as needed) to reconcile so a subsequent
  push dry-run shows **no destructive ops on `deals`**. **Gotcha:** Postgres auto-generated constraint
  names diverge from the schema's explicit names — look up the **real constraint name from the catalog**
  before dropping.
- Preserve all existing deals. **Do NOT accept any TRUNCATE.**

**Do NOT:**
- Do NOT apply any P4 schema change here (no `outcome` column, no `stage` default change — that's B1).
- Do NOT run a blanket `push`/`push-force` that would truncate. Do NOT touch other tables.

**Acceptance test (run only this, then STOP):**
1. A push **dry-run** (or generated SQL) shows **no pending TRUNCATE / destructive op on `deals`**.
2. Deal row count **before == after** (report the number).
3. **If the drift cannot be reconciled non-destructively AND the deals are not safely re-seedable → STOP
   and report** (do not proceed; the fallback is a separate decision).

**Then STOP and wait for "continue."**

---

## STEP B0.1 — Reconcile remaining constraint-name drift DB-wide (non-destructive)

**Objective:** `drizzle-kit push` is all-or-nothing across the whole schema. B0 fixed only `deals`, but
the same `_key`-vs-`_unique` constraint-name drift exists on ~13 other tables / 14 constraints (e.g.
`users_email_key`). Rename them all so a **full push runs clean DB-wide** — no truncate prompt on any
table. This permanently clears the landmine for every future phase.

**Scope (do only this):**
- Enumerate every constraint where the live DB name differs from the name Drizzle's push expects (the
  `_key` auto-name vs the Drizzle `_unique` / explicit `.unique("...")` name). **Read the real live names
  from the Postgres catalog — do not assume the pattern** (some are composite, e.g. wc_rates).
- For each, apply `ALTER TABLE <t> RENAME CONSTRAINT <live_name> TO <drizzle_expected_name>`. This is
  metadata-only — **no rows touched**.

**Do NOT:**
- Do NOT apply any P4 schema change (no `outcome`, no `stage` default — that's B1).
- Rename only — do NOT drop/add constraints, do NOT change columns/data, do NOT `push-force`, do NOT edit
  Drizzle schema files (they're already correct; only the live DB names are drifted).
- Only reconcile the `_key`→`_unique` name drift — do not "fix" other unrelated differences.

**Acceptance test (run only this, then STOP):**
1. A **full** `drizzle-kit push` dry-run (all tables, real FK context, stdin closed / timeout) shows **NO
   pending TRUNCATE / destructive prompt on ANY table** — specifically the `users_email_unique` prompt
   seen in B0's cross-check is now gone.
2. Row counts unchanged on affected tables (spot-check e.g. `users`, `deals` — report before/after).
3. List each constraint renamed (table, old name → new name).

**Then STOP and wait for "continue."**

---

## STEP B1 — Apply P4 schema via `drizzle-kit push` (spec workflow)

**Objective:** add the `outcome` column and change the `stage` default, via Drizzle push — now unblocked.

**Pre-req — exclude the orphan backup table (do NOT drop it):** `rates_backup_20260610` (24,820 rows) is
an orphan snapshot not in the Drizzle schema; a full push would want to `DROP` it. **Do not drop it.**
Exclude it from Drizzle's view via **`tablesFilter`** in the drizzle config so push ignores it entirely.
The live rates data is safe in the schema-managed `wc_rates` table — the backup is untouched, preserved.

**Scope (do only this):**
- Add/adjust **`tablesFilter`** in the drizzle-kit config to exclude `rates_backup_20260610` (and any
  other non-schema orphan tables) so push neither introspects nor drops them.
- Edit `lib/db/src/schema/deals.ts`: add **`outcome`** `text` default `'open'`; change **`stage`** default
  from `'SUBMISSION_REVIEW'` → `'NEW_LEAD'`. `stage` stays `text`.
- **Dry-run first:** run a full push dry-run and confirm the pending statements are **only**:
  (a) the P4 change (add `outcome`, alter `stage` default), and (b) known non-destructive reconciliation
  (FK `_fkey`→`_fk` renames, the `appetite` unique constraint→index conversion). **There must be NO
  TRUNCATE and NO DROP of any data table.** If any destructive op appears → STOP and report.
- Then apply: `pnpm --filter db push`.

**Do NOT:**
- Do NOT drop `rates_backup_20260610` or any table. Do NOT `push-force` blindly.
- Do NOT remap existing deal rows yet (that's B2). Do NOT change routes, UI, or OpenAPI.

**Acceptance test (run only this, then STOP):**
1. Dry-run showed only the P4 change + non-destructive reconciliation (no truncate, no data-table drop);
   `rates_backup_20260610` absent from the plan (excluded).
2. Push applies clean (no hang). Live `deals` has the `outcome` column (existing rows default to `'open'`)
   and `stage` default is `NEW_LEAD`; **deal count unchanged (32); `rates_backup_20260610` still present
   with 24,820 rows**.
3. `pnpm typecheck` — zero new errors vs baseline.

**Then STOP and wait for "continue."**

---

## STEP B2 — Data migration (idempotent script) **[mapping = Curtis sign-off]**

**Objective:** remap the existing deals from the 8 legacy stages onto the 10, and backfill `outcome`.

**Scope (do only this):**
- Add an **idempotent** script under `artifacts/api-server/src/scripts/` (e.g. `migrate-pipeline-stages.ts`).
- Apply this mapping (proposed — flag for Curtis):

  | Legacy | → New | | Legacy | → New |
  |---|---|---|---|---|
  | `SUBMISSION_REVIEW` | `NEEDS_ANALYSIS` | | `BIND_ORDER` | `DOCUMENTATION` |
  | `INDICATION` | `PROPOSAL_SENT` | | `BOUND` | `BOUND` |
  | `UW_REVIEW` | `PROPOSAL_SENT` | | `CLIENT` | `CLIENT` |
  | `APPROVED_QUOTED` | `NEGOTIATION` | | `LOST` | see below |

- For **`LOST`** deals: set `outcome = 'lost'`, keep `closedAt`, and **recover the stage** from
  `activity_log` (the `from_stage` of the move into `LOST`); fallback `NEEDS_ANALYSIS` if unrecoverable.
- **Idempotent:** only maps legacy keys; re-running changes 0 rows. Report before/after counts by stage
  and outcome.

**Do NOT:** touch non-deal tables; invent stages; overwrite an already-migrated deal.

**Acceptance test (run only this, then STOP):**
1. Every deal has a valid **new** stage (one of the 10) and `outcome ∈ {open, lost}`; a DB query shows
   **zero legacy stage values remain**.
2. Before/after counts reported; lost deals show a recovered stage where `activity_log` had one.
3. Re-run the script → **0 rows changed** (idempotent).

**Then STOP and wait for "continue."**

---

## STEP C — OpenAPI + codegen

**Objective:** reflect the 10-stage enum + `outcome` in the API contract and regenerate clients.

**Scope (do only this):**
- Edit `lib/api-spec/openapi.yaml`: deal `stage` enum = the 10 canonical keys (must match Step A exactly);
  add `outcome` enum (`open | lost`); update any stage-transition endpoint request/response shapes.
- Regenerate: `pnpm --filter @workspace/api-spec codegen`.

**Do NOT:** hand-edit anything under `generated/`. Do NOT change route logic yet (Step D).

**Acceptance test (run only this, then STOP):**
1. Codegen runs clean; generated Zod + hooks include the 10-stage enum + `outcome`.
2. `pnpm typecheck` — zero new errors; **no manual edits under `generated/`** (git diff confirms only
   regenerated output changed there).

**Then STOP and wait for "continue."**

---

## STEP D — Backend behavior

**Objective:** route logic for the new model + relocate the Bound gate to stage 9.

**Scope (do only this):**
- `deals.ts`: validate `stage` against the 10 keys; default `NEW_LEAD`; accept/persist `outcome`.
- `deal-card.ts`: **Approve** → set stage `NEGOTIATION` (was `APPROVED_QUOTED`); **Decline** → set
  `outcome='lost'` + `closedAt` (off the old `LOST` stage).
- **Relocate the Bound gate** to new stage 9: entering `BOUND` requires the server-side bind-readiness
  check (completed submission + approved quote) and fires the existing **implementation-tracker
  creation** trigger. Not bind-ready → reject with a clear message.
- Keep `activity_log` `from_stage`/`to_stage` logging on every move.

**Do NOT:**
- Do NOT build the implementation/onboarding trackers themselves (that's P5) — only fire the existing
  trigger. Do NOT add role-based stage-move locking (that's the deferred UW phase).

**Acceptance test (curl matrix, per-role sessions; run only this, then STOP):**
1. Free stage moves across stages 1–8 → 200.
2. Move to `BOUND` on a bind-ready deal → 200 **and** the implementation trigger fires; on a
   non-bind-ready deal → rejected with a clear message.
3. **Decline** at an arbitrary stage → `outcome='lost'` + `closedAt` set; deal drops off the active list.
4. **Approve** → stage becomes `NEGOTIATION`.
5. `pnpm typecheck` — zero new errors.

**Then STOP and wait for "continue."**

---

## STEP E — Pipeline board UI

**Objective:** 10-column board driven by the shared constant, with Lost off-board.

**Scope (do only this):**
- `Pipeline.tsx`: replace the local 8-stage `STAGES` with the shared constant (10). Render 10 columns in
  order; keep the board **full-bleed with horizontal scroll**. Remove the `LOST` column.
- Add a **Lost filter/toggle** that surfaces `outcome='lost'` deals (absent from the active board).
- Entering `BOUND` via drag shows a confirm and respects the server bind-readiness gate from Step D.

**Do NOT:** change badge sites elsewhere yet (Step F); add no new routes/pages.

**Acceptance test (Playwright + visual, after a real login; run only this, then STOP):**
1. Board renders **10 columns in order**; dragging a deal across free stages persists.
2. Entering Bound triggers the confirm + server gate; Lost filter shows lost deals and they are **absent**
   from the board.
3. Verified in **light AND dark**; tokens only; `pnpm typecheck` zero new.

**Then STOP and wait for "continue."**

---

## STEP F — Stage badges + 6-phase tracker remap

**Objective:** every stage badge/label reads the shared constant; the operational tracker is remapped.

**Scope (do only this):**
- `stage-map.ts`: re-point the **display-only** 6-phase macro tracker mapping FROM the new 10 stages → the
  6 phases (Submission Pending → Indication → U/W Review → Approved/Declined → Binding → Implementation).
  Keep it display-only (Curtis-locked in 4C — do not change its semantics).
- Update every stage badge/label site to read labels from the shared constant and remove legacy stage
  strings: `AccountDetail`, dashboards (`AgentDashboard`, `PeoDashboard`), `DealsPage`, `MyProgram`,
  `Billing`, quote-flow `Step4Indication`, and any others surfaced by grep.

**Do NOT:** change tracker semantics or add phases; no new routes.

**Acceptance test (run only this, then STOP):**
1. Grep shows **zero remaining legacy stage keys** (`SUBMISSION_REVIEW`, `INDICATION`, `UW_REVIEW`,
   `APPROVED_QUOTED`, `BIND_ORDER`, and `LOST`-as-stage) in code — excluding `generated/` and the B2
   migration script's mapping source.
2. The 6-phase tracker maps correctly from **each** of the 10 stages (spot-check all 10).
3. Badges correct on AccountDetail, dashboards, DealsPage, MyProgram; **light + dark**; typecheck zero new.

**Then STOP and wait for "continue."**

---

## STEP G — Full regression + acceptance report

**Objective:** run the whole acceptance suite and write the phase report.

**Scope (do only this):**
- Run all acceptance tests from the design spec §10. Regression: deal card opens from the pipeline **and**
  from the 4A account detail; the quote→deal flow is intact.
- Confirm `drizzle-kit push` now runs **clean on `deals`** (landmine cleared).
- Write `docs/build-prompts/phase-4-report.md`: pass/fail per test, migration before/after counts,
  typecheck two ways (zero new + the pre-existing repo-wide count, untouched), new/changed API surface,
  and the Curtis sign-off items. **Screenshots go in chat only — do NOT commit images.**

**Acceptance test (run only this, then STOP):**
1. All spec §10 acceptance tests pass.
2. Regression checks pass; `drizzle-kit push` clean on `deals`.
3. `phase-4-report.md` committed (text only, no images).

**Then STOP.** Phase complete — hand off for Curtis review; do not merge to `awf-os-brendy-sprint-1` or
`main` until instructed.

