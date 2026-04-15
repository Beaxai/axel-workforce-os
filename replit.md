# Axel Workforce OS

## Overview

Axel Workforce OS is a full-stack workforce management platform designed to optimize operations within the insurance and PEO industries. It provides comprehensive solutions for managing organizations, deals, policies, CRM, workforce, agent registrations, rate tables, implementation tracking, commissions, and onboarding. The platform features eight role-based dashboards, a dark glassmorphism design system, and an AppShell layout with light/dark mode toggles. Its primary goal is to offer a unified and efficient system for lead generation, policy binding, client onboarding, and account management, serving administrators, underwriters, agents, employers, carriers, and PEO partners.

## User Preferences

I prefer detailed explanations.
I want iterative development.
Ask before making major changes.

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

**Database Schema:**
The PostgreSQL database consists of 29 tables covering Core, Deals/Pipeline, Policies/AMS, CRM, Email, Implementation, Partners/Network, Resources, Agent Registration, Rate Tables, Workforce, and Onboarding.

**API Design:**
The Express API server provides RESTful endpoints for CRUD operations across various entities and includes specific functionalities for implementation tracking, workforce summaries, and global search. All API routes are mounted at `/api`.

**Authentication and Role System:**
Authentication is managed via a Zustand store, supporting eight distinct party types (Admin, Underwriter, CSA, Agent, Employer, Carrier, PEO Partner, Vendor). Role-based access control is enforced, and a role switcher is available.

**UI/UX and Design System:**
The platform enforces a strict design system:
- **Default Theme:** Dark mode.
- **Accent Color:** `#E91E8C` (solid pink, no gradients).
- **Glassmorphism Modals:** Overlay uses `rgba(0,0,0,0.5)` (dark tint only, no blur); popup panels use `rgba(18,18,24,0.82)` background with `backdrop-filter: blur(40px)`, `box-shadow: 0 24px 80px rgba(0,0,0,0.6)`, and `inset 0 1px 0 rgba(255,255,255,0.06)` highlight.
- **Typography:** Open Sans (body/labels via `--app-font-sans`), Jost all-caps for section subheadings (`--app-font-heading`, `.font-heading` utility class). Base font-size: 15px.
- **Layout:** Main content centered with `maxWidth: 1280px`, `margin: 0 auto`, padding `32px 40px`.
- **Components:** A custom component library provides reusable UI elements adhering to the design system.

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