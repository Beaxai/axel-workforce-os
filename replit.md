# Axel Workforce OS

## Overview

Full-stack workforce management platform built with a pnpm workspace monorepo using TypeScript.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React 18 + Vite + Tailwind CSS
- **Backend**: Express 5 with helmet, morgan, cors, socket.io
- **Database**: PostgreSQL + Drizzle ORM
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
│   ├── migrations/            # SQL migration files
│   └── seed/                  # Seed data files
├── docs/                      # Documentation
├── scripts/                   # Utility scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## Running the App

Both frontend and backend start via their respective workflows:
- **Frontend**: `pnpm --filter @workspace/axel-workforce-os run dev` (Vite dev server)
- **Backend**: `pnpm --filter @workspace/api-server run dev` (Express server)

## Backend Packages

express, typescript, @supabase/supabase-js, zod, jsonwebtoken, cors, helmet, morgan, dotenv, socket.io, bullmq

## Frontend Packages

react, react-dom, react-router-dom, typescript, tailwindcss, @supabase/supabase-js, zustand, @tanstack/react-query, react-hook-form, zod, lucide-react, recharts, socket.io-client

## Packages

### `artifacts/axel-workforce-os` (`@workspace/axel-workforce-os`)

React + Vite frontend for Axel Workforce OS. Uses react-router-dom for routing, Tailwind CSS for styling, and zustand for state management.

- Entry: `src/main.tsx`
- App: `src/App.tsx` — BrowserRouter with routes
- Pages: `src/pages/` — Dashboard and other pages
- Components: `src/components/` — UI components (shadcn/ui based)

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server with helmet, morgan, cors. Routes live in `src/routes/`.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App setup: `src/app.ts` — mounts middleware and routes at `/api`
- Routes: `src/routes/index.ts` mounts sub-routers; `src/routes/health.ts` exposes `GET /healthz`
- Depends on: `@workspace/db`, `@workspace/api-zod`

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL.

### `lib/api-spec` (`@workspace/api-spec`)

OpenAPI 3.1 spec and Orval codegen config. Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client from the OpenAPI spec.
