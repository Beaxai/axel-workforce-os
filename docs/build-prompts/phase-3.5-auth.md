# Phase 3.5 — Real Authentication + API Hardening — Replit build prompt

> **How to use:** paste this into Replit/Claude Code as the work order for Phase 3.5. It implements
> State Document §6. Engineering decisions are pre-made (with justification) but flagged
> "(decision — override if you disagree)". Execute in Replit — it has the DB, secrets, run button,
> and the environment the acceptance tests need.

## TL;DR

Implements State Doc §6: replace the mock client-side auth with real server auth + API hardening.

- **Library:** `better-auth` (maintained Lucia successor; Lucia deprecated, Auth.js poor fit) — flagged
  to Curtis as the substitution; hand-rolled session is the fallback.
- **Sessions** in Postgres, `httpOnly`/`secure`/`sameSite` cookies, library-managed.
- **Schema:** map the library onto the **existing `users`** (no duplicate table), credentials in its
  `account` table, **roles stay in `org_members`**; add `session`/`verification`/reset storage.
- **Endpoints:** mount at `/api/auth/*`; alias §6's exact names (`login`/`logout`/`me`/`register`) if
  Curtis wants the named contract; register = admin-invite only; reset scaffolded (email stubbed).
- **Hardening:** `requireAuth` (401 on `/api/*` except auth/agent-registration/webhooks) +
  `requireRoles` on every route; close the 12 RBAC holes per the §6 role map.
- **Data:** seed the 8 real users through the library; delete `PLACEHOLDER_USERS` (+ its 2 consumers).
- **Frontend:** real email/password login (tokens, glass-panel, gradient CTA), `/me` hydration,
  `VITE_DEV_AUTH` switcher, `credentials: "include"`.
- **Gate:** `pnpm typecheck` clean (doc cites 9 errors — verify) + the 8 §6 acceptance tests, run in
  Replit. No Supabase; delete `supabase/`. Tokens only. No secrets in source.

## Guardrails (binding decisions — do not revisit)

- Database is **Replit-managed PostgreSQL + Drizzle ORM — permanent. Do NOT introduce Supabase.**
  **Delete the legacy `supabase/` folder** as part of this phase.
- Schema is defined in **Drizzle (source of truth)**, no migration files — but **do NOT run a blanket
  `drizzle-kit push`**: per `.agents/memory/drizzle-push-blocked.md`, push hangs on a destructive
  `deals` drift prompt. Add the new auth tables via **explicit SQL DDL** against `$DATABASE_URL`
  (`CREATE TABLE`/`ALTER TABLE`), and keep the Drizzle table files in sync as the source of truth.
- Authorization lives in **API middleware** (not RLS). Every route declares allowed roles server-side.
- Design system: **tokens only** (no hardcoded accent hexes), Inter body / Jost headings, dark
  default, the two glass recipes, single `--gradient-cta` per view. Verify **light AND dark**.
- **Audit actual files, never agent memory.** Inspect real routes/schema/DB before and after.
- Any API surface change updates `lib/api-spec/openapi.yaml` and regenerates Orval hooks + Zod
  (`pnpm --filter @workspace/api-spec codegen`). Never hand-edit `generated/`.
- **Stack (reference explicitly):** React + Vite + TypeScript frontend, Express 5 API, Drizzle ORM,
  esbuild bundle. Note: PDF/State Doc say React 18, but the pnpm catalog pins **React 19.1** — build
  to 19.1 (drift recorded in `CLAUDE.md`).

## 0. Current state (verified against code on this branch)

- `users` table has **no `password_hash`** column (id, email[unique], first/last name, phone, mobile,
  avatar, `notification_preference`, `status` default `PENDING_APPROVAL`, created_at).
- `org_members` already carries **`role`** (text) + `permissions` (jsonb) + `is_primary_org` — role
  authorization reads from here.
- **No** `auth` route, **no** `sessions` / `password_reset_tokens` tables, **no** auth/crypto deps
  installed.
- `PLACEHOLDER_USERS` lives in `artifacts/axel-workforce-os/src/lib/users.ts` and is imported by
  **`src/components/DealCardModal.tsx` and `src/pages/Pipeline.tsx`** — both must be updated when it's
  deleted.

## 1. Auth approach + justification (the §6 one-paragraph decision)

**Decision: `better-auth` (a maintained library).** §6 calls for "a maintained library (Lucia or
Auth.js — engineer's call; justify)." **Lucia was deprecated** by its maintainer (now a
copy-the-code learning resource, not a dependency), and **Auth.js/Express is OAuth/Next-centric** —
awkward for email+password with this app's custom per-route `allowedRoles`. **`better-auth`** is the
actively-maintained successor: native email+password, Postgres-backed sessions, a Drizzle adapter,
and httpOnly cookie handling — satisfying §6's "maintained library" requirement while fitting this
stack.

**Flag for Curtis:** this substitutes `better-auth` for the now-dead Lucia he named. The only
*literally-named* maintained option is Auth.js, which I advise against for fit. **Fallback:** if
`better-auth`'s schema/endpoint conventions prove too invasive against the existing
`users`/`org_members` model (see §3/§5), drop to a hand-rolled session layer (`node:crypto` +
`sessions` table, `argon2id`/`bcryptjs`) and flag that swap to Curtis.

**Password hashing:** `better-auth` handles it internally (scrypt by default; configurable) — no
separate hasher dep unless overridden.

> Library APIs move fast — verify all `better-auth` specifics (Drizzle adapter, schema CLI, Express
> handler, cookie/session config) against its **current docs** during the build (audit actual, not
> memory). **Confirm the better-auth handler works under Express 5** specifically (Express 5 changed
> routing/middleware internals); if it doesn't, that's a trigger for the §1 hand-rolled fallback.

## 2. Dependencies (api-server)

- `better-auth` + its **Drizzle adapter**; use the `better-auth` CLI (`@better-auth/cli generate`) to
  emit/inspect the Drizzle schema it needs.
- Confirm the esbuild bundle (`build.mjs`) handles `better-auth` (and any transitive native dep)
  correctly.
- Fallback path only: if you drop to hand-rolled, prefer **`bcryptjs`** (pure-JS — avoids a
  native-module-at-runtime risk in the esbuild single-bundle deploy) + `node:crypto`.

## 3. Schema changes (Drizzle source-of-truth → explicit SQL DDL; NO blanket push)

`better-auth` defines its own tables (typically `user`, `session`, `account`, `verification`).
**Reconcile with the existing schema — do NOT create a parallel duplicate user table** (binding
decision: one users table). Generate with the CLI, then hand-reconcile into `lib/db/src/schema/`
(per-file + `drizzle-zod`, re-exported from `schema/index.ts`):

- **Map first, then write DDL.** Run `@better-auth/cli generate` and **diff** the columns it needs on
  its user model (e.g. `email_verified`, `name`, `created_at`, `updated_at`, `image`) against the real
  `users` columns (`first_name`/`last_name`, `avatar_url`, `status`, **no** `email_verified`/
  `updated_at`/`name`/`image`). Produce an explicit adapter **field-mapping** (or additive columns)
  BEFORE any DDL — this is where the build will actually get stuck.
- **Map `better-auth`'s user model onto the existing `users` table** via its model/field config so it
  reuses `users`. **Name better-auth's own tables with an `auth_` prefix** (`auth_account`,
  `auth_session`, `auth_verification`) via the adapter's table-name config, to avoid confusion with the
  existing business **`accounts`** table (binding decision #4). The credential lives in `auth_account`.
- The library owns session tokens (this replaces the hand-rolled SHA-256 design from the earlier draft).
- **Keep roles in `org_members`** (the app's existing model). Do **not** put role on better-auth's
  user; after the library resolves a session, read role from the user's primary `org_members` row.
- Add **`auth_verification`** + reset-token storage as the library requires.

> **Reconciliation is the main cost of the library route** — map to existing tables carefully so you
> don't fork the user model. If this fights the schema badly, take the §1 hand-rolled fallback.

> **Apply via explicit SQL DDL, not a blanket `push`** — the `deals` drift makes push hang and risk a
> destructive TRUNCATE (see `.agents/memory/drizzle-push-blocked.md`). Resolve the `deals` drift
> separately; never blind-accept destructive changes.

> **Flag for Curtis (workflow deviation):** the project convention is "schema ships via
> `drizzle-kit push`." This phase applies the new auth tables via explicit SQL DDL instead, *because*
> push is currently blocked by the `deals` drift. Drizzle table files remain the source of truth — this
> is a workaround for the drift, **not** a switch to a migration-file flow. Surface it in the report.

## 4. Session + cookie config (`api-server/src/lib/auth.ts`)

- Configure `better-auth`: email+password enabled, the Drizzle/Postgres adapter, session expiry ~30d
  with refresh, cookies `httpOnly` + `secure` (prod) + **`sameSite=lax`**. The frontend calls
  **same-origin `/api`** (`main.tsx` sets no base URL), so **do NOT use `sameSite=none`** — it would
  needlessly weaken CSRF posture. Only revisit if Replit genuinely serves the API on a different origin.
- **Expose the session to routes:** a thin middleware calls the library's session resolver
  (e.g. `auth.api.getSession({ headers })`), then attaches `req.user` + the role from the user's
  primary `org_members` row, or 401s. `requireAuth`/`requireRoles` (§6) build on this.
- Any `better-auth` secret/`BETTER_AUTH_SECRET` goes in **Replit Secrets** (env) — never in source.

## 5. Auth endpoints (mount `better-auth`, reconcile to §6's contract)

- Mount the `better-auth` Express handler at **`/api/auth/*`** (e.g. `toNodeHandler(auth)`), **before**
  `requireAuth` (auth routes are a §6 exception).
- **Reconcile to §6's named contract.** §6 lists `POST /api/auth/login|logout|register`,
  `GET /api/auth/me`. `better-auth` exposes its own paths (e.g. `sign-in/email`, `sign-out`,
  `get-session`). Either **(a)** adopt the library's paths and update the frontend + `openapi.yaml`,
  or **(b)** add thin alias routes for §6's exact names that delegate to the library. **Choose (b) if
  Curtis wants the §6 endpoint names preserved.** Whatever surface you expose, update `openapi.yaml`
  → regenerate Orval/Zod.
- **Register = admin-invite only** (`requireRoles("ADMIN")` around the library's create-user; also
  create the `org_members` row). No public self-registration except the existing **agent-registration**
  flow.
- **Password reset:** use `better-auth`'s reset flow; keep email delivery **stubbed** until the email
  phase (no-op/log the send).

## 6. API protection — every route

- Mount **`requireAuth`** in `api-server/src/app.ts` so all `/api/*` requests are rejected with **401**
  unless authenticated. **Exceptions:** `/api/auth/*`; **only `POST /api/agent-registrations`** (the
  public submission — its `GET /` lists all registrations and `PATCH /:id` is an admin review action,
  so those MUST require ADMIN/CSA; scope the exception **per-method, not the whole router**); and the
  `/webhooks` receivers (mounted before `express.json()`, outside `/api`).
- **Do NOT reorder the `/webhooks` middleware.** Its body handling is pre-existing tech debt and out of
  scope; `requireAuth` mounts on `/api` only, leaving `/webhooks` untouched.
- **Harden CORS + CSRF (required once cookies carry auth).** `app.ts` currently uses an open
  `app.use(cors())`. Replace it with an explicit `origin` allowlist + `credentials: true`, and enable
  better-auth's `trustedOrigins`/origin (CSRF) check. Open CORS + credentialed cookies is a cross-site
  request vector — closing it is part of "API hardening."
- Add **`requireRoles(...roles)`**; **every** route declares its allowed roles server-side, mirroring
  the frontend access map. No route ships without an explicit role declaration.
- Close the 12 frontend RBAC holes (§6.3) with server-side roles: `/organizations`, `/deals`,
  `/policies`, `/contacts`, `/employees`, `/tasks`, `/commissions`, `/agent-registrations`,
  `/rate-tables`, `/implementation`, `/workforce`, `/legacy`. Default **ADMIN/CSA**; **ADMIN-only** for
  `/rate-tables`; **ADMIN/CSA/AGENT/UNDERWRITER** for `/deals`.

## 7. Seed real users + remove the mock

- Seed the 8 `PLACEHOLDER_USERS` as real accounts **through `better-auth`'s create-user / sign-up API**
  so the password credential lands in its `account` table (hashed by the library) — one per role
  (ADMIN, UNDERWRITER, CSA, AGENT, EMPLOYER, CARRIER, PEO, VENDOR); set `users.status` active.
- Ensure the target **`organizations` rows exist first** (seed them if needed — `org_members.org_id`
  FKs `organizations`), then create matching `org_members` rows linking each user to its org + role.
- **Delete `src/lib/users.ts`** and update its two consumers — `DealCardModal.tsx` and `Pipeline.tsx`
  — to source user data from the API/auth store instead. No reference to `PLACEHOLDER_USERS` may remain.

## 8. Frontend auth rewiring

- Replace the role-switcher `LoginPage` with a real **email/password** form: `#060608` canvas,
  `glass-panel` (blur 40) card, Inter body / Jost heading, pink `--accent-primary` links + focus
  rings, sign-in button uses `--gradient-cta` (the page's single gradient CTA). **Tokens only.**
  Verify in **light and dark**.
- Auth store (Zustand) **hydrates from `GET /api/auth/me`** on load; logout calls the API then clears.
- **Cookies, not bearer:** `custom-fetch.ts` must send `credentials: "include"` so the session cookie
  rides along. (The current `setAuthTokenGetter` bearer path is unused for session auth — leave it or
  remove it, but ensure requests are credentialed.)
- Dev-only role switcher behind **`VITE_DEV_AUTH=true`**, compiled out of production builds.

## 9. Typecheck cleanup

Fix the pre-existing typecheck errors so `pnpm typecheck` passes clean — the State Doc cites **9**;
verify the actual count on the synced build. List each error and its fix in the report. If a fix would
change business logic, flag it and stop rather than guessing.

## 10. Acceptance tests — all must pass (report pass/fail each)

1. Login with each of the 8 seeded accounts lands on the correct dashboard.
2. Unauthenticated `curl` to any `/api/*` route (except the public exceptions) returns **401**.
3. Logged in as AGENT, a direct API call to an ADMIN-only endpoint returns **403**.
4. Logged in as EMPLOYER, navigating to `/billing` redirects to `/unauthorized` (frontend — note
   `App.tsx` already enforces this client-side). **Also** verify the **server** returns **403** for an
   EMPLOYER's API call to a billing/admin endpoint — that's the real server-side check.
5. Session survives page refresh; logout fully clears it; cookie is **httpOnly** (verify in devtools).
6. **No references to `PLACEHOLDER_USERS`** remain anywhere in the codebase.
7. `pnpm typecheck` passes with **zero** errors.
8. Login page screenshot included — gradient CTA, pink accents, glass panel (light + dark).
9. Regression: the deal card modal still opens and renders (it imported the removed mock).

## 11. Report back to Curtis

- The one-paragraph library justification (§1) as actually built.
- Pass/fail per acceptance test, with the login screenshot(s).
- The list of typecheck errors fixed.
- Confirm `supabase/` folder deleted and no Supabase references introduced.
- **Flag the two deviations:** (1) `better-auth` substituted for the deprecated Lucia (§1); (2) auth
  tables applied via explicit **SQL DDL** rather than `drizzle-kit push`, due to the `deals` drift —
  Drizzle stays the source of truth. Note whether the `deals` drift itself was resolved.
