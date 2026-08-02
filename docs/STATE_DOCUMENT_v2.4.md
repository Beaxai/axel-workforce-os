<!--
  AUTHORITATIVE TRUTH DOCUMENT #1 — Axel Workforce OS Project State Document v2.4.
  Faithful TEXT EXTRACTION of the owner's master .docx (owned by Curtis Prince / Beax.ai,
  "Updated June 12, 2026"), checked into the repo on 2026-08-02 so code can be diffed against it.
  Supersedes the v2.1 snapshot (docs/STATE_DOCUMENT_v2.1.md, kept for history). The master .docx
  in Curtis's project knowledge base remains canonical; tables here are linearized by the
  extraction. If this text ever disagrees with Curtis's current .docx, the .docx wins.
  NOTE: this snapshot is dated June 12, 2026 — the build has continued past it (see git history:
  Phase 4.1 pipeline-stage correction to 8 operational stages, P5-WC binding build, SEC-1 plan).
  Where the repo's later, flagged-and-accepted corrections differ (e.g. §8 "Pipeline: 10 stages"
  vs the Phase 4.1 8-stage correction in CLAUDE.md), see CLAUDE.md -> "Domain & data-model rules".
  Governance: see CLAUDE.md -> "Source of truth". Pairs with docs/PROJECT_INSTRUCTIONS.md.
-->

AXEL WORKFORCE OS
Project State Document — v2.4
Beax.ai / Axel Workforce Solutions  |  Updated June 12, 2026  |  Supersedes all prior versions
Single source of truth for platform state, architecture decisions, design system, and work orders. Owner: Curtis Prince. Chat history is not shared between Claude accounts — if it is not in this document, it did not happen.
1. PROJECT OVERVIEW
Field
Detail
Platform Name
Axel Workforce OS
Owner / Client
Curtis Prince (CEO, Axel Workforce Solutions / Beax.ai) — product owner, decision-maker
Lead Engineer
Brendan — owns the Replit build; technical authority on implementation within binding decisions
Dev Vehicle
Beax.ai
Build Status
Auth hardened and live-tested; Accounts + user profiles shipped; D2 light mode in progress; deal-card right rail under review (see Section 4)
Multi-party, AI-enabled marketplace delivering workers' compensation (WC) insurance and PEO/human capital services through a dual quote-to-bind path. Four product types: WC Only, PEO, ASO, ASO+Captive. First PEO program: Kind PEO Program (cannabis vertical).
2. CONFIRMED TECH STACK (BINDING)
Layer
Technology
Status
Frontend
React 18 + Vite + TypeScript + Tailwind
Live
Backend
Node.js + Express 5
Live
Database
Replit-managed PostgreSQL + Drizzle ORM (PERMANENT — Supabase removed; legacy folder deleted)
Live
Auth
Custom session auth: bcryptjs, hashed session tokens in sessions table, httpOnly cookies, server-side requireAuth + requireRoles on every router
LIVE (3.5 closed)
Monorepo
pnpm workspaces (artifacts/ + lib/)
Live
API contract
OpenAPI spec → Orval React Query hooks + Zod schemas
Live
Hosting (prod)
Railway
Planned
AI
Anthropic API (Class Code Advisor, claude-haiku-4-5, cached)
Live
E-Signature
HelloSign / Dropbox Sign
Stubbed (no API key)
Email
Nodemailer declared
Absent — not wired
File storage (future)
S3 or Cloudflare R2
Not built
Architecture notes (June 2026)
Custom session auth was built in lieu of Lucia/Auth.js (engineer's call, accepted by Curtis): bcryptjs hashing, anti-enumeration dummy compares, admin-invite-only registration, forgot/reset scaffolded, dev role-switcher gated behind VITE_DEV_AUTH.
Role lives on org_members, NOT on the users row — a user's role is org-membership context. This is the accepted model; do not add a role column to users.
/billing has no mounted router — the module was always a shell; it gets a real router in P7.
3. DESIGN SYSTEM (BINDING)
Token system — single source of truth
All colors defined as CSS variables in src/index.css and mirrored in src/lib/use-theme-colors.ts. No hardcoded accent hex literals outside token definition files.
Token
Value
Role
--accent-primary
#E91E8C (pink)
PRIMARY interactive: buttons, links, focus rings, active nav, tab underlines, chart primary
--accent-primary-hover / -focus
#d1187e / #ff4ba6
Hover / dark-mode focus outline
--accent-support
#7C3AED (purple), hover #6D28D9
SUPPORTING: icon chips, badge purple variant, chart secondary
--gradient-cta
135deg #7C3AED → #E91E8C
THE ONLY PERMITTED GRADIENT — single primary CTA per view
Form tokens (D2)
--input-bg/-border/-text/-placeholder/-bg-focus/-border-focus, --label-text, --section-heading
All form surfaces/labels, both modes — defined in both token paths
Rules
Max one gradient CTA per view; gradients banned everywhere else. Semantic status colors (green/red/yellow/blue/gray) are not brand colors — never repoint.
Canvas #060608 dark / #f4f4f5 light. Two glass recipes only: glass-card (blur 12px) and glass-panel (blur 40px). Inter body (15px base), Jost headings.
Both-modes rule: DEFINITION OF DONE (permanent, in replit.md): every new view/component verified in BOTH light and dark mode before a phase closes. All acceptance tests implicitly include light-mode rendering.
4. CURRENT POSITION (JUNE 11 AUDIT — VERIFIED)
Phase
Status
Detail
3.5 Real Auth + API Hardening
CLOSED
Live-tested: unauth /api/* → 401; requireRoles → 403; 8 users + 8 org_members; PLACEHOLDER_USERS gone; supabase/ deleted; typecheck 0 errors; real login page with gradient CTA
4A Accounts (Leads/Prospects/Clients)
CLOSED
leads table live (3 rows); three role-gated tabs in Accounts.tsx; 37/37 deals have account_id (deal count grew from 27 during build); accounts = 36 rows
4B User Profiles
CLOSED
UserProfile.tsx, AdminUsers.tsx, UserMiniProfile popover wired into deal-card avatars + GlobalSearch
D2 Light Mode
OPEN — 2 items
Form tokens shipped both paths; both-modes rule in replit.md. REMAINING: (1) migrate Step1BusinessDetails, Step4Indication, P2 steps, FinalSubmission off raw literals; (2) run axe-core contrast check on quote step 1, admin dashboard, pipeline, login — both modes — and record results
4C Submission Panel
DIVERGED — UNDER CURTIS REVIEW
Right rail rebuilt as tabs (OverviewTab/SupportingTabs) + WhatIfPanel instead of the specced six-section Submission Panel. Curtis is reviewing screenshots before ruling: adopt-as-satisfying, merge (sections within tab structure), or implement spec. The 4C requirements below remain binding until explicitly satisfied or amended.
4C requirements that must exist somewhere in the final right rail
All submission data accessible and editable from the deal card, organized by section (Business Info, Locations, Workforce, Operations, Loss History, Coverage/Program), fields derived from the submission schema with no orphans
Per-section completeness indicators computed server-side + aggregate count
Edits write to the single source of truth; rating-relevant changes set a rating_stale flag with re-rate banner; every edit logs a field-level diff to the activity feed and syncs company-level fields to the account (4A rules)
Server-enforced role access: ADMIN/CSA edit all; UNDERWRITER view-only; AGENT edit own deals; EMPLOYER edit business sections only, Loss History view-only; CARRIER/PEO view-only relevant sections
Off-plan work landed since D1.1 (accepted into the record)
Pipeline stage reconciliation: canonical stage constant, atomic transitions, lost-deal filter (early P4 scope — reduces P4 remaining work)
Quote wizard draft persistence / autosave / resume-from-Pipeline
Deal card modal redesign: US map header with location markers/popups, team avatar row, KPI row with quote-fallback premiums
App-wide gradient CTA rollout; blurred/darker modal backdrops; demo-video recording feature; Cannabis WC end-to-end test fixture
Branch note: p4-pipeline-stages was ahead of the GitHub remote at audit time — confirm it has been pushed/merged
Working-agreement reinforcement (June 2026)
Implementation decisions are Brendan's. New UI concepts and new features (e.g., map headers, video recording) get a heads-up to Curtis BEFORE they land, so this document keeps describing reality. Off-plan work is welcome when flagged.
5. PHASE PLAN
Phase
Scope
Status
P1 / P2 / P3
Setup + schema + eight dashboards
CLOSED (P1 auth gap resolved by 3.5; P2 empty subsystems fill in P5–P7)
D1 / D1.1
Design system consolidation + pink-primary restyle
CLOSED
3.5
Real auth + API hardening + typecheck
CLOSED (June 11)
4A
Accounts: Leads/Prospects/Clients + submission→account creation + backfill
CLOSED (June 11)
4B
User profile cards + admin user management
CLOSED (June 11)
D2
Light mode remediation
ACTIVE — two items remaining (Section 4)
4C
Deal card Submission Panel
UNDER REVIEW — Curtis ruling on tab/WhatIfPanel divergence; requirements in Section 4 binding
P4
Pipeline + quote flow remaining gap-closure
Partially pre-built by off-plan stage work; scope to be re-cut after 4C ruling
P5
Policies/AMS + Implementations/Onboarding (Stage 9 triggers)
Backlog — biggest remaining build; may split
P6
Communications live: email sending, HelloSign live key, Cannabis WC 481-field PDF mapping
Backlog
P7
Billing (incl. real /billing router) + Commissions
Backlog — launch-ready milestone
Launch-ready (quote → propose → bind → onboard → bill end-to-end) at approximately P7.
6. WC BINDING & CONVERSION SPEC (BINDING — DEFINED JUNE 2026)
The authoritative definition of how a WC-only deal converts from prospect to Active Client. Source: Curtis, from live operating process. PEO/ASO binding will be specced separately. This spec drives the P5-WC build.
6A. Bind subjectivities (Stage 8 — Documentation)
Entering Stage 8 generates a Bind Subjectivities Checklist on the deal from a product/state-aware template:
#
Item
Notes
1
Signed ACORD 130 application
AcroForm pre-filled from submission data (mapped)
2
Signed supplemental application
Trean Supp mapped; Axel Cannabis WC 481-field mapping pending (P6)
3
Signed quote acceptance
Carries billing frequency + billing type; establishes carrier deposit due within 30 days of binding, paid by client DIRECTLY to carrier
4
TRIA (terrorism) election

5
Fraud warnings

6
State notices
State-specific set per deal state(s)
7
Officer exclusion/rejection forms

8
Waiver forms

9
CONDITIONAL: currently valued loss history
Auto-flagged as an open subjectivity if loss-run valuation date is older than (desired effective date minus 60 days) — carrier requires valuation within 60 days
10
Axel broker fee
Default 7% of total premium; deal-level editable field (ADMIN/CSA), negotiable per deal. Invoiced by Axel separately from carrier premium. TRACKED, NON-BLOCKING: does not prevent carrier submission or binding. If unpaid at bind, automation notifies client AND agent of the outstanding fee with a payment link. Ideal flow is sign-and-pay in one workflow when possible.
6B. Two workflow modes, same checklist
Agent-submitted deal: CSA-driven — CSA initiates the HelloSign signature package, client signs, CSA monitors the checklist on the deal card
Direct-submitted deal: client self-serves — checklist surfaces in My Program with per-item sign-now actions (HelloSign embedded); CSA monitors and intervenes on stall
Every checklist state change auto-logs to the deal activity feed
6C. Carrier submission → Bound (Stage 8 → 9)
Carrier underwriters do NOT work inside the platform — they communicate via email. All carrier communication threads through the deal listener email (outbound package with attachments; inbound replies land in the activity feed). Listener inbound ingestion is therefore a P5 dependency.
Underwriter confirms coverage bound and emails the policy binder — OR, sometimes, releases the policy directly with no binder. Either document plus confirming communication = coverage bound.
v1: internal rep uploads the binder/policy to the deal. Target state: listener email auto-captures the attachment to deal documents and flags for classification.
Binder or policy on file → Stage 9 (Bound) → account client_stage = New Client → document immediately visible in My Program → WC Implementation Tracker fires
6D. WC Implementation Tracker — the four phases (defined)
Phase
Name
Completion gate
1
Carrier acceptance
AUTO-SATISFIES on binder OR policy upload (either = de facto carrier acceptance of all subjectivities)
2
Policy issuance
Policy document on file. Carrier SLA 24 hours to 7 days; timer with CSA nudge at day 5. If carrier released policy directly (no binder), Phases 1 and 2 complete together.
3
Policy & claims kit delivery
Policy + WC claims kit delivered to client via My Program; client notified
4
Carrier billing setup
Client directed to establish billing with carrier for monthly premium payments; CSA marks instructions delivered
Tracker complete → client_stage = Active Client (AUTOMATED) → onboarding tab disappears permanently per blueprint rule.
6E. Deposit monitor (parallel, NON-GATING)
Client pays the carrier deposit directly; Axel has no payment signal — silence means paid; the only firm signal is a carrier cancel-for-nonpay notice (~30 days). Therefore deposit NEVER gates Active Client conversion.
30-day timer from bind date; CSA task at day 21 to request carrier confirmation; a cancel-for-nonpay notice flags the deal at-risk with an alert
6F. Dependency consequences
Listener email INBOUND ingestion moves into P5 (was deferred) — required for carrier communication threading; attachment auto-capture may be v1.5
Broker fee invoicing partially pulls forward from P7: deal-level fee field (7% default, editable), invoice generation, paid-status tracking, and the unpaid-at-bind notification automation with payment link land in P5; full billing module remains P7
HelloSign LIVE API key required for P5 — the stub cannot run a real bind
6G. PEO BINDING & CONVERSION (DEFINED JUNE 2026)
Product structure: PEO and WC are separate products, but PEO INCLUDES WC. WC-only deals place WC alone and run the WC Implementation Tracker (6D). PEO deals run the PEO Implementation Tracker ONLY, with WC deliverables folded in as sub-items. This amends the original blueprint rule 'both trackers trigger at Stage 9' to: the tracker matching the deal's product type triggers.
Subjectivities: the full WC checklist (6A items 1–10) PLUS item 11 — signed Client Service Agreement with the PEO. Naming: the document is 'Client Service Agreement (CSA-PEO)' in system and docs, to avoid collision with the CSA (Client Service Associate) role. Carrier flow, deposit monitor, and broker fee dunning are identical to WC (6C, 6E).
PEO Implementation Tracker — five phases:
Phase
Name
Completion gate
1
Client Service Agreement executed
Auto-satisfies from checklist (signed CSA-PEO on file). Signing date anchors payroll scheduling.
2
Implementation meeting
Client schedules via Calendly link to the PEO implementation team (Calendly integration required) and completes kickoff — coordinates employee onboarding + payroll setup
3
Employee onboarding
All employees complete PEO new-hire paperwork. Paperwork lives in the PEO's systems, NOT ours — we track counts only (N of M complete). Interim: internal team pings PEO daily and updates; PEO partner role can update directly; future API/automation with PEO system planned.
4
Payroll setup
Payroll start date elected (system suggests CSA-PEO signing date + 14 days, editable); client provides payroll registers and related info to PEO; PEO configures processing. Runs in PARALLEL with Phase 3.
5
Go-live
Gates on BOTH Phase 3 and Phase 4 complete → client live with PEO → client_stage = Active Client (automated). WC deliverable sub-items (binder/policy on file, claims kit delivered) tracked within this tracker.
Progress updates: PEO partner role has platform access to mark onboarding/payroll milestones; internal team updates from daily follow-ups in the interim; API/automation with the PEO's system is a future integration.
7. RATING ENGINE RULES (UNCHANGED, BINDING)
Source: BIC (Benchmark Insurance Company) data ingested: wc_rates ~24,820 rows + appetite ~25,058 rows
Rate lookup: EffectiveDate is internal reference ONLY — never filters queries; always most recent rate per State + ClassCode
WC formula: Premium = (Payroll ÷ 100) × Class Code Rate × EMod × Schedule Rating; minimum premium $500
PEO bundled WC discount: 10% on the WC component only, PEO deals
WFS PEPM: Monthly WFS Fee = (Total Annual Payroll × 2%) ÷ 12; per-employee display = monthly fee ÷ headcount
Audit: Every calculation stores full rating_breakdown JSON
8. KEY DECISIONS LOG
Decision
Resolution
Database platform
Replit PostgreSQL + Drizzle — PERMANENT; Supabase removed (June 2026)
Auth architecture
Custom Express session auth (bcryptjs + hashed tokens); role carried on org_members, not users (June 2026)
Design system
Pink #E91E8C primary / purple #7C3AED support / single gradient-CTA exception / form tokens / both-modes definition of done (June 2026)
Lead vs Account
Lead = unqualified name (own table, under Accounts module). Account = one table for prospects AND clients via client_stage. Pipeline Stage 1 = new DEAL
Accounts module
Three tabs: Leads / Prospects / Clients
Deal card right rail
4C six-section requirements binding; implementation form under review after tab/WhatIfPanel divergence (June 2026)
User profiles vs contacts
Platform user profiles (4B) and account contacts (4A) are separate concepts — never merge
Off-plan work
Welcome when flagged to Curtis before landing; UI concepts and new features require heads-up
Client policy module name
'My Program' (WC, PEO, ASO, ASO+Captive)
Pipeline
10 stages, New Lead → Client; Stage 9 (Bound) triggers both implementation trackers
Deal listener email
[clientname][ID]@card.axelworkforce.com
PDF filling
AcroForm standard; ACORD 130 + Trean Supplemental mapped; Axel Cannabis WC (481 fields) pending in P6
First PEO program
Kind PEO Program (cannabis vertical)
WC binding process
Fully defined June 2026 — Section 6 is authoritative (subjectivities checklist, dual workflow modes, carrier email threading, 4 tracker phases, Active Client automation)
Axel broker fee
Default 7% of total premium, deal-level editable; tracked NON-BLOCKING at bind with automated client+agent dunning and payment link if unpaid
Coverage-bound evidence
Binder OR direct policy release — either auto-satisfies tracker Phase 1; direct policy completes Phases 1+2 together
Deposit
Client pays carrier directly; monitored with 30-day timer + day-21 CSA confirmation task; never gates Active Client
Loss history freshness
Carrier requires valuation within 60 days of desired effective date; system auto-flags stale loss runs as an open subjectivity
PEO binding process
Defined June 2026 — Section 6G authoritative: WC checklist + CSA-PEO, five-phase tracker, phases 3/4 parallel, go-live gates on both
Tracker trigger rule (amended)
The tracker matching the deal's product type triggers at Stage 9 — WC-only → WC tracker; PEO → PEO tracker with WC deliverables as sub-items (amends 'both trackers trigger')
CSA naming collision
'CSA' = Client Service Associate role; the PEO contract is 'Client Service Agreement (CSA-PEO)' everywhere
Employee onboarding data
New-hire paperwork lives in the PEO's systems; Axel tracks counts/status only (N of M). PEO partner role updates directly; interim daily follow-ups; future API
Payroll start date
Elected by client + PEO; system suggests CSA-PEO signing + 14 days, editable
9. WORKING AGREEMENT
Curtis issues phase work orders and owns product decisions and this document; Brendan owns execution and may decompose work orders into implementation prompts and generate fix/debug prompts independently.
New scope, changed acceptance criteria, new UI concepts/features, or anything touching a binding decision goes to Curtis BEFORE it lands.
Every phase ends with its acceptance tests — not done until all pass, in both light and dark mode. Reports are pass/fail per test with requested screenshots.
Audit before trusting: verify state by inspecting actual files, routes, and the live database — never agent conversation memory.
After each major phase: Brendan sends the phase report, Curtis updates this document, both replace it in their respective Claude project knowledge.
