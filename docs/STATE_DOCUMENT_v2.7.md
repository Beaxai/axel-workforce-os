<!--
  AUTHORITATIVE TRUTH DOCUMENT #1 — Axel Workforce OS Project State Document v2.7.
  Faithful TEXT EXTRACTION of the owner's master .docx (owned by Curtis Prince / Beax.ai,
  "Updated June 2026"), checked into the repo on 2026-08-09 so code can be diffed against it.
  Supersedes the v2.4 snapshot (docs/STATE_DOCUMENT_v2.4.md, kept for history; v2.1 also retained).
  Doc-chain note: v2.2, v2.5, and v2.6 were never received/checked in — the chain in this repo is
  v2.1 -> v2.4 -> v2.7. The master .docx in Curtis's project knowledge base remains canonical;
  tables here are linearized by the extraction. If this text ever disagrees with Curtis's current
  .docx, the .docx wins. Section numbering follows the source exactly (the source has no §7F).
  Notable changes vs v2.4: SignWell replaces HelloSign platform-wide; Resend named for email;
  8-stage pipeline canonical; end-to-end process segments 1-6 locked; PC-series client-facing
  roadmap (§6B) added; David Edwards legal dependency on the agent agreement.
  Governance: see CLAUDE.md -> "Source of truth". Pairs with docs/PROJECT_INSTRUCTIONS.md.
-->

AXEL WORKFORCE OS
Project State Document — v2.7
Beax.ai / Axel Workforce Solutions  |  Updated June 2026  |  Supersedes all prior versions
Single source of truth for platform state, architecture, design system, and the end-to-end process. Owner: Curtis Prince. Chat history is not shared between Claude accounts — if it is not in this document, it did not happen.
1. PROJECT OVERVIEW
Field
Detail
Platform
Axel Workforce OS — multi-party, AI-enabled WC + PEO/HCM marketplace, dual quote-to-bind path
Owner
Curtis Prince (CEO) — product owner, decision-maker
Lead Engineer
Brendan — owns the Replit build; technical authority within binding decisions
Products
WC Only, PEO, ASO, ASO+Captive. First PEO program: Kind PEO Program (cannabis vertical)
2. TECH STACK (BINDING)
Layer
Technology
Frontend
React 18 + Vite + TypeScript + Tailwind
Backend
Node.js + Express 5
Database
Replit-managed PostgreSQL + Drizzle ORM (PERMANENT — Supabase removed)
Auth
Custom session auth: bcryptjs, hashed session tokens, httpOnly cookies, requireAuth + requireRoles server-side. Role on org_members, not users.
E-Signature
SignWell (replaced HelloSign/Dropbox Sign, June 2026) — agent agreements, bind subjectivities, CSA-PEO. New account + integration required; embedded signing plan needed.
AI
Anthropic API (Class Code Advisor, cached)
PDF
Puppeteer (proposal + document generation)
Deferred/pending
Live SignWell key, native scheduler, Calendly (PEO meeting), email send, S3/R2 storage, PEO-system API
3. DESIGN SYSTEM (BINDING)
Tokens only — no hardcoded accent hex outside token files. Defined in src/index.css + mirrored in use-theme-colors.ts.
Primary: #E91E8C pink — PRIMARY interactive (buttons, links, focus, active nav, tab underlines, chart primary). Hover #d1187e, dark-focus #ff4ba6.
Support: #7C3AED purple — SUPPORTING (icon chips, badge variant, chart secondary). Hover #6D28D9.
Gradient CTA: linear-gradient(135deg,#7C3AED→#E91E8C) — ONLY on the single primary CTA per view; banned everywhere else.
Surfaces: Canvas #060608 dark / #f4f4f5 light. Two glass recipes (card blur-12 / panel blur-40). Inter body, Jost headings. Form tokens (--input-*, --label-text, --section-heading) defined both paths.
Rules: Semantic status colors (green/red/yellow/blue/gray) are not brand colors — never repoint. Every new view verified in BOTH light and dark mode before a phase closes (D2 definition of done).
4. BUILD STATE (VERIFIED)
Phase
Status
Detail
3.5 Auth + API hardening
CLOSED
Live-tested 401/403; 8 users + org_members; typecheck 0; real login; supabase/ deleted
4A Accounts (Leads/Prospects/Clients)
CLOSED
leads table; three tabs; deals backfilled with account_id; dedupe by FEIN
4B User profiles
CLOSED
UserProfile, AdminUsers, UserMiniProfile popover wired app-wide
D2 Light mode
OPEN
Form tokens shipped; REMAINING: migrate Step1/Step4/P2 steps/FinalSubmission off literals; run axe-core contrast
4C Deal card right rail
UNDER REVIEW
Rebuilt as tabs + WhatIfPanel vs specced Submission Panel; Curtis reviewing screenshots; 4C requirements remain binding
Pipeline (8 stages)
CLOSED
Curtis-instructed 8-stage model now canonical (see 5)
Forward roadmap (backend P-series + client-facing PC-series)
Recommended build order interleaving both tracks: P5-WC → PC1 → PC2 → PC3 → P5-PEO → PC4 → PC5 → PC6 → P6 → P7.
Phase
Scope
Status
P5-WC
WC binding: subjectivities engine, SignWell flows, listener inbound, tracker, deposit monitor, broker fee dunning
Active work order
PC1
Prospect self-registration auth + real email (Resend)
Queued — client dependency
PC2
My Program shell + progressive unlock
Queued
PC3
Pre-bind client experience (proposal view, self-serve signing)
Queued
P5-PEO
PEO binding + 5-phase onboarding tracker (extends P5-WC)
Queued
PC4
Onboarding read-only view
Queued
PC5
Active Client self-service (COIs, policies, billing, claims kit)
Queued — launch-critical
PC6
Active Client request-based actions (changes, claims, renewals)
Fast-follow
P6
Communications live: email at scale, SignWell live key, Cannabis WC 481-field PDF mapping
Backlog
P7
Billing + Commissions + document vault (S3/R2)
Backlog — launch milestone
Also open: D2 light-mode closers (quote-flow literal migration + axe-core); 4C right-rail ruling; SignWell + Resend live keys; native scheduler; Calendly for PEO meeting; David Edwards conditional agreement clause.
5. PIPELINE — 8 STAGES (CANONICAL)
Amended June 2026 by Curtis after reviewing the submission flow; supersedes the old 10-stage model. Stage reflects how far the submission has progressed.
#
Stage
Meaning / trigger
1
Submission Review
Submission started, no indication generated yet
2
Indication
Indication generated, formal proposal not yet requested
3
U/W Review
Full submission complete; awaiting underwriter
4
Approved / Quoted
U/W approved; proposal auto-generated; Active Prospect trigger
5
Bind Order
Quote acceptance signed; subjectivities checklist fires
6
Bound
Binder or policy on file; client_stage → New Client; implementation tracker fires
7
Client
Implementation complete; Active Client
8
Lost
Terminal for the DEAL only — never changes the account; a lost deal's company stays a Prospect
6. END-TO-END PROCESS (SEGMENTS 1–5 LOCKED)
The authoritative process flow, walked and locked segment by segment with Curtis. A master flowchart accompanies this document for the dev team, UI/UX, and CTO.
Segment 1 — Agent / Partner Registration
Status chain on agent_registrations: submitted → agreement_sent → agreement_signed → call_scheduled → call_completed → approved / terminated → active.
Lands on axelins.com → registration application (agency info, licenses, E&O)
Agency agreement AUTO-SENT via SignWell on application (automated upstream of qualification)
Schedule partnership call (native scheduler for launch; Calendly deferred)
Partnership call: demo + qualification questions → approved or NOT approved (agreement terminated)
Approved → credentials + AGENT profile issued → active referral partner (sub-users, submissions enabled)
⚠ LEGAL DEPENDENCY (David Edwards): because the agreement executes before qualification, the template MUST be effective-on-approval with a unilateral termination right. Gates turning on SignWell automation.
⚠ GATE: approval blocked until agreement_signed = true (rep review screen enforces).
Qualification questions: structured form, content deferred to a later session (build the shell now).
Segment 2 — Submission Intake (two-part filter)
Deliberate two-part design: Part 1 basic company + payroll → pricing indication (the hook); Part 2 full submission → formal proposal request. The indication self-selects motivated parties so underwriters only work complete submissions. Agent and direct-prospect paths are identical today.
Submission lands in the stage matching its progress: abandon before indication → Submission Review; indication but no proposal request → Indication; full journey complete → U/W Review
Agent/prospect does NOT choose indication vs. proposal — the flow determines it by how far they go
Auto-indication is always shown; U/W review is about approving it for proposal, not gating the rating
Appetite does NOT block completion by default — anyone may complete; U/W decides; no market → rejection → Lost
Branches: THREE coded exceptions: (a) Ineligible per guidelines → automated ineligibility response, submission stops; (b) Blocked by prior submission → automated response, agent cannot enter; (c) Referral/other flags → does NOT block, but the U/W package is annotated so underwriting sees the flag
Appetite scoring already exists (appetite table ~25k rows; Acceptable/Referral/Conditional/Ineligible tiers) — wire tiers to these behaviors: Ineligible=block, Referral/Conditional=annotate-proceed, Acceptable=clean-proceed
Segment 3 — Proposal Generation (dual internal/external model)
Format: both PDF and in-platform versions of indications AND proposals. One template, conditional sections (WC breakdown always; PEO/WFS section + service inclusions + bundled WC discount when PEO). Broker fee DOES appear on the proposal. Versioned — re-rate creates a new version, prior versions retained. Auto-generated on advance to Stage 4.
Internal path: Axel internal products: internal underwriter approves in-system → system AUTO-GENERATES the approved proposal on stage advance
External path: External carrier products: external underwriter emails an approved proposal PDF → listener/communication hub syncs the email + attachment onto the deal → the inbound proposal TRIGGERS Axel proposal generation → the carrier PDF is BUNDLED into the Axel proposal so it reads as natively Axel-generated
Carrier PDF: The same carrier PDF does TRIPLE DUTY: triggers generation, bundles into the prospect-facing proposal, and is retained for the SignWell bind package (it is a required binding subjectivity). One inbound document, three uses, no re-upload.
Elevated dependency: listener email INBOUND ingestion with attachment capture is now load-bearing for proposal generation, not just bind communication
Acceptance: Acceptance = prospect signs the quote acceptance via SignWell = proposal acceptance AND subjectivity #1 AND the Stage 5 trigger. Expires with the proposal validity period. One signature event bridges proposal → binding.
⚠ BUILD DECISION (Curtis + Brendan): bundling method — recommend Axel-branded wrapper + appended carrier PDF, since re-keying arbitrary carrier PDFs is not reliably automatable. Also: an external-carrier flag must exist on the deal so the system expects the email trigger instead of auto-generating.
Segment 4 — Binding
Assembles Sections 7/7G (WC/PEO binding specs). Product-agnostic in the middle; forks only at the endpoints (CSA-PEO subjectivity for PEO; product type selects the tracker at Bound).
Opens on the segment-3 signature (quote acceptance = subjectivity #1) → enters Bind Order (5) → subjectivities checklist generates
Checklist signed via SignWell in two modes: CSA-driven (agent deals) or self-serve in My Program (direct)
Package to carrier underwriter via deal listener email; replies thread into the hub; underwriter confirms bound and emails binder OR releases policy directly; rep uploads
Binder or policy on file → Bound (Stage 6) → New Client → tracker fires
Parallel, non-gating: broker fee dunning (client + agent, payment link) and deposit 30-day monitor
Segment 5 — Implementation → Active Client
Assembles Sections 7D/7G. One Bound event; product type selects the tracker; both converge on automated Active Client conversion.
WC-only → WC tracker (4 phases): carrier acceptance (auto on upload) → policy issuance (24h–7d, day-5 nudge) → policy + claims kit delivery → carrier billing setup. Direct policy completes phases 1+2 together.
PEO → PEO tracker (5 phases): CSA-PEO executed (auto) → implementation meeting (Calendly) → employee onboarding (N of M, PEO updates) → payroll setup (start = sign + 14d) → go-live (gates on BOTH 3 and 4). WC deliverables (binder/policy, claims kit) are SUB-ITEMS inside this tracker — no separate WC tracker for PEO deals.
All phases complete → client_stage → Active Client (automated) → onboarding tab removed → Stage 7 Client → My Program self-service (segment 6, pending discovery)
Parallel: deposit 30-day monitor; cancel-for-nonpay flags at-risk; never gates conversion
Segment 6 — My Program (Client Self-Service)
My Program is ONE module presenting FOUR experiences by client_stage — pre-bind sales/binding, read-only onboarding, then the active-client home. Same shell, conditional sections (PEO clients see payroll/benefits/roster; WC-only clients do not).
Prospect auth: Direct prospects self-register at submission via email verification — this provisions their My Program login. NET-NEW auth work: a public prospect-registration path alongside the existing admin-invite and agent flows. Hard dependency for the entire client-facing side. Company profiles are created even on incomplete submissions (agent- or direct-input), consistent with 4A.
Pre-bind: Prospect / Active Prospect: view indication + proposal, sign the quote acceptance, self-serve the subjectivities checklist with embedded SignWell
Onboarding: New Client: onboarding tab shows READ-ONLY tracker status (implementation is facilitated externally by Axel + the PEO); tab disappears permanently at Active Client
Active: Active Client — day-to-day home. Actions split by risk:
· Self-service, instant: download standard COIs (self-generated, no human check — Curtis approved), view/download policies, billing status, claims kit access; PEO-only conditional sections: employee roster, payroll, benefits
· Request-based, routed: policy changes, add locations, non-standard COIs, file a claim, renewals — each creates a task/activity on the deal and is worked through the same pipeline/communication hub (no separate service system)
Scope: Launch-critical: COIs, view policies, billing status, claims kit access. Fast-follow: file-a-claim, employee roster, renewals.
All six segments are now locked. The client-facing build (My Program + prospect self-registration auth) is the largest chunk of net-new work the walkthrough surfaced and should be scoped as its own phase roadmap.
6B. CLIENT-FACING BUILD ROADMAP (PC PHASES)
The client-facing work sequenced by dependency. PC = Client-facing; these interleave with the backend P-series rather than running strictly after. Recommended overall order: P5-WC → PC1 → PC2 → PC3 → P5-PEO → PC4 → PC5 → PC6.
Phase
Scope
Priority
PC1 Prospect self-registration auth
Public prospect-registration path (marketplace submission provisions a pending user tied to the account); email verification → set password → My Program login; extends existing custom session auth (not a rebuild). DEPENDENCY: real email (Resend) — can no longer be deferred.
Dependency — first
PC2 My Program shell + progressive unlock
One module, client_stage-gated nav (Prospect → Active Prospect → New Client → Active Client); conditional-section framework (PEO vs WC-only); EMPLOYER scoping; empty-state shells; both light/dark
Foundational
PC3 Pre-bind experience
View indication + proposal (in-platform); sign quote acceptance via embedded SignWell (= acceptance + subjectivity #1 + Stage 5 trigger); self-serve subjectivities checklist. Pairs with P5-WC self-serve mode.
Launch-critical
PC4 Onboarding read-only view
Read-only tracker status during implementation (WC 4-phase / PEO 5-phase); onboarding tab disappears permanently at Active Client. Display only — no client actions.
Launch-critical (light)
PC5 Active Client home — self-service
COI self-generation (standard certs, instant, no human check — its own meaty sub-build: cert template, holder input, Puppeteer PDF); view/download policies; billing status; claims kit access; PEO read views (roster, payroll, benefits)
Launch-critical core
PC6 Active Client home — request-based
Policy changes, add locations, non-standard COIs, renewals, file-a-claim — each creates a task/activity on the deal, routed into the existing pipeline/communication hub (no separate service system)
Fast-follow
Dependencies surfaced: Real email (Resend) — PC1 verification needs it; previously deferred, now unavoidable
· COI generation (PC5) is larger than it appears — certificate templates, holder management, instant PDF issuance; Brendan may split it out
7. WC BINDING & CONVERSION SPEC (BINDING)
7A. Bind subjectivities (Stage 5 — Bind Order)
Entering Bind Order generates a product/state-aware checklist:
Signed ACORD 130 (AcroForm pre-filled) · signed supplemental (Trean mapped; Axel Cannabis WC 481-field pending P6) · signed quote acceptance (carries billing frequency/type; establishes carrier deposit due 30 days post-bind, paid direct to carrier)
TRIA election · fraud warnings · state notices (per deal state) · officer exclusion/rejection · waiver forms
CONDITIONAL currently-valued loss history: auto-flagged if loss-run valuation date < (effective date − 60 days); re-evaluates on effective-date change
Axel broker fee: default 7% of total premium, deal-level editable (ADMIN/CSA), negotiable, invoiced separately. TRACKED NON-BLOCKING; if unpaid at bind, automation notifies client AND agent with a payment link. Never blocks submission or binding.
External carrier proposal PDF (from segment 3) is a required checklist item — already captured, uploaded to SignWell.
7B. Two signing modes
Agent-submitted: CSA-driven — CSA initiates SignWell package, client signs, CSA monitors
Direct-submitted: client self-serves the checklist in My Program (embedded SignWell); CSA monitors and intervenes
7C. Carrier submission → Bound
Carrier underwriters do NOT work in the platform — email only, threaded via the deal listener address (inbound ingestion is a P5 dependency)
Underwriter confirms bound and emails the binder OR releases the policy directly — either document + confirming communication = bound
Binder or policy on file → Stage 6 → New Client → visible in My Program → tracker fires
7D. WC Implementation Tracker (4 phases)
Phase
Gate
1 Carrier acceptance
Auto on binder/policy upload
2 Policy issuance
Policy on file; 24h–7d; day-5 nudge; direct policy completes 1+2 together
3 Policy & claims kit delivery
Policy + WC claims kit published to My Program; client notified
4 Carrier billing setup
CSA marks billing instructions delivered → tracker complete → Active Client (automated), onboarding tab removed
7E. Deposit monitor (parallel, non-gating)
Client pays carrier directly; no payment signal except a cancel-for-nonpay notice (~30 days). 30-day timer from bind; day-21 CSA confirmation task; cancel notice flags at-risk. NEVER gates Active Client.
7G. PEO BINDING & CONVERSION (BINDING)
PEO and WC are separate products, but PEO INCLUDES WC. WC-only runs the WC tracker; PEO runs the PEO tracker ONLY, with WC deliverables as sub-items. Amends the original 'both trackers trigger' rule to: the tracker matching product type triggers at Bound.
Subjectivities = full WC checklist PLUS signed Client Service Agreement (CSA-PEO). Naming: 'Client Service Agreement (CSA-PEO)' everywhere to avoid collision with the CSA (Client Service Associate) role.
Carrier flow, deposit monitor, broker fee dunning identical to WC.
Phase
Gate
1 CSA-PEO executed
Auto from checklist; signing date anchors payroll scheduling
2 Implementation meeting
Calendly link to PEO implementation team; booked/completed
3 Employee onboarding
New-hire paperwork lives in PEO's systems; Axel tracks counts only (N of M). PEO partner role updates; interim daily follow-ups; future API
4 Payroll setup
Payroll start date = CSA-PEO signing + 14 days (editable); client provides registers; PEO configures. Runs PARALLEL with Phase 3
5 Go-live
Gates on BOTH 3 and 4 → client live → Active Client (automated)
8. RATING ENGINE (UNCHANGED, BINDING)
Source: wc_rates ~24,820 rows + appetite ~25,058 rows ingested from BIC data
Lookup: Most recent rate per State + ClassCode; EffectiveDate never filters
WC: Premium = (Payroll ÷ 100) × Class Code Rate × EMod × Schedule Rating; min $500
Discount: 10% bundled WC discount (WC component only) on PEO deals
WFS PEPM: Monthly WFS Fee = (Annual Payroll × 2%) ÷ 12; per-employee = ÷ headcount
Audit: Every calculation stores full rating_breakdown JSON
9. KEY DECISIONS LOG
Decision
Resolution
Database
Replit PostgreSQL + Drizzle — permanent; Supabase removed
Auth
Custom Express session auth; role on org_members not users
Design system
Pink primary / purple support / single gradient-CTA / form tokens / both-modes DoD
E-signature
SignWell replaces HelloSign platform-wide (June 2026) — new account + integration
Pipeline
8 stages canonical (Curtis-instructed); Lost is deal-terminal, never touches the account
Submission design
Two-part filter: indication (Part 1) qualifies before full submission (Part 2); underwriters only work complete submissions
Submission branches
Ineligible → auto-block; prior-submission → auto-block; referral/flags → annotate U/W package, do not block
Proposal model
Dual: internal auto-generates on U/W approval; external triggered by carrier's emailed PDF synced via hub
Carrier PDF
Triple-use: triggers generation, bundles into Axel proposal, retained as bind subjectivity
Broker fee on proposal
Yes — appears on the proposal; default 7%, editable; tracked non-blocking at bind with dunning
Proposal acceptance
Signed quote acceptance via SignWell = acceptance + subjectivity #1 + Stage 5 trigger
Tracker trigger
Tracker matching product type fires at Bound; PEO absorbs WC deliverables as sub-items
Lead vs Account
Lead = unqualified (own table); Account = one table for prospects+clients via client_stage
Agent agreement (legal)
Executes pre-qualification → template must be effective-on-approval with termination right (David Edwards)
Prospect authentication
Direct prospects self-register at submission via email verification — net-new public auth path; dependency for all client-facing features
My Program
One module, four experiences by client_stage; onboarding read-only (external); active client = day-to-day home
Client self-service split
Instant self-serve for safe reads + standard COIs (self-generated); request-based routing to the pipeline for anything changing coverage/premium
10. WORKING AGREEMENT
Curtis issues work orders and owns product decisions + this document; Brendan owns execution, may decompose work orders and generate fix/debug prompts independently.
New scope, changed acceptance criteria, new UI concepts/features, or anything touching a binding decision → Curtis BEFORE it lands. (Stage-model changes are doc-worthy decisions — the 10→8 change lagged the doc and caused spec drift; do not repeat.)
Every phase ends with acceptance tests — not done until all pass, in both light and dark mode.
Audit before trusting: verify state by inspecting actual files, routes, and the live database — never agent memory.
After each major phase: Brendan reports, Curtis updates this doc, both replace it in their project knowledge.
