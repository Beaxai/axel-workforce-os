# Phase 4C — Deal Card Submission Panel — Replit build prompt

> **How to use:** paste the kickoff into Replit/Claude Code; it points the agent at this file.
> **This prompt is the State Document §8 work order, restated 1:1.** Execute in Replit (DB + secrets
> live there).
>
> **Source of truth:** [`docs/STATE_DOCUMENT_v2.1.md`](../STATE_DOCUMENT_v2.1.md) **§8** — build exactly
> that. The owner instructions are [`docs/PROJECT_INSTRUCTIONS.md`](../PROJECT_INSTRUCTIONS.md). Where
> anything here differs from §8, **§8 wins.** §8's six-buttons-in-the-rail layout is "Option B" in the
> earlier B/C discussion, chosen 2026-06-22 ([`2026-06-15-4c-deal-card-layout.md`](../decisions/2026-06-15-4c-deal-card-layout.md)).
>
> **Dependencies (both landed):** Phase 3.5 auth + Phase 4A Accounts. 4C is **unblocked** and uses 4A's
> real account-sync rules (not stubs).

## Guardrails (binding decisions — flag to Curtis before touching, do not redesign around)

- **Schema:** Replit PostgreSQL + Drizzle is permanent — **no Supabase**. Drizzle is source of truth;
  apply changes via **explicit SQL DDL, not a blanket `drizzle-kit push`** (the `deals` drift hangs/risks
  a TRUNCATE). The likely change is a narrow `deals.rating_stale boolean default false` `ALTER`.
- **Auth (3.5) + Accounts (4A) are implemented.** Reuse `requireAuth` + per-route `requireRoles`
  (`routes/index.ts`, `middleware/require-auth.ts`; roles in `org_members`) and the 4A account-sync +
  activity-log helpers. Authorization in API middleware, not RLS.
- **Rating engine is display/flag only here (binding #3):** WC = `(Payroll÷100)×ClassCodeRate×EMod×
  ScheduleRating`, **$500 min**; PEO **10% bundled WC discount (WC component only)**; WFS PEPM =
  `(annual payroll×2%)÷12`; **every calc stores `rating_breakdown` JSON**; most recent rate per
  State+ClassCode, EffectiveDate never filters. 4C **flags** staleness and routes re-rate through the
  existing quote flow — it does not change the math.
- **Design = tokens only:** pink `#E91E8C` `--accent-primary` (all interactive), purple `#7C3AED`
  `--accent-support` (chips/secondary), `--gradient-cta` only on a single CTA per view. Inter body /
  Jost headings. **Two glass recipes only** — `glass-card` (blur 12) and `glass-panel` (blur 40); the
  **section editor overlay is `glass-panel`/heavy-glass (blur 40)**. No hardcoded accent hex outside the
  token files (`src/index.css` + `src/lib/use-theme-colors.ts`, kept in sync). Canvas `#060608` dark /
  `#f4f4f5` light. **Verify BOTH light and dark** (Definition of Done).
- **Stitch is a LAYOUT reference, not color or scope:** `docs/mockups/4c-deal-card/stitch-reference/`
  (and the "Approach B" panel in `index.html`) inform structure/visual rhythm only. The Stitch export's
  colors are generic Material blue/green — **re-skin to Axel tokens.** Where the Stitch diverges from
  §8 (see "Out of scope" below), **§8 governs.**
- **API changes** update `lib/api-spec/openapi.yaml` → regenerate **Orval hooks + Zod**; never hand-edit
  `generated/`.
- **Git:** commit to `awf-os-brendy-sprint-1` (or a sub-branch). **Never merge/PR to `main`.**
- **Audit actual files, never agent memory.** Stack: React 19.1 + Vite + TS, Express 5, Drizzle.

---

## §8 work order — build exactly this

> The deal card is the platform's communication hub and must hold ALL submission data, sectioned and
> editable. Replaces the flat "Deal Details" rail. Runs after 4A (uses its account-sync rules).

### 1. Right rail redesign
- **Summary block (top):** business name, quote-type badge, state(s), requested effective date.
  **Remove payroll/headcount from the rail — the KPI strip owns them.**
- **Six section buttons**, each a **`glass-card` row** with icon, name, and completeness indicator:
  - **Business Info** — legal name, DBA, FEIN, entity type, years in business, website, contacts
  - **Locations** — addresses, states, premises, multi-location per the rating model
  - **Workforce** — headcount + payroll by class code and state, EMod, class list
  - **Operations** — description, NAICS, safety programs, question-set detail
  - **Loss History** — prior carriers, periods, claims, loss-run docs
  - **Coverage/Program** — quote type, effective/expiration, structure, PEO/ASO selections
- Section fields **derive from the existing submission schema** (`submission_questions`/`answers` +
  `lib/cannabis-application` canonical schema) — **every captured field maps to exactly one section;
  no parallel field list.**

### 2. Completeness
- Per section: **complete / partial ("N missing") / not started**; required-field sets derive from the
  submission question config **per product type and vertical**; aggregate **"Submission 4/6 complete"**
  in the panel header; **computed server-side** in the deal payload.

### 3. Section editor overlays
- Click opens a **heavy-glass overlay (blur 40px)**, view mode with inline **Edit**; **Zod validation
  from the generated schemas**; saves write to the **SAME records the rating engine and account profile
  read** — single source of truth.
- **Re-rate flag:** rating-relevant changes (payroll, headcount, class codes, EMod, state, locations)
  set **`rating_stale`** on the deal; persistent banner **"Rating inputs changed — re-rate required"**
  with a **Re-rate** action into the quote flow; **clears on successful re-rate**; non-rating edits do
  not trigger it.
- Every save **logs to the activity feed** with user, section, field-level diff; multi-field saves log
  **one expandable entry**; company-level edits **sync to the linked account** and its activity feed
  (4A rules).

### 4. Role-aware access (server-enforced)
- **ADMIN/CSA** edit all; **UNDERWRITER** view all, **edit none** (uses "Request Info"); **AGENT** edit
  all on **own** deals; **EMPLOYER** edit Business Info / Locations / Workforce / Operations on own deal,
  **Loss History view-only**, internal notes never rendered; **CARRIER/PEO** view-only relevant sections.
  UI hides unusable edit affordances; the **server is the enforcement boundary**.

### 5. API + codegen
- **GET** sectioned submission payload + completeness. **PATCH per section** with role + field-level
  validation (**FEIN format; class codes must exist in `wc_rates` for the state**). Update
  `lib/api-spec/openapi.yaml` → regenerate **Orval/Zod**. Apply schema via **SQL DDL**.

---

## Acceptance tests — §8's set; all must pass (report pass/fail each)

1. **No orphaned submission fields** vs the product-type/vertical question set (every field maps to one
   section).
2. **Payroll edit** → KPI updates + **stale banner appears** + activity diff logged + **account synced**
   + banner **clears after re-rate**.
3. **Non-rating edit** → **no** stale banner.
4. **Completeness states** correct per section + correct aggregate (server-computed).
5. **UNDERWRITER `PATCH`** to any section → **403**.
6. **EMPLOYER** section permissions enforced server-side (Loss History view-only; internal notes never
   rendered).
7. **Heavy-glass overlay + tokens only**, verified in **light AND dark**; **`pnpm typecheck` zero
   errors** — report two ways (`scripts/typecheck-baseline.sh` 0/0 **and** `pnpm typecheck` exit 0); do
   not "fix" unrelated pre-existing errors as part of this phase.
8. _(Added regression — not §8, keep it:)_ the deal card still opens from the **pipeline** and from the
   **4A account detail**, with the new rail rendering.

---

## Out of scope for 4C (NOT in §8 — do not build; the Stitch shows some of these)

§8 redesigns the **right rail + section editing only**. The Stitch mockup additionally shows items that
**§8 does not include** — leave them alone in 4C:

- **Approve / Decline actions** — not in §8. Do not add or relocate them; leave any existing card
  behavior as-is.
- **WC/WFS premium pricing placement** — §8 moves only **payroll/headcount** to the KPI strip. Do **not**
  relocate or restyle premium pricing as part of 4C.
- **Communication hub — RFI workflow, AI quote-variation engine, AI composer** — the "communication hub"
  is framing; the actual RFI/AI features are **deferred to P6**. Do not build them now.
- **Header stage tracker** — §8 doesn't touch the header. Do **NOT** introduce the Stitch's 6-macro-phase
  tracker; the pipeline is **binding at 10 stages** (§11). If a header lifecycle indicator is ever wanted,
  it's a separate binding decision for Curtis — flag, don't build.

## Engineering notes (recommended, not §8 — engineer's call)

- `DealCardModal.tsx` is large (~1,879 lines); splitting it while implementing §8 (e.g. shell / rail /
  section-overlay / re-rate-banner) keeps each unit testable. Container stays the existing modal
  (`openDealCard` / `GlobalDealCardHost`) so 4A's open path is preserved.

## Report back to Curtis (`docs/build-prompts/phase-4c-report.md`)

- Pass/fail per §8 acceptance test; **typecheck two ways**; light + dark screenshots (in chat, **not**
  committed) of the rail, a section editor overlay, and the stale/re-rate banner.
- Schema added (and that it went via SQL DDL); new/changed API surface (OpenAPI/Orval/Zod regenerated).
- Confirm the **out-of-scope** items were left untouched. Flag anything that touched a binding decision.
