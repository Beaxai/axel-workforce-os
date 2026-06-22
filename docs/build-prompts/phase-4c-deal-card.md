# Phase 4C — Deal Card "Collaboration Hub" (Stitch layout) — Replit build prompt

> **How to use:** paste the kickoff into Replit/Claude Code; it points the agent at this file.
> Execute in Replit (DB + secrets live there).
>
> **Owner decision (2026-06-22):** Curtis wants the deal card built to **his Stitch design**
> (`docs/mockups/4c-deal-card/stitch-reference/` — `screen.png` + `code.html`). The Stitch **layout
> supersedes §8's "six section buttons in the rail" wording**; **§8's functional requirements
> (sections, completeness, editor overlays, re-rate, sync, roles, API) still hold** and move to the
> **Submission tab**. The replacement §8 text for the State Document is drafted in
> [`docs/decisions/2026-06-22-4c-stitch-section8-update.md`](../decisions/2026-06-22-4c-stitch-section8-update.md)
> for Curtis to paste in — until he does, **this prompt + the Stitch are the build target.**
>
> **Source docs:** State Document [`§8`](../STATE_DOCUMENT_v2.1.md) (functional spec) + the Stitch
> (layout). **Dependencies (landed):** Phase 3.5 auth + Phase 4A Accounts.

## Two owner rulings baked into this build (2026-06-22)

1. **The 6-phase header tracker is a DISPLAY-ONLY macro lifecycle indicator.** It does **NOT** replace
   the binding **10-stage pipeline** (§11), which stays exactly as-is in the Kanban. Map the deal's
   real pipeline stage → one of the 6 macro phases for the header only.
2. **The collaboration hub is UI-now, logic-later.** Build the hub layout, the **static activity/message
   feed** (from the existing `activity_log`), and a working **composer** that posts a persisted
   message/note. The **AI quote-variation engine** and **RFI blocking/countdown logic** are **deferred
   to P6** — render them as static placeholders from data if present; do not build the live engines.

## Guardrails (binding decisions — flag before touching, do not redesign around)

- **Tokens only — re-skin the Stitch to the Axel brand.** The Stitch export uses `#E6007E` pink,
  `#00C875` green, `#FFCB00` amber — **these are NOT the brand.** Use Axel tokens: `--accent-primary`
  **#E91E8C** (interactive, gradient end), `--accent-support` **#7C3AED** (chips/secondary),
  `--gradient-cta` **only** on the single primary CTA (the **Approve** button), canvas **#060608** dark
  / **#f4f4f5** light, semantic green `#22c55e` / amber `#eab308` / red `#ef4444`. Inter body, Jost
  all-caps subheads. **Two glass recipes only:** `glass-card` (blur 12) for hub cards; **`glass-panel`
  (blur 40) for the section editor overlays.** No hardcoded accent hex outside the token files
  (`src/index.css` + `src/lib/use-theme-colors.ts`, kept in sync). **Verify light AND dark.**
- **Schema:** Replit PostgreSQL + Drizzle is permanent — **no Supabase**. Drizzle is source of truth;
  apply changes via **explicit SQL DDL, not a blanket `drizzle-kit push`** (the `deals` drift hangs).
  Likely change: a narrow `deals.rating_stale boolean default false` `ALTER`.
- **Auth (3.5) + Accounts (4A) implemented.** Reuse `requireAuth` + per-route `requireRoles` and the 4A
  account-sync + activity-log helpers. Authorization in API middleware, not RLS.
- **Rating engine is display/flag only (binding #3):** 4C shows pricing from the stored
  `rating_breakdown` and flags staleness; it does not change the math. Re-rate routes through the
  existing quote flow.
- **API changes** update `lib/api-spec/openapi.yaml` → regenerate **Orval/Zod**; never hand-edit
  `generated/`.
- **Git:** commit to `awf-os-brendy-sprint-1` (or a sub-branch). **Never merge/PR to `main`.**
- **Audit actual files, never agent memory.** Stack: React 19.1 + Vite + TS, Express 5, Drizzle.

---

## Layout — build the Stitch, re-skinned (see `stitch-reference/screen.png` + `code.html`)

- **Left sub-nav:** Overview · Submission · Documents · Tasks · Quote · Policy (active item = pink).
- **Header:** company name + badges (vertical, product/PEO, license, **Effective date**) + deal-team
  avatars (reuse the 4B-less avatar/initials pattern; photos TODO).
- **Macro lifecycle tracker** (band under header): 6 phases — **Submission Pending → Indication → U/W
  Review → Approved/Declined → Binding → Implementation** — current phase in `--accent-primary`.
  **Display-only; mapped from the real 10-stage pipeline (ruling #1). Do not alter the pipeline.**
- **KPI strip (4 cards):** Locations · Employees · Annual Payroll · ExMod. (Payroll/headcount live here,
  per §8 — removed from anywhere else.)
- **Overview tab = Collaboration Hub:** day-grouped activity/message timeline (user messages in
  `glass-card`, system/AI events, RFI cards), left timeline rail, and a **sticky composer** ("Type a
  message or request…", attach + send). UI + static feed + working composer now; **AI/RFI logic → P6
  (ruling #2).**
- **Right rail:** **WC Pricing** (Total Est. Premium from `rating_breakdown` + Modify), **WFS Pricing**
  (amount + per-employee + Modify), **Submission Actions** (**Approve** = the single `--gradient-cta`;
  **Decline** = outline). Modify enters the existing quote/rate flow.
- **Submission tab = the six §8 sections** (the Stitch doesn't draw this tab — build it from §8 below),
  full-width, each with a completeness indicator; click opens the heavy-glass editor overlay.

## §8 functional core (unchanged — lives on the Submission tab + drives the rail/KPIs)

- **Six sections:** Business Info · Locations · Workforce · Operations · Loss History · Coverage/Program.
  Fields **derive from the existing submission schema** (`submission_questions`/`answers` +
  `lib/cannabis-application`) — every field maps to **exactly one** section; no parallel list.
- **Completeness:** per section complete / partial ("N missing") / not started; required-field sets per
  **product type + vertical**; aggregate in the panel header; **computed server-side** in the deal payload.
- **Section editor overlays:** click → **heavy-glass overlay (`glass-panel`, blur 40)**, view + inline
  **Edit**; **Zod validation** (FEIN format; class codes must exist in `wc_rates` for the state); saves
  write to the **same records the rating engine + 4A account read** — single source of truth.
- **Re-rate flag:** rating-relevant edits (payroll, headcount, class codes, EMod, state, locations) set
  **`deals.rating_stale`**; persistent **"Rating inputs changed — re-rate required"** banner with a
  Re-rate action; clears on successful re-rate; non-rating edits don't trigger it.
- **Activity + sync:** every save logs a **field-level diff** to the activity feed (multi-field = one
  expandable entry) and **syncs company-level fields to the linked account** (4A rules).
- **Role-aware access (server-enforced):** ADMIN/CSA edit all; **UNDERWRITER view all, edit none**
  (Request Info); AGENT edit all on **own** deals; **EMPLOYER** edit Business Info/Locations/Workforce/
  Operations on own deal, **Loss History view-only**, internal notes never rendered; **CARRIER/PEO**
  view-only. UI hides unusable affordances; the **server is the boundary**.
- **API:** `GET` sectioned payload + completeness; `PATCH` per section with role + field validation.
  **Approve/Decline** endpoints (new, see below). Update `openapi.yaml` → regenerate Orval/Zod. SQL DDL.

## New scope vs §8 (from the Stitch, owner-approved — build these)

- **Submission Actions — Approve / Decline** (rail): **role-gated UNDERWRITER/ADMIN**; both **log to
  activity**; **Approve** advances the deal **per the existing 10-stage pipeline rules** (does not
  bypass them; pipeline stops at Bind Order — binding triggers implementation per binding #4); Decline
  records a reason. AGENT/others → **403**.
- **Rail pricing** (WC Total Est. Premium + WFS + per-employee): **display from the stored
  `rating_breakdown`**; Modify enters the existing quote/rate flow. (This overrides the earlier "pricing
  in KPI strip" idea — pricing lives in the rail per the Stitch.)
- **6-phase macro tracker** + **Collaboration Hub UI** + **composer** — per the two rulings above.

## Acceptance tests — all must pass (report pass/fail each)

1. **No orphaned submission fields** vs the product-type/vertical question set (every field → one section).
2. **Payroll edit** → KPI updates + **stale banner** + activity diff + **account synced** + banner
   **clears after re-rate**.
3. **Non-rating edit** → **no** stale banner.
4. **Completeness states** + aggregate correct, **server-computed**.
5. **UNDERWRITER `PATCH`** to any section → **403**; **AGENT** calling **Approve/Decline** → **403**.
6. **EMPLOYER** section permissions enforced (Loss History view-only; internal notes never rendered).
7. **Approve** advances the deal per the 10-stage pipeline and logs; **Decline** records a reason + logs.
8. **Macro tracker is display-only:** the deal's header phase reflects its real pipeline stage, and the
   **pipeline Kanban still has all 10 stages** (binding §11 intact — verify nothing repointed it to 6).
9. **Collaboration Hub:** activity feed renders from `activity_log`; the **composer posts a persisted
   message**; **AI quote-variation + RFI are static placeholders** (no live engine) — confirm deferred.
10. **Layout matches the Stitch, re-skinned to Axel tokens** (left nav, header, macro tracker, KPI strip,
    Overview hub, rail pricing + Approve/Decline; the **Submission tab renders the six sections** with
    completeness and a heavy-glass editor overlay).
11. **Tokens only, verified light AND dark**; **`pnpm typecheck` zero errors** — report two ways
    (`scripts/typecheck-baseline.sh` 0/0 **and** `pnpm typecheck` exit 0); don't touch pre-existing errors.
12. **Regression:** the deal card still opens from the **pipeline** and the **4A account detail**.

## Engineering notes (engineer's call, not owner-specified)

- `DealCardModal.tsx` is large (~1,879 lines). Split it while building (shell / sub-nav / macro-tracker /
  KPI strip / OverviewHub / SubmissionTab / SectionEditorOverlay / ReRateBanner / PricingRail /
  SubmissionActions). Container stays the existing modal (`openDealCard`/`GlobalDealCardHost`) so 4A's
  open path is preserved.

## Report back to Curtis (`docs/build-prompts/phase-4c-report.md`)

- Pass/fail per acceptance test; **typecheck two ways**; light + dark screenshots (in chat, **not**
  committed) of the Overview hub, the Submission tab + a section editor overlay, the rail, and the
  stale/re-rate banner.
- Confirm: macro tracker is display-only and the 10-stage pipeline is untouched; AI/RFI are deferred
  (UI-only); pricing + Approve/Decline live in the rail.
- Schema added (SQL DDL) + new API surface (OpenAPI/Orval/Zod regenerated). Flag any binding-decision touch.
- Note for Curtis: paste the updated §8 text (`2026-06-22-4c-stitch-section8-update.md`) into the State
  Document so the doc matches the build.
