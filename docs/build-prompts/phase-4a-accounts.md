# Phase 4A — Accounts Module (Leads / Prospects / Clients) — Replit build prompt

> **How to use:** paste the kickoff into Replit/Claude Code; it points the agent at this file.
> Implements State Document §7. Execute in Replit (DB + secrets live there). Phase 3.5 auth is
> already in place, so role enforcement uses the existing `requireRoles`.

## TL;DR

Stand up the Accounts module per binding decision #4. A **lead** is an unqualified name in its own
`leads` table; an **account** is a real company — **one `accounts` table for prospects AND clients**,
distinguished by `client_stage`. Never create a separate `prospects` table. Pipeline Stage 1 ("New
Lead") means a new *deal*, not a lead record.

- New **`leads`** table; **extend the existing `accounts`** table with the rating-environment fields;
  make **`deals.account_id` non-null** (after backfill).
- **Account auto-created on marketplace submission**, deduped by **FEIN** (fallback: normalized name +
  state); **backfill** accounts from existing deals and link them.
- **Lead conversion** (Convert / Convert & Start Submission).
- **Three-tab UI** (Leads / Prospects / Clients) + account-detail profile card.
- **Role access** via the existing `requireRoles`; OpenAPI + Orval/Zod regenerated.

## Guardrails (binding decisions — do not revisit)

- **Lead vs Account (binding #4):** leads = own `leads` table under the Accounts module; accounts =
  single table for prospects + clients via **`client_stage`**. **Never** a separate `prospects` table.
- **Auth is implemented (Phase 3.5).** Use the existing `requireAuth` + `requireRoles` (`routes/index.ts`,
  `middleware/require-auth.ts`); roles live in `org_members`. Do not re-invent auth.
- **Schema:** Drizzle is source of truth; **apply changes via explicit SQL DDL, not a blanket
  `drizzle-kit push`** (the `deals` drift hangs/risks a TRUNCATE — see `.agents/memory/drizzle-push-blocked.md`).
- **No Supabase** (already deleted). Authorization in API middleware, not RLS.
- **Design system: tokens only** (pink primary / purple support / single `--gradient-cta`), Inter/Jost,
  the two glass recipes. **Verify light AND dark.**
- **API surface changes** update `lib/api-spec/openapi.yaml` → regenerate Orval hooks + Zod; never
  hand-edit `generated/`.
- **Git:** commit to `awf-os-brendy-sprint-1` (or a sub-branch). **Never merge/PR to `main`.**
- **Audit actual files, never memory.** Stack: React 19.1 + Vite + TS, Express 5, Drizzle.

## 0. Current state (verified against code on this branch)

- **`accounts` exists but lean** (`lib/db/src/schema/accounts.ts`): `business_name`, `vertical`,
  `state`, `annual_payroll`, `headcount`, **`account_status` (default "Prospect")**, `primary_contact`,
  `contact_email`, `contact_phone`, `notes`, `assigned_csa` (FK users), timestamps. **Missing**:
  legal name vs DBA, **FEIN**, entity type, NAICS, class codes, EMod, locations, product type.
- **No `leads` table.**
- **`deals.account_id` exists but is nullable** (`lib/db/src/schema/deals.ts`).
- Scaffold present: `routes/accounts.ts`, `pages/Accounts.tsx`, `pages/AccountDetail.tsx`,
  `routes/submission.ts`. The deal card (`DealCardModal.tsx`) is the existing deal viewer.

## 1. Data model (SQL DDL; Drizzle files as source of truth)

- **`client_stage` reconciliation (decision — confirm):** the existing `accounts.account_status`
  (default "Prospect") is the discriminator binding #4 calls `client_stage`. **Standardize it to the
  four canonical values** `Prospect → Active Prospect → New Client → Active Client`, and **rename the
  column to `client_stage`** for spec fidelity (update the Drizzle file + all references). If a rename
  is risky against live data, keep `account_status` but treat it as `client_stage` and document it.
- **Extend `accounts`** with the rating-environment fields §7 requires: `legal_name`, `dba`, **`fein`**
  (used for dedupe), `entity_type`, `naics`, `class_codes` (jsonb), `emod` (numeric), `locations`
  (jsonb), `product_type`. Keep `business_name` as display name.
- **New `leads` table** (own file, drizzle-zod, re-export from `schema/index.ts`): `company_name`,
  `contact_name`, `email`, `phone`, `state`, `vertical`, `source` (`purchased_list | inbound |
  referral | event | other`), `source_detail`, `status` (`new | working | qualified | converted |
  dead`), `notes`, `assigned_to` (FK users), `created_at`, `converted_account_id` (nullable FK accounts).
- **`deals.account_id` → NOT NULL** after the backfill in §2.

## 2. Account creation on submission + dedupe + backfill

- Completing a marketplace submission (indication or full proposal) **creates an `accounts` record**
  capturing every rating-environment field (legal name, DBA, FEIN, entity type, locations, states,
  vertical, NAICS, payroll, headcount, class codes, EMod, contacts, product type). Hook into
  `routes/submission.ts`.
- **Dedupe by FEIN (primary)** or **normalized business name + state (fallback)**: link the new deal
  to the existing account instead of duplicating; **log updates to the account's activity feed**.
- **Backfill:** create accounts from existing deals' stored data and link them (set `account_id`);
  **report the resulting count** (State Doc cites ~27 deals — verify the actual count). Then enforce
  `deals.account_id` NOT NULL.

## 3. Lead conversion

- **Convert** action: creates an account at `client_stage = Prospect`, carries over fields, sets the
  lead `status = converted` + `converted_account_id`, logs the conversion.
- **Convert & Start Submission** variant: same, and pre-fills the marketplace submission flow.
- Converted/dead leads remain visible under a filter (not deleted).

## 4. UI — Accounts module, three tabs (+ detail)

Build on `pages/Accounts.tsx` / `pages/AccountDetail.tsx`. Tokens only; verify light + dark.

- **Leads tab:** table (company, contact, source, status, assigned_to, age); quick-add **glass modal**;
  inline status updates; **Convert** / **Convert & Start Submission** actions. (Bulk import = stubbed TODO.)
- **Prospects tab:** accounts filtered to `Prospect`/`Active Prospect`. **Clients tab:** `New Client`/
  `Active Client`. Same columns: name, vertical, state, headcount, payroll, # deals, stage badge.
- **Account detail (profile card):** `glass-panel` with all profile data, linked deals (stage +
  premium), quotes/proposals with rating breakdowns, contacts, activity history, documents. Deals open
  via the **existing `DealCardModal`**. Binding moves the record between tabs automatically via
  `client_stage`.

## 5. Sync + role access

- Quote-revision edits to rating inputs **update the linked account** and **log to its activity feed**;
  `client_stage` advances automatically (the `Active Client` trigger is **stubbed TODO** until the
  Implementations flow exists).
- **Role access (via existing `requireRoles`):** ADMIN/CSA full; **AGENT** only own leads + accounts on
  their deals; **UNDERWRITER** read-only Prospects/Clients, **no** Leads; **EMPLOYER/CARRIER/PEO/VENDOR**
  no `/accounts` access. Enforce server-side; hide unusable affordances in the UI.

## 6. API + codegen

- New/changed endpoints for leads CRUD + convert, accounts list/detail (by tab/stage), and the
  submission→account hook. Update `lib/api-spec/openapi.yaml` → regenerate Orval hooks + Zod. Apply
  schema via SQL DDL (per guardrails).

## 7. Acceptance tests — all must pass (report pass/fail each)

1. Each product-type submission creates an account + linked deal with **all fields on the profile**.
2. A **same-FEIN second submission links** to the existing account — **no duplicate**.
3. All existing deals **backfilled with `account_id`** and appear under the correct tab; report the count.
4. Lead **Convert** and **Convert & Start Submission** work, with the conversion logged.
5. A test **bind moves the account Prospects → Clients** (via `client_stage`).
6. A **quote-revision payroll edit updates the account** and logs to its activity feed.
7. **AGENT scoping enforced** (own leads/accounts only); **EMPLOYER gets 401/403 on `/accounts`**.
8. Design system honored in **light and dark**; `pnpm typecheck` passes with **zero** errors.

## 8. New files this phase creates

`lib/db/src/schema/leads.ts` (+ re-export); likely a `routes/leads.ts`; new/extended account + lead
React Query usage; tab components under the Accounts pages. Extend (do not duplicate) `accounts.ts`
schema, `routes/accounts.ts`, `routes/submission.ts`.

## 9. Report back to Curtis

- The `client_stage` reconciliation decision as actually built (rename vs keep `account_status`).
- The backfill count (deals → accounts) and confirmation `deals.account_id` is now NOT NULL.
- Pass/fail per acceptance test; design screenshots (light + dark) of the three tabs + a profile card.
- Any new API surface (OpenAPI/Orval/Zod regenerated). Flag if anything touched a binding decision.
