# Codebase Intake: Axel Workforce OS
_Intake date: 2026-06-15 · Reviewer: Brendan Skrocki · Branch/commit: awf-os-brendy-sprint-1 @ c4ff52a · Built with: Replit (PNPM_WORKSPACE stack)_

> **Scope:** Whole repo. This intake describes the **real, synced codebase** as of commit
> `c4ff52a` — the documented build that previously lived only in the Replit workspace and was
> pulled into Git on 2026-06-15 (247 commits, fast-forward from the old `2f8801e` scaffold). A
> prior intake written against `2f8801e` (the 3-commit bare scaffold) is now obsolete and has
> been replaced by this one.

## 1. What this is

Axel Workforce OS is a multi-party, AI-enabled marketplace for **workers' compensation (WC)
insurance and PEO / human-capital services**, with a dual quote-to-bind path and four product
types (WC Only, PEO, ASO, ASO+Captive). First PEO program is the Kind PEO Program (cannabis
vertical). Core flow: marketplace submission → rate → proposal → 10-stage deal pipeline → bind →
onboard → bill, serving eight role-based party types (Admin, Underwriter, CSA, Agent, Employer,
Carrier, PEO Partner, Vendor). Owner/decision-maker: Curtis Prince (CEO, Beax.ai). Lead engineer:
Brendan. Origin platform: **Replit** (pnpm-workspace monorepo, autoscale deployment).

## 2. Stack & dependencies

- **Monorepo:** pnpm workspaces (npm/yarn blocked by a `preinstall` guard). Node 24, TypeScript 5.9.
- **Frontend** (`artifacts/axel-workforce-os`): **React 19.1.0** (⚠ `replit.md` says "React 18" —
  stale; the catalog pins 19.1.0), Vite 7, `react-router-dom` v7, `@tanstack/react-query` v5,
  Tailwind v4 (`@tailwindcss/vite`), shadcn/ui, Zustand (persisted auth + theme).
- **Backend** (`artifacts/api-server`): Express 5 (helmet, morgan, pino-http, cors), built to a
  single ESM bundle via esbuild. `bullmq` + `socket.io` installed for future queue/realtime work.
- **Database:** PostgreSQL (Replit-managed) + Drizzle ORM 0.45 over `node-postgres`.
- **API contract:** OpenAPI (`lib/api-spec/openapi.yaml`) → Orval codegen → generated React Query
  hooks (`lib/api-client-react`) + Zod schemas (`lib/api-zod`). Generated dirs must not be hand-edited.
- **Zod:** 3.25.76 (note: `lib/db` schema files import from `zod/v4`).
- **No test runner and no linter.** `tsc --noEmit` (`pnpm typecheck`) is the only correctness gate.

## 3. Architecture map

**Workspace layout**
- `artifacts/api-server` — Express 5 backend (`src/index.ts` → `src/app.ts` → `src/routes`).
- `artifacts/axel-workforce-os` — React 19 + Vite frontend (`src/App.tsx` routing, `src/pages/*`,
  `src/components`, `src/lib`).
- `artifacts/mockup-sandbox` — throwaway UI playground; not part of the product.
- `lib/api-spec` (OpenAPI + Orval), `lib/api-zod` (generated), `lib/api-client-react` (generated +
  hand-written `custom-fetch.ts`), `lib/db` (Drizzle schema + pool), `lib/cannabis-application`
  (canonical Zod schema for the Cannabis WC PDF + AcroForm field mappings).

**Backend request flow:** `index.ts` reads `PORT`, starts an hourly `ai_classify_cache` sweeper,
`app.listen`. `app.ts` mounts **`/webhooks` BEFORE `express.json()`** (raw-body webhook receivers),
then JSON/urlencoded parsers, then the main router at `/api`. `routes/index.ts` composes ~30
sub-routers (organizations, users, deals, quotes, policies, commissions, contacts, employees,
tasks, notes, agent-registrations, rate-tables, implementation, workforce, accounts, partners,
resources, search, wc-rates, rate, submission, loss-history, proposals, signatures, documents,
appetite, ai, health, + a `/bind-packages`→`/bind-package` URL-rewrite shim).

**Frontend:** `App.tsx` routes wrap protected pages in `ProtectedRoute`; ~30 page components under
`src/pages` plus role dashboards (`pages/dashboard`), quote wizard (`pages/quote-flow`), public
agent registration (`pages/register`). `AppShell.tsx` sets the `.dark`/`.light` class on
`<html>` from the persisted theme store. Two theming paths must stay in sync: CSS vars in
`src/index.css` and their JS mirror in `src/lib/use-theme-colors.ts`.

**Rating engine** (domain core): WC premium = `(Payroll ÷ 100) × ClassCodeRate × EMod ×
ScheduleRating`, $500 minimum; PEO deals get a 10% bundled WC discount on the WC component only;
WFS PEPM = `(annual payroll × 2%) ÷ 12`; every calc stores a full `rating_breakdown` JSON.
Always uses most recent rate per State + ClassCode (`EffectiveDate` never filters). Rate data
lives in `Server/data/` (`BIC_2026_Rates.csv` ~25k rows, `CA_Territorial_Rates.csv`) and a
multi-location endpoint `POST /api/rate/wc/multi`.

## 4. Data & auth boundaries

- **Data layer:** Drizzle ORM is the source of truth. **31 table files** under `lib/db/src/schema/`
  re-exported from `schema/index.ts` (⚠ `replit.md` says "29 tables" — drift). Schema ships via
  `drizzle-kit push`, **not** SQL migration files (`scripts/post-merge.sh` runs `pnpm --filter db
  push` after merges). Prior agent note (`.agents/memory/drizzle-push-blocked.md`): push currently
  **hangs on pre-existing `deals` drift** and the workaround has been to apply DDL via direct SQL
  while keeping the Drizzle files as source of truth — verify before relying on `push`.
- **Auth:** ⚠ **Authentication is currently CLIENT-SIDE ONLY.** `src/lib/auth-store.ts` is a
  Zustand store persisted to `localStorage` (`axel-auth`); `ProtectedRoute.tsx` checks only that
  client state and the role list. A grep of `artifacts/api-server/src` for
  `allowedRoles|requireAuth|session|bcrypt|argon|passport|lucia` returns **nothing** — there is
  **no server-side auth middleware, no session store, no route-level authorization.** Every
  `/api/*` endpoint is reachable unauthenticated. This is the documented Phase 3.5 work order
  (real session-based Express auth, bcrypt/argon2, `sessions` table, httpOnly cookies) — **not yet
  built.**
- **Integrations:** Anthropic AI via Replit Integrations (`AI_INTEGRATIONS_ANTHROPIC_API_KEY` /
  `_BASE_URL`) powers the AI Class Code Advisor and a cached classify layer (`ai_classify_cache`
  table + hourly purge). HelloSign for e-signatures is **stubbed** (`HELLOSIGN_API_KEY`,
  `HELLOSIGN_TEST_MODE`, `HELLOSIGN_WEBHOOK_SECRET`). PDF generation via `pdf-lib` (ACORD 130 +
  Trean Cannabis Supp filled on demand; the Axel Cannabis source PDF's 481 auto-named AcroForm
  fields are unmapped — tracked follow-up). Calendly planned. GitHub integration via `.replit`.

## 5. Risk flags

- **HIGH — No backend authentication or authorization.** All `/api/*` routes are unauthenticated;
  authz is enforced only in the React client, which is trivially bypassable (any client can call
  the API directly, and `localStorage` role can be edited). This is the single largest gap. It is
  the intended scope of Phase 3.5 but is currently unimplemented. Do not treat any current
  role-gating as a security boundary.
- **HIGH — CORS is fully open** (`app.use(cors())` with no origin allowlist) and **helmet CSP is
  disabled** (`contentSecurityPolicy: false`). Combined with no auth, the API is wide open.
- **MEDIUM — Drizzle `push` is blocked** by `deals` schema drift (per agent memory). Schema is
  being applied out-of-band via direct SQL DDL, which risks the Drizzle definitions diverging from
  the live DB. The documented "push is the workflow" rule is currently not fully operational.
- **MEDIUM — Documentation drift in `replit.md`:** claims React 18 (actual 19.1.0) and 29 tables
  (actual 31). The doc is otherwise the richest description of the system but should not be trusted
  on exact figures without checking code.
- **LOW — No automated tests and no linter.** `tsc --noEmit` is the only gate; regressions in
  runtime behavior, rating math, and RLS-equivalent authz cannot be caught automatically.
- **LOW — Large binary assets committed to Git** (multi-MB `.xlsx`/`.pdf` under repo root,
  `Server/data/`, and `attached_assets/`), inflating clone size. Acceptable for now; flag for
  future LFS/extraction.

## 6. Open questions for the client

- **Phase 3.5 auth:** is implementing real Express session auth the immediate next priority, or is
  there other queued phase work that comes first? (CLAUDE.md notes Brendan earlier said "whatever
  Replit uses"; the State Document overrides with Express-built auth — please re-confirm.)
- **Drizzle push drift:** what is the actual state of the live DB vs. the Drizzle schema files?
  Should the `deals` drift be resolved so `push` works again, or is the direct-SQL workaround the
  accepted path?
- **State Document v2.1:** can it be checked into the repo (or `docs/`)? It is the named source of
  truth but is not in Git, so it can't be diffed against code.
- **HelloSign / Calendly:** timeline for moving these from stubbed to live, and do we have
  accounts/keys?
- **React version of record:** is 19.1.0 intended (it's what's pinned), and should `replit.md` be
  corrected to match?

## 7. Suggested next steps

_Proposals pending discussion — no changes made during intake._

1. **Regenerate `CLAUDE.md`** against this real codebase (the prior one carried the now-false
   "3-commit bare scaffold" warning). — _in progress as the companion task to this intake._
2. **Reconcile `replit.md` drift** (React 18→19, 29→31 tables) once confirmed.
3. **Scope Phase 3.5 auth** as the highest-value security work: pick the library (Lucia vs Auth.js
   for Express — justify), add the `sessions` table, the auth middleware rejecting unauthenticated
   `/api/*` (except auth/public-registration/webhooks), and per-route `allowedRoles`. Tighten CORS
   and re-enable a real CSP at the same time.
4. **Resolve the Drizzle `deals` drift** so `drizzle-kit push` is reliable again, restoring the
   intended schema workflow.
5. **Verify the app runs locally** (`pnpm install`, set `PORT`/`DATABASE_URL`/`BASE_PATH`, run
   backend + frontend) to confirm the synced build is functional before further work.
