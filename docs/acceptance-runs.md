# Acceptance Runs — Axel Workforce OS

Durable, copy-able record of acceptance-test results for every build phase.

**Convention:** each phase appends its acceptance run here (newest at top) when the
phase closes. One entry per phase. Each entry records: phase, branch, HEAD commit,
date, the migrate/seed/typecheck gates, and one PASS/FAIL line per acceptance test
with evidence. This file is the single place to copy all acceptance evidence at
build-end; the State Document carries only the short STATUS line per phase.

---

## Phase 4B — User Profiles & Management
Branch: awf-os-brendy-sprint-1 · HEAD: ba5d6bf (synced, no local drift) · Date: 2026-06-25 · Result: ALL 9 PASS

### 0. Sync
- HEAD == ba5d6bf confirmed; only untracked file is the work-order .txt. No local Phase 4B drift to reconcile.
- Canonical lost-stage literal in user-profiles.ts is "LOST" (line 299: ne(deals.stage, "LOST")). No CLOSED_LOST remains. ✓

### 1. Migrate + seed
- user_profiles table EXISTS with exact required shape: id, user_id (UNIQUE, FK→users ON DELETE CASCADE),
  title, timezone, bio, internal_notes, role_metadata jsonb, date_joined, last_login_at, updated_at. ✓
- normalize:user-status run — before/after status counts:
    BEFORE:  active=8, invited=1        (1 invited = leftover e2e test user)
    SCRIPT:  Rows touched: 0  (already canonical: active=8, invited=1)
    AFTER:   active=8, invited=1  → all rows in {active, invited, deactivated}; 8 seeded users all 'active'. ✓
    (leftover invited test user cleaned up post-run → final: active=8)
- seed:users re-run — all 8 seeded users present with a user_profiles row carrying role_metadata. ✓

### 2. Correctness gate
- pnpm typecheck (scripts/typecheck-baseline.sh): web 0 (baseline 0), api-server 0 (baseline 0).
  Baseline IS zero for both packages → 0 NEW errors, true zero. ✓

### 3. Acceptance tests (server-side curl with per-role sessions; all 8 roles logged in 200)
1. PASS — Role-correct profiles at /users/:id for all 8 roles (GET /api/users/:id/profile roleSection):
     ADMIN/CSA → {department, territory}; UNDERWRITER → {carrier, lines, states, verticals};
     AGENT → {agencyName, licenseNumbers, statesLicensed, linesOfAuthority, eoCarrier, eoExpiration, bookSummary};
     CARRIER/PEO/VENDOR → {company, programs}; EMPLOYER → {linkedAccount}.
2. PASS — Single shared UserMiniProfile component wired at deal team + activity + task assignee
     (DealCardShell / OverviewTab / SupportingTabs), partner (GlobalSearch), and AdminUsers.
     No legacy AVATAR tooltip remains; non-avatar tooltips untouched.
3. PASS — AGENT book summary API vs DB match exactly:
     API : dealCount=6, totalPremium=356360, boundCount=0, boundPremium=0
     SQL : deal_count=6, total_prem=356360, bound_count=0, bound_prem=0
     (producing_agent_id = robert; estimated_premium; bind_status='bound' subset)
4. PASS — Server-side visibility (canViewProfile):
     EMPLOYER → AGENT (unrelated) = 403; EMPLOYER → UNDERWRITER (not on employer's deals) = 403;
     CARRIER → UNDERWRITER (internal staff) = 200; VENDOR → EMPLOYER (unrelated) = 403.
     Logic: internal roles see all; EMPLOYER sees only internal staff on its deals;
     CARRIER/PEO/VENDOR see internal staff + shared-deal users.
5. PASS — Self-edit: AGENT PATCH phone/mobile/timezone = 200, persists cross-table
     (users.phone=555-0100, users.mobile=555-0200, user_profiles.timezone=America/Chicago).
     Self-edit role = 403, status = 403, org = 403 (server-enforced, not UI-hidden).
6. PASS — Atomicity:
     - POST /api/users/invite (ADMIN) created users + org_members + user_profiles (1/1/1), status='invited';
       route wraps all three inserts in db.transaction → rollback leaves none.
     - POST /api/agent-registrations/:id/approve created user (invited) + org_members(AGENT) + user_profiles
       with role_metadata carried over {agencyName, licenseNumbers:[LIC-12345], statesLicensed:[TX,CA],
       linesOfAuthority:[WC,GL], eoCarrier, eoExpiration}; reg→approved; idempotent re-approve = 409.
7. PASS — Status/login gating:
     invited user (no credential) login = 401; deactivate seeded VENDOR → login = 403;
     reactivate → login = 200; invited→active ONLY after completing reset-password
     (status flips invited→active, then login = 200). Deals/activity history intact throughout.
8. PASS — last_login_at stamped on real login (user_profiles.last_login_at = 2026-06-25T01:10...);
     GET /api/users (admin) surfaces email, role, orgName, status, lastLoginAt for the /admin/users table.
9. PASS — Design system in BOTH light AND dark verified via Playwright after real ADMIN login on
     /admin/users, /users/:id (underwriter + agent), and /profile (test status: success, per-theme
     assertions confirmed). Static token audit clean: no disallowed color literals in UserProfile.tsx,
     AdminUsers.tsx, UserMiniProfile.tsx — only allowed #ef4444 error red (as rgb) and the black glass
     shadow recipe. NOTE: the Playwright harness captured screenshots internally but did not return
     downloadable file paths for attachment; rendering was verified per-theme on every surface.

### 4. Result
- ALL 9 acceptance tests PASS.
- FLAG FOR CURTIS: hard-delete endpoint DELETE /api/users/:id (ADMIN-only, users.ts line 329) still exists
  alongside the deactivate/reactivate flow. It contradicts "no hard delete / preserve history" — confirm:
  retire it, or keep it for true GDPR-style erasure?
- State Document §9 updated to STATUS: DONE, noting last_login stamping and the status-gate (login gate +
  invited→active on reset) as the auth-path changes that shipped.

---

## Phase 4C — Deal Card Submission Panel / Collaboration Hub
Branch: awf-os-brendy-sprint-1 · Date: 2026-06-15..22 · Result: ALL 9 PASS
Source: docs/build-prompts/phase-4c-report.md (verified: curl matrix across ADMIN/UNDERWRITER/CSA/AGENT/EMPLOYER + Playwright e2e, dark + light)

1. PASS — No orphaned submission fields: sections built from SECTION_DEFS; every field key maps to exactly one section.
2. PASS — Payroll edit → KPI update + stale banner + activity diff + account sync; annualPayroll edit returned
     ratingStale:true + diff {from:100000.00, to:1250000}; clear-rating-stale reset it to false.
3. PASS — Non-rating edit → no stale banner (coverage.hasPriorCoverage edit left rating_stale = false).
4. PASS — Completeness states + aggregate correct (e.g. business=partial(2), loss=complete(0), aggregate 1/6).
5. PASS — UNDERWRITER PATCH any section → 403 (UW PATCH /submission/business → 403).
6. PASS — EMPLOYER permissions server-side: EMPLOYER_EDITABLE excludes loss/coverage; EMPLOYER GET on non-owned deal → 403.
7. PASS — Rail summary + Submission tab stay in sync from one PATCH payload; glass section editor opens (e2e).
8. PASS — Design system honored light + dark; typecheck-baseline.sh 0/0 (web + api-server), pnpm typecheck exit 0.
9. PASS — Regression: deal card opens from pipeline and 4A account detail; openDealCard/GlobalDealCardHost contract preserved.
- Bug found & fixed during acceptance: account-only section edit (e.g. legalName) threw "No values to set" (empty deal UPDATE);
  guarded deal update behind Object.keys(dealUpdates).length > 0; re-verified account sync + linked-account feed entry.
- Header 6-phase tracker is display-only, mapped from the binding 8-stage pipeline (Kanban unchanged).

---

## Phase 4A — Accounts Module (Leads / Prospects / Clients)
Branch: awf-os-brendy-sprint-1 · Result: ALL 8 PASS (one with caveat)
Source: docs/build-prompts/phase-4a-report.md (verified live against dev DB)

1. PASS — Submission creates account + linked deal with all profile fields: 13 fields populated, 0 nulls; deal.account_id links.
2. PASS — Same-FEIN second submission links, no duplicate: exactly 1 account exists for the FEIN (dedupe enforced).
3. PASS — Existing deals backfilled: 28/28 linked; deals.account_id NOT NULL; accounts under correct tab by client_stage.
4. PASS — Lead Convert + Convert & Start Submission: lead_converted activity logged; startSubmission:true; lead status → converted.
5. PASS (caveat) — client_stage PATCH Prospect → New Client moves account Prospects → Clients + logs stage_changed.
     CAVEAT: bind flow does NOT auto-write client_stage, so binding does not auto-transition the account today — PATCH path only.
6. PASS — Payroll edit updates account + logs account_updated with structured metadata.changes.
7. PASS — AGENT scoping (own only); EMPLOYER → 403 on /accounts and /leads.
8. PASS — Design honored light + dark for 3 tabs + profile card; typecheck zero NEW errors from 4A files.
- Backfill: 28/28 deals linked before ALTER … account_id SET NOT NULL; live re-check 0 null account_id.
- Decision: account_status renamed to client_stage {Prospect, Active Prospect, New Client, Active Client}.
- Typecheck note (at the time): 0 new from 4A files; 114 pre-existing repo-wide api-server errors (later driven to baseline 0).

---

## Phase 3.5 — Real Authentication + API Hardening
Branch: awf-os-brendy-sprint-1 · Date: 2026-06-18 · Result: ALL 9 PASS
Source: docs/build-prompts/phase-3.5-report.md (API via proxy localhost:80; UI via Playwright)

1. PASS — Login with each of the 8 seeded accounts → 200, each returning correct role; ADMIN redirects to /dashboard/admin.
2. PASS — Unauthenticated /api/* → 401 (GET /api/deals, /accounts, /rate-tables, /quotes); public exceptions OK
     (GET /api/healthz → 200; POST /api/agent-registrations → 400 validation, i.e. reached handler, not 401).
3. PASS — AGENT → ADMIN-only GET /api/rate-tables → 403; AGENT → in-scope GET /api/leads → 200.
4. PASS — EMPLOYER → /billing redirects to /unauthorized (ProtectedRoute ADMIN-only); server EMPLOYER → /api/commissions
     & /api/rate-tables → 403, /api/employees → 200; control ADMIN → /api/rate-tables → 200.
5. PASS — Session survives refresh; logout clears it; cookie axel_session is HttpOnly; Secure; SameSite=None.
6. PASS — No PLACEHOLDER_USERS references remain in application code (only non-shipping docs).
7. PASS — pnpm typecheck zero errors (typecheck-baseline.sh 0/0, pnpm typecheck exit 0).
8. PASS — Login page screenshot light + dark: glass-panel on #060608 / #f4f4f5, single --gradient-cta CTA (delivered in chat).
9. PASS — Regression: deal card modal opens and renders (Activities/Quote/Proposal/Bind tabs) after the mock removal.
- Deviations: better-auth substituted for deprecated Lucia; auth tables applied via explicit SQL DDL (deals drift made push unsafe).
- Hardening: FK-guard fix on activity_log inserts in the HelloSign/webhook signature path (architect-reviewed).

---

## Earlier phases (R.1–R.3 rating engine, S.1–S.5 underwriting/proposal/bind/appetite, S.4 workforce, D1/D1.1)
No standalone acceptance-report docs exist in the repo for these — they predate the per-phase report-doc
convention. Their scope and "done" status are recorded as feature entries in `replit.md` (Key Features) and
in State Document §3 (D1/D1.1 design system) and §4 (build-state audit). Per-test PASS/FAIL evidence for these
was delivered in chat at the time and is not reconstructable here without re-running them. If you want any of
these formally re-verified, say which phase and I'll run a fresh acceptance pass and append it above.
