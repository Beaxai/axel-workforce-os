# Cannabis Test Client Fixture — Emerald Coast Cultivation (TEST)

A complete worked example of the Marketplace → Cannabis WC quote flow, created end-to-end
through the real UI (no seeded shortcuts). Use this document to recreate the fixture after a
data reset.

## What exists after a successful run

| Artifact | Value (from the 2026-07-02 run) |
|---|---|
| Indication deal | `AX-MR3XRCKQ-5VJW` — stage **Proposal Sent**, created by "Save Indication" |
| Submitted deal | `DL-MR3XTDPF` — stage **New Lead** (moved from Needs Analysis post-submission), `submission_status = submitted` |
| Quotes | One `INDICATION` quote on the indication deal, one `SUBMITTED` quote on the submitted deal — both with `wc_rating_breakdown` + `workforce_profile` JSONB |
| Premium | Final **$92,213.84**, indication range **$82,992 – $101,435** |
| Deal documents (submitted deal) | Application Summary, Rate Indication, Coverage Verification, **Axel Cannabis WC Application 2026**, **ACORD 130**, **Trean Cannabis Supp** |
| Canonical answers | `submission_answers.answers` for the submitted deal — snapshot preserved at [`cannabis-test-client-answers.json`](./cannabis-test-client-answers.json) |

Note: the submission endpoint creates the deal at `NEEDS_ANALYSIS`. The fixture deal was then
moved to `NEW_LEAD` via `PATCH /api/deals/:id` (logged as a stage change) so it sits at the top
of the pipeline for demos.

## Client profile (exact inputs)

- **Legal Business Name:** `Emerald Coast Cultivation (TEST)`
- **FEIN:** `88-4471235` · **Entity Type:** LLC · **Years in Business:** 6
- **Coverage Effective Date:** `2026-08-01`
- **Business address:** 1420 Samoa Blvd, Arcata, CA **95521** (CA ZIP is required — territory rating fails without a valid 5-digit ZIP)
- **Contact:** Dana Reyes · `dana.reyes@emeraldcoast-test.com` · (707) 555-0132
- **Locations (2):**
  1. 1420 Samoa Blvd, Arcata, CA 95521 — class **0035** "Cultivators (Farm – Florist & Drivers)", 18 FT, **$950,000** payroll
     (note: the canonical answers snapshot may persist `0035` normalized as `"35"` — treat them as equivalent in assertions)
  2. 2210 5th St, Sacramento, CA 95818 — class **8017** "Cannabis Dispensary & Delivery", 12 FT, **$520,000** payroll
- **Totals:** 30 employees, $1,470,000 payroll
- **Experience modifier:** Yes → **0.95**
- **Cannabis operations:** Growing, Dispensary (deliberately NOT Extraction/Delivery — those add extra wizard steps)
- **Loss history:** none uploaded (continue without)

## Re-run procedure (UI, logged in as the seeded dev Admin — `sarah@axelwos.com`; password is the standard local seed credential)

1. `/marketplace` → click **Cannabis** → **Start Submission** → pick the **WorkShield** (WC) card.
2. **Step 1 – Business Details:** enter the profile above; "How many locations?" = 2 → Continue.
3. **Step 2 – Workforce Profile:** fill both location cards (address/ZIP + class code + FT + payroll as above). Verify summary shows 2 locations / 30 employees / $1,470,000 → Continue.
4. **Step 3 – Experience Rating:** "Yes", modifier 0.95 → Continue.
5. **Step 4 – General Information:** defaults → Continue.
6. **Step 5 – Indication:** wait for rating (POST `/api/rate/wc/multi`); click **Save Indication** (creates the Proposal Sent deal + INDICATION quote), then **Request Proposal**.
7. **Phase 2:** "Let's Go" → Cannabis Operations (Growing + Dispensary; product forms Smoked + Edibles; Bi-Weekly payroll) → Safety & Premises (safety-positive answers) → Loss History (skip upload) → **Submit for Approval** → confirmation screen.
8. Optional: move the submitted deal to New Lead —
   `PATCH /api/deals/<dealId> {"stage":"NEW_LEAD"}` (authenticated session).

⚠️ The wizard store is in-memory (not persisted) — do the whole flow in one browser session; a
reload resets to `/marketplace`.

## Verification checklist

- `deals`: two rows for `Emerald Coast Cultivation (TEST)` (Proposal Sent + submitted one).
- `quotes`: both rows have non-null `wc_rating_breakdown` and `workforce_profile`.
- `deal_documents`: six rows on the submitted deal, incl. the three application PDFs.
- PDFs stream non-empty (HTTP 200, `application/pdf`):
  - `GET /api/submission/applications/<dealId>/axel-cannabis-application.pdf`
  - `GET /api/submission/applications/<dealId>/acord-130.pdf`
  - `GET /api/submission/applications/<dealId>/trean-supp.pdf`
- `/pipeline`: deal card visible; opening it shows the **WC Application** section with the three
  download buttons and the section-grouped answer summary (Documents tab of the deal modal).
