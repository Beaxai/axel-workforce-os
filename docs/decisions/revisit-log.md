# Decisions to revisit

A living register of decisions that were **made deliberately but are meant to be reconsidered later**,
plus **open decisions** still owed an answer. This is the place to look before re-litigating something —
if a choice is here, it was intentional and the trade-off is recorded.

- **Decided (revisitable):** we picked something and moved on, knowing we may change it.
- **Deferred:** intentionally not built/decided yet; scheduled for a later phase.
- **Open:** needs an owner's answer before it can proceed.

Owner of binding decisions: **Curtis Prince (CEO)**. Lead engineer: **Brendan**. Binding decisions live
in the State Document v2.1 (not in this repo); this log tracks the revisitable/deferred ones around them.

_Last updated: 2026-06-22._

---

## Decided — revisitable

### 1. Phase 4C deal-card layout = Option B
- **Decided:** 2026-06-22 · **Owner:** Brendan · **Status:** locked for the 4C build.
- **What:** the deal card's six submission sections render as **completeness buttons in the right rail**;
  WC/WFS pricing sits in the **KPI strip**; **Approve/Decline are header actions** (spec-literal §8).
- **Alternative not taken:** Option C (compact completeness summary in the rail + full-width editing on a
  dedicated "Submission" tab).
- **Why revisitable / reversal cost: LOW.** B↔C differs only in **front-end layout** — no database, API,
  or schema change. Switching later is contained to `DealCardModal` and its child components.
  Note the asymmetry: **C → B is easier than B → C** (a roomy editor can be summarized into rail buttons,
  but cramming a rail editor into a roomy tab means rebuilding the editor).
- **Revisit when:** rail-based section editing proves cramped in real use, or user/owner feedback favors C.
- **Refs:** [`2026-06-15-4c-deal-card-layout.md`](2026-06-15-4c-deal-card-layout.md) ·
  [`../build-prompts/phase-4c-deal-card.md`](../build-prompts/phase-4c-deal-card.md) ·
  [`../superpowers/specs/2026-06-15-4c-deal-card-design.md`](../superpowers/specs/2026-06-15-4c-deal-card-design.md)

### 2. Deal-card container = existing full-screen modal (not a `/deals/:id` route)
- **Decided (default):** carried from the 4C spec · **Owner:** Brendan to confirm after more time in code.
- **What:** keep the existing `DealCardModal` (`openDealCard` / `GlobalDealCardHost`) rather than a
  dedicated routed page. 4A already opens deals via this modal, so the contract is preserved.
- **Why revisitable / reversal cost: LOW** — the 4C component decomposition (spec §10) is structured so
  the pieces can lift into a `/deals/:id` route later without a rewrite.
- **Revisit when:** deep-linking to a deal, or shareable deal URLs, become a real requirement.
- **Refs:** 4C spec §11.

---

## Deferred — scheduled for a later phase

### 3. Deal-card communication hub (RFI / AI quote-variation / AI composer) → P6
- **Deferred:** to **Phase P6** · per the 4C spec §2.
- **What:** in 4C the Overview tab ships as a **static, read-only activity feed + manual notes**. The
  blocking-RFI workflow with countdowns, the AI quote-variation engine, and the AI message composer
  (all shown in the owner's Stitch reference) are **vision, not built in 4C**.
- **Revisit when:** P6 begins. Do not build these in 4C.

---

## Open — needs an owner's answer

### 4. Header stage tracker: 6 macro phases vs the binding 10-stage pipeline  ⚠ binding
- **Open:** needs **Curtis** · blocks only the deal-card header stepper (build the rest of 4C meanwhile).
- **What:** the Stitch reference shows a condensed **6-phase** tracker (Submission Pending → Indication →
  U/W Review → Approved/Declined → Binding → Implementation), but binding decision / State Doc §11 defines
  the pipeline as **10 stages** (New Lead → Qualified → Needs Analysis → Proposal Sent → Negotiation →
  Decision Pending → Committed → Documentation → Bound → Client).
- **Decision needed:** (a) header = a macro **lifecycle** tracker *distinct* from the 10-stage Kanban, or
  (b) header **mirrors the real 10 stages**. This **touches a binding decision** — do not silently pick.
- **Refs:** 4C spec §15.

### 5. State Document v2.1 not checked into the repo
- **Open:** request to **Curtis** to check it into `docs/` (or share for diffing).
- **Why it matters:** it is the named source of truth but lives outside Git, so code can't be diffed
  against it and §-numbered acceptance tests (e.g. §8) are reconstructed/approximated. Reconcile the 4C
  acceptance-test numbering against the real §8 once available.
- **Refs:** `CLAUDE.md` ("not checked into this repo — request it if you need to diff against it").

---

## Standing technical debt (revisit on the monthly audit)

These are not feature decisions but recurring "we know, and chose to defer" items worth re-checking.

- **Drizzle `push` blocked by `deals` drift** — schema is applied via **direct SQL DDL** while Drizzle
  files stay source of truth. Resolve the drift so `drizzle-kit push` is reliable again, restoring the
  intended workflow. (MEDIUM) · `.agents/memory/drizzle-push-blocked.md`.
- **helmet CSP disabled** (`contentSecurityPolicy: false`) — re-enable a real CSP. (LOW)
- **No test runner / linter** — `tsc --noEmit` is the only correctness gate; no way to catch runtime,
  rating-math, or authz regressions automatically. (LOW)
- **Large binaries committed to Git** (multi-MB `.xlsx`/`.pdf` under repo root, `Server/data/`,
  `attached_assets/`) — consider LFS/extraction. (LOW)
- **Refs:** [`../../INTAKE.md`](../../INTAKE.md) §5 (risk flags).
