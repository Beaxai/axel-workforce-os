# Axel Workforce OS

## Overview

Axel Workforce OS is a full-stack workforce management platform designed to optimize operations within the insurance and PEO industries. It provides comprehensive solutions for managing organizations, deals, policies, CRM, workforce, agent registrations, rate tables, implementation tracking, commissions, and onboarding. The platform features eight role-based dashboards, a dark glassmorphism design system, and an AppShell layout with light/dark mode toggles. Its primary goal is to offer a unified and efficient system for lead generation, policy binding, client onboarding, and account management, serving administrators, underwriters, agents, employers, carriers, and PEO partners.

## User Preferences

I prefer detailed explanations.
I want iterative development.
Ask before making major changes.
When I ask for a report, give it to me directly in chat inside a single copy-friendly Markdown code block (do not build in-app report pages).

## System Architecture

The project is structured as a pnpm workspace monorepo, utilizing TypeScript.

**Technology Stack:**
- **Monorepo:** pnpm workspaces
- **Frontend:** React 18, Vite, Tailwind CSS
- **Backend:** Express 5 (with helmet, morgan, cors, socket.io)
- **Database:** PostgreSQL with Drizzle ORM
- **State Management:** Zustand (authentication, theme, persisted)
- **Data Fetching:** @tanstack/react-query
- **Forms:** react-hook-form with Zod
- **Real-time:** socket.io / socket.io-client
- **API Codegen:** Orval (from OpenAPI spec)

**Project Structure:**
The monorepo contains `api-server` (Express backend) and `axel-workforce-os` (React frontend), along with shared libraries for API specifications, generated API clients, Zod schemas, and Drizzle ORM configurations.

**Cannabis WC Application (`@workspace/cannabis-application`):**
A canonical schema (Zod) capturing every question on the Axel Cannabis WC 2026 PDF, plus AcroForm field-name mappings to the ACORD 130 and Trean Cannabis Supplemental templates in `Server/data/`. Storage is stateless — only the canonical answers JSON lives in `submission_answers.answers`; filled PDFs are generated on demand by the api-server using `pdf-lib`.

API endpoints:
- `POST /api/submission/submit-for-approval` — accepts `cannabisApplicationAnswers`, validates with the lib's Zod schema, persists, and registers three `deal_documents` rows (axel_cannabis_application, acord_130, trean_cannabis_supp) pointing at the streaming routes below.
- `GET /api/submission/applications/:dealId` — returns the parsed answers + PDF link metadata.
- `GET /api/submission/applications/:dealId/axel-cannabis-application.pdf` — streams the Axel Cannabis WC Application 2026 source PDF (currently unfilled — the source template's 481 AcroForm fields are auto-named "Text Field N" and require per-field coordinate analysis to map; tracked as a follow-up).
- `GET /api/submission/applications/:dealId/acord-130.pdf` — streams the filled ACORD 130.
- `GET /api/submission/applications/:dealId/trean-supp.pdf` — streams the filled Trean Cannabis Supp.

UI surfaces:
- `FinalSubmission.tsx` (quote flow) builds the canonical payload with `fromQuoteFlow()` from the quote-flow Zustand store and POSTs it.
- `DealCardModal.tsx` (pipeline) renders a "WC Application" section with PDF download buttons + a section-grouped answer summary, gated on whether the application data exists for that deal.

**Database Schema:**
The PostgreSQL database consists of 29 tables covering Core, Deals/Pipeline, Policies/AMS, CRM, Email, Implementation, Partners/Network, Resources, Agent Registration, Rate Tables, Workforce, and Onboarding.

**API Design:**
The Express API server provides RESTful endpoints for CRUD operations across various entities and includes specific functionalities for implementation tracking, workforce summaries, and global search. All API routes are mounted at `/api`.

**Authentication and Role System:**
Authentication is managed via a Zustand store, supporting eight distinct party types (Admin, Underwriter, CSA, Agent, Employer, Carrier, PEO Partner, Vendor). Role-based access control is enforced, and a role switcher is available.

**UI/UX and Design System:**
The platform enforces a strict design system:
- **Default Theme:** Dark mode (dark canvas `#060608`).
- **Accent System (two-tier):** Pink `#E91E8C` is the **primary interactive accent** (links, focus rings, selected/active states, the active nav indicator bar, selected tab underlines, View All / ghost actions, loading, progress bars, filter/tab pills, checkboxes). Purple `#7C3AED` is the **supporting accent** (icon chips, the AxelBadge `purple` variant, the secondary chart series, and category/role distinctions such as the non-ASO deal-card border and the ADMIN role label). **ALL primary action buttons** (Approve, Submit, Save, Confirm, Invite, New Deal, Sign In, etc.) render the `--gradient-cta` purple→pink gradient — this is the ONLY permitted gradient and it is no longer limited to one per screen. `PrimaryButton`/`PinkButton` render it by default. Solid pink is reserved for non-button accents (progress fills, active pills, checkboxes, indicators). No other gradients are allowed.
- **Tokens:** All accent values come from CSS variables in `src/index.css` (`--accent-primary`, `--accent-primary-hover`, `--accent-primary-focus`, `--accent-primary-soft`, `--accent-support`, `--accent-support-hover`, `--accent-support-soft`, `--gradient-cta`) and are mirrored in `src/lib/use-theme-colors.ts` for the JS styling path. shadcn HSL tokens (`--primary`, `--ring`, `--sidebar-primary`, `--sidebar-ring`, `--chart-1`) are repointed to pink, and `--chart-2` to purple (secondary series). Charts drive their palette from the `--chart-*` tokens via `hsl(var(--chart-N))`. The only allowed raw accent hex literals outside the two token files are purple (`#7C3AED`/`#6D28D9`, e.g. the AxelBadge color map and categorical product colors) and `#1E6BE9` (categorical WC blue); pink literals live exclusively in the two token files and the AxelBadge color map.
- **Glassmorphism Modals:** Overlay uses `rgba(0,0,0,0.5)` (dark tint only, no blur); popup panels use `rgba(18,18,24,0.82)` background with `backdrop-filter: blur(40px)`, `box-shadow: 0 24px 80px rgba(0,0,0,0.6)`, and `inset 0 1px 0 rgba(255,255,255,0.06)` highlight.
- **Typography:** Open Sans (body/labels via `--app-font-sans`), Jost all-caps for section subheadings (`--app-font-heading`, `.font-heading` utility class). Base font-size: 15px.
- **Layout:** Main content centered with `maxWidth: 1280px`, `margin: 0 auto`, padding `32px 40px`.
- **Components:** A custom component library provides reusable UI elements adhering to the design system.

**Theming & Definition of Done (light + dark):**
The app supports dark (default) and light modes. The `.dark`/`.light` class is set on
`document.documentElement` (in `AppShell.tsx`) from the persisted Zustand theme store,
so any inline style using `var(--token)` re-resolves automatically when the toggle
flips. There are two theming paths that MUST stay in sync: the CSS variables in
`src/index.css` (`:root` = light, `.dark` = dark) and their JS mirror in
`src/lib/use-theme-colors.ts`. Form surfaces and text use dedicated tokens
(`--input-bg`, `--input-border`, `--input-text`, `--input-placeholder`,
`--input-bg-focus`, `--input-border-focus`, `--label-text`, `--section-heading`).
**Definition of Done:** every new view or component must be verified in BOTH light and
dark mode before a phase closes — all phase acceptance tests implicitly include
light-mode rendering. Never hardcode dark color literals (hex/rgba) in components;
consume the tokens above (via `useThemeColors()` or `var(--…)`). The only permitted raw
accent literals outside the token files remain pink/purple brand hexes, `#1E6BE9`, and
`#ef4444` error red.

**Layouts:**
- **AppShell.tsx:** Main dashboard layout with a collapsible sidebar and top header.
- **ProtectedRoute.tsx:** Handles authentication and role-based access.

**Key Features:**
- **Role-based Dashboards:** Eight tailored dashboards for specific user roles.
- **Pipeline Management:** 8-stage Kanban board with drag-and-drop for deals.
- **Deal Card Modal:** Detailed full-screen modal for deal interaction, including activities, tasks, and editable details.
- **Accounts Management:** Listing, search, filtering, and detailed views for accounts.
- **Implementation Tracking:** Dual-tab view for WC Bind Journey and PEO/ASO Onboarding with progress trackers.
- **Network Management:** Multi-tab partner directory for various partner types.
- **Agent Registration:** Public multi-step registration with administrative approval workflows.
- **Resources Library:** Searchable and filterable library of guides and templates.
- **Global Search:** Integrated search across deals, accounts, partners, and resources.
- **Client Progressive Unlock:** Dedicated views for employers to manage programs and track onboarding.
- **Marketplace:** Vertical-specific marketplace for initiating quotes, with 11 industry verticals.
- **Two-Phase Quote Wizard:** Multi-step wizard for fast indication and full proposal generation, managing state via Zustand.
- **Rate Table Ingestion (R.1):** BIC.csv rate table ingestion system with admin UI for lookup and browsing.
- **Rating Engine (R.2):** Server-side engine for calculating WC and WFS premiums, saving breakdowns to the `quotes` table.
- **Rating Engine UI (R.3):** Full quote-to-deal flow, live API calls, proposal display, and "Save as Deal" functionality.
- **Underwriting Submission Engine (S.1):** Vertical-aware submission system with dynamic question sets, loss history upload, and document generation (Application Summary, Rate Indication).
- **Proposal System (S.2):** Lifecycle management for proposals, including auto-generation from quotes, pricing cards, policy details, and underwriting package assembly.
- **Bind & Signature System (S.3):** HelloSign integration (stubbed) for e-signatures, webhook handling, UW file viewer, and status tracking for bind packages.
- **Underwriting Appetite Engine (S.5):** Ingestion and determination system for underwriting appetite data, integrating badges and filters into deal cards, pipelines, and quote flows.
- **Workforce Profile Widget (S.4):** Rich multi-location workforce profile widget replacing Step2ClassCodes in the quote wizard. Features summary cards (locations/employees/payroll), AI Class Code Advisor (Anthropic-powered), LocationCard components with inline appetite badges, and a multi-location rating engine endpoint (`POST /api/rate/wc/multi`). Profile data stored as JSONB in the `quotes.workforce_profile` column.
- **Hazometer (ExMod Gauge):** Interactive SVG speedometer gauge on Step3 (Experience Rating) that visualizes the experience modification factor. Green/yellow/orange/red arc segments with an animated needle, rating labels (Excellent → High Risk), and smooth easing transitions. Component: `src/components/quote-flow/Hazometer.tsx`.

## External Dependencies

- **PostgreSQL:** Primary database.
- **Socket.IO:** Real-time communication.
- **GitHub:** Project repository.
- **HelloSign (stubbed):** For e-signatures (requires API key for live use).
- **Anthropic AI (via Replit Integrations):** Powers the AI Class Code Advisor in the Workforce Profile widget.
- **Calendly (planned):** For onboarding call scheduling.