# What's Done — Running Log

Plain-English record of completed work. Newest at the top. Every time a stage
finishes, a new dated section is added here (companion to
`docs/questions-for-curtis/open-questions.md`, which tracks what's still undecided).

---

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
