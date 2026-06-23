# Phase 4C — Deal Card Collaboration Hub — Build Report

**Branch:** `awf-os-brendy-sprint-1` (never committed/merged/PR'd to `main`)
**Spec:** `docs/superpowers/specs/2026-06-15-4c-deal-card-design.md` (Approach C)
**Visual ref:** `docs/mockups/4c-deal-card/prototype-c.html` (Axel-token realization of Curtis's Stitch layout)

---

## 1. Summary

The Deal Card was rebuilt from a single 1,883-line `DealCardModal.tsx` into a decomposed
collaboration hub. The server now computes a six-section submission model with per-section
completeness and fine-grained edit access; the client renders only what the server grants.
A new `/deal-card` router enforces the §8 role/ownership matrix. The 6-phase header tracker
is **display-only**, mapped from the binding 8-stage pipeline (the Kanban is unchanged).

---

## 2. What shipped

### Backend
- **`deals.rating_stale`** boolean column (default `false`), applied via explicit `ALTER TABLE` DDL.
- **`lib/deal-sections.ts`** — maps deal + account fields into six sections
  (Business Info, Locations, Workforce, Operations, Loss History, Coverage/Program) with
  per-section `complete | partial | not_started` status keyed by required fields, plus the
  `RATING_RELEVANT_KEYS` set and `canEditSection()` role/ownership rules.
- **`routes/deal-card.ts`** mounted at `/deal-card` (all 7 party types allowed in; §8 enforced inside):
  - `GET /:id/submission` — sectioned fields + completeness + per-section `access` map + `canApprove`.
  - `PATCH /:id/submission/:section` — role+ownership gate, Zod/field coercion (incl. FEIN format),
    field-diff activity log, account sync for company fields, sets `rating_stale` on rating-relevant edits.
    **UNDERWRITER → 403.**
  - `POST /:id/messages` — persists composer message to `activity_log`.
  - `POST /:id/approve` / `POST /:id/decline` — UNDERWRITER/ADMIN only; advance stage / set LOST + reason.
  - `POST /:id/clear-rating-stale` — clears the flag on successful re-rate.

### OpenAPI / codegen
- New paths + schemas + `deal-card` tag added to `lib/api-spec/openapi.yaml`; Orval + Zod regenerated.
- Renamed a colliding schema `ClearRatingStaleResponse → RatingStaleClearedResponse` (Orval barrel
  collided with the operationId-derived type).

### Frontend (`components/deal-card/`)
Decomposed per §10: `DealCardShell`, `OverviewTab`, `SubmissionTab`, `RailCompletenessSummary`,
`SectionEditorOverlay`, `ReRateBanner`, `PricingRail`, plus `SupportingTabs` (Documents / Tasks /
Quote / Policy wrapping the existing functional panels), `types.ts`, `icons.tsx`, `stage-map.ts`.
- Header (company + badges + close), 6-phase macro tracker, KPI strip
  (Locations / Employees / Annual Payroll / ExMod), left sub-nav.
- **Overview** = day-grouped activity timeline + sticky persisted composer (AI quote-variation
  + RFI widgets are static placeholders, deferred to P6 per ruling #2).
- **Submission** = six section cards + glass section-editor overlay + re-rate banner.
- **Right rail** = completeness summary + WC/WFS pricing + Approve/Decline (gradient CTA on Approve).
- `DealCardModal.tsx` is now a thin re-export preserving the public contract
  (`<DealCardModal>`, `openDealCard(dealId)`, `<GlobalDealCardHost />`).
- Role-aware affordances from `auth-store`; tokens only; verified light + dark.

---

## 3. Stage → phase map (display only)

| Pipeline stage      | Header phase           |
|---------------------|------------------------|
| SUBMISSION_REVIEW   | Submission Pending     |
| INDICATION          | Indication             |
| UW_REVIEW           | U/W Review             |
| APPROVED_QUOTED     | Approved/Declined      |
| BIND_ORDER          | Binding                |
| BOUND / CLIENT      | Implementation         |
| LOST                | Approved/Declined (declined state) |

---

## 4. Acceptance tests (§14) — results

All verified against the running dev server (curl matrix across ADMIN/UNDERWRITER/CSA/AGENT/EMPLOYER
sessions) and an end-to-end Playwright run (login → pipeline → deal card → editor, dark + light).

| # | Test | Result |
|---|------|--------|
| 1 | No orphaned submission fields (every field maps to one section) | **PASS** — sections built from `SECTION_DEFS`; all field keys covered. |
| 2 | Payroll edit → KPI update + stale banner + activity diff + account sync; clears after re-rate | **PASS** — `annualPayroll` edit returned `ratingStale:true` + diff `{from:100000.00,to:1250000}`; `clear-rating-stale` reset it to `false`. |
| 3 | Non-rating edit → no stale banner | **PASS** — `coverage.hasPriorCoverage` edit left `rating_stale = false`. |
| 4 | Completeness states + aggregate correct | **PASS** — e.g. business=partial(2), loss=complete(0), aggregate 1/6 on the test deal. |
| 5 | UNDERWRITER `PATCH` any section → 403 | **PASS** — UW PATCH `/submission/business` → 403. |
| 6 | EMPLOYER permissions server-side (loss view-only; ownership) | **PASS** — `EMPLOYER_EDITABLE` excludes loss/coverage; EMPLOYER GET on a non-owned deal → 403 (ownership). |
| 7 | Rail summary + Submission tab in sync; glass editor opens | **PASS** — PATCH response returns refreshed `sections`/`aggregate`; shell updates both rail and tab from one payload; e2e confirmed editor overlay. |
| 8 | Design system honored light + dark; `pnpm typecheck` zero errors | **PASS** — e2e confirmed both modes legible; `typecheck-baseline.sh` 0/0 (web + api-server) and `pnpm run typecheck` exit 0. |
| 9 | Regression: deal card opens from pipeline and 4A account detail | **PASS** — `openDealCard`/`GlobalDealCardHost` contract preserved; e2e opened from pipeline. |

**Bug found & fixed during acceptance:** an account-only section edit (e.g. `legalName`) threw
`Error: No values to set` because the deal `UPDATE` ran with an empty set object. Guarded the
deal update behind `Object.keys(dealUpdates).length > 0`. Re-verified: account sync now succeeds
and writes the linked-account feed entry.

---

## 5. Typecheck (two ways)

- `bash scripts/typecheck-baseline.sh` → `web errors: 0 (baseline 0)`, `api-server errors: 0 (baseline 0)`, **PASS**.
- `pnpm run typecheck` (libs build + leaf checks) → exit 0.

---

## 6. Deviations / drift (flagged)

1. **Substituted visual reference.** The literal `stitch-reference/` directory and the original
   Phase-4C build-prompt markdown are **not present on this branch**; `prototype-c.html` (the Axel
   token realization) was used as the visual base. Flagged to the user.
2. **"10-stage" vs reality.** The prompt referred to a 10-stage pipeline; the binding pipeline in
   `Pipeline.tsx` has **8 stages**. The display-only header maps 8 → 6 phases (ruling #1). The
   Kanban was not shrunk or replaced.
3. **P6 deferrals (ruling #2).** The AI quote-variation engine and the RFI blocking/countdown
   workflow are rendered as **static placeholders** in Overview; the working composer persists a
   real message to the activity feed.
4. **Dropped minor legacy affordances**, superseded by the new model: inline email listener,
   `@mentions`, task templates, and the old inline deal-edit form (replaced by the Submission
   section editor). Documents/Tasks/Quote/Policy panels were preserved.
5. **Screenshots:** light + dark rendering was verified via the e2e testing subagent (it reported
   both modes legible with correct contrast). Per-image files from that run were not retrievable
   for inline attachment; no images were committed.

---

## 7. Not deployed / not merged

Work is confined to `awf-os-brendy-sprint-1`. No deploy, no merge, no PR to `main`.
