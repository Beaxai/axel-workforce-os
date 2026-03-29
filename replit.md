# Axel Workforce OS

## Overview

Full-stack workforce management platform built with a pnpm workspace monorepo using TypeScript. Covers organizations, deals/pipeline, policies, CRM, workforce management, agent registration, rate tables, implementation tracking, commissions, and onboarding. Features 8 role-based party environment dashboards with a dark glassmorphism design system.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React 18 + Vite + Tailwind CSS
- **Backend**: Express 5 with helmet, morgan, cors, socket.io
- **Database**: PostgreSQL (28 tables) + Drizzle ORM
- **State Management**: Zustand (auth store persisted to localStorage)
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

28 tables provisioned in PostgreSQL:

- **Core**: organizations, users, org_members
- **Deals/Pipeline**: deals, quotes
- **Policies/AMS**: policies, commissions, policy_documents
- **CRM**: contacts, notes, tasks, task_library, activity_log
- **Email**: deal_email_addresses, deal_inbound_emails, task_send_log
- **Implementation**: implementation_trackers, implementation_phases, implementation_tasks
- **Agent Registration**: agent_registrations, agent_compliance
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

## Authentication & Role System (Phase 3)

Auth is managed via Zustand store (`auth-store.ts`) persisted to localStorage.
- **Login page** at `/login` — role selector with 8 party types
- **ProtectedRoute** component guards dashboard routes
- **Role switcher** in sidebar allows switching between all 8 roles

### Party Types & Dashboard Routes

| Role | Route | Description |
|------|-------|-------------|
| Admin | `/dashboard/admin` | Full platform access — orgs, deals, pipeline, agents, UW queue |
| Underwriter | `/dashboard/underwriter` | Deal review, bound policies, rate tables |
| CSA | `/dashboard/csa` | Client servicing, active policies, renewals, tasks |
| Agent | `/dashboard/agent` | Deal submissions, commissions, clients |
| Employer | `/dashboard/employer` | Policy view, claims, payroll/billing, PEO onboarding |
| Carrier | `/dashboard/carrier` | Bound business, claims, performance summary |
| PEO Partner | `/dashboard/peo` | PEO clients, workforce data, billing |
| Vendor | `/dashboard/vendor` | Assigned tasks, documents, completion tracking |

### Design System

- **Background**: `#060608` (near-black)
- **Card/Panel**: `rgba(255,255,255,0.04)` with `1px border rgba(255,255,255,0.08)`
- **Accent**: `#E91E8C` (magenta/pink) for CTAs, active states, badges
- **Secondary accent**: `rgba(233,30,140,0.15)` for hover states
- **Font**: Inter (400, 500, 600, 700)
- **Sidebar**: 240px fixed
- **Top nav**: 56px fixed
- **Card border-radius**: 12px
- **Glassmorphism**: `backdrop-filter: blur(12px)`

### Key Frontend Components

- `DashboardLayout.tsx` — Dark-themed layout with role-specific sidebar + top nav
- `AppLayout.tsx` — Original light-themed layout (legacy pages at `/organizations`, `/deals`, etc.)
- `GlassCard.tsx` — Reusable glassmorphism card component
- `StatCard.tsx` — Metric stat card with icon + optional trend
- `ProtectedRoute.tsx` — Auth + role guard wrapper

## Frontend Pages

### Dashboard Pages (Dark Theme)
8 role-based dashboards under `/dashboard/{role}`, each with role-specific stat cards, data panels, and quick actions.

### Legacy Pages (Light Theme)
Sidebar layout (`AppLayout.tsx`) with 12 navigation items:
- Dashboard, Organizations, Deals/Pipeline, Policies, Contacts, Employees
- Tasks, Commissions, Agent Registration, Rate Tables, Implementation, Workforce

All pages use React Query for data fetching. Create forms on Organizations, Deals, Contacts, and Employees pages.

## Running the App

Both frontend and backend start via their respective workflows:
- **Frontend**: `pnpm --filter @workspace/axel-workforce-os run dev` (Vite dev server)
- **Backend**: `pnpm --filter @workspace/api-server run dev` (Express server)

## GitHub

Repository: https://github.com/Beaxai/axel-workforce-os (main branch)
