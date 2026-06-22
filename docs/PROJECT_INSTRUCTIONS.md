<!--
  AUTHORITATIVE TRUTH DOCUMENT #2 — Curtis's engineering instructions to Brendan
  (Brendan_Claude_Project_Instructions). Faithful transcription of the owner-provided file,
  checked into the repo on 2026-06-22. Pairs with docs/STATE_DOCUMENT_v2.1.md.
  Governance: see CLAUDE.md -> "Source of truth". If this disagrees with the owner's current
  master, the owner's master wins.
-->

# Axel Workforce OS — Project Instructions (Engineering)

## Who you are working with

You are working with **Brendan**, lead stack engineer on Axel Workforce OS. Brendan owns
implementation and is the technical authority on how things get built. **Curtis Prince** (CEO, Axel
Workforce Solutions / Beax.ai) is the product owner and decision-maker — he sets priorities, makes
product decisions, and issues phase work orders.

Go fully technical with Brendan. No product-owner framing, no simplification. He executes builds in
Replit with Claude Code on a pnpm monorepo (React 18 + Vite + TS frontend, Express 5 API, Drizzle
ORM). _(Audit note: the live frontend is React 19.1 — binding decision #5 says audit actual files;
the doc says 18.)_

## Read this first

The **Project State Document** in this project's knowledge base is the single source of truth. Read
it before any technical work. It contains:

- Verified build state (front-of-house built and data-backed; auth/email/esign/policies/implementations stubbed or empty)
- Binding architecture decisions
- The full design token system
- The phase plan and all queued work-order prompts (Sections 6–9), ready to execute

## Binding decisions — do not revisit

These are settled. If Brendan or you see a technical problem with one, flag it to Curtis with a
concrete tradeoff — do not redesign around it.

1. **Database: Replit-managed PostgreSQL + Drizzle ORM — permanent.** Supabase is removed from the
   spec. Never introduce it. The legacy `supabase/` folder gets deleted in Phase 3.5. Auth lives in
   Express; authorization in API middleware; future file storage is S3/R2; realtime via
   polling/websockets if needed.
2. **Design system: pink primary / purple support / gradient-CTA exception.**
   - `--accent-primary` `#E91E8C` (hover `#d1187e`, dark-focus `#ff4ba6`) — all interactive elements
   - `--accent-support` `#7C3AED` (hover `#6D28D9`) — icon chips, badge variant, chart secondary series
   - `--gradient-cta` `(135deg, #7C3AED → #E91E8C)` — ONLY on the single primary CTA per view; gradients banned everywhere else
   - Semantic status colors (green/red/yellow/blue/gray) are not brand colors — never repoint them
   - Tokens only — no hardcoded accent hex literals outside token definition files
   - Canvas `#060608` dark; exactly two glass recipes (card blur-12 / panel blur-40); Inter body, Jost headings
3. **Rating engine rules:** most recent rate per State + ClassCode (EffectiveDate never filters); NCCI
   formula; $500 minimum; 10% PEO bundled WC discount (WC component only); WFS PEPM =
   `(annual payroll × 2%) ÷ 12`; every calculation stores `rating_breakdown` JSON.
4. **Lead vs Account:** leads are their own table under the Accounts module; accounts are one table
   for prospects and clients distinguished by `client_stage`. Never create a separate `prospects` table.
5. **Audit actual files, never agent memory.** When verifying state, inspect real files, routes, and
   the live database. Replit Agent's reported state is unreliable.

## How work flows

1. Curtis issues phase work orders as paste-ready prompts (embedded in the State Document).
2. Brendan executes in Replit/Claude Code, adapting implementation details as needed within the
   binding decisions above.
3. Every phase ends with its acceptance tests — a phase is not done until all tests pass.
4. Brendan reports pass/fail per test to Curtis, with screenshots where the prompt asks for them.
5. After each major phase, the State Document gets updated (Curtis owns the doc) and re-uploaded to
   both Curtis's and Brendan's project knowledge. Chat history is not shared between accounts — the
   doc is the only shared memory. **If it's not in the doc, it didn't happen.**

## Current position

- **Active work order:** Phase 3.5 — real authentication + API hardening + typecheck cleanup (State
  Document Section 6). _(Status as of 2026-06-22: 3.5 and 4A landed; 4C is the active build.)_
- **Then:** 4A (Accounts: Leads/Prospects/Clients) → 4C (Deal Card Submission Panel) → 4B (User
  Profiles) → P4 (pipeline/quote gap-closure) → P5 (Policies + Implementations) → P6
  (email/HelloSign/PDF mapping) → P7 (Billing + Commissions, launch-ready).

## When generating or modifying code/prompts

- Reference the confirmed stack and design tokens explicitly
- Include acceptance tests for any new scope
- Update the OpenAPI spec and regenerate Orval hooks + Zod schemas whenever API surface changes
- Flag any change that would touch a binding decision before building it
- Never paste secrets or API keys into project knowledge or prompts
