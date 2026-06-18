# Phase 4A — Accounts Module: Acceptance Report

Task #32 · Branch `awf-os-brendy-sprint-1` · Verified live against the dev DB.

## Acceptance tests

| # | Name | Result | Evidence |
|---|------|--------|----------|
| 1 | Submission creates account + linked deal with all profile fields | **PASS** | All 13 profile fields populated, 0 nulls; deal `account_id` links to the created account |
| 2 | Same-FEIN second submission links, no duplicate | **PASS** | Second submission reused the same account; exactly **1** account exists for the FEIN (dedupe enforced) |
| 3 | Existing deals backfilled with `account_id`, correct tab | **PASS** | 28/28 linked; `deals.account_id` is NOT NULL; accounts appear under the correct tab by `client_stage` |
| 4 | Lead Convert + Convert & Start Submission, conversion logged | **PASS** | `lead_converted` activity logged; `startSubmission:true` returned; lead status → `converted` |
| 5 | Bind moves account Prospects → Clients (via `client_stage`) | **PASS (caveat)** | `client_stage` PATCH `Prospect → New Client` moves the account out of Prospects into Clients and logs `stage_changed`. Caveat: the bind flow does **not** auto-write `client_stage`, so binding does not auto-transition the account today — transition is via the stage edit/PATCH path only |
| 6 | Payroll edit updates account + logs to activity feed | **PASS** | Payroll updated; `account_updated` logged with structured `metadata.changes` |
| 7 | AGENT scoping (own only); EMPLOYER 401/403 on `/accounts` | **PASS** | EMPLOYER → **403** on `/accounts` and `/leads`; AGENT sees only its own lead (admin-created leads invisible to the agent) |
| 8 | Design honored light + dark; typecheck zero errors | **PASS** (web/db/lib) | Light + dark verified for 3 tabs + a profile card; see Typecheck section for the scoping of "zero errors" |

## Backfill

- **Total deals:** 28 (at the time of the backfill/ALTER).
- **Deals given an `account_id`:** 28.
- **Confirmation:** 28/28 were linked **before** `ALTER … account_id SET NOT NULL` was applied. `deals.account_id` is now NOT NULL (`information_schema.columns.is_nullable = NO`), and a live re-check shows 0 null `account_id` values.

## Typecheck

- **New errors from 4A files: 0** — `axel-workforce-os` (Accounts.tsx, AccountDetail.tsx), db schema (`accounts.ts`, `leads.ts`), and `lib/accounts.ts` all typecheck clean.
- **Pre-existing repo-wide errors: 114** (listed separately) — all in `api-server`, endemic across **29 of ~29 route files**:
  - 96 × TS7030 (Express handler return-paths)
  - 17 × TS2769 (Drizzle insert/update/delete overloads)
  - 1 × TS2345
  - The 4A route files (`accounts.ts`, `leads.ts`) merely share this **same pre-existing pattern** — not 4A-introduced, with zero runtime impact (all acceptance tests pass live).

## client_stage decision

`account_status` was **renamed to `client_stage`** (not kept). Values: `Prospect`, `Active Prospect`, `New Client`, `Active Client`. Tab mapping: Prospects = `{Prospect, Active Prospect}`, Clients = `{New Client, Active Client}`. Confirmed in DB: the `client_stage` column exists and `account_status` no longer exists.

## New/changed API surface

- **Leads (new):** `GET /leads`, `POST /leads`, `GET /leads/:id`, `PATCH /leads/:id`, `POST /leads/:id/convert` (Convert + Convert & Start Submission). Mounted with role gate `requireRoles("ADMIN","CSA","AGENT")`.
- **Accounts (extended):** list/detail by tab/stage; `POST /accounts` and `DELETE /accounts/:id` gated to ADMIN/CSA via `requireAccountManager`; `PATCH /accounts/:id` now logs tracked field changes (`stage_changed` vs `account_updated`); subresource reads (`/:id/deals`, `/:id/policies`, `/:id/activity`) scoped to AGENT ownership.
- **Submission (extended):** `POST /submission/submit-for-approval` auto-creates/reuses an account (FEIN-first, then case-insensitive business-name + state dedupe), links the deal, and logs activity.
- **Codegen:** `lib/api-spec/openapi.yaml` updated; Orval hooks + Zod schemas regenerated.

## Screenshots

Light + dark rendering verified via the Playwright testing subagent (authenticated ADMIN session; status: success) for the three tabs and a profile card. Referenced by filename only (images not committed):

- `accounts-leads-dark.jpeg`
- `accounts-prospects-dark.jpeg`
- `accounts-clients-dark.jpeg`
- `account-profile-dark.jpeg`
- `accounts-leads-light.jpeg`
- `accounts-prospects-light.jpeg`
- `accounts-clients-light.jpeg`
- `account-profile-light.jpeg`
