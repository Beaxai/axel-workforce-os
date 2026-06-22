# Phase 4C — Deal Card Submission Panel (Option B) — Replit build prompt

> **How to use:** paste the kickoff into Replit/Claude Code; it points the agent at this file.
> Implements State Document **§8**. Execute in Replit (DB + secrets live there). Phases 3.5 (auth)
> and 4A (Accounts) are already landed, so role enforcement uses the existing `requireRoles` and the
> linked-account sync uses the 4A `accounts`/activity plumbing.
>
> **Layout decision is LOCKED to Option B** (spec-literal §8) — see
> `docs/decisions/2026-06-15-4c-deal-card-layout.md`. Build B exactly; do **not** build the
> Option C "Submission tab" variant. (B↔C is front-end-only and reversible later, so no need to
> hedge — build B cleanly.)

## TL;DR

Turn the deal card into the **submission + communication hub** per §8. In **Option B**:

- The **six submission sections** live as **buttons with completeness indicators** in the deal card's
  **right rail** (not a separate tab).
- **WC + WFS pricing** is promoted into the **KPI strip** at the top of the card.
- **Approve / Decline** are **header actions** (top-right of the card).
- The center column is the **communication hub** (messages / RFI thread / AI-engine notices).
- Editing a section, re-rating, approving, or declining **syncs to the linked account** (4A) and
  **logs to the activity feed**; rating-input changes raise a **re-rate "stale" flag** on the quote.

## Guardrails (binding decisions — do not revisit)

- **Layout = Option B only.** Six sections as rail buttons + completeness; pricing in the KPI strip;
  Approve/Decline in the header. No dedicated "Submission" left-nav tab.
- **Auth is implemented (Phase 3.5).** Use the existing `requireAuth` + `requireRoles`
  (`routes/index.ts`, `middleware/require-auth.ts`); roles live in `org_members`. Do not re-invent auth.
- **Accounts/sync is implemented (Phase 4A).** Reuse the linked-account update + activity-log helpers;
  do not create a parallel sync path. Deals already carry a non-null `account_id`.
- **Schema:** Drizzle is source of truth; **apply changes via explicit SQL DDL, not a blanket
  `drizzle-kit push`** (the `deals` drift hangs/risks a TRUNCATE — see
  `.agents/memory/drizzle-push-blocked.md`). Most of 4C should need **no** schema change; if a
  stale-flag column is added, do it as a narrow `ALTER`.
- **No Supabase** (deleted). Authorization in API middleware, not RLS.
- **Rating engine (binding #3):** WC premium = `(Payroll ÷ 100) × ClassCodeRate × EMod ×
  ScheduleRating`, **$500 min**; PEO deals get a **10% bundled WC discount on the WC component only**;
  WFS PEPM = `(annual payroll × 2%) ÷ 12`. **Every calc stores a full `rating_breakdown` JSON.** Most
  recent rate per State+ClassCode; `EffectiveDate` never filters. Do not alter these — 4C only
  *displays* pricing and flags staleness; it does not change the math.
- **Design system: tokens only** (pink `#E91E8C` primary / purple `#7C3AED` support / single
  `--gradient-cta` on one CTA), Inter body / Jost all-caps subheads, the two glass recipes
  (`.glass-card`, `.glass-panel`). No hardcoded accent hex outside token files. **Verify light AND dark.**
- **API surface changes** update `lib/api-spec/openapi.yaml` → regenerate Orval hooks + Zod; never
  hand-edit anything under `generated/`.
- **Git:** commit to `awf-os-brendy-sprint-1` (or a sub-branch). **Never merge/PR to `main`.**
- **Audit actual files, never memory.** Stack: React 19.1 + Vite + TS, Express 5, Drizzle.

## 0. Current state (verify against code on this branch before building)

- **`DealCardModal.tsx`** is the existing deal viewer. It currently has tabs
  `activity | quote | proposal | bind` (`TabKey`), a stage strip, and panels
  (`ProposalPanel`, `BindStatusPanel`, etc.). 4C reshapes this card into the §8 hub.
- **Submission sections are data-driven**, not hardcoded: `SubmissionFlow.tsx` loads questions from
  the submission API and groups them by `q.section` (`uniqueSections`), with per-section
  `validateSection` (required-field check) and a completed/active/locked step rail. **Reuse this
  section + validation model** to compute each rail button's completeness — do not invent a second
  source of truth for "what are the sections."
- **The six sections** (per §8 / the 4C mockup): Business Info, Locations, Workforce, Operations,
  Loss History, Coverage. Drive these from the actual submission question metadata, not a literal list.
- **Pricing data** comes from the quote / `rating_breakdown` (WC) and the WFS PEPM calc; surface both
  in the KPI strip.
- **Reference mockup:** `docs/mockups/4c-deal-card/index.html` → **"Approach B"** (and the static
  card in this repo). Match that arrangement in real tokens.

## 1. Layout — Option B (build exactly this)

Reshape `DealCardModal` into the submission hub:

- **Header:** company name + product/vertical/effective badges on the left; **Approve** (gradient CTA)
  and **Decline** (outline) on the right. Approve/Decline are **role-gated** (underwriter/admin) —
  hide for roles that can't action.
- **KPI strip:** Locations · Employees · Annual Payroll · **Est. Premium (WC)** · EMod. Premium cell
  uses the pink-accented treatment (it is the promoted pricing). Include **WFS pricing** in the strip
  or immediately beside WC premium.
- **Left sub-nav:** Overview · Docs · Tasks · Quote · Policy (no "Submission" tab — that's Option C).
- **Center column = communication hub:** message thread (UW ↔ agent), AI-engine notices
  ("new quote variation — Compare"), **RFI items** with blocking/non-blocking state + progress, and a
  composer ("Type a message…") with the single gradient send affordance.
- **Right rail = the six submission sections as completeness buttons:** header `SUBMISSION  n / 6
  complete`; each section a button showing its icon, name, and state (✓ complete green / "k missing"
  amber / "Not started" gray). Clicking a button opens that section for editing (modal or inline
  expander — keep editing usable; this is the known B trade-off). Required-field validation reuses the
  `SubmissionFlow` `validateSection` logic.

## 2. Functional requirements (§8)

1. **Completeness:** `n / 6` and per-section state computed live from submission answers + required
   fields. Editing a section updates its state and the rollup immediately.
2. **Section editing:** open a section from its rail button, edit, save. Save **persists via the
   submission API**, **syncs the linked account** where the field is a rating-environment field (4A),
   and **logs to the deal activity feed**.
3. **Re-rate stale flag:** when a rating input changes (payroll, class codes, EMod, locations, etc.),
   mark the current quote **stale** and surface a visible "re-rate needed" indicator + a re-rate
   action. Re-rating recomputes via the existing rating engine (no math changes) and clears the flag.
   If persisting staleness needs a column, add `quotes.rating_stale boolean default false` via SQL DDL.
4. **Pricing display:** WC est. premium (from `rating_breakdown`) and WFS pricing in the KPI strip;
   keep them consistent with the stored breakdown (display only — do not recompute differently).
5. **Approve / Decline:** underwriter/admin only; both **log to activity**; Approve advances the deal
   per the existing stage model (do not bypass the pipeline rules — pipeline stops at Bind Order,
   binding triggers implementation per binding #4). Decline records reason + logs.
6. **Communication hub:** post/read messages and RFIs on the deal; persist + log; render newest-first.
   (If a messages table doesn't yet exist, add a minimal one via SQL DDL or reuse the activity/notes
   plumbing — keep it narrow and report what was chosen.)
7. **Role-aware access:** server-enforced via `requireRoles`. AGENT sees only its own deals' cards and
   **cannot** Approve/Decline; UNDERWRITER/ADMIN can action; EMPLOYER/CARRIER/PEO/VENDOR per existing
   scoping. Hide unusable affordances in the UI but enforce on the server.

## 3. API + codegen

- Add/extend endpoints for: section completeness/save (reuse submission routes where possible),
  re-rate + stale flag, Approve/Decline, and deal messages/RFI. Update `lib/api-spec/openapi.yaml` →
  regenerate **Orval hooks + Zod**. Apply any schema via **SQL DDL** (per guardrails). Do not hand-edit
  `generated/`.

## 4. Acceptance tests — all must pass (report pass/fail each)

> **Note:** these are reconstructed from §8 as described in the decision doc; the State Document v2.1
> is not in the repo. Reconcile the exact §8 numbering against the doc when running, and report any
> §8 item not covered here.

1. Opening a deal card shows the **six sections as rail buttons** with correct `n / 6` and per-section
   state derived from real submission answers.
2. **Pricing is in the KPI strip** (WC est. premium + WFS), values matching the stored
   `rating_breakdown` for that quote.
3. **Approve / Decline are header actions**, visible only to UNDERWRITER/ADMIN; an AGENT (and
   EMPLOYER) cannot see/use them, and the server returns **403** if they call the endpoint directly.
4. **Editing a section** persists, updates completeness live, **syncs the linked account** (4A) for
   rating-environment fields, and **logs to the activity feed**.
5. **Changing a rating input flags the quote stale**; re-rating recomputes via the existing engine,
   stores a fresh `rating_breakdown`, and clears the flag.
6. **Approve** advances the deal per the pipeline rules and logs; **Decline** records a reason and
   logs. Neither bypasses the stage model.
7. The **communication hub** posts and renders messages/RFIs on the deal, persisted and logged.
8. **Design honored in light AND dark** (header, KPI strip, rail buttons, comms hub, a section
   editor); **`pnpm typecheck` passes with zero errors** (`scripts/typecheck-baseline.sh` 0/0 and
   `pnpm typecheck` exit 0). Report typecheck two ways; do not "fix" unrelated pre-existing errors as
   part of this phase.

## 5. Files this phase touches

- **Reshape** `artifacts/axel-workforce-os/src/components/DealCardModal.tsx` into the §8 hub
  (header actions, KPI strip with pricing, comms-hub center, six-section rail).
- **Reuse** `components/submission/SubmissionFlow.tsx` section + `validateSection` logic for
  completeness; likely a small shared `useSubmissionSections(dealId)` helper.
- **Extend** `routes/submission.ts` / `routes/quotes.ts` / `routes/deals.ts` for save, re-rate/stale,
  approve/decline, messages. New narrow schema only if needed (`quotes.rating_stale`, a `deal_messages`
  table) via SQL DDL, re-exported from `schema/index.ts`.
- `lib/api-spec/openapi.yaml` + regenerated `generated/` (Orval + Zod).

## 6. Report back to Curtis (`docs/build-prompts/phase-4c-report.md`)

- Confirm **Option B** built as specified (rail buttons / KPI-strip pricing / header Approve-Decline).
- Pass/fail per acceptance test; **typecheck two ways**; light + dark screenshots (in chat, **not**
  committed) of the card, a section editor, and the stale/re-rate state.
- Any schema added (and that it went via SQL DDL); the messages/RFI storage choice.
- New/changed API surface (OpenAPI/Orval/Zod regenerated). Flag anything that touched a binding decision.
