<!--
  AUTHORITATIVE TRUTH DOCUMENT #1 — Axel Workforce OS Project State Document v2.1.
  Faithful TEXT EXTRACTION of the owner's master .docx (owned by Curtis Prince / Beax.ai,
  "Updated June 10, 2026"), checked into the repo on 2026-06-22 so code can be diffed against it.
  The master .docx in Curtis's project knowledge base remains canonical; tables here are linearized
  by the extraction. If this text ever disagrees with Curtis's current .docx, the .docx wins.
  Governance: see CLAUDE.md -> "Source of truth". Pairs with docs/PROJECT_INSTRUCTIONS.md.
-->

AXEL WORKFORCE OS
Project State Document — v2.1
Beax.ai / Axel Workforce Solutions  |  Updated June 10, 2026  |  Supersedes March 2026 and June 9 v2 versions
Prepared for engineering handoff to Brendan (Lead Stack Engineer). This document is the single source of truth for platform state, architecture decisions, design system, and active work orders.
1. PROJECT OVERVIEW
Field
Detail
Platform Name
Axel Workforce OS
Owner / Client
Curtis Prince (CEO, Axel Workforce Solutions / Beax.ai)
Lead Engineer
Brendan — owns the Replit build going forward
Dev Vehicle
Beax.ai
Build Status
Active build in Replit + Claude Code; front-of-house functional, back-of-house stubbed (see Section 4)
Multi-party, AI-enabled marketplace delivering workers&apos; compensation (WC) insurance and PEO/human capital services through a dual quote-to-bind path. Four product types: WC Only, PEO, ASO, ASO+Captive. First PEO program: Kind PEO Program (cannabis vertical).
2. CONFIRMED TECH STACK (UPDATED — BINDING DECISIONS)
Layer
Technology
Status
Frontend
React 18 + Vite + TypeScript + Tailwind
Live
Backend
Node.js + Express 5 (39 route files)
Live
Database
Replit-managed PostgreSQL + Drizzle ORM (PERMANENT — Supabase removed from spec)
Live — 43 tables
Monorepo
pnpm workspaces (artifacts/ + lib/)
Live
API contract
OpenAPI spec → Orval-generated React Query hooks + Zod schemas
Live
Hosting (prod)
Railway
Planned
IDE / Build
Replit + Claude Code
Live
AI
Anthropic API (Class Code Advisor live, claude-haiku-4-5, cached)
Live
E-Signature
HelloSign / Dropbox Sign
Stubbed (no API key)
Email
Nodemailer declared
Absent — not wired
File storage (future)
S3 or Cloudflare R2 (doc vault, attachments)
Not built
Key architecture decision (June 2026)
Replit PostgreSQL + Drizzle is the permanent database foundation. Supabase was in the original spec but the build diverged; after evaluation, the decision is to stay on plain Postgres permanently. Consequences: authentication is built in Express (Phase 3.5), authorization lives in API middleware (not RLS), file storage will be S3/R2, realtime via polling/websockets if needed. The legacy supabase/ folder is to be deleted in Phase 3.5. Do not introduce Supabase.
3. DESIGN SYSTEM (UPDATED — D1/D1.1 COMPLETE)
The platform was restyled June 2026 to match the Axel brand website (purple/pink). The old &apos;pink sole accent / no gradients&apos; spec is superseded by the following:
Token system (single source of truth)
All accent colors are defined as CSS variables in src/index.css and mirrored in src/lib/use-theme-colors.ts. No hardcoded accent hex literals are permitted outside token definition files.
Token
Value
Role
--accent-primary
#E91E8C (pink)
PRIMARY interactive: all buttons, links, focus rings, active nav (3px bar), tab underlines, loading states, chart primary series
--accent-primary-hover
#d1187e
Hover state
--accent-primary-focus
#ff4ba6
Dark-mode focus outline
--accent-primary-soft
rgba(233,30,140,0.15)
Pink tints
--accent-support
#7C3AED (purple)
SUPPORTING: icon chip backgrounds, AxelBadge purple variant, chart secondary series
--accent-support-hover
#6D28D9
Hover state
--accent-support-soft
rgba(124,58,237,0.15)
Icon chip fills
--gradient-cta
linear-gradient(135deg, #7C3AED → #E91E8C)
THE ONLY PERMITTED GRADIENT — single primary CTA per view (e.g. Generate Insight, Quote Now, Bind)
Rules
Rationale: Pink is primary because of contrast: #7C3AED is too dark against the #060608 canvas for small interactive elements; pink reads crisply.
Gradient rule: Maximum one gradient CTA visible per view. Gradients remain banned on cards, panels, badges, charts, text, borders, and all other UI elements.
Semantic status colors (unchanged): Green #22c55e / red #ef4444 / yellow #eab308 / blue #3b82f6 / gray #6b7280 (AxelBadge COLOR_MAP). These communicate state, not brand — never repoint them.
Exactly two glass recipes: glass-card (rgba(255,255,255,0.05) bg, blur 12px, 1px border rgba(255,255,255,0.08), radius 12px) and glass-panel (rgba(18,18,24,0.82) bg, blur 40px, 1px border rgba(255,255,255,0.12), radius 16px) — each with light-mode counterparts. The blur-48 one-off was removed.
Unchanged: Canvas #060608 dark / #f4f4f5 light. Inter body (15px base), Jost headings (uppercase, 0.06em tracking). Dark mode default, toggle top-right. Sidebar 280px/64px collapsed, header 56px, content max-width 1280px (marketplace and pipeline full-bleed).
Consolidation done: The shadcn/Tailwind HSL variable system was repointed from template blue (#2563EB/#3B82F6) to the brand palette; --primary/--ring/--sidebar-primary are pink, --chart-1 pink, --chart-2 purple, dark --background is #060608-equivalent (not slate). Legacy duplicate GlassCard deleted; StatCard rebuilt theme-aware; PinkButton renamed PrimaryButton.
4. BUILD STATE (JUNE 2026 AUDIT — VERIFIED AGAINST CODE)
What is genuinely built and data-backed
8 role-based dashboards (ADMIN, UNDERWRITER, CSA, AGENT, EMPLOYER, CARRIER, PEO, VENDOR), role-gated via ProtectedRoute, all wired to live API via React Query
Quote → rate → proposal → pipeline flow with live data (27 deals, 3 quotes, 56 deal documents, 45 activity log entries)
Rating engine: wc_rates 24,820 rows + appetite 25,058 rows ingested; pepm_rates seeded
AI Class Code Advisor live on Anthropic API with caching
62 page files, ~70 ui primitives + Axel custom primitives, design system consolidated (D1/D1.1)
What is stubbed, mocked, or empty (the gap list)
Item
State
Plan
Authentication
MOCKED — client-side role switcher, PLACEHOLDER_USERS, localStorage; users and org_members tables empty; API fully open, no server middleware
Phase 3.5 (active work order)
RBAC
~12 frontend routes lack allowedRoles; zero server-side role checks
Phase 3.5
Email sending
Absent — proposals.ts hardcodes &apos;sent&apos; status; nodemailer unused
Post-3.5 phase
HelloSign
Stubbed — generates stub_ IDs without API key; webhook receiver is real
Needs live API key + test
Axel Cannabis WC PDF
481 auto-named AcroForm fields unmapped (ACORD 130 and Trean Supplemental ARE mapped and filling)
Dedicated mapping task
Policies / AMS subsystem
Schema + pages exist; 0 rows; no flow populates policies, policy_documents, commissions, employees
Phase 5+
Implementations / Onboarding
Schema + pages exist; all 4 tables empty; no trigger flow from Stage 9 (Bound)
Phase 5+
rate_tables table
Dead — superseded by wc_rates/appetite
Drop or ignore
Calendly
Absent (&apos;coming soon&apos; button)
Backlog
Typecheck
9 pre-existing errors
Fixed in Phase 3.5
5. PHASE PLAN (REVISED)
Phase
Scope
Status
P1
Setup, navigation, routing, theme, role switcher
PARTIAL — auth is mock (see 3.5)
P2
Database schema + seed
PARTIAL — 43-table Drizzle schema live, rating data ingested; 25 tables empty; formal seed covers only 4 tables
P3
Eight role-based dashboards
COMPLETE
D1 / D1.1
Design system consolidation + pink-primary/purple-support restyle
COMPLETE (June 2026)
3.5
REAL AUTH + API HARDENING + typecheck cleanup
ACTIVE WORK ORDER — full prompt in Section 6
4A
Accounts module: Leads / Prospects / Clients tabs + account creation from submission flow + backfill
QUEUED — full prompt in Section 7
4C
Deal card Submission Panel: six editable sections, completeness indicators, re-rate flag, account sync
QUEUED — full prompt in Section 8 (runs after 4A)
4B
User profile cards + user management
QUEUED — full prompt in Section 9
P4
Deal Pipeline + Quote Flow remaining gap-closure
After 4-series
P5
Policies/AMS + Implementations/Onboarding flows (Stage 9 triggers)
Backlog — biggest remaining build; may split
P6
Communications live: email sending, HelloSign live key, Cannabis WC 481-field PDF mapping
Backlog
P7
Billing + Commissions
Backlog — launch-ready milestone
Confirmed build order: 3.5 → 4A → 4C → 4B → P4 → P5 → P6 → P7. Launch-ready (quote → propose → bind → onboard → bill end-to-end) at approximately P7.
6. ACTIVE WORK ORDER — PHASE 3.5 (FULL PROMPT)
Paste-ready for Replit/Claude Code. Brendan executes this next.
Phase 3.5 — Real Authentication + API Hardening
Replace the mock authentication system with production-grade auth. The database platform is permanent: Replit PostgreSQL with Drizzle ORM — do not introduce Supabase. Delete the legacy supabase/ folder.
1. Server-side authentication
Session-based auth in the Express API using a maintained library (Lucia or Auth.js for Express — engineer&apos;s call; justify in one paragraph before building)
Email + password login with bcrypt or argon2; sessions stored in PostgreSQL (new sessions table); httpOnly + secure + sameSite cookies
Endpoints: POST /api/auth/login, POST /api/auth/logout, GET /api/auth/me, POST /api/auth/register (admin-invite only — no public self-registration except the existing agent registration flow)
Password reset flow scaffolded (reset token table + endpoints); email delivery remains stubbed until the email phase
2. Populate real user data
Migrate the 8 PLACEHOLDER_USERS into the users table as seeded accounts with hashed passwords, one per role (ADMIN, UNDERWRITER, CSA, AGENT, EMPLOYER, CARRIER, PEO, VENDOR)
Create matching org_members rows linking each user to the appropriate organization with their role
Delete src/lib/users.ts after migration
3. API protection — every route
Auth middleware in api-server/src/app.ts rejecting all unauthenticated requests to /api/* with 401 (exceptions: auth endpoints, agent registration public endpoints, webhook receivers)
Role-authorization middleware: every route declares allowed roles server-side, mirroring the frontend access map. No route ships without an explicit role declaration.
Close the 12 frontend RBAC holes: add allowedRoles to /organizations, /deals, /policies, /contacts, /employees, /tasks, /commissions, /agent-registrations, /rate-tables, /implementation, /workforce, /legacy (ADMIN/CSA for most; ADMIN-only for /rate-tables; ADMIN/CSA/AGENT/UNDERWRITER for /deals)
4. Frontend auth rewiring + new login page
Replace the role-switcher LoginPage with a real email/password login form
Login page styling follows the final design system: #060608 canvas, glass-panel card (blur 40px), Inter body / Jost heading, pink --accent-primary for links and focus rings, sign-in button uses --gradient-cta (the page&apos;s single gradient CTA). Tokens only — no hardcoded hexes.
Auth store (Zustand) hydrates from GET /api/auth/me on load; logout calls the API and clears state
Dev-only role-switcher behind VITE_DEV_AUTH=true — impossible to enable in production builds
5. Typecheck cleanup
Fix the 9 pre-existing typecheck errors so the project&apos;s typecheck script passes clean. List each error and fix in the report. If any fix would change business logic, flag it and stop rather than guessing.
6. Acceptance tests — all must pass
Login with each of the 8 seeded accounts lands on the correct dashboard
Unauthenticated curl to any /api/* route (except public exceptions) returns 401
Logged in as AGENT, direct API call to an ADMIN-only endpoint returns 403
Logged in as EMPLOYER, navigating to /billing redirects to /unauthorized
Session survives page refresh; logout fully clears it; cookie is httpOnly (verify in devtools)
No references to PLACEHOLDER_USERS remain anywhere in the codebase
Typecheck passes with zero errors
Login page screenshot included — gradient CTA, pink accents, glass panel
Deal card modal still opens and renders correctly (regression check on prior-task merge)
7. QUEUED WORK ORDER — PHASE 4A: ACCOUNTS MODULE (LEADS / PROSPECTS / CLIENTS)
Lifecycle decision: Lead = unqualified name (own table, no rating data, no deals). Account = real company with a real opportunity, single table for prospects AND clients, distinguished by client_stage (Prospect → Active Prospect → New Client → Active Client). Never create a separate prospects table. Leads live under Accounts, not Pipeline — pipeline Stage 1 &apos;New Lead&apos; means new DEAL.
1. Data model
New leads table: company_name, contact_name, email, phone, state, vertical, source (purchased_list | inbound | referral | event | other), source_detail, status (new | working | qualified | converted | dead), notes, assigned_to, created_at, converted_account_id (nullable FK)
Every deals record must have a non-null account_id FK
2. Account creation on submission
Completing a marketplace submission (indication or full proposal) creates an accounts record capturing every rating-environment field: legal name, DBA, FEIN, entity type, locations, states, vertical, NAICS, payroll, headcount, class codes, EMod, contacts, product type
Dedupe by FEIN (primary) or normalized business name + state (fallback); link new deals to existing accounts, log updates to activity feed
Backfill: create accounts from the 27 existing deals&apos; stored data and link them; report the resulting count
3. Lead conversion
Convert action: creates account at Prospect stage, carries over fields, sets lead converted + converted_account_id, logs conversion. &apos;Convert & Start Submission&apos; variant pre-fills the marketplace flow. Converted/dead leads remain under a filter.
4. UI — Accounts module, three tabs
Leads tab: table (company, contact, source, status, assigned_to, age), quick-add glass modal, inline status updates, Convert actions; bulk import stubbed TODO
Prospects tab: accounts filtered to Prospect/Active Prospect; Clients tab: New Client/Active Client — same columns (name, vertical, state, headcount, payroll, # deals, stage badge)
Account detail (company profile card): glass-panel with all profile data, linked deals (stage + premium), quotes/proposals with rating breakdowns, contacts, activity history, documents; deals open via existing DealCardModal; binding moves the record between tabs automatically via client_stage
5. Sync + access
Quote-revision edits to rating inputs update the account and log to its activity feed; client_stage advances automatically (Active Client trigger stubbed TODO until Implementations flow exists)
allowedRoles: ADMIN/CSA full; AGENT only own leads + accounts on their deals; UNDERWRITER read-only Prospects/Clients, no Leads; EMPLOYER/CARRIER/PEO/VENDOR no /accounts access. OpenAPI updated, Orval/Zod regenerated.
6. Acceptance tests
Each product type submission creates account + linked deal with all fields on the profile; same-FEIN second submission links, no duplicate; 27 deals backfilled with account_id under correct tabs; lead Convert and Convert & Start Submission work with logged conversion; test bind moves account Prospects → Clients; quote-revision payroll edit updates account + logs; AGENT scoping enforced, EMPLOYER unauthorized on /accounts; design system + typecheck clean
8. QUEUED WORK ORDER — PHASE 4C: DEAL CARD SUBMISSION PANEL
The deal card is the platform&apos;s communication hub and must hold ALL submission data, sectioned and editable. Replaces the flat &apos;Deal Details&apos; rail. Runs after 4A (uses its account-sync rules).
1. Right rail redesign
Summary block (top): business name, quote type badge, state(s), requested effective date. Remove payroll/headcount from rail — KPI strip owns them.
Six section buttons, each a glass-card row with icon, name, completeness indicator: Business Info (legal name, DBA, FEIN, entity type, years in business, website, contacts) · Locations (addresses, states, premises, multi-location per rating model) · Workforce (headcount + payroll by class code and state, EMod, class list) · Operations (description, NAICS, safety programs, question-set detail) · Loss History (prior carriers, periods, claims, loss run docs) · Coverage/Program (quote type, effective/expiration, structure, PEO/ASO selections)
Section fields derive from the existing submission schema (submission_questions/answers + lib/cannabis-application canonical schema) — every captured field maps to exactly one section; no parallel field list
2. Completeness
Per section: complete / partial (&apos;N missing&apos;) / not started; required-field sets derive from submission question config per product type and vertical; aggregate &apos;Submission 4/6 complete&apos; in panel header; computed server-side in the deal payload
3. Section editor overlays
Click opens heavy-glass overlay (blur 40px), view mode with inline Edit; Zod validation from generated schemas; saves write to the SAME records the rating engine and account profile read — single source of truth
Re-rate flag: rating-relevant changes (payroll, headcount, class codes, EMod, state, locations) set rating_stale on the deal; persistent banner &apos;Rating inputs changed — re-rate required&apos; with Re-rate action into the quote flow; clears on successful re-rate; non-rating edits do not trigger
Every save logs to the activity feed with user, section, field-level diff; multi-field saves log one expandable entry; company-level edits sync to the linked account and its activity feed (4A rules)
4. Role-aware access (server-enforced)
ADMIN/CSA edit all; UNDERWRITER view all, edit none (uses Request Info); AGENT edit all on own deals; EMPLOYER edit Business Info/Locations/Workforce/Operations on own deal, Loss History view-only, internal notes never rendered; CARRIER/PEO view-only relevant sections; UI hides unusable edit affordances
5. API + acceptance tests
GET sectioned submission payload + completeness; PATCH per section with role + field-level validation (FEIN format, class codes must exist in wc_rates for the state); OpenAPI/Orval/Zod regenerated
Tests: no orphaned submission fields vs question set; payroll edit → KPI updates + stale banner + activity diff + account sync + re-rate clears; non-rating edit no banner; completeness states correct; UNDERWRITER PATCH 403; EMPLOYER section permissions enforced; heavy-glass + tokens; typecheck clean
9. PHASE 4B: USER PROFILE CARDS + USER MANAGEMENT — STATUS: DONE (June 25 2026, branch awf-os-brendy-sprint-1)
All 9 acceptance tests pass (profiles for all 8 roles, shared mini popover at all sites, AGENT book summary matches DB, EMPLOYER/CARRIER/PEO visibility enforced server-side, self-edit limited to contact fields, atomic invite + agent-registration approval, status/login gating, last_login surfacing, design system clean in light + dark). typecheck: 0 new errors vs baseline 0.
Auth-path changes that shipped: (a) login now gates on status === "active" (deactivated/invited blocked); (b) successful login stamps user_profiles.last_login_at; (c) reset-password promotes invited → active (never overrides deactivated), which is the documented onboarding completion step. Generic POST/PATCH /users now reject non-canonical status values.
OPEN ITEM FOR CURTIS: a hard-delete endpoint DELETE /api/users/:id (ADMIN-only) still exists alongside the new deactivate/reactivate flow. It contradicts the "no hard delete / preserve history" principle — confirm whether to retire it or keep it for true GDPR-style erasure.
Every platform user needs a profile card accessible wherever a user appears (avatars, @mentions, task assignees, deal teams, activity feeds). Hard dependency: 3.5 real users. Contacts at prospect/client companies are 4A account contacts — a separate concept; do not merge.
1. Data model
Extend users (or 1:1 user_profiles — engineer&apos;s call): name, title, organization FK, role, email, direct phone, mobile, avatar (initials + color now; photo upload TODO until file storage), timezone, status (active | invited | deactivated), date joined, last login, internal-only bio/notes
Role-specific sections — AGENT: agency, license number(s) + states, lines, appointment date, computed book summary (deal count + premium), referral arrangement ref, compliance status from agent_compliance · UNDERWRITER: carrier affiliation, lines of authority, states, verticals · CSA/ADMIN: department, territory/verticals, computed active deal count · CARRIER/PEO/VENDOR reps: company, partnership role, programs serviced · EMPLOYER: linked account, role at company, My Program visibility
2. UI
Mini profile popover — one shared component replacing existing avatar tooltips everywhere: avatar, name, title, role badge, org, click-to-copy email/phone, View full profile link
Full profile page /users/:id: identity header, contact block, role-specific section, activity tab from activity_log; internal viewers also see open tasks + active deals. /profile: self-edit of contact info/timezone/password (via 3.5 reset machinery); role, org, credentials admin-editable only.
3. Admin + access
/admin/users: searchable table (name, role, org, status, last login), invite flow (3.5 admin-invite registration), edit role-specific fields, deactivate/reactivate (history remains). Approved agent registration creates user + profile with agency/license data carried over.
Visibility: internal roles see all; AGENT sees internal staff + users on own deals; EMPLOYER sees assigned internal staff only; CARRIER/PEO/VENDOR see internal staff + shared-deal profiles. Self-edit limited to contact fields; internal notes never render externally. OpenAPI/Orval/Zod regenerated.
4. Acceptance tests
8 seeded users have complete role-specific profiles; popover works from deal avatars, activity feed, task assignee, global search; AGENT book summary matches actual deals; EMPLOYER 403 on unrelated profile; self-edit phone persists, self-edit role rejected server-side; deactivated user blocked from login with history intact; design system + typecheck clean
10. RATING ENGINE RULES (UNCHANGED)
Source: Data: BIC.csv (Benchmark Insurance Company) ingested into wc_rates (24,820 rows) + appetite (25,058 rows); 46 states
Rate lookup: EffectiveDate is internal reference ONLY — never filters queries; always use the most recent rate per State + ClassCode
WC formula: Premium = (Payroll ÷ 100) × Class Code Rate × EMod × Schedule Rating; minimum premium $500
PEO bundled WC discount: 10% on the WC component only, PEO deals
WFS PEPM: Monthly WFS Fee = (Total Annual Payroll × 2%) ÷ 12; per-employee display = monthly fee ÷ headcount
Audit: Every calculation stores a full rating_breakdown JSON for audit and proposal display
11. KEY TERMINOLOGY & DECISIONS LOG
Decision
Resolution
Database platform
Replit PostgreSQL + Drizzle — PERMANENT (June 2026); Supabase removed
Design system
Pink #E91E8C primary / purple #7C3AED support / gradient CTA exception (June 2026, supersedes pink-sole-accent + absolute no-gradient rules)
Client policy module name
&apos;My Program&apos; (covers WC, PEO, ASO, ASO+Captive)
Workforce module name
&apos;Network&apos;
Onboarding history
Client tab disappears permanently after completion
Rate lookup
Most recent rate always; EffectiveDate never filters
Pipeline
10 stages: New Lead → Qualified → Needs Analysis → Proposal Sent → Negotiation → Decision Pending → Committed → Documentation → Bound → Client; stage 9 (Bound) triggers both implementation trackers; pipeline stops at Bind Order — Implementation Tracker owns post-bind
Deal listener email
[clientname][ID]@card.axelworkforce.com (deal_email_addresses table, 7 live)
PDF filling
AcroForm fill method standard; ACORD 130 + Trean Supplemental mapped; Axel Cannabis WC (481 fields) pending; lib/cannabis-application holds canonical schema + field maps
First PEO program
Kind PEO Program (cannabis vertical)
Lead vs Account
Lead = unqualified name (own leads table, under Accounts module). Account = real company with real opportunity; single table for prospects AND clients via client_stage. Leads live under Accounts, not Pipeline; pipeline Stage 1 = new deal (June 2026)
Accounts module structure
Three tabs: Leads / Prospects / Clients (June 2026)
Deal card right rail
Sectioned Submission Panel (6 sections, completeness indicators, re-rate stale flag) replaces flat Deal Details (June 2026)
User profiles vs contacts
Platform user profiles (4B) and account contacts (4A) are separate concepts — never merge
12. WORKING AGREEMENT
Curtis (product owner) drives priorities and decisions; Brendan (lead engineer) owns execution in Replit and is the technical authority on implementation choices within the documented constraints.
Workflow: phase-by-phase paste-ready build prompts → execute → run acceptance tests → report pass/fail → next phase. Prompts are written to need zero modification.
Every build prompt must end with explicit acceptance tests; phases are not &apos;done&apos; until all tests pass.
Audit before trusting: when verifying state, inspect actual files/routes/DB — never rely on agent conversation memory.
Update this document after each major phase and re-upload to the Claude Project knowledge base — project members do not see each other&apos;s chat history; this doc is the shared memory.