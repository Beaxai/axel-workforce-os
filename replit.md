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

- **Underwriting Submission Engine (Phase S.1):** Vertical-aware underwriting submission system. Database tables: `submission_question_sets`, `submission_questions`, `submission_answers`, `form_field_mappings`, `loss_history_documents`, `bind_document_packages`, `deal_documents`. Deals table extended with `vertical_id`, `has_prior_coverage`, `submission_status`. Cannabis question set seeded with 48 questions across 5 sections (Business Information, Cannabis Operations, Locations, Safety & Risk, Loss History). Supports conditional questions. API routes: `GET /api/submission/question-set/:verticalId`, `GET/POST /api/submission/answers/:dealId`, `POST /api/submission/request-bind/:dealId`, `POST /api/submission/submit-for-approval` (creates deal + generates document records), `GET /api/submission/deal-documents/:dealId`, `GET /api/loss-history/:dealId`, `POST /api/loss-history/:dealId/upload`, `DELETE /api/loss-history/:dealId/:docId`. Frontend: `SubmissionFlow.tsx` (full-screen overlay with dynamic sections, auto-save, validation), `LossHistoryUpload.tsx` (drag-and-drop PDF upload), `RequestBindButton.tsx` (bind request with status). Page at `/submission?dealId=&verticalId=&dealName=`. Accessible to ADMIN, CSA, AGENT, UNDERWRITER roles. Loss History upload step integrated into Phase 2 wizard before Final Review. "Submit for Approval" creates a deal, generates submission documents (Application Summary, Rate Indication, Coverage Verification, Loss History Bundle), and stores them for display in the Deal Card Modal's Documents section. `DealCardModal.tsx` Documents section fetches and displays generated docs with pink file icons and document type labels. "Complete Application" button in DealCardModal header links to the submission page.

- **Proposal System (Phase S.2):** Full proposal lifecycle from quote data. Database tables: `proposals` (pricing snapshot, policy metadata, UW notification tracking, status flow: draft → sent_to_client → approved_proposal_requested → underwriting_notified → accepted/declined), `underwriting_packages` (document assembly, email tracking). Deals table extended with `proposal_status`. API routes: `POST /api/proposals` (create), `GET /api/proposals/:dealId` (get latest), `POST /api/proposals/:dealId/create-from-quote` (auto-generate from quote data), `POST /api/proposals/:proposalId/request-approved-proposal` (trigger UW package assembly), `GET /api/proposals/:proposalId/uw-package-status` (poll status). Frontend: `ProposalTab.tsx` component (embedded in SubmissionPage as 4th tab), `ProposalTabInline` in DealCardModal (3rd tab "Proposal"). ProposalScreen standalone page at `/proposal?dealId=`. Features: Generate Proposal from Quote button, pricing cards (WC Annual/Monthly, WFS PEPM, Total Monthly/Annual), policy details, rating breakdown (collapsible JSON), status badges, Request Approved Proposal CTA with UW package polling. UW package assembly: collects proposal, submission answers, loss history docs, deal documents. Schema in `lib/db/src/schema/proposals.ts`.

- **Bind & Signature System (Phase S.3):** HelloSign bind package signature flow with UW file viewer, webhook handler, and deal card bind status. Database tables: `signature_requests` (HelloSign lifecycle tracking: pending → awaiting_signature → partially_signed → signed → declined/expired, signers array, webhook events log, signed documents path), `uw_file_views` (audit trail for document views). Deals extended with `bind_status` (not_started → bind_requested → sent_for_signature → partially_signed → signed → bound), `bound_at`, `signed_documents_path`. Bind_document_packages extended with `signature_request_id`, `hellosign_signature_request_id`. Backend: HelloSign service (stubbed — no real API key yet) at `artifacts/api-server/src/services/helloSignService.ts`. Webhook handler at `/webhooks/hellosign` (registered before express.json() for raw body access). API routes: `POST /api/signatures/send/:bindPackageId`, `GET /api/signatures/:dealId`, `GET /api/signatures/:dealId/signed-url`, `POST /api/signatures/:dealId/resend`, `POST /api/documents/signed-url`, `POST /api/documents/log-view`, `GET /api/documents/bind-package/:dealId`, `GET /api/bind-packages/:dealId` (alias). Frontend: `BindStatusPanel.tsx` (6-stage progress tracker with signer status, send-for-signature CTA), `UwFileViewer.tsx` (categorized document browser with signature status panel, collapsible categories). Integrated into DealCardModal as 4th "Bind" tab and SubmissionPage "Bind Request" tab (alongside RequestBindButton). Schema in `lib/db/src/schema/signatures.ts`. Env vars needed for production: `HELLOSIGN_API_KEY`, `HELLOSIGN_CLIENT_ID`, `HELLOSIGN_WEBHOOK_SECRET`, `HELLOSIGN_TEST_MODE`.

- **Underwriting Appetite Engine (Phase S.5):** Appetite data ingestion and underwriting determination system. Database table: `appetite` (state, class_code, description, base_rate, uw_determination, uw_considerations, UNIQUE(state, class_code)). Ingestion script at `scripts/src/ingest-appetite.ts` (xlsx bulk upsert in batches of 500). API routes: `GET /api/appetite` (paginated list with state/determination/search filters), `GET /api/appetite/:state/:classCode` (single lookup), `POST /api/appetite/batch` (batch lookup). Frontend: `AppetiteBadge.tsx` (4 determination colors: Acceptable=green, Referral=amber, Conditional=blue, Ineligible=red, with hover tooltip for UW considerations). Integrated into: DealCardModal right column ("Underwriting Appetite" panel fetches by deal state + class code), Pipeline page (appetite filter chips: All/Acceptable/Referral/Conditional/Ineligible), Quote flow Step2ClassCodes (inline badges next to each class code row), AppetiteGuide page at `/resources/appetite` (searchable/filterable/paginated table). Underwriter nav updated with Resources link. Schema in `lib/db/src/schema/appetite.ts`.

## External Dependencies

- **PostgreSQL:** Primary database for all application data.
- **Socket.IO:** Used for real-time communication between the frontend and backend.
- **GitHub:** Project repository is hosted on GitHub.
- **HelloSign (stubbed):** For bind document e-signatures. Service stubbed — requires `HELLOSIGN_API_KEY` for live signing.
- **Calendly (planned):** For onboarding call scheduling in agent registration.