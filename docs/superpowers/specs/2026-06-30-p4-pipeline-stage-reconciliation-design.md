# P4 — Pipeline Stage Reconciliation — Design Spec

_Date: 2026-06-30 · Author: Brendan (lead engineer) · Owner sign-off required: Curtis Prince_
_Branch (planned): `p4-pipeline-stages` off `awf-os-brendy-sprint-1` · Build path: Replit-native_

> **Authority note.** The **State Document v2.1** (§11) and Curtis's instructions govern. This spec is a
> subordinate planning artifact. Where anything here conflicts with the State Document, the State Document
> wins. Items marked **[Curtis sign-off]** are owner decisions, proposed here but not final until confirmed.

---

## 1. Purpose & problem

The live pipeline board ships **8 operational/underwriting stages**
(`SUBMISSION_REVIEW · INDICATION · UW_REVIEW · APPROVED_QUOTED · BIND_ORDER · BOUND · CLIENT · LOST`).
The State Document §11 **binds a 10-stage sales funnel**
(`New Lead → Qualified → Needs Analysis → Proposal Sent → Negotiation → Decision Pending → Committed →
Documentation → Bound → Client`). This is the single concrete place where the build is **off-spec** — it
is drift, not a sanctioned deviation (the only stage rulings in the decisions log, #4/#7, kept the
deal-card 6-phase tracker *display-only* and left the binding 10-stage pipeline untouched).

**P4 reconciles the live board to the binding 10-stage model.** Adopting the spec is *compliance*, not a
new decision.

### Why 10 (recorded rationale)
Producers (agents/brokers) are primary pipeline users in a marketplace; the sales funnel gives conversion/
forecasting and speaks their language. The operational lens is **not lost** — it survives as the deal-card's
display-only 6-phase tracker plus the future UW-status overlay. Staying at 8 would be an *active deviation*
from a binding spec requiring Curtis to amend the State Document; going to 10 is compliance.

---

## 2. Locked decisions

1. **Adopt the State Doc's 10 stages literally.** Operational stages (U/W Review, Bind Order) do not appear
   as board columns.
2. **`outcome` axis, lost-only (won implied).** Lost is an orthogonal deal status, **not** a stage. Won is
   implied by reaching `CLIENT` and is not stored. Lost deals leave the active board (Lost filter).
3. **Free stage movement for all roles in P4**, except the one protected transition (entering Bound).
4. **Role-aware locking / underwriting queue is a deferred follow-up** (Model Y — UW as a status overlay).
   **Not built in P4.** P4 only leaves a clean seam: stage and outcome stay strictly orthogonal, so a future
   `uw_status` axis can be added without reworking this model.
5. **Schema lands via `drizzle-kit push` (spec workflow).** The pre-existing `deals` drift that blocks push
   is **reconciled first** (one-time surgical SQL, debt cleanup — not the P4 change), then P4's schema change
   goes in via push. This clears the standing landmine and restores push for all future phases.

---

## 3. Non-goals (explicitly out of P4)

- The underwriting lock/queue, field-level edit locks, return-to-agent / change-request workflow, and
  role-based stage-move restrictions. → **deferred UW-lock phase.**
- Hard sequential entry-criteria for the sales stages (no per-stage gatekeeping beyond the Bound gate).
- Building the implementation/onboarding trackers themselves (P5). P4 only fires the Bound trigger correctly;
  the trackers stay empty until P5.
- Quote-flow polish (was the alternative P4 framing; not this phase).

---

## 4. Data model

`lib/db/src/schema/deals.ts`:

- **`stage`** — remains `text`. Canonical value set becomes the 10 keys below. Default changes
  `SUBMISSION_REVIEW` → **`NEW_LEAD`**.
- **`outcome`** — **new** `text`, default `'open'`, values `open | lost`. (`won` not stored; implied by
  `stage = CLIENT`.)
- **`closedAt`** — already exists; set when `outcome` flips to `lost` (unchanged behavior, re-pointed off the
  `LOST` stage).

**Canonical stage keys (single source of truth):**
`NEW_LEAD · QUALIFIED · NEEDS_ANALYSIS · PROPOSAL_SENT · NEGOTIATION · DECISION_PENDING · COMMITTED ·
DOCUMENTATION · BOUND · CLIENT`

A single shared **`STAGES` constant** (key, label, order) is the source of truth consumed by the board, the
6-phase tracker mapping, badges, and server validation — so the three representations can never drift again.

---

## 5. Migration of existing deals **[Curtis sign-off]**

Proposed 8 → 10 mapping for the ~27–28 existing deals:

| Current (operational) | → New (sales funnel) | Rationale |
|---|---|---|
| `SUBMISSION_REVIEW` | `NEEDS_ANALYSIS` | submission in, being worked |
| `INDICATION` | `PROPOSAL_SENT` | a number has gone to the prospect |
| `UW_REVIEW` | `PROPOSAL_SENT` | quote being finalized (UW isn't a stage) |
| `APPROVED_QUOTED` | `NEGOTIATION` | approved quote now with the client |
| `BIND_ORDER` | `DOCUMENTATION` | committed; preparing to bind |
| `BOUND` | `BOUND` | direct |
| `CLIENT` | `CLIENT` | direct |
| `LOST` | `outcome = 'lost'` + stage **recovered from `activity_log.from_stage`** (fallback `NEEDS_ANALYSIS`) | preserves where it died |

The **mechanism** (orthogonal outcome, lost-stage recovery from `activity_log`) is the architectural
commitment; the **cell values** are tunable and are Curtis's to bless. The data-migration script is
**idempotent** and reports before/after counts.

---

## 6. Behavior & logic

- **Stage movement:** free drag for all roles across stages 1–8 (New Lead → Documentation), forward and back.
- **Bound gate (stage 9) — the one protected transition:** entering `BOUND` requires a confirm **+** the
  server-side bind-readiness check (completed submission + approved quote), relocated from the old stage-6
  `BOUND` logic. Not bind-ready → rejected with a clear message. On success it fires **implementation-tracker
  creation** (the §11 "Stage 9 triggers both trackers" rule). The trackers stay empty until P5 builds those
  flows — P4 only fires the trigger correctly.
- **Decline → `outcome = 'lost'`** from any stage; sets `closedAt` + reason; logs to activity feed.
- **4C deal-card Approve** re-targets `APPROVED_QUOTED` → `NEGOTIATION`. **[Curtis sign-off]**
- **`activity_log`** keeps recording `from_stage`/`to_stage` on every move (unchanged); it is the source for
  lost-deal stage recovery in the migration.
- **Forward-compat seam:** stage and outcome are strictly orthogonal; nothing assumes "lost is a stage."

---

## 7. UI & frontend

- **`Pipeline.tsx`:** replace the 8-value `STAGES` with the shared 10-stage constant. Ten columns ordered
  New Lead → Client; board stays **full-bleed with horizontal scroll** (10 columns exceed 1280px).
- **Lost is off-board:** no `LOST` column; a **Lost filter/toggle** surfaces `outcome = 'lost'` deals. Won is
  not a column (reaching `CLIENT` is the win state).
- **Stage badges everywhere** (~15 sites: `AccountDetail`, dashboards, `DealsPage`, `MyProgram`, `Billing`,
  quote-flow `Step4Indication`, etc.) read labels from the shared constant — no per-page stage strings.
- **Deal-card 6-phase tracker (`stage-map.ts`):** keep the Curtis-locked operational macro tracker; **re-point
  its mapping** from the new 10 stages → the 6 display phases. This is the preserved operational lens.
- **Design system:** all changed surfaces verified **light + dark**, tokens only; stage colors from the
  `AxelBadge` semantic map, no new hex literals.
- **No new routes/pages** — in-place surgery.

---

## 8. API contract

- Update `lib/api-spec/openapi.yaml`: deal `stage` enum (10 values), new `outcome` field, any stage-transition
  request/response. Then `pnpm --filter @workspace/api-spec codegen` to regenerate Orval hooks + Zod.
- **Never hand-edit anything under `generated/`.**
- Backend routes touched: `deals.ts` (validation/default), `deal-card.ts` (Approve→Negotiation,
  Decline→outcome=lost, Bound-gate relocation + trigger).

---

## 9. Gated build steps (one at a time · test · STOP)

Each step is small, independently testable, and ends with a **mandatory stop**. Replit runs **only** that
step's test, reports, and waits for explicit "continue."

| # | Step | Gate (test) |
|---|---|---|
| **A** | **Canonical stage model** — add shared 10-stage `STAGES` constant + `outcome` type. Pure addition, no behavior change. | Typecheck clean; constant exports exactly the 10 values in order. |
| **B0** | **Diagnose & reconcile deals drift (one-time)** — inspect why push wants to TRUNCATE `deals` + add `deals_reference_code_unique`; apply surgical SQL so `push --dry-run` reports **clean, no truncate**; preserve the existing deals. | `drizzle-kit push --dry-run` shows no pending destructive ops on `deals`; deal count unchanged. **If drift can't be reconciled non-destructively and deals aren't re-seedable → STOP and report before proceeding.** |
| **B1** | **Apply P4 schema via `drizzle-kit push`** — `outcome` column (default `open`), `stage` default → `NEW_LEAD`, in the Drizzle definition; push. | Push applies clean; live `deals` has `outcome` + new default; typecheck clean. |
| **B2** | **Data migration (idempotent script)** — remap existing deals per §5; backfill `outcome` (mine `activity_log` for lost); report before/after counts. Re-runnable. | Every deal has a valid new stage + `outcome`; **zero legacy stage values** in DB; counts reported; lost deals show recovered stage where available. |
| **C** | **OpenAPI + codegen** — update `openapi.yaml`; regenerate Orval/Zod. | Codegen clean; typecheck passes; nothing under `generated/` hand-edited. |
| **D** | **Backend behavior** — `deals.ts` validation/default; `deal-card.ts` Approve→Negotiation, Decline→outcome=lost; relocate Bound gate + trigger to stage 9. | Curl matrix: free moves OK; Bound-ready→200 + trigger fires; Bound-not-ready→rejected; Decline→outcome=lost + closedAt. |
| **E** | **Pipeline board UI** — 10 columns from shared constant, full-bleed horizontal scroll; Lost filter. | Board renders 10 in order; drag across free stages; Lost filter works; light + dark. |
| **F** | **Badges + tracker remap** — re-point `stage-map.ts`; all badge sites read shared constant. | Tracker maps correctly from each stage; grep clean of legacy strings; badges correct on AccountDetail/dashboards/DealsPage/MyProgram; light + dark. |
| **G** | **Full regression + report** — run whole acceptance suite; write `docs/build-prompts/phase-4-report.md`. | All §10 acceptance tests pass; deal card opens from pipeline + 4A; quote→deal intact; typecheck 0 new. |

Order rationale: canonical model → unblock + apply schema → migrate data → contract → backend → UI → verify.
Data model lands before any UI depends on it; each step is reversible on its own.

---

## 10. Acceptance tests (phase contract)

1. Board renders all 10 stages in order; a deal drags across all 8 free stages (fwd + back).
2. Entering **Bound** on a bind-ready deal → succeeds + fires implementation-tracker creation; a
   **non-bind-ready** deal → rejected with message.
3. **Decline** at an arbitrary stage → `outcome=lost`, `closedAt` set, leaves the board, appears under Lost
   filter, retains its last stage.
4. Migration: every existing deal has a valid new stage + `outcome`; **zero orphaned/legacy stage values** in
   DB; before/after counts reported; lost deals show recovered stage where `activity_log` had it.
5. Deal-card 6-phase tracker maps correctly from each of the 10 new stages.
6. Stage badges across pages (AccountDetail, dashboards, DealsPage, MyProgram) show new labels; no legacy
   strings remain (grep clean).
7. `openapi.yaml` updated + Orval/Zod regenerated; nothing under `generated/` hand-edited.
8. Design system honored **light + dark**; `pnpm typecheck` zero new errors vs baseline.
9. Regression: deal card opens from pipeline + 4A account detail; quote→deal flow intact.
10. `drizzle-kit push` works clean on `deals` (drift landmine cleared) — restored spec workflow.

---

## 11. Open items to flag for Curtis (in the build-prompt)

- **The 8→10 migration mapping table** (§5) — bless the cell values (esp. `APPROVED_QUOTED → Negotiation`,
  `UW_REVIEW → Proposal Sent`).
- **`outcome` model** (lost-as-status, won implied) — confirm Lost leaving the board vs. an 11th column.
- **UW-lock/queue is a deliberate follow-up phase**, not P4.
- (Pre-existing, adjacent) the §8 deal-card doc-text still lags the as-built 4C Stitch layout — unrelated to
  P4 but worth folding into the master when convenient.

---

## 12. Replit build-prompt protocol (the leash)

The build-prompt opens with a hard protocol Replit must obey:

- **Do exactly one lettered step, then STOP.** Run *only* that step's acceptance test, paste the result, and
  **wait for explicit "continue"** before the next step.
- **No looking ahead, no batching steps, no refactoring beyond the step's scope.**
- **If a step's test fails, STOP and report** — do not proceed or "work around" it.
- Guardrails: branch `p4-pipeline-stages` off the sprint branch, **never main**; schema change lands via
  `drizzle-kit push` after the B0 drift reconciliation (no blanket push before B0); `openapi.yaml` →
  regenerate on any API change; **tokens only, light + dark**; do not commit images; **audit files, never
  memory**.

---

## 13. Risks & mitigations

- **B0 drift reconciliation surprises.** The truncate want may stem from a column change requiring a rewrite.
  Mitigation: B0 is diagnose-first, gated; if it can't be done non-destructively and deals aren't re-seedable,
  STOP and fall back to the SQL-DDL workaround for P4 only (drift cleanup deferred).
- **Existing 27–28 deals are the acceptance corpus.** Migration is idempotent and preserves them; B0 preserves
  them; lost-stage recovery is best-effort with a documented fallback.
- **Mapping cell values are subjective.** Marked [Curtis sign-off]; the mechanism is what's committed.
- **No automated tests / linter.** `tsc --noEmit` + the curl/Playwright acceptance matrix are the gates
  (unchanged project constraint).
