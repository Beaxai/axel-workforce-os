# Axel Workforce OS

## Overview

Axel Workforce OS is a full-stack workforce management platform designed to streamline operations for various stakeholders in the insurance and PEO (Professional Employer Organization) industries. Built as a pnpm workspace monorepo using TypeScript, it offers comprehensive solutions for managing organizations, deals, policies, CRM activities, workforce, agent registrations, rate tables, implementation tracking, commissions, and onboarding processes. The platform features eight role-based dashboards, each utilizing a dark glassmorphism design system, an AppShell layout with a collapsible sidebar, and light/dark mode toggles. Its primary purpose is to provide a unified and efficient system for all aspects of workforce management, from lead generation and policy binding to client onboarding and ongoing account management, targeting a diverse user base including administrators, underwriters, agents, employers, carriers, and PEO partners.

## User Preferences

I prefer detailed explanations.
I want iterative development.
Ask before making major changes.

## System Architecture

The project is structured as a pnpm workspace monorepo.

**Technology Stack:**
- **Monorepo Tool:** pnpm workspaces
- **Node.js:** 24
- **Package Manager:** pnpm
- **TypeScript:** 5.9
- **Frontend:** React 18, Vite, Tailwind CSS
- **Backend:** Express 5 with helmet, morgan, cors, socket.io
- **Database:** PostgreSQL (29 tables) with Drizzle ORM
- **State Management:** Zustand (for authentication and theme, persisted to localStorage)
- **Data Fetching:** @tanstack/react-query
- **Forms:** react-hook-form with Zod
- **Icons:** lucide-react
- **Charts:** recharts
- **Real-time:** socket.io / socket.io-client
- **Validation:** Zod (`zod/v4`), `drizzle-zod`
- **API Codegen:** Orval (from OpenAPI spec)
- **Build:** esbuild (CJS bundle for server), Vite (frontend)

**Project Structure:**
The monorepo includes `api-server` (Express backend) and `axel-workforce-os` (React frontend), along with shared libraries for API specifications, generated API clients, Zod schemas, and Drizzle ORM configurations.

**Database Schema:**
The PostgreSQL database comprises 29 tables categorized into Core, Deals/Pipeline, Policies/AMS, CRM, Email, Implementation, Partners/Network, Resources, Agent Registration, Rate Tables, Workforce, and Onboarding. Drizzle ORM schema files are organized by domain.

**API Design:**
The Express API server exposes RESTful endpoints for CRUD operations across various entities such as organizations, users, deals, policies, commissions, accounts, partners, and resources. It also includes specific endpoints for implementation tracking, workforce summaries, and a global search functionality. All API routes are mounted at `/api`.

**Authentication and Role System:**
Authentication is managed via a Zustand store persisted in localStorage. The system supports eight distinct party types (Admin, Underwriter, CSA, Agent, Employer, Carrier, PEO Partner, Vendor), each with specific dashboard routes and navigation items. A `ProtectedRoute` component guards access based on user roles, and a role switcher allows users to change roles within the application.

**UI/UX and Design System:**
A strict design system is enforced:
- **Background:** `#060608` (dark), `#f4f4f5` (light). Dark mode is default.
- **Accent Color:** `#E91E8C` (solid pink), used exclusively as an accent. No gradients are allowed.
- **Glass Panels:** `rgba(255,255,255,0.05)` background, `backdrop-filter: blur(12px)`, `border: 1px solid rgba(255,255,255,0.08)`, `border-radius: 12px`.
- **Typography:** White primary, `rgba(255,255,255,0.5)` secondary/muted in dark mode.
- **Theme:** A light/dark mode toggle is available, with the accent color remaining consistent.

**Core UI Components:**
A custom component library (`/components/ui/`) provides reusable UI elements adhering to the design system, including `GlassCard`, `PinkButton`, `GhostButton`, `StatTile`, `SectionHeader`, `AxelBadge`, `AxelModal`, and `AxelTooltip`.

**Layouts:**
- **AppShell.tsx:** The main dashboard layout featuring a collapsible left navigation, top header, and scrollable content area.
- **ProtectedRoute.tsx:** Handles authentication and role-based access.

**Key Features:**
- **Role-based Dashboards:** Eight distinct dashboards tailored to specific user roles, each leveraging the common UI components and AppShell layout.
- **Pipeline Management:** An 8-stage Kanban board for tracking deals, supporting drag-and-drop functionality to update deal stages.
- **Deal Card Modal:** A detailed, full-screen modal for viewing and interacting with deal information, including activity feeds, tasks, editable details, and document placeholders.
- **Accounts Management:** Features account listing with search and filters, and detailed account views showing associated deals, policies, and activity logs.
- **Implementation Tracking:** Dual-tab view for WC Bind Journey and PEO/ASO Onboarding, with progress trackers and phase advancement capabilities.
- **Network Management:** A multi-tab partner directory for Agents, Carriers, PEO Partners, and Vendors, supporting partner details and administrative actions.
- **Agent Registration:** A public multi-step registration process for agents, with administrative workflows for approval and onboarding.
- **Resources Library:** A searchable and filterable library of resources (guides, templates, forms), with admin capabilities for adding and deleting resources.
- **Global Search:** An integrated search functionality accessible from the AppShell header, capable of searching across deals, accounts, partners, and resources.
- **Client Progressive Unlock:** Dedicated views for employers to manage their program (`/my-program`) and track onboarding progress (`/my-program/onboarding`).
- **Marketplace:** A vertical-specific marketplace for initiating quotes, accessible to Admin and CSA roles. 11 vertical cards (Cannabis, Staffing, Construction, Healthcare, Technology, Trucking, Manufacturing, Restaurant/Hospitality, Ambulances, Garbage/Waste, High EMod, All Other Industries).
- **Two-Phase Quote Wizard:** Full multi-step quote wizard at `/marketplace/quote/wizard`. Phase 1 (Fast Indication): 4 steps — Business Details, Class Codes & Payroll (repeatable locations/class codes), Experience Modifier, Pricing Indication Screen (two-column layout with rate card, coverage highlights, and "Request Proposal" CTA). Phase 2 (Full Proposal): 7+ steps — Applicant Details, Coverage History, General Information (24 UW questions), Cannabis Operations, Safety & Premises, Extraction (conditional on Cannabis ops), Auto Exposure (conditional on Delivery ops), Final Submission, and Confirmation Screen. State managed by Zustand store (`lib/quote-flow-store.ts`). Shared form components in `components/quote-flow/FormFields.tsx`. Flow: Marketplace → ServiceTypeSelect → QuoteWizard.
- **Rate Table (R.1):** BIC.csv rate table ingestion system. `wc_rates` DB table with unique constraint on (state, class_code, effective_date). Admin rate lookup UI at `/admin/rates` with state/class code lookup, stats tiles, and paginated rate browser. Import script at `scripts/importBIC.js`. Server-side utility at `artifacts/api-server/src/utils/getWCRate.ts`. SQL function `get_wc_rate(state, classCode)` returns most recent rate. API routes: `/api/wc-rates` (paginated browse), `/api/wc-rates/stats`, `/api/wc-rates/lookup`. 24,824 rates imported across 46 states.
- **Rating Engine (R.2):** Server-side rating engine at `artifacts/api-server/src/utils/ratingEngine.ts`. Two functions: `calculateWCPremium` (base rate × payroll/100 × eMod × scheduleRating, $500 minimum premium, 10% PEO discount) and `calculateWFSPEPM` (2% annual fee / 12 / headcount). API routes: `POST /api/rate/wc` and `POST /api/rate/wfs`. Saves rating breakdowns to `quotes` table. Validation: eMod 0.5-2.0, scheduleRating 0.5-2.0, valid state codes. Test suite at `scripts/testRatingEngine.js` (16/16 passing).
- **Rating Engine UI (R.3):** Full quote-to-deal flow. `QuoteNew.tsx` at `/marketplace/quote/new` calls live `/api/rate/wc` and `/api/rate/wfs` endpoints. Shared `ProposalPanel.tsx` component shows WC and PEO+WC proposal breakdowns with final premium in bold pink. "Save as Deal" creates deal + quote records and shows toast with Pipeline link. `DealCardModal.tsx` has Activity & Quote tabs; Quote tab shows saved rating breakdown in read-only ProposalPanel with Requote button (prefills form). Pipeline cards show live premium or "Pending Quote". API route `GET /api/quotes/by-deal/:dealId` added.

## External Dependencies

- **PostgreSQL:** Primary database for all application data.
- **Socket.IO:** Used for real-time communication between the frontend and backend.
- **GitHub:** Project repository is hosted on GitHub.
- **HelloSign (planned):** For agreement signing in agent registration.
- **Calendly (planned):** For onboarding call scheduling in agent registration.