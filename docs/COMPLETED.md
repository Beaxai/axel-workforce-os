# What's Done — Running Log

Plain-English record of completed work. Newest at the top. Every time a stage
finishes, a new dated section is added here (companion to
`docs/questions-for-curtis/open-questions.md`, which tracks what's still undecided).

---

## NOT COMPLETED — what remains in this sprint, and what each item is waiting on

*(Status as of 2026-08-02. "Q" numbers refer to the questions doc. Sources: the State
Document's binding process spec (§6) and phase plan (§5), and the engineering
instructions. This block gets updated as items finish and move into the log below.)*

**Buildable now — no decision needed:**

- **Deposit monitor, tasks 3–4 of 4** — the deposit status display + two buttons on
  bound deals' cards (mark confirmed / record cancellation notice), then the final
  proof-run and report. *(State Doc §6E.)*
- **Broker fee (WC-2)** — the 7% editable fee field on deals, checklist tie-in, and
  paid-status tracking. *(§6A item 10, §6F.)* The "email the client a payment link if
  unpaid at bind" automation within it waits on email (Q15) and on what pay-to-bind
  means (Q14).
- **Light-mode closeout (D2)** — migrate the last four quote-flow screens onto the
  design tokens and record the contrast checks in both modes. The doc's only ACTIVE
  phase. *(§4.)*

**Waiting on ONE decision each:**

- **Turn on the security work (SEC-1)** — merge + tag the demo deals → waiting on
  **Q1–Q4** (mostly Q1).
- **Deal email receiving (WC-5)** — carrier replies landing on the deal card; Curtis's
  critical path *(§6C, §6F)* → waiting on **Q5** (the email domain), with **Q15**
  (sending service) as its pair.
- **Real signatures** — a live signing flow for the bind checklist *(§6F)* → waiting
  on **Q13** (SignWell vs HelloSign), then the account/key (Q6).
- **Permanent file storage** — binders and policies somewhere durable *(§2)* → waiting
  on **Q7** (Amazon vs Cloudflare). A real go-live blocker.
- **Deal card right rail** — close the 4C divergence *(§4)* → waiting on **Q9**.

**Next legs after this sprint (specced, not started):**

- **PEO onboarding tracker** — the five-phase PEO version of what we built for WC
  *(§6G)*; needs the PEO partner access definition (Q4) and eventually a Calendly
  integration.
- **Proposal-request workflow** (from the 2026-08-02 meeting) — Request Proposal
  button, carrier email template, responses on the card, standardized proposals,
  Request to Bind, pay-to-bind → waiting on **Q13–Q17** and the State Doc v2.5 update
  (Q17) to become work orders.
- **Client logins for "My Program"** *(§6B)* → waiting on **Q8**.

---

## 2026-08-02 (later) — Deposit monitor: the clock and the reminder are live

**What it is:** the carrier-deposit watcher from the binding process (State Doc §6E).
When a deal is bound, a 30-day clock starts (the client owes the carrier its deposit,
paid directly to the carrier — we just watch). At day 21, a task is automatically
created for our CSA to ask the carrier whether the deposit arrived. None of this ever
blocks a client's onboarding — that's the rule from the doc, and the tests prove it's
respected.

**Built so far (tasks 1–2 of 4):** the timer that starts at bind, and the automatic
day-21 CSA task (it shows up in the existing task drawer — no new screens needed).
Verified on the live environment: 9/9 deposit checks + the 46-check onboarding
regression still green. **Still to come:** a small deposit status display on the deal
card with two buttons (mark confirmed / record a cancellation notice) — the only piece
that needs any UI — then the final proof-run and report. Branch
`p5-wc3b-deposit-monitor`.

## 2026-08-02 (later) — A working system that keeps the build honest

Three connected additions, all in the repo so Curtis can read everything from GitHub:

- **A scope auditor** — a review step that checks every plan against the State Document
  and the engineering instructions before we build, and again when we finish. It caught
  real things on day one (see the meeting audit below).
- **A build-decisions log** (`docs/decisions/build-decisions-log.md`) — why each thing
  was built the way it was, traced to the exact line of Curtis's documents that called
  for it.
- **A meeting log** (`docs/meetings/meeting-log.md`) — today's future-direction meeting
  captured: the proposal-request workflow end to end, carrier email on the deal card,
  standardizing carrier PDF proposals, SignWell + pay-to-bind ideas, quote-wizard
  save-guard. Every item was then **audited against the documents**: most are in scope
  or clean extensions; two need rulings (SignWell conflicts with the doc's HelloSign;
  pay-to-bind depends on what's being paid). The questions file was also rewritten in
  plain business language — now 17 decisions, each with a suggested one-word answer.

## 2026-08-02 — Security: each login sees only its own deals (SEC-1)

**What it is:** Before this, any agent login could see every agency's deals, quotes,
accounts, and contacts. Now visibility follows ownership: agents see the deals they
sold, a broker sees their whole agency's book, a client company sees its own deals,
and Admin/CSA/Underwriter see everything. Anyone else (carrier, PEO, vendor) sees
nothing until their access is defined.

**Where it's enforced:** everywhere data is read — deal lists, individual deal pages,
the deal card (including approve/decline buttons), quotes, policies, proposals,
documents, accounts, contacts, and global search. Guessing another tenant's deal ID
just returns "not found." New deals are automatically tagged with who sold them.

**Proof:** a 32-check isolation test that seeds two rival agencies and verifies each
login shape sees exactly the right rows (then rolls itself back — writes nothing).
Passed on the live environment, along with the existing 46-check journey-engine test.

**Status:** on branch `sec1-multi-tenant-scoping`, NOT merged — waiting on Curtis's
answers (questions 1–4 in the questions doc). Full technical report:
`docs/build-prompts/sec1-report.md`.

## 2026-08-02 — Repo housekeeping: everything back in one place

- Replit's build work (87 commits: deal-card redesign, TaskDrawer, indication detail
  view and PDF, accounts page rework, dozens of design mockups) and GitHub's docs
  work had silently drifted onto separate histories. Reconciled into one line on
  `p5b-journey-engine` — nothing lost, no force-pushes needed on the Replit side.
- **State Document v2.4** (Curtis's master, June 12) checked into the repo as
  `docs/STATE_DOCUMENT_v2.4.md`, superseding the v2.1 snapshot.
- Started `docs/questions-for-curtis/open-questions.md` (12 open decisions) and this file.
- Fixed a type error in a design mockup that was breaking the project-wide check.

## Earlier (before this log existed) — where the build stood

High-level summary; the State Doc is the authority on this history.

- **Phases 1–3, D1/D1.1** — platform skeleton: eight role dashboards, quote → rate →
  proposal → pipeline flow, rating engine with real BIC rate data (~25k rows), and the
  purple/pink design system with light + dark modes.
- **Phase 3.5** — real authentication (sessions, hashed passwords, role checks on every
  API route); Supabase removed permanently.
- **Phase 4A/4B** — Accounts module (Leads / Prospects / Clients tabs) and user
  profiles + admin user management.
- **Phase 4.1** — pipeline corrected to 8 operational stages.
- **P5b journey engine** — implementation trackers instantiate from templates when a
  deal binds; progress rolls up; completing the tracker automatically makes the
  account an Active Client (46-check test harness proves it).
- **P5-WC (in progress)** — Curtis's WC binding process from State Doc §6: the 4-phase
  WC Implementation Tracker (WC-0), the 10-item bind subjectivities checklist with the
  60-day loss-run staleness rule (WC-1), and binder/policy upload that auto-completes
  tracker phases (WC-3a). Demo companies seeded for each stage of the story
  (Green Valley → Cascade Wellness → Emerald Coast).
- **Still open in P5-WC:** listener email receiving (WC-5), broker fee (WC-2), deposit
  monitor (WC-3b) — several blocked on questions 5–7 in the questions doc.
