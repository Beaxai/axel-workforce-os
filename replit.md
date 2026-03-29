# Axel Workforce OS

## Overview

Full-stack workforce management platform built with a pnpm workspace monorepo using TypeScript. Covers organizations, deals/pipeline, policies, CRM, workforce management, agent registration, rate tables, implementation tracking, commissions, and onboarding.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React 18 + Vite + Tailwind CSS
- **Backend**: Express 5 with helmet, morgan, cors, socket.io
- **Database**: PostgreSQL (28 tables) + Drizzle ORM
- **State Management**: Zustand
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

## Frontend Pages

Sidebar layout (`AppLayout.tsx`) with 12 navigation items:
- Dashboard (live counts from all entities)
- Organizations, Deals/Pipeline, Policies, Contacts, Employees
- Tasks, Commissions, Agent Registration, Rate Tables
- Implementation, Workforce

All pages use React Query for data fetching. Create forms on Organizations, Deals, Contacts, and Employees pages.

## Running the App

Both frontend and backend start via their respective workflows:
- **Frontend**: `pnpm --filter @workspace/axel-workforce-os run dev` (Vite dev server)
- **Backend**: `pnpm --filter @workspace/api-server run dev` (Express server)

## GitHub

Repository: https://github.com/Beaxai/axel-workforce-os (main branch)
