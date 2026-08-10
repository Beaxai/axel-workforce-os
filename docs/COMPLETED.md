# What's Done — Running Log

Plain-English record of completed work. Newest at the top. Every time a stage
finishes, a new dated section is added here (companion to
`docs/questions-for-curtis/open-questions.md`, which tracks what's still undecided).

---

## NOT COMPLETED — what remains in this sprint, and what each item is waiting on

*(Status as of 2026-08-10. "Q" numbers refer to the questions doc. Sources: the State
Document's binding process spec (§6) and phase plan (§5), and the engineering
instructions. This block gets updated as items finish and move into the log below.)*

**Buildable now — no decision needed:**

- **Quote-acceptance / bind-order PDF** — the one signable document without a
  generator yet; buildable once Curtis says template vs. our one-pager design
  (see questions doc 2026-08-10 item D).
- **Signature field placement** — envelopes currently use free-form signing;
  placing exact signature/initial fields on the ACORD + supplemental is a
  refinement pass (questions doc item E).

*(2026-08-10: real signatures, the Stripe payment webhook, the stage-placement
fix, and the duplicate hard block all moved to the completed log below.)*

**Waiting on something:**

- **Turn on the security work (SEC-1)** — merge + tag the demo deals → waiting on
  **Q1–Q4** (mostly Q1).
- **Deal email receiving (WC-5)** — code is built and live-tested; domain is
  `axelins.com` (Q5 closed) → waiting only on **DNS setup** (Resend verification,
  listener MX, webhook signing secret). On Brendan.
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

## 2026-08-10 (later) — Real signatures, Stripe webhook, stage fix, pipeline UX

- **Real SignWell signing (§6F).** Sending a bind package now generates the real
  PDFs (ACORD 130, Axel supplemental, carrier supplemental) and creates a real
  SignWell envelope for the client + Axel signer. When everyone signs, the platform
  downloads the signed PDF, marks the deal bound, checks off the ACORD + supplemental
  checklist items, and advances the account to New Client. Webhook at
  `/api/webhooks/signwell` treats every event as a hint and confirms against
  SignWell's API, so forged calls are harmless. **Blocked on one click:** the
  SignWell account email must be verified before real sends work (questions doc,
  2026-08-10 items A/B).
- **Stripe payment webhook.** `/api/webhooks/stripe` auto-marks the broker fee PAID
  when the payment link is paid — same trust model (re-fetches the session from
  Stripe before acting), idempotent, and it ACKs only after processing so Stripe
  retries transient failures. Needs the `checkout.session.completed` event pointed
  at it in the Stripe dashboard.
- **Stage placement fixed (v2.7 §6 Seg 2).** Complete final submissions now land in
  **U/W Review** (was: Indication); incomplete ones still go to Submission Review.
- **Duplicate hard block: already done.** Verified in code — duplicate submissions
  for an account with an active deal are blocked atomically with a 409 + automated
  response and an activity log entry. No new work was needed.
- **Pipeline board UX.** Manual drag-between-stages is gone — stages advance
  automatically as work completes, so the board is now a read surface (cards still
  click through to the deal card). Horizontal navigation is click-and-hold
  drag-panning instead of the scrollbar. All verified by an automated UI test pass.

---

## 2026-08-10 — Broker fee live, light mode closed out, keys in: Stripe verified, Resend/SignWell loaded

**Broker fee (WC-2) — COMPLETE.** Deals carry an editable broker fee (default 7% of
the WC premium from the latest quote — the server computes the amount everywhere; no
surface recalculates it). ADMIN/CSA can adjust the percent, mark paid, waive, or
reinstate as unpaid; the bind checklist's broker-fee line mirrors the status
automatically. It never blocks submission or binding (per v2.7 §7A). If the fee is
unpaid at bind, a dunning email goes to the client and agent — sent exactly once,
even under concurrent binds.

**Stripe payment link — LIVE (Q14 closed).** The dunning email now carries a real
Stripe payment link for the exact fee amount, generated per deal with the deal ID in
metadata for later reconciliation. Verified end-to-end against both keys.
Development uses the test key (fake cards, no real charges); production
automatically uses the live key. If Stripe is ever unreachable, dunning falls back
to a portal link rather than failing — binding is never held up by the payment
provider. *(Still open: a Stripe webhook to auto-mark fees PAID on payment;
until then CSA marks paid manually.)*

**Light-mode closeout (D2) — COMPLETE.** The last four quote-flow screens (Business
Details, Loss History, Extraction Operations, Driving & Delivery Exposure) migrated
off hardcoded dark colors onto the theme tokens. All four passed visual acceptance
in BOTH light and dark mode (screenshots via the browser test run); typecheck stayed
at zero.

**Keys loaded (Q6 closed, Q15A unblocked).** Curtis added `RESEND_API_KEY`,
`SIGNWELL_API_KEY`, and both Stripe keys to the workspace. SignWell's key slots into
the existing signing service — real signatures unblock when that build starts.
Outbound email switched from dev-logging to real sending.

**Email domain settled (Q5 closed in practice): `axelins.com`.** The app is
configured for `deals@axelins.com` outbound and `listener.axelins.com` inbound.
Remaining is DNS-only, on Brendan: verify the domain in Resend (SPF/DKIM records),
add the MX record on the listener subdomain, create the `email.received` webhook
pointing at `/api/webhooks/resend-inbound`, and hand over its signing secret. Until
the domain verifies, sends fall back to Resend's onboarding address (deliverable
only to the account owner).

---

## 2026-08-09 — State Doc v2.7 in, Replit resynced, mockup sandbox retired

**Truth docs:** Curtis's State Document v2.7 and the master process flowchart are now
in the repo (`docs/STATE_DOCUMENT_v2.7.md`, `docs/MASTER_FLOW_v2.7.svg` + a text
transcription agents can read). The open-questions doc was reconciled against v2.7 —
seven questions answered (SignWell, Resend, client self-registration, stage placement,
duplicate blocking, 8 stages, doc update), and two answers became build items: complete
submissions must land in U/W Review (code currently does the opposite), and duplicate
submissions get a hard block, not a warning. One logged deviation: the flowchart
arrived labeled v2.5; relabeled v2.7 on Brendan's instruction (only that one line
changed — verified by diff).

**Replit resync:** Replit had 21 local commits that never reached GitHub (the fork
pattern again). Recovered via a temp branch and merged: the deal-card work (PricingRail,
WC+PEO price badges — unreviewed UI concepts, Curtis heads-up pending) and a schema
guard that stops Replit's silent `db push` aborts. Rejected from the merge: the
deletion of `allowBuilds` from pnpm-workspace.yaml (would risk breaking esbuild).

**Mockup sandbox removed** (Brendan's decision): `artifacts/mockup-sandbox` deleted
from the repo — it was a throwaway UI playground, never part of the product, and the
Replit agent kept parking unreviewed UI experiments there. UI concepts now need a
different route to Curtis (screenshots or a branch). References cleaned: `.replit`,
CLAUDE.md, lockfile. Typecheck green across libs, frontend, api-server after both
the merge and the removal.

---

## 2026-08-09 — Deposit monitor finished (WC-3b complete)

**What it is:** the last two pieces of the §6E carrier-deposit watcher. Bound deals
now show a "Carrier Deposit" card in the deal card's right rail with the current
status (Monitoring / Confirmed / At risk) and, for ADMIN/CSA, two actions: **mark
the deposit confirmed**, or **record a carrier cancel-for-nonpay notice**, which
flags the deal At Risk. The day-21 CSA reminder now actually fires: an hourly
background sweep creates the "confirm carrier deposit" task in the existing task
drawer exactly once per deal, 21 days after bind. As specified, none of this ever
blocks a client from being onboarded — silence means paid.

**Rules encoded:** a confirmed deposit can never be flipped back by a cancellation
notice (409); a late payment *can* clear an At-Risk flag to Confirmed; every change
lands in the deal's activity feed; only ADMIN/CSA may act (others get 403).

**Proof:** 14/14 checks in the deposit verification harness (`verify-deposit.ts`,
transaction-rollback — no permanent rows), 46/46 onboarding regression still green,
live API smoke (confirm / cancel-notice / role block / bad action), and a full
browser walkthrough of the card on a bound deal in **both light and dark mode**.
The `p5-wc3b-deposit-monitor` branch is merged; existing bound demo deals were
backfilled to Monitoring.

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
