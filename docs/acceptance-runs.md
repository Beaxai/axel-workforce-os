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
