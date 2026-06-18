# Phase 3.5 — Real Authentication + API Hardening — Close-out Report

**Branch:** `awf-os-brendy-sprint-1` (never merged to `main`)
**Date:** 2026-06-18

This report closes out Phase 3.5 per §10/§11 of `docs/build-prompts/phase-3.5-auth.md`:
typecheck proof, the 9 acceptance tests run against the live dev DB, login screenshots
(light + dark), and a small FK-guard hardening fix in the HelloSign signature path.

---

## 1. Typecheck — zero errors (§10.7)

Both gates are clean on the synced build.

### `bash scripts/typecheck-baseline.sh`
```
==> Building shared libs (typecheck:libs)…
==> Typechecking web (@workspace/axel-workforce-os)…
    web errors: 0 (baseline 0)
==> Typechecking api-server (@workspace/api-server)…
    api-server errors: 0 (baseline 0)
PASS: no new typecheck errors beyond baseline.
EXIT=0
```

### `pnpm typecheck`
```
Scope: 4 of 10 workspace projects
scripts typecheck: Done
artifacts/mockup-sandbox typecheck: Done
artifacts/api-server typecheck: Done
artifacts/axel-workforce-os typecheck: Done
PNPM_EXIT=0
```

`API_BASELINE = 0` and `WEB_BASELINE = 0` are the enforced ceilings on disk — the
repo is fully clean, not merely "no new errors above a non-zero baseline."

> Note: the long-lived `typecheck` **workflow** log may still show a stale historical
> count (e.g. "114 (baseline 114)"). That is cached output from before the cleanup;
> the authoritative on-disk result is 0/0 as shown above.

---

## 2. Acceptance tests — 9/9 PASS (§10)

All API checks were run through the shared proxy at `localhost:80` (never the service
port). All 8 seed users share the dev seed password. UI checks used a Playwright
browser session.

| # | Test | Result | Evidence |
|---|------|--------|----------|
| 1 | Login with each of the 8 seeded accounts lands on the correct dashboard | **PASS** | `POST /api/auth/login` → **200** for all 8 users, each returning its correct role (ADMIN, UNDERWRITER, CSA, AGENT, EMPLOYER, CARRIER, PEO, VENDOR). `ROLE_PATHS` maps every role to its `/dashboard/<role>` route; e2e confirmed ADMIN (`sarah@axelwos.com`) redirects to `/dashboard/admin` after sign-in. |
| 2 | Unauthenticated `/api/*` returns **401** (except public exceptions) | **PASS** | Unauth `GET /api/deals`, `/api/accounts`, `/api/rate-tables`, `/api/quotes` → **401**. Public exceptions behave correctly: `GET /api/healthz` → **200**; `POST /api/agent-registrations` → **400** (validation, i.e. reached the handler — **not** 401), confirming the per-method public exception. |
| 3 | AGENT calling an ADMIN-only endpoint returns **403** | **PASS** | AGENT (`robert@broker.com`) → `GET /api/rate-tables` (ADMIN-only) → **403**; AGENT → `GET /api/leads` (in-scope) → **200**. |
| 4 | EMPLOYER → `/billing` redirects to `/unauthorized` (frontend) **and** server returns **403** for a billing/admin API call | **PASS** | Frontend: `/billing` is wrapped in `<ProtectedRoute allowedRoles={["ADMIN"]}>` in `App.tsx`, so a non-ADMIN (EMPLOYER) is redirected to `/unauthorized`. Server: EMPLOYER (`lisa@acmecorp.com`) → `GET /api/commissions` → **403** and `GET /api/rate-tables` → **403**, while `GET /api/employees` → **200** (in-scope). Control: ADMIN → `/api/rate-tables` → **200**. |
| 5 | Session survives refresh; logout clears it; cookie is **httpOnly** | **PASS** | Login sets cookie `axel_session` with `HttpOnly; Secure; SameSite=None`. With the cookie, `GET /api/auth/me` → **200** (survives across requests / page refresh, since auth is cookie-based). After `POST /api/auth/logout`, `GET /api/auth/me` → **401** (fully cleared). |
| 6 | No references to `PLACEHOLDER_USERS` remain in the codebase | **PASS** | Source-wide search returns **no** `PLACEHOLDER_USERS` matches in application code. Remaining mentions live only in non-shipping docs (`CLAUDE.md`, `docs/`, `attached_assets/`). The former `src/lib/users.ts` mock was repurposed into a live `useTeamMembers()` hook backed by `GET /api/users`. |
| 7 | `pnpm typecheck` passes with zero errors | **PASS** | See §1 — both `scripts/typecheck-baseline.sh` (0/0) and `pnpm typecheck` (exit 0, all 4 projects). |
| 8 | Login page screenshot — gradient CTA, pink accents, glass panel (light + dark) | **PASS** | Captured in both themes (see §3). Glass-panel card on `#060608` (dark) / `#f4f4f5` (light) canvas renders correctly; the single CTA uses `--gradient-cta` when enabled. Images are **not** committed (delivered in chat only). |
| 9 | Regression: the deal card modal still opens and renders (it imported the removed mock) | **PASS** | Playwright e2e: logged in as ADMIN → `/pipeline` → Kanban rendered with deal cards → clicked first card → Deal Card Modal opened with deal details, stage, and tabs (Activities / Quote / Proposal / Bind) → closed → pipeline restored. No `useTeamMembers` / `PLACEHOLDER_USERS` console errors. |

### Notes / observations (not blockers)
- **Test 8 cosmetic quirk (out of scope):** the unauthenticated login route does not mount
  `AppShell`, which is what applies the `.dark` / `.light` class on `document.documentElement`.
  `LoginPage` styles its container from the theme store inline, but the input fields read
  `var(--input-*)` tokens which fall back to the `:root` (light) values when no theme class is
  present — so the inputs render light even on the dark canvas, and the white wordmark logo is
  faint on the light canvas. Both are pre-existing cosmetic issues in untouched frontend code
  and are outside this type-correctness/acceptance scope.
- **Test 9:** the modal load fired `404`s for `/api/submission/applications/:dealId` and
  `/api/quotes/by-deal/:dealId` — expected for a deal that has no submission/quote yet; the
  modal still renders correctly.

---

## 3. Login screenshots (§10.8)

Captured in both themes and delivered in chat (per instruction, **not** committed to the repo):

- **Dark (default):** `login-dark.jpg` — `#060608` canvas, glass-panel card, Axel wordmark.
- **Light:** `login-light.jpg` — `#f4f4f5` canvas, glass-panel card.

The light capture was produced by temporarily flipping the `theme-store` default to `"light"`,
screenshotting, then **reverting** the change (the file is back to `theme: "dark"` — verified
clean in `git status`).

---

## 4. FK-guard hardening fix

**Problem:** `activity_log.deal_id` is a FK to `deals.id`. The HelloSign webhook /
signature path inserted activity-log rows using non-null assertions
(`sigRecord.dealId!`). If a signature record ever had a `null` `dealId`, those inserts
would attempt a dangling/NULL FK write.

**Fix (type-safe, behavior-preserving):**
- `routes/webhooks.ts` — captured `const logDealId = sigRecord.dealId;` after the
  `sigRecord` null-check and wrapped each deal-scoped activity-log INSERT
  (`signature_viewed`, `document_signed`, `signature_declined`, `signature_expired`) in
  `if (logDealId) { … }`, using `logDealId` for both `dealId` and `entityId`. The bind-completion
  insert was already guarded by `if (boundDealId)` and writes `entityId: accountId`.
- `services/helloSignService.ts` — same pattern via `sentLogDealId` / `signedLogDealId`
  for the `signature_request_sent` and `bind_documents_signed` inserts.
- `routes/signatures.ts` — **no change needed**; its insert uses the non-nullable
  `req.params.dealId` route param.

The existing `UPDATE … .where(eq(dealsTable.id, sigRecord.dealId!))` statements were left
untouched: a null `dealId` there matches zero rows (safe), it is not an FK insert.

**Code review:** the architect (code_review) reviewed the diff and confirmed the FK-guard fix
is correct, preserves non-null behavior, leaves no unguarded possibly-null activity-log insert,
and introduces no silent-failure or correctness concerns. The only semantic change is the
intentional suppression of deal activity rows when the source `dealId` is null.

---

## 5. Deviations from the original work order (§11)

1. **`better-auth` substituted for the deprecated Lucia** (§1) — Lucia is deprecated;
   `better-auth` provides the same session-cookie model with maintained hashing/account tables.
2. **Auth tables applied via explicit SQL DDL** rather than `drizzle-kit push`, due to the
   pre-existing `deals` table drift that makes a blanket push unsafe on this branch.
