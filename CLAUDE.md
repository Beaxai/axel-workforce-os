# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Source of truth

The **Axel Workforce OS Project State Document** (v2.1, owned by Curtis Prince / Beax.ai, handed to
Brendan the lead engineer) is the single source of truth for platform state, binding architecture
decisions, the design token system, and the queued phase work orders. Read it before any technical
work. If it isn't in that doc, it didn't happen. Chat history is not shared between accounts — the
doc is the only durable shared memory. The binding decisions below are distilled from it; the doc
itself governs when they conflict. (The doc is **not** checked into this repo — request it if you
need to diff against it.)

> ✅ **As of 2026-06-15 the documented build is synced into Git** (commit `c4ff52a` on
> `awf-os-brendy-sprint-1` — 247 commits fast-forwarded over the old 3-commit scaffold). The real
> codebase — ~30 API routes, 31 Drizzle tables, ~30 frontend pages, role dashboards, live rating
> engine — now exists on disk. **Still audit actual files, never agent or document memory** (binding
> decision #5): `replit.md` already drifts from code in places (see Conventions). `INTAKE.md` at the
> repo root is the read-only first-pass map of this synced build.

## What this is

Axel Workforce OS is a **multi-party, AI-enabled marketplace for workers' compensation (WC)
insurance and PEO / human-capital services**, with a dual quote-to-bind path and four product types
(WC Only, PEO, ASO, ASO+Captive). First PEO program: Kind PEO Program (cannabis vertical). Core
flow: marketplace submission → rate → proposal → deal pipeline (New Lead → … → Bound → Client) →
bind → onboard → bill. Eight role-based party types: Admin, Underwriter, CSA, Agent, Employer,
Carrier, PEO Partner, Vendor. Owner/decision-maker: Curtis Prince (CEO). Lead engineer: Brendan.

pnpm-workspace monorepo, Replit-origin, Node 24 + TypeScript 5.9, **React 19.1** frontend.

## Commands

Run from the repo root unless noted. Package manager is **pnpm** (npm/yarn are blocked by a
`preinstall` guard).

| Task | Command |
|------|---------|
| Typecheck everything | `pnpm typecheck` (libs via `tsc --build`, then artifacts/scripts) |
| Build everything | `pnpm build` (typecheck, then `pnpm -r build`) |
| Frontend dev server | `pnpm --filter @workspace/axel-workforce-os dev` |
| Backend dev (build + run) | `pnpm --filter @workspace/api-server dev` |
| Typecheck one package | `pnpm --filter <pkg-name> typecheck` |
| Regenerate API client/zod | `pnpm --filter @workspace/api-spec codegen` |
| Push schema to DB | `pnpm --filter db push` (`push-force` to skip prompts) |

There is **no test runner and no linter** configured. `tsc --noEmit` typecheck is the correctness
gate; there is no way to run a single test. Backend `dev` does a full esbuild then start — it is
**not** hot-reloading.

### Required environment variables

These throw at startup if missing — set them before running:
- **api-server**: `PORT`, `DATABASE_URL`
- **frontend (Vite)**: `PORT`, `BASE_PATH`
- **lib/db** (push/runtime): `DATABASE_URL`

Optional integration vars the backend reads: `AI_INTEGRATIONS_ANTHROPIC_API_KEY` /
`AI_INTEGRATIONS_ANTHROPIC_BASE_URL` (AI Class Code Advisor, model `claude-haiku-4-5`, cached via
`ai_classify_cache`), `HELLOSIGN_API_KEY` /
`HELLOSIGN_TEST_MODE` / `HELLOSIGN_WEBHOOK_SECRET` (e-sign, stubbed), `LOG_LEVEL`, `NODE_ENV`.
Secrets live in Replit's env — a missing `.env` is normal, not a red flag.

## Architecture

### Workspace layout
- `artifacts/api-server` (`@workspace/api-server`) — Express 5 backend
- `artifacts/axel-workforce-os` (`@workspace/axel-workforce-os`) — React 19 + Vite frontend
- `artifacts/mockup-sandbox` — throwaway UI mockup playground; not part of the product
- `lib/api-spec` (`@workspace/api-spec`) — OpenAPI spec + Orval codegen config (source of truth)
- `lib/api-zod` (`@workspace/api-zod`) — **generated** Zod schemas
- `lib/api-client-react` (`@workspace/api-client-react`) — **generated** React Query hooks + fetch client
- `lib/db` (`@workspace/db`) — Drizzle ORM schema + pg pool
- `lib/cannabis-application` (`@workspace/cannabis-application`) — canonical Zod schema for the Axel
  Cannabis WC 2026 PDF + AcroForm field-name mappings to ACORD 130 / Trean Cannabis Supp templates
- `Server/data` — rate + template data (`BIC_2026_Rates.csv` ~25k rows, `CA_Territorial_Rates.csv`,
  source PDFs); `scripts`, `supabase/`, `docs/`

### The API contract is code-generated — do not hand-edit generated files

`lib/api-spec/openapi.yaml` is the **single source of truth** for the API. Codegen flow:

```
openapi.yaml ──orval──▶ lib/api-client-react/src/generated/  (React Query hooks, used by frontend)
             └────────▶ lib/api-zod/src/generated/           (Zod schemas, used by api-server)
```

To add or change an endpoint: edit `openapi.yaml`, run
`pnpm --filter @workspace/api-spec codegen`, then implement the matching Express route in
`artifacts/api-server/src/routes/` and the matching frontend usage. **Never edit anything under a
`generated/` directory by hand — it is clobbered on the next codegen run.** The OpenAPI `info.title`
is forced to `"Api"` by a transformer; don't rename it or import paths break.

The frontend calls the API through the generated hooks, which use `customFetch`
(`lib/api-client-react/src/custom-fetch.ts`) — a hand-written fetch wrapper providing
`ApiError`/`ResponseParseError`, base-URL prefixing (`setBaseUrl`), and bearer-token injection
(`setAuthTokenGetter`). Edit `custom-fetch.ts` directly; it is *not* generated.

### Backend
Entry `src/index.ts` (reads `PORT`, `app.listen`, and starts an hourly `ai_classify_cache` purge
sweeper) → `src/app.ts`. **Mount order matters in `app.ts`:** `/webhooks` is mounted with its raw
body **before** `express.json()` (webhook receivers need the unparsed body); the main router mounts
at `/api` after the JSON/urlencoded parsers. `routes/index.ts` composes ~30 sub-routers (deals,
quotes, accounts, policies, proposals, submission, rate, rate-tables, wc-rates, appetite, ai,
signatures, documents, implementation, workforce, partners, resources, search, etc.), plus a
`/bind-packages` → `/bind-package` URL-rewrite shim into `documentsRouter`. Built with **esbuild**
(`build.mjs`) into a single ESM bundle at `dist/index.mjs`. `bullmq` and `socket.io` are installed
for future queue/realtime work.

### Frontend
React 19, `react-router-dom` v7 (`App.tsx`), `@tanstack/react-query`, Tailwind v4 (via
`@tailwindcss/vite`), shadcn/ui components in `src/components/ui`, Zustand (persisted) for auth and
theme. Path alias `@` → `src`. `BASE_PATH`/`BrowserRouter basename` are driven by env for Replit's
path-based hosting. `AppShell.tsx` sets the `.dark`/`.light` class on `document.documentElement`
from the persisted theme store; `ProtectedRoute.tsx` gates routes by client auth state + role.

### Database
Drizzle ORM over `node-postgres`. **~45 `pgTable` definitions across 31 schema files** under
`lib/db/src/schema/`, re-exported from `schema/index.ts` (Core, Deals/Pipeline, Policies/AMS, CRM,
Email, Implementation, Partners/Network, Resources, Agent Registration, Rate Tables, Workforce,
Onboarding, plus `ai_classify_cache`). (State Doc says "43 tables"; audited count is 45 — close.)
Rating data is ingested into `wc_rates` (~24.8k rows) + `appetite` (~25k rows); many other tables
exist as schema + pages but are still empty (policies, implementations, commissions, employees).
`lib/db/src/index.ts` exports the `db` instance and `pool`.

**Schema changes ship via `drizzle-kit push`, not SQL migration files. This is the intended
workflow — do not introduce a migration-file flow.** `scripts/post-merge.sh` runs
`pnpm --filter db push` automatically after merges. To change the schema, edit the Drizzle table
definitions and run `pnpm --filter db push`.

> ⚠️ **`drizzle-kit push` is currently blocked by pre-existing `deals` drift** (it hangs on the
> interactive drift prompt). The working around has been to apply DDL via direct SQL while keeping
> the Drizzle files as the source of truth. Verify the live DB vs. the schema files before relying
> on `push`; resolving this drift is open work.

**Database is Replit-managed PostgreSQL + Drizzle ORM — PERMANENT (binding decision #1).**
**Supabase is removed from the spec: never introduce it, and the legacy `supabase/` folder is
slated for deletion in Phase 3.5.** Authorization belongs in API middleware (not RLS); future file
storage is S3/R2; realtime via polling/websockets if needed.

### Auth
**Binding decision #1 specifies real session-based auth built in Express; Phase 3.5 is the active
work order to implement it — and it is NOT yet built.** Current reality: auth is **client-side
only**. `src/lib/auth-store.ts` is a Zustand store persisted to `localStorage` (`axel-auth`);
`ProtectedRoute.tsx` checks only that client state and the allowed-role list. **There is no
server-side auth middleware, session store, or per-route authorization** — every `/api/*` endpoint
is currently reachable unauthenticated, and `cors()` is fully open with helmet CSP disabled. Do not
treat current role-gating as a security boundary.

Phase 3.5 target (per the State Document): a maintained library (Lucia or Auth.js for Express —
engineer's call, justify before building), email+password with bcrypt/argon2, **sessions stored in
PostgreSQL** (`sessions` table), `httpOnly` + `secure` + `sameSite` cookies. Endpoints
`POST /api/auth/login|logout|register`, `GET /api/auth/me`. Middleware rejects unauthenticated
`/api/*` with 401 (except auth, public agent-registration, and webhook receivers); every route
declares server-side `allowedRoles`. A dev-only role switcher sits behind `VITE_DEV_AUTH=true`,
impossible to enable in production.

## Design system (binding decision #2 — tokens only)

Restyled to the Axel brand (purple/pink). Accent colors are CSS variables in `src/index.css`,
mirrored in `src/lib/use-theme-colors.ts`. **No hardcoded accent hex literals outside token
definition files.** The two theming paths (`index.css` `:root`=light / `.dark`=dark, and the JS
mirror) MUST stay in sync.

- `--accent-primary` **#E91E8C** (pink) — all interactive: buttons, links, focus rings, active nav,
  tab underlines, chart primary. Hover `#d1187e`, dark focus `#ff4ba6`, soft `rgba(233,30,140,0.15)`.
- `--accent-support` **#7C3AED** (purple) — icon chips, badge variant, chart secondary, category/role
  distinctions. Hover `#6D28D9`. (Pink is primary, not purple: #7C3AED is too dark on #060608 for
  small elements.)
- `--gradient-cta` `linear-gradient(135deg, #7C3AED → #E91E8C)` — **the ONLY permitted gradient**,
  on a single primary CTA per view. Banned on cards, panels, badges, charts, text, borders.
- **Semantic status colors are not brand colors — never repoint them:** green `#22c55e`, red
  `#ef4444`, yellow `#eab308`, blue `#3b82f6`, gray `#6b7280` (AxelBadge COLOR_MAP). The only raw
  accent hex literals allowed outside the token files are purple (`#7C3AED`/`#6D28D9`), `#1E6BE9`
  (categorical WC blue), and `#ef4444` (error red); pink lives only in the token files + AxelBadge map.
- Canvas **#060608** dark / `#f4f4f5` light (dark default). **Inter** body (15px base, via
  `--app-font-sans`), **Jost** all-caps section subheadings (`--app-font-heading`, `.font-heading`).
  (Audited in `src/index.css`: `--app-font-sans: 'Inter'` — `replit.md`'s "Open Sans" is wrong.)
  **Exactly two glass recipes** (binding): `.glass-card` (blur 12px) and `.glass-panel` (blur 40px),
  each with light-mode counterparts — no other blur values. Content centered at `maxWidth 1280px`,
  padding `32px 40px`. Sidebar 280px/64px collapsed, header 56px.
- Form surfaces/text use dedicated tokens (`--input-bg`, `--input-border`, `--input-text`,
  `--input-placeholder`, `--input-bg-focus`, `--input-border-focus`, `--label-text`,
  `--section-heading`). **Definition of Done: every new view/component is verified in BOTH light and
  dark mode before a phase closes.** Never hardcode dark literals in components — consume tokens via
  `useThemeColors()` or `var(--…)`.

## Domain & data-model rules (binding)

- **Rating engine (decision #3):** always use the **most recent rate per State + ClassCode** —
  `EffectiveDate` is reference only and **never filters** queries. WC premium =
  `(Payroll ÷ 100) × ClassCodeRate × EMod × ScheduleRating`, **$500 minimum**. PEO deals get a
  **10% bundled WC discount on the WC component only**. WFS PEPM monthly fee =
  `(annual payroll × 2%) ÷ 12`. **Every calculation stores a full `rating_breakdown` JSON.**
  Multi-location rating: `POST /api/rate/wc/multi`; workforce profile stored as JSONB in
  `quotes.workforce_profile`.
- **Lead vs Account (decision #4):** a *lead* is an unqualified name in its own `leads` table under
  the Accounts module. An *account* is a real company with a real opportunity — **one table for
  prospects AND clients**, distinguished by `client_stage` (Prospect → Active Prospect → New Client
  → Active Client). **Never create a separate `prospects` table.** Pipeline Stage 1 ("New Lead")
  means a new *deal*, not a lead record.
- **Pipeline is 10 stages** (State Doc, authoritative — `replit.md`'s "8-stage" is wrong): New Lead →
  Qualified → Needs Analysis → Proposal Sent → Negotiation → Decision Pending → Committed →
  Documentation → Bound → Client. **Stage 9 (Bound) triggers both implementation trackers**;
  pipeline stops at Bind Order — the Implementation Tracker owns everything post-bind. Client module
  is named **"My Program"**; the workforce/partner module is named **"Network"**.
- **API surface changes** must update `openapi.yaml` and regenerate Orval hooks + Zod schemas. New
  scope ships with explicit **acceptance tests**; a phase isn't done until its tests pass. Flag
  anything that would touch a binding decision *before* building it.

## Conventions

- **Shared deps use the pnpm catalog** (`pnpm-workspace.yaml` → `catalog:`). Reference shared
  versions as `"catalog:"` rather than pinning per-package. Cross-package refs use `workspace:*`.
- **TypeScript is strict-ish** (`tsconfig.base.json`): `strictNullChecks`, `noImplicitAny`,
  `noImplicitReturns`, `isolatedModules` on; `noUnusedLocals` off. Workspace resolution relies on
  the custom condition `"workspace"` — keep it when touching tsconfigs.
- **Zod**: backend/codegen pins `zod` 3.25 via catalog; schema files in `lib/db` import from
  `zod/v4`. Match the surrounding file's import path.
- **`replit.md` drifts from code** — it's the richest prose description of the system but states
  React 18 (actual 19.1) and 29 tables (actual 31). Trust code over the doc on exact figures.
- **`.agents/memory/`** holds prior agent notes from the Replit side (drizzle-push drift, light-mode
  theming/AA contrast, AxelBadge color prop, quote-flow wizard state) — useful context, still verify
  against code.

## Execution model (Replit-native)

This project deploys through Replit (`.replit`): `runButton = "Project"`, autoscale deployment,
`PNPM_WORKSPACE` stack, GitHub integration, `nodejs-24` + `python-3.11` + `postgresql-16` modules.
Replit's harness runs builds, the dev server, and `post-merge` schema pushes. When working locally
you can run the pnpm commands above directly, but the canonical run/deploy path is Replit's.
