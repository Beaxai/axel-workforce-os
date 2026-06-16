# Phase 4C — Deal Card Submission Panel — Design Spec

_Date: 2026-06-15 · Author: Brendan (lead engineer) · Status: DRAFT — chosen layout (Approach C) pending Curtis sign-off (see §13)_
_Source of truth: Axel Workforce OS Project State Document v2.1, §8 (Phase 4C work order). Visual inspiration: owner-provided Google Stitch layout (`stitch_extract/`)._

## 1. Scope & sequencing

This designs the Phase 4C deal card: the deal card becomes "the platform's communication hub" holding **all** submission data, sectioned and editable, replacing the flat "Deal Details" rail.

**Hard dependencies (State Doc build order `3.5 → 4A → 4C`):**
- **Phase 3.5 (auth)** — §8 role enforcement is server-side; requires real sessions + roles from 3.5.
- **Phase 4A (Accounts)** — section→account sync and the `account_id` FK come from 4A; 4C "runs after 4A and uses its account-sync rules."

This spec may be **written and mocked now**, but **implementation is gated on 3.5 + 4A landing.** Building 4C ahead of those is out of order and will require stubbing role + account-sync behavior.

## 2. Chosen direction

- **Layout: Approach C — hybrid rail (CHOSEN, pending Curtis — see §13).** The right rail carries a **compact six-section completeness summary** *and* WC/WFS pricing *and* Approve/Decline; the **Submission** sub-nav tab expands the six sections **full-width for viewing/editing**; **Overview** is the static comms/activity hub. Keeps section completeness visible in the rail (close to State Doc §8) while giving editing real room and pricing/actions a home.
- **Fallback: Approach B (spec-literal).** If Curtis wants the rail to be section buttons only, the six sections render as completeness buttons in the right rail per State Doc §8 wording; pricing moves to the KPI strip and Approve/Decline become header actions. Everything else in this spec is unchanged.
- **Alternative considered: Approach A** (sections on their own tab, rail = pricing/actions only) — set aside in favor of C so section completeness stays visible without a tab switch.
- **Comms scope: static now.** Overview ships as a read-only activity feed + manual notes. The AI quote-variation engine, blocking RFIs with countdowns, and AI composer shown in the Stitch are **deferred to P6** (documented as vision, not built in 4C).

## 3. Layout & information architecture (Approach C)

- **Left sub-nav:** Overview · Submission · Documents · Tasks · Quote · Policy (active item gets the pink 2px left bar).
- **Header:** company name + product/effective badges + the **10-stage pipeline stepper** (New Lead → Qualified → Needs Analysis → Proposal Sent → Negotiation → Decision Pending → Committed → Documentation → Bound → Client; current stage in `--accent-primary`).
- **KPI strip (full width):** Locations · Employees · Annual Payroll · ExMod. Payroll/headcount live here, removed from the body.
- **Right rail (persistent across tabs), top → bottom:**
  1. **Compact six-section completeness summary** — one row per section (name + status: check / "N missing" / "—") with the aggregate ("3 / 6") in the header. Rows are read-only at-a-glance here; clicking a row deep-links to that section on the Submission tab.
  2. **WC est. premium** (+ Modify) and **WFS pricing** (+ per-employee, + Modify).
  3. **Submission Actions** — Approve (`--gradient-cta`), Decline.
- **Overview tab:** static activity/comms feed (system events + human notes), newest grouped by day; rail visible alongside.
- **Submission tab:** the six sections expand **full-width** for viewing/editing, each opening an editor overlay (§5). This is where the real editing happens; the rail summary mirrors its completeness state.

Rail density note: the hybrid rail is the tallest of the three options. On shorter viewports the completeness summary collapses to a single "Submission 3/6" line with a chevron that expands the per-section rows, keeping pricing + actions above the fold.

## 4. The six sections + completeness

Sections: **Business Info · Locations · Workforce · Operations · Loss History · Coverage/Program.**

- Fields **derive from the existing submission schema** (`submission_questions` / `submission_answers` + the `@workspace/cannabis-application` canonical schema). Every captured field maps to **exactly one** section — no parallel field list.
- Per-section completeness: `complete` / `partial` ("N missing") / `not_started`. Required-field sets are keyed by **product type + vertical**.
- Aggregate ("Submission 4/6 complete") shown in the panel/tab header.
- **Completeness is computed server-side** and returned in the deal payload — the client renders, it does not compute required-field logic.

## 5. Section editor overlays

- Click a section → heavy **`glass-panel` (blur 40px)** overlay; view mode with inline **Edit**.
- Validation uses the **generated Zod schemas** (field-level): FEIN format; class codes must exist in `wc_rates` for the location's state.
- Saves write to the **same records the rating engine and the 4A account profile read** — single source of truth, no shadow copies.

## 6. Re-rate stale flag

- Rating-relevant edits — **payroll, headcount, class codes, EMod, state, locations** — set **`rating_stale = true`** on the deal.
- Persistent banner: "Rating inputs changed — re-rate required" with a **Re-rate** action that enters the quote flow; clears on successful re-rate.
- Non-rating edits (e.g. website, contact name) do **not** set the flag.

## 7. Activity log + account sync

- Every save logs to the activity feed with **user, section, and field-level diff**; a multi-field save logs **one expandable entry**.
- Company-level edits **sync to the linked account** and its activity feed, per 4A rules.

## 8. Role-aware access (server-enforced)

| Role | Access |
|------|--------|
| ADMIN / CSA | Edit all sections |
| UNDERWRITER | View all; edit none (uses "Request Info") |
| AGENT | Edit all sections on **own** deals |
| EMPLOYER | Edit Business Info / Locations / Workforce / Operations on own deal; Loss History view-only; internal notes never rendered |
| CARRIER / PEO | View-only on relevant sections |

The UI hides unusable edit affordances, but the **server is the enforcement boundary** (mirrors the frontend access map; no route ships without explicit `allowedRoles`).

## 9. API surface + codegen

- `GET` deal submission payload: sectioned fields + per-section + aggregate completeness.
- `PATCH` per section: role check + field-level validation (FEIN, class-code-in-`wc_rates`-for-state).
- Update `lib/api-spec/openapi.yaml` → regenerate **Orval hooks + Zod schemas** (never hand-edit `generated/`).

## 10. Component decomposition

`DealCardModal.tsx` is currently **1,879 lines** and must be split as part of 4C:
- `DealCardShell` — sub-nav + header + stage stepper + KPI strip + persistent right rail.
- `OverviewTab` — activity/comms feed.
- `SubmissionTab` — full-width six-section view/edit surface.
- `RailCompletenessSummary` — compact per-section status + aggregate in the rail (deep-links into `SubmissionTab`); collapses on short viewports.
- `SectionEditorOverlay` — heavy-glass editor + Zod validation.
- `ReRateBanner` — stale-flag banner + Re-rate action.
- `PricingRail` — WC/WFS pricing + Approve/Decline (sits below `RailCompletenessSummary`).

Each unit is independently testable and small enough to hold in context. The components are structured so they can later be lifted into a standalone `/deals/:id` route (see §12) without a rewrite.

## 11. Container decision (open, reversible)

Default: **enhance the existing full-screen modal** (`DealCardModal` + `openDealCard`/`GlobalDealCardHost`) — 4A opens deals via this modal, so the contract is preserved. A move to a dedicated `/deals/:id` route is deferred; §10's decomposition keeps that option cheap. Brendan to confirm after more time in the codebase.

## 12. Design-system compliance

- Tokens only (`src/index.css` + `src/lib/use-theme-colors.ts` in sync). No hardcoded accent hexes outside token files.
- Pink `--accent-primary` for interactive; purple `--accent-support` for chips/secondary; `--gradient-cta` only on the single Approve CTA.
- **Inter** body, **Jost** headings; two glass recipes only (`glass-card` 12 / `glass-panel` 40).
- **Definition of Done: verified in BOTH light and dark mode.**

## 13. Flag to Curtis (binding-decision process — paste-ready)

> **Proposed refinement of State Doc §8 (Phase 4C).** §8 specifies the six submission sections as completeness **buttons in the deal-card right rail**. Building off the Stitch layout you provided, I recommend a hybrid: keep a **compact six-section completeness summary in the rail** (so status stays visible per your spec) and add **WC/WFS pricing + Approve/Decline** beneath it, while the actual **editing happens full-width on a "Submission" sub-nav tab**. **Overview** becomes the activity/comms hub.
>
> **Why it's better UX:** the rail still surfaces section completeness at a glance (honoring §8's intent), but six fully-interactive section editors don't fit legibly in a rail that also needs to show pricing and the bind/decline actions — so editing moves to a roomy tab. **Tradeoff:** the rail is taller (mitigated by a collapse-on-short-viewports behavior); reaching a section's editor is one click from the rail summary. **Fallback:** if you prefer the rail to be section buttons only, Approach B (spec-literal) is fully designed and ready — pricing would move to the KPI strip.
>
> Requesting your OK on Approach C before build. If approved, §8 of the State Document should be updated to match.

## 14. Acceptance tests (adapted from State Doc §8 for Approach A)

1. No orphaned submission fields vs the product-type/vertical question set (every field maps to one section).
2. Payroll edit → KPI updates + stale banner appears + activity diff logged + account synced + banner clears after re-rate.
3. Non-rating edit → no stale banner.
4. Completeness states (complete / N missing / not started) correct per section; aggregate correct.
5. UNDERWRITER `PATCH` to any section → **403**.
6. EMPLOYER section permissions enforced server-side (Loss History view-only; internal notes never rendered).
7. Rail shows the compact six-section completeness summary with correct states and aggregate; the **Submission tab** renders all six sections full-width and the section editor opens as heavy glass; rail summary and tab stay in sync after an edit.
8. Design system honored in **light and dark**; `pnpm typecheck` passes with zero errors.
9. Regression: deal card still opens from pipeline and from the 4A account detail.

## 15. Open questions

- Container: modal-now vs `/deals/:id` page (§11) — Brendan to confirm.
- Curtis sign-off on Approach C (§13) — blocks build of the chosen layout (Approach B is the no-sign-off fallback).
- Confirm 3.5 + 4A are complete before 4C implementation begins (§1).
