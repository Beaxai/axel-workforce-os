# Build Decisions Log

Why each piece was built the way it was, traced to the exact lines of the State
Document (`docs/STATE_DOCUMENT_v2.4.md`) and Curtis's instructions
(`docs/PROJECT_INSTRUCTIONS.md`) that called for it. Newest at the top. Every
plan gets an entry BEFORE building (the mandate) and the entry is updated or
extended when the work closes (what actually happened). Written by/with the
`scope-auditor` agent (`.claude/agents/scope-auditor.md`). Companions:
`docs/COMPLETED.md` (what's done) and
`docs/questions-for-curtis/open-questions.md` (what's undecided).

---

## 2026-08-02 — WC-3b deposit monitor: plan + Task 1 (timer starts at bind)

**What we're building:** the carrier-deposit monitor. When a deal reaches Bound, a
30-day clock starts; at day 21 a CSA task asks the carrier to confirm; a
cancel-for-nonpay notice marks the deal at-risk with an alert. It never blocks the
client becoming an Active Client. Branch `p5-wc3b-deposit-monitor`.

**Where it comes from:** State Doc §6E (STATE_DOCUMENT_v2.4.md:232–234): "Deposit
monitor (parallel, NON-GATING)… 30-day timer from bind date; CSA task at day 21 to
request carrier confirmation; a cancel-for-nonpay notice flags the deal at-risk with an
alert." §6 preamble (line 170): "This spec drives the P5-WC build."

**Why built this way:**
- Three new columns on the deal (status / due date / day-21 stamp) instead of a new
  table — one deposit per bound deal, and the doc describes deal-level state.
- Timer anchors to a real `bound_at` timestamp. It existed but nothing set it on the
  stage move, so entering Bound now stamps it once (engineer call under §9 line 319;
  §6E says "from bind date", so the date must exist).
- The monitor is started inside the same locked transaction as the Bound triggers, and
  it is idempotent: re-entering Bound never resets a CONFIRMED or AT_RISK deposit.
- UI decision (asked by Brendan up front): background-only where possible. The timer
  and day-21 task are pure background; the day-21 task appears in the EXISTING task
  drawer — no new UI. Only two things need a surface, and both are mandated: the
  at-risk ALERT (the word "alert" in line 234) and the manual confirm/cancel-notice
  actions — until listener email (WC-5) exists there is no other way for the status to
  ever change. So the whole UI is one small deposit block on bound deals' cards
  (status + two ADMIN/CSA buttons), coming in Task 3.

**What we did NOT do and why:** no automatic ingestion of the carrier notice (that is
WC-5 listener email scope, §6F line 236); no schema-push through drizzle yet — the
known deals-table drift means the columns ship as reviewed SQL if push hangs (repo
CLAUDE.md, Database section).

**Questions raised:** none — §6E is unambiguous.

## 2026-08-02 — Choosing the next build items (WC-3b deposit monitor, WC-2 broker fee, D2 closure)

**What we're building:** the next round of work while SEC-1 awaits review — the
carrier-deposit monitor, the broker fee field/tracking, and the two remaining
light-mode items.

**Where it comes from:**
- Deposit monitor — State Doc §6E (STATE_DOCUMENT_v2.4.md:232–234): "30-day
  timer from bind date; CSA task at day 21 to request carrier confirmation; a
  cancel-for-nonpay notice flags the deal at-risk with an alert." §6 preamble
  (line 170): "This spec drives the P5-WC build."
- Broker fee — §6A item 10 (line 205): "Default 7% of total premium; deal-level
  editable field (ADMIN/CSA)… TRACKED, NON-BLOCKING"; §6F (line 237): fee
  field, invoice generation and paid-status tracking "land in P5; full billing
  module remains P7."
- D2 closure — §4 (line 114): "REMAINING: (1) migrate Step1BusinessDetails,
  Step4Indication, P2 steps, FinalSubmission off raw literals; (2) run axe-core
  contrast check… both modes — and record results." §5 marks D2 the only
  ACTIVE phase.

**Why built this way (why these three):** they are the only items in the
documents that are explicitly mandated AND not blocked on an open Curtis
question or a missing external account. WC-5 (listener email) is blocked on
the domain ruling (Q5); HelloSign signing on the live key (Q6); SEC-1 merge on
Q1–Q4.

**What we did NOT pick and why:** the PEO tracker (§6G, lines 242–251) is
specced but belongs to the PEO leg of P5, behind the WC leg; the drizzle-push
drift fix has NO State Doc mandate — it is repo tech debt (CLAUDE.md,
Database section) done as enabling work under §9 line 319 (Brendan owns
execution). The broker-fee "notify with payment link" automation stays stubbed
because email sending is "Absent — not wired" (§2, line 66) until P6.

**Questions raised:** none new (all blockers already filed as Q1–Q7).

## 2026-08-02 — SEC-1 multi-tenant data scoping (retroactive entry; built this date)

**What we built:** every login now sees only its own rows — agents their sold
deals, brokers their agency's book, employers their company's deals, internal
roles everything, everyone else nothing. Enforced on all read paths, the deal
card, and search; new deals auto-tagged with who sold them. Branch
`sec1-multi-tenant-scoping`, not merged.

**Where it comes from:**
- State Doc §4, 4C requirements (line 122): "Server-enforced role access:
  ADMIN/CSA edit all; UNDERWRITER view-only; AGENT edit own deals; EMPLOYER
  edit business sections only… CARRIER/PEO view-only relevant sections" — the
  only explicit server-enforced access mandate in the doc; SEC-1 generalizes
  "AGENT edit own deals" from the right rail to every endpoint.
- Owner rules given directly by Brendan 2026-07-20 (recorded in the SEC-1 plan,
  docs/superpowers/plans/2026-07-20-sec1-multi-tenant-data-scoping.md,
  "Owner rules" section): agent → own produced deals; broker → whole org;
  org member → org's deals.
- Instructions/working agreement §9 (lines 319–322): Brendan owns execution;
  acceptance tests before done; audit actual files, never memory.

**Why built this way:**
- One shared module (scope.ts) instead of per-route rules — so the temporary
  journeys view can be deleted later without touching authorization (plan's
  decoupling note).
- Fail-closed everywhere (unknown role/no org → zero rows) — security work
  must under-show, never over-show; there is no State Doc line granting
  carriers/PEOs/vendors list access, so absence of a mandate = no access (Q4).
- Out-of-scope IDs return "not found" instead of "forbidden" — so an ID can't
  be used to confirm another tenant's deal exists. Engineer's call under §9.
- Existing deals left untagged (agents temporarily see nothing) — a backfill
  changes data meaning, which is Curtis's to rule on (Q1); safe direction
  chosen deliberately.

**What we did NOT do and why:** no schema change for account→org linkage (no
mandate; tied to the client-login design, Q8); journeys view left with
agent-sees-all (slated for deletion; flagged Q-report item 7); no OpenAPI
contract change (deals CRUD predates the contract entirely).

**Questions raised:** Q1 (demo-deal tagging), Q2 (broker model — interprets
§8's role list, line 291 area), Q3 (assigned vs sold visibility), Q4
(carrier/PEO/vendor zero access) — all in
docs/questions-for-curtis/open-questions.md with suggested answers.
