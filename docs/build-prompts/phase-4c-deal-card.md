# Phase 4C — Deal Card Submission Panel (Option B) — Replit build prompt

> **How to use:** paste the kickoff into Replit/Claude Code; it points the agent at this file.
> Implements State Document **§8**. Execute in Replit (DB + secrets live there).
>
> **Source of truth for behavior:** [`docs/superpowers/specs/2026-06-15-4c-deal-card-design.md`](../superpowers/specs/2026-06-15-4c-deal-card-design.md).
> Build **everything** in that spec, with the **Approach B** layout (the spec's documented fallback,
> §2). This prompt restates the spec adapted to B and flags where B diverges from the C-authored
> sections. **Where this prompt and the spec disagree, the spec governs** — except the layout, which
> is locked to **B** per [`docs/decisions/2026-06-15-4c-deal-card-layout.md`](../decisions/2026-06-15-4c-deal-card-layout.md).
>
> **Dependencies (both landed):** Phase 3.5 auth (`3a58ada`) and Phase 4A Accounts. 4C is **unblocked** —
> section→account sync uses the real 4A plumbing, not stubs.

## TL;DR

Turn the deal card into the submission hub per §8, **Approach B**:

- **Right rail = the six submission sections as completeness *buttons*** (Business Info · Locations ·
  Workforce · Operations · Loss History · Coverage/Program). Each button shows its completeness state;
  clicking it opens that section's **heavy-glass editor overlay**.
- **WC + WFS pricing** is promoted into the **KPI strip** (this is the B difference: in C it lived in
  the rail).
- **Approve / Decline** are **header actions** (the B difference: in C they lived in the rail).
- **Overview = static activity/comms feed** (read-only system events + manual notes). **The AI
  quote-variation engine, blocking RFIs with countdowns, and the AI composer are DEFERRED to P6**
  (spec §2) — do **not** build them in 4C.
- Section edits validate (Zod), **persist to the same records the rating engine + 4A account read**,
  **sync company-level fields to the linked account**, **log a field-level diff to activity**, and —
  for rating-relevant fields — **raise a re-rate stale flag**.

## Guardrails (binding decisions — do not revisit)

- **Layout = Approach B only.** Sections = completeness buttons in the rail; pricing in the KPI strip;
  Approve/Decline in the header. **No "Submission" sub-nav tab** (that's C). B↔C is front-end-only and
  reversible later — build B cleanly, don't hedge.
- **Comms scope is STATIC in 4C.** Overview = read-only activity feed + manual notes. RFI/AI/composer
  → **P6**. Building them here is out of scope.
- **Completeness is computed SERVER-SIDE** and returned in the deal payload; the client **renders**, it
  does not compute required-field logic (spec §4). Required-field sets are keyed by **product type +
  vertical**.
- **Auth (3.5) + Accounts (4A) are implemented.** Reuse `requireAuth` + per-route `requireRoles`
  (`routes/index.ts`, `middleware/require-auth.ts`; roles in `org_members`) and the 4A account-sync +
  activity-log helpers. Do not re-invent either.
- **Schema:** Drizzle is source of truth; apply changes via **explicit SQL DDL, not a blanket
  `drizzle-kit push`** (the `deals` drift hangs/risks a TRUNCATE — `.agents/memory/drizzle-push-blocked.md`).
  The likely change is a narrow `deals.rating_stale boolean default false` `ALTER` (spec §6).
- **No Supabase** (deleted). Authorization in API middleware, not RLS.
- **Rating engine (binding #3) is display-only here.** WC premium = `(Payroll ÷ 100) × ClassCodeRate ×
  EMod × ScheduleRating`, **$500 min**; PEO = **10% bundled WC discount on the WC component only**; WFS
  PEPM = `(annual payroll × 2%) ÷ 12`; **every calc stores a full `rating_breakdown` JSON**; most recent
  rate per State+ClassCode, `EffectiveDate` never filters. 4C **displays** pricing and **flags
  staleness** — it does not change the math; re-rate routes through the existing quote flow.
- **Design system: tokens only** — pink `#E91E8C` `--accent-primary` (interactive), purple `#7C3AED`
  `--accent-support` (chips/secondary), `--gradient-cta` **only** on the single Approve CTA. Inter body /
  Jost all-caps subheads. **Two glass recipes only** (`glass-card` blur 12 / `glass-panel` blur 40);
  the section editor overlay is `glass-panel`. No hardcoded accent hex outside the token files
  (`src/index.css` + `src/lib/use-theme-colors.ts`, kept in sync). **Verify light AND dark.**
- **API changes** update `lib/api-spec/openapi.yaml` → regenerate **Orval hooks + Zod**; never
  hand-edit `generated/`.
- **Git:** commit to `awf-os-brendy-sprint-1` (or a sub-branch). **Never merge/PR to `main`.**
- **Audit actual files, never memory.** Stack: React 19.1 + Vite + TS, Express 5, Drizzle.

## 0. Current state (verify against code before building)

- **`DealCardModal.tsx` is ~1,879 lines and MUST be split** as part of 4C (spec §10). It currently has
  tabs `activity | quote | proposal | bind`, a stage strip, and panels (`ProposalPanel`,
  `BindStatusPanel`, …). 4A opens deals via this modal (`openDealCard` / `GlobalDealCardHost`) — keep
  that contract.
- **Submission fields derive from the existing schema** (`submission_questions` / `submission_answers`
  + the `@workspace/cannabis-application` canonical schema). Every captured field maps to **exactly
  one** section — **no parallel field list**. `SubmissionFlow.tsx` groups questions by `q.section`;
  reuse that section model, but move required-field/completeness computation **server-side**.
- **Reference mockup:** `docs/mockups/4c-deal-card/index.html` → **"Approach B"**.

## 1. Layout & IA — Approach B

- **Left sub-nav:** Overview · Documents · Tasks · Quote · Policy (active item = pink 2px left bar).
  **No Submission tab.**
- **Header:** company name + product/effective badges + the stage stepper (see the §15 open question on
  6-macro vs 10-stage) + **Approve (`--gradient-cta`) / Decline** actions, role-gated.
- **KPI strip (full width):** Locations · Employees · Annual Payroll · ExMod · **WC est. premium** ·
  **WFS pricing** (+ per-employee). Pricing promoted here is the B difference.
- **Right rail (persistent):** the **six sections as completeness buttons** — each shows name + status
  (`complete` ✓ / `N missing` / `not started`) with the aggregate (`3 / 6`) in the rail header.
  Clicking a button opens that section's editor overlay (§3). Required-field validation reflects the
  **server-computed** completeness.
- **Overview tab:** static activity/comms feed (system events + human notes), newest grouped by day.

## 2. Component decomposition (spec §10, adapted to B)

Split the modal into small, independently testable units:

- `DealCardShell` — sub-nav + header (badges, stage stepper, **Approve/Decline**) + **KPI strip with
  WC/WFS pricing** + persistent right rail.
- `OverviewTab` — static activity/comms feed (read-only + manual notes).
- `SubmissionRail` — the six **section completeness buttons** + aggregate; opens `SectionEditorOverlay`.
- `SectionEditorOverlay` — heavy `glass-panel` editor; view mode + inline Edit; Zod validation.
- `ReRateBanner` — stale-flag banner + Re-rate action.

Structure so they can later lift into a `/deals/:id` route without a rewrite (§11 — container stays the
existing modal for now; confirm with Brendan).

## 3. Sections, completeness, editor, validation

- **Six sections:** Business Info · Locations · Workforce · Operations · Loss History · Coverage/Program.
- **Completeness (server-side):** per section `complete` / `partial` ("N missing") / `not_started`,
  plus aggregate; required-field sets keyed by **product type + vertical**; returned in the deal payload.
- **Editor overlay:** click a section → `glass-panel` overlay, view mode with inline **Edit**.
  **Field-level Zod validation using the generated schemas:** FEIN format; **class codes must exist in
  `wc_rates` for the location's state**. Saves write to the **same records** the rating engine and the
  4A account profile read — no shadow copies.

## 4. Re-rate stale flag (spec §6)

- Rating-relevant edits — **payroll, headcount, class codes, EMod, state, locations** — set
  **`deals.rating_stale = true`** (narrow SQL DDL `ALTER` if the column is absent).
- Persistent **`ReRateBanner`**: "Rating inputs changed — re-rate required" + **Re-rate** action that
  enters the existing quote flow; **clears on successful re-rate**.
- **Non-rating edits** (website, contact name, …) do **not** set the flag.

## 5. Activity log + account sync (spec §7)

- Every save logs to the activity feed with **user, section, and field-level diff**; a multi-field save
  logs **one expandable entry**.
- **Company-level edits sync to the linked account** and its activity feed, per 4A rules.

## 6. Role-aware access (server-enforced — spec §8)

| Role | Section access |
|------|----------------|
| ADMIN / CSA | Edit all sections |
| UNDERWRITER | **View all; edit none** (uses "Request Info") |
| AGENT | Edit all sections on **own** deals |
| EMPLOYER | Edit Business Info / Locations / Workforce / Operations on own deal; **Loss History view-only**; internal notes never rendered |
| CARRIER / PEO | View-only on relevant sections |

- **Approve / Decline** (the underwriting decision) are gated to **UNDERWRITER + ADMIN**; AGENT and
  others cannot see or call them (server returns **403**). Confirm the exact Approve/Decline role set
  against §8 if the doc specifies it.
- UI hides unusable affordances, but the **server is the enforcement boundary** — no route ships
  without explicit `allowedRoles`.

## 7. API surface + codegen (spec §9)

- `GET` deal submission payload: sectioned fields + **per-section + aggregate completeness**
  (server-computed).
- `PATCH` per section: role check + field-level validation (FEIN, class-code-in-`wc_rates`-for-state).
- Approve / Decline endpoints (role-gated; log to activity; Approve advances the deal per the pipeline
  rules — pipeline stops at Bind Order, binding triggers implementation per binding #4; Decline records
  a reason).
- Update `lib/api-spec/openapi.yaml` → regenerate **Orval hooks + Zod**. Apply schema via **SQL DDL**.

## 8. Acceptance tests — all must pass (adapted from spec §14 for B; report pass/fail each)

1. **No orphaned submission fields** vs the product-type/vertical question set (every field maps to one
   section).
2. **Payroll edit** → KPI updates + **stale banner appears** + activity diff logged + **account synced**
   + banner **clears after re-rate**.
3. **Non-rating edit** → **no** stale banner.
4. **Completeness states** (complete / N missing / not started) correct per section; **aggregate**
   correct; values come from the **server**.
5. **UNDERWRITER `PATCH`** to any section → **403**.
6. **EMPLOYER** section permissions enforced server-side (Loss History view-only; internal notes never
   rendered).
7. **(B layout)** The right rail shows the **six sections as completeness buttons** with correct states
   + aggregate; clicking a button opens the **`glass-panel` section editor**; rail completeness updates
   after an edit. **(No Submission tab.)**
8. **(B layout)** **WC est. premium + WFS pricing render in the KPI strip**; **Approve/Decline are
   header actions**, visible only to UNDERWRITER/ADMIN; an AGENT calling the endpoint gets **403**.
9. **Design honored in light AND dark**; **`pnpm typecheck` passes with zero errors** (report two ways:
   `scripts/typecheck-baseline.sh` 0/0 **and** `pnpm typecheck` exit 0). Do not "fix" unrelated
   pre-existing errors as part of this phase.
10. **Regression:** the deal card still opens from the **pipeline** and from the **4A account detail**.

## 9. Design polish (must hold in the real build — spec §16)

- **Label contrast (AA):** small metadata labels (stepper/KPI/rail) clear WCAG AA on `#060608` — floor
  `rgba(255,255,255,0.55)`, ~10–11px.
- **No color-only status:** "complete" uses a check glyph or text, not a bare green dot.
- **Light mode** built + verified (half the Definition of Done).
- Standardize radii to the system; use the two real glass recipes for inner cards; Jost for section
  subheadings.
- Consider **one semantic accent** for out-of-range risk values (e.g. ExMod > 1.10) — "color as state,"
  within token rules.

## 10. Open question to resolve with Curtis BEFORE building the header (binding-decision process)

- **Header stage tracker (spec §15):** the Stitch reference shows a condensed **6 macro phases**
  (Submission Pending → Indication → U/W Review → Approved/Declined → Binding → Implementation), but
  binding decision / §11 defines the pipeline as **10 stages**. This **touches a binding decision** —
  do **not** silently pick one. Decide with Curtis: (a) header = a macro lifecycle tracker *distinct*
  from the 10-stage Kanban, or (b) header mirrors the real 10 stages. Build the rest of 4C while this is
  pending; gate only the header stepper on the answer.

## 11. Report back to Curtis (`docs/build-prompts/phase-4c-report.md`)

- Confirm **Approach B** built as specified (rail = section buttons / KPI-strip pricing / header
  Approve-Decline; **no comms RFI/AI** — deferred to P6; **completeness server-side**).
- Pass/fail per acceptance test; **typecheck two ways**; light + dark screenshots (in chat, **not**
  committed) of the card, a section editor overlay, and the stale/re-rate banner.
- Schema added (and that it went via SQL DDL); the `DealCardModal` decomposition as actually built.
- New/changed API surface (OpenAPI/Orval/Zod regenerated).
- **Header stage-tracker decision** (§10) as resolved, and anything else that touched a binding decision.
