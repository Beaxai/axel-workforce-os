# Axel Workforce OS

## Overview

Full-stack workforce management platform built with a pnpm workspace monorepo using TypeScript. Covers organizations, deals/pipeline, policies, CRM, workforce management, agent registration, rate tables, implementation tracking, commissions, and onboarding. Features 8 role-based party environment dashboards with a dark glassmorphism design system, AppShell layout with collapsible sidebar, and light/dark mode toggle.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React 18 + Vite + Tailwind CSS
- **Backend**: Express 5 with helmet, morgan, cors, socket.io
- **Database**: PostgreSQL (28 tables) + Drizzle ORM
- **State Management**: Zustand (auth store + theme store persisted to localStorage)
- **Data Fetching**: @tanstack/react-query
- **Forms**: react-hook-form + zod
- **Icons**: lucide-react
- **Charts**: recharts
- **Real-time**: socket.io / socket.io-client
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle for server), Vite (frontend)

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/            # Express API server (backend)
│   └── axel-workforce-os/     # React + Vite frontend
├── lib/                       # Shared libraries
│   ├── api-spec/              # OpenAPI spec + Orval codegen config
│   ├── api-client-react/      # Generated React Query hooks
│   ├── api-zod/               # Generated Zod schemas from OpenAPI
│   └── db/                    # Drizzle ORM schema + DB connection
├── supabase/
│   ├── migrations/            # SQL migration files (001_initial_schema.sql)
│   └── seed/                  # Seed data files
├── docs/                      # Documentation
├── scripts/                   # Utility scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## Database

29 tables provisioned in PostgreSQL:

- **Core**: organizations, users, org_members, accounts
- **Deals/Pipeline**: deals (with account_id FK), quotes
- **Policies/AMS**: policies, commissions, policy_documents
- **CRM**: contacts, notes, tasks, task_library, activity_log
- **Email**: deal_email_addresses, deal_inbound_emails, task_send_log
- **Implementation**: implementation_trackers, implementation_phases, implementation_tasks
- **Partners/Network**: partners
- **Agent Registration**: agent_registrations (with partner_id, user_id FKs), agent_compliance
- **Rate Tables**: rate_tables, pepm_rates
- **Workforce**: employees, workforce_summaries, vertical_workforce_rollups
- **Onboarding**: onboarding_checklist

Drizzle ORM schema files in `lib/db/src/schema/` (one per domain).

## API Routes (Express, mounted at `/api`)

- `GET /api/healthz` — health check
- `/api/organizations` — CRUD
- `/api/users` — CRUD
- `/api/deals` — CRUD + sub-resources (quotes, contacts, notes, tasks, activity)
- `/api/quotes` — CRUD
- `/api/policies` — CRUD + commissions, documents
- `/api/commissions` — CRUD
- `/api/contacts` — CRUD
- `/api/employees` — CRUD
- `/api/tasks` — CRUD
- `/api/notes` — CRUD
- `/api/agent-registrations` — CRUD
- `/api/rate-tables` — list with filters, PEPM rates
- `/api/implementation` — trackers with phases/tasks
- `/api/workforce` — summaries, vertical rollups
- `/api/accounts` — CRUD + /deals, /policies, /activity sub-resources
- `/api/partners` — CRUD with ?type= filter (Agent, Carrier, PEO, Vendor)

## Authentication & Role System

Auth is managed via Zustand store (`auth-store.ts`) persisted to localStorage (`axel-auth`).
- **Login page** at `/login` — role selector with 8 party types
- **ProtectedRoute** component guards dashboard routes with `allowedRoles`
- **Role switcher** in sidebar allows switching between all 8 roles (uses setTimeout for navigation timing)

### Party Types & Dashboard Routes

| Role | Route | Nav Items (P4) |
|------|-------|----------------|
| Admin | `/dashboard/admin` | Home, Marketplace, Pipeline, Accounts (/accounts), Implementations (/implementations), Billing (/billing), Network, Resources |
| Underwriter | `/dashboard/underwriter` | Home, Pipeline, Accounts |
| CSA | `/dashboard/csa` | Home, Marketplace, Pipeline, Accounts (/accounts), Implementations (/implementations), Network (/network) |
| Agent | `/dashboard/agent` | Home, Pipeline, Accounts |
| Employer | `/dashboard/employer` | My Program (locked until Active Client) |
| Carrier | `/dashboard/carrier` | Home, Accounts |
| PEO Partner | `/dashboard/peo` | Home, Network |
| Vendor | `/dashboard/vendor` | Home, Accounts |

## Design System (Phase 4)

### Rules (Non-Negotiable)
- **Background**: `#060608` (dark), `#f4f4f5` (light)
- **Accent**: `#E91E8C` (solid pink) — ONLY accent color, NO gradients anywhere
- **Glass panels**: `rgba(255,255,255,0.05)` bg, `backdrop-filter: blur(12px)`, `border: 1px solid rgba(255,255,255,0.08)`, `border-radius: 12px`
- **Typography**: White primary, `rgba(255,255,255,0.5)` secondary/muted (dark mode)
- **Light/Dark**: Toggle in top-right header. Dark is default. Light mode keeps `#E91E8C` accent.

### Component Library (`/components/ui/`)

All importable from `@/components/ui/axel-index`:

| Component | File | Description |
|-----------|------|-------------|
| GlassCard | GlassCard.tsx | Frosted glass panel, theme-aware, accepts className, children, padding |
| PinkButton | PinkButton.tsx | Solid #E91E8C, white text, hover darkens 10% |
| GhostButton | GhostButton.tsx | Transparent, #E91E8C border+text, solid fill on hover |
| StatTile | StatTile.tsx | Glass card with label + large number + optional trend |
| SectionHeader | SectionHeader.tsx | Page title + optional subtitle |
| Badge/AxelBadge | AxelBadge.tsx | Status pill with color + label, solid colors only |
| Modal/AxelModal | AxelModal.tsx | Glassmorphism overlay modal, isOpen/onClose/children |
| Tooltip/AxelTooltip | AxelTooltip.tsx | Hover tooltip, dark glass surface |

### Layout Components

- **AppShell.tsx** — Main layout shell for all dashboard routes. Collapsible left nav (icons-only collapsed), top header with wordmark/theme toggle/user dropdown, scrollable content area with 24px padding.
- **DashboardLayout.tsx** — Legacy P3 layout (kept for backwards compat, gradients removed)
- **AppLayout.tsx** — Light-themed layout for legacy CRUD pages
- **ProtectedRoute.tsx** — Auth + role guard wrapper

### Theme Store

`lib/theme-store.ts` — Zustand store persisted to localStorage (`axel-theme`). Toggle between `dark` and `light`. AppShell adds/removes `dark`/`light` class on `<html>`.

### Role Config

`lib/role-config.ts` — `NavItem[]` per role with `{ label, path, icon, locked? }`. `ROLE_NAV` record maps `PartyRole` to nav items. Employer has `locked: true` on "My Program".

## Frontend Pages

### Dashboard Pages (Dark/Light Theme via AppShell)
8 role-based dashboards under `/dashboard/{role}`, each using AppShell with StatTile, GlassCard, SectionHeader, AxelBadge from the component library.

### Pipeline (Phase 6)
- **`/pipeline`** — 8-stage Kanban board (Submission Review → Indication → U/W Review → Approved/Quoted → Bind Order → Bound → Client → Lost). Accessible to Admin, CSA, Agent, Underwriter.
- Each column is 280px wide, horizontally scrollable, with deal count badges.
- Deal cards show business name, vertical with icon, WC/PEO badge, WC Premium, PEPM (PEO only), team avatars.
- "New Deal" button opens modal form (Business Name, Vertical, Quote Type, State, Payroll, Employees, Assigned To).
- HTML5 drag-and-drop between columns updates deal stage via API.
- Stage 9 (Bound) drop logs implementation trigger to console.
- Click card opens DealCardModal (Phase 7).

### Deal Card Modal (Phase 7)
- **`DealCardModal.tsx`** — Full-screen overlay modal opened by clicking any deal card on the Pipeline Kanban board.
- **Layout**: Two-column — left (65%) has activity feed + tasks, right (35%) has deal details + documents.
- **Header**: Business name, vertical badge (WC/PEO), stage indicator, "Advance Stage" button, team avatars, close button.
- **Activity Feed**: Shows timestamped activity entries (stage changes, notes, task events). Note input with @ mention support and "Post" button.
- **Tasks**: Task list with checkboxes (toggle complete/open), "Add Task" inline form, "Use Template" with 3 preset templates (WC New Business, PEO Onboarding, Renewal).
- **Deal Details**: Editable fields (Business Name, State, Annual Payroll, Headcount) via "Edit Details" toggle. Read-only view shows all deal fields.
- **Listener Email**: Auto-generated on deal creation (`slug@listener.axel.io`), displayed with copy button.
- **Documents**: Placeholder section for future file storage integration.
- **API Routes**: `POST /deals/:id/activity`, `GET/POST /deals/:id/email`, plus existing `GET /deals/:id/tasks`, `GET /deals/:id/activity`.
- **Stage Advance**: Updates deal stage via PATCH and logs activity entry. Kanban board refreshes on close.

### Accounts (Phase 8)
- **`/accounts`** — Account list with search, status filters (All/Active Client/Prospect/Inactive), 2-column card grid. New Account modal. Accessible to Admin, CSA.
- **`/accounts/:id`** — Account detail with two-column layout: business info (editable), associated deals (clickable → DealCardModal), policies, contact info, account status, notes, activity log.

### Implementations (Phase 8)
- **`/implementations`** — Dual-tab view: "WC Bind Journey" (4 phases) and "PEO / ASO Onboarding" (5 phases). Shows tracker cards with progress bars (#E91E8C solid fill), phase labels, days elapsed, "Advance Phase" button.
- Auto-creates trackers when a deal is dropped to BOUND stage in Pipeline Kanban. Completed trackers auto-advance deal to CLIENT stage.

### Billing (Phase 8)
- **`/billing`** — Admin-only. Two tabs: "WC Premiums" (policies list with stat tiles) and "Workforce Solutions Fees" (PEO clients with PEPM data). Search filter and CSV export button.

### Network (Phase 9)
- **`/network`** — Four-tab partner directory (Agents, Carriers, PEO Partners, Vendors). Accessible to Admin, CSA.
- Each tab shows partner cards with status badges (Active=#1EE97B, Pending=#E9C31E, Suspended=#E91E1E). "Add Partner" modal.
- **`/network/agents/:id`** — Agent detail: profile, contact, registration status, commission summary (placeholder), associated deals. Edit & Suspend Agent actions.
- **`/network/carriers/:id`** — Carrier detail: AM Best rating, appetite notes, contact info, bound policies list. Edit action.
- **`/network/peo/:id`** — PEO Partner detail: program name, verticals served, WC bundled discount rate (editable), client organizations. Edit action.
- Vendors tab has inline editing directly on cards (no detail page).

### Agent Registration (Phase 9)
- **`/register/agent`** — Public route (no auth). Multi-step registration: name, agency, NPN, license states, email, phone. Submits to agent_registrations table with PENDING_REVIEW status.
- **`/register/agent/agreement/:id`** — Agreement signing placeholder (HelloSign integration — coming soon).
- **`/register/agent/onboarding/:id`** — Onboarding call scheduling placeholder (Calendly integration — coming soon).
- **Admin dashboard** shows "Agent Applications" panel with pending registrations. Admin can Approve (→ Agreement Pending), Mark Call Complete (→ Credentials Pending), Issue Credentials (creates partner record, sets status to Active).
- Registration statuses: PENDING_REVIEW → AGREEMENT_PENDING → ONBOARDING_CALL_PENDING → CREDENTIALS_PENDING → ACTIVE (or REJECTED).

### Marketplace (Phase 5)
- **`/marketplace`** — Vertical card grid with 8 industry verticals (Cannabis, Construction, Staffing, Healthcare, Hospitality, Transportation, Manufacturing, Retail). Each card has WC Quote and PEO Quote buttons. Accessible to Admin and CSA only.
- **`/marketplace/quote/new`** — Quote initiation form (Business Name, State, Annual Payroll with currency formatting, Employee Count, Class Code, EMod, Schedule Rating). "Calculate Quote" logs form state to console. Redirects to `/marketplace` if accessed without route state.

### Legacy Pages (Light Theme)
Sidebar layout (`AppLayout.tsx`) with 12 navigation items at `/organizations`, `/deals`, `/policies`, etc.

## Running the App

Both frontend and backend start via their respective workflows:
- **Frontend**: `pnpm --filter @workspace/axel-workforce-os run dev` (Vite dev server)
- **Backend**: `pnpm --filter @workspace/api-server run dev` (Express server)

## GitHub

Repository: https://github.com/Beaxai/axel-workforce-os (main branch)
