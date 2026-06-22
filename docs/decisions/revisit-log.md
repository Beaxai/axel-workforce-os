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

### 1. Phase 4C deal-card layout = Curtis's Stitch design  (was "Option B", overridden 2026-06-22)
- **Decided:** 2026-06-22 · **Owner:** Curtis (overriding Brendan's earlier Option B) · **Status:** locked.
- **What:** build the deal card to Curtis's **Stitch** design (`mockups/4c-deal-card/stitch-reference/`):
  rail = **WC/WFS pricing + Approve/Decline**; the **six sections on a Submission tab**; an **Overview
  collaboration hub** (messages/RFI/AI); a **6-phase macro tracker** in the header. §8's functional
  requirements (completeness, editor overlays, re-rate, sync, roles) are unchanged and move to the
  Submission tab. Re-skin the Stitch's blue/green to Axel tokens.
- **Two rulings baked in:** (a) the 6-phase tracker is **display-only**; the binding **10-stage pipeline
  (§11) is untouched**; (b) the hub is **UI now, AI quote-variation + RFI logic deferred to P6**.
- **Why revisitable / reversal cost: LOW–MEDIUM** — still front-end-only (no schema/API migration beyond
  the `rating_stale` flag + Approve/Decline endpoints), but more surface than a pure rail swap.
- **Doc sync:** supersedes §8's "buttons in rail" wording — replacement §8 text drafted for Curtis in
  [`2026-06-22-4c-stitch-section8-update.md`](2026-06-22-4c-stitch-section8-update.md); paste into the
  State Document so the doc matches the build.
- **Refs:** [`2026-06-15-4c-deal-card-layout.md`](2026-06-15-4c-deal-card-layout.md) ·
  [`../build-prompts/phase-4c-deal-card.md`](../build-prompts/phase-4c-deal-card.md) ·
  `mockups/4c-deal-card/stitch-reference/`

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

### 4. Header stage tracker: 6 macro phases vs the binding 10-stage pipeline — ✅ RESOLVED 2026-06-22
- **Resolved (Curtis):** the deal-card header shows the **6-phase macro tracker as a DISPLAY-ONLY
  lifecycle indicator** (Submission Pending → Indication → U/W Review → Approved/Declined → Binding →
  Implementation), **mapped from** the deal's real pipeline stage. The binding **10-stage pipeline (§11)
  is unchanged** — option (a). No binding violation; build it.
- **Refs:** State Doc §11; `phase-4c-deal-card.md` (ruling #1).

### 5. State Document v2.1 not checked into the repo — ✅ RESOLVED 2026-06-22
- **Resolved:** both truth docs are now in the repo — [`STATE_DOCUMENT_v2.1.md`](../STATE_DOCUMENT_v2.1.md)
  and [`PROJECT_INSTRUCTIONS.md`](../PROJECT_INSTRUCTIONS.md) — plus the Stitch 4C reference under
  `mockups/4c-deal-card/stitch-reference/`. Code can now be diffed against §8 directly. Curtis's master
  .docx remains canonical; re-sync these after each State-Document update.

### 6. Phase 4C: State Doc §8 text vs the Stitch visual conflict — ✅ RESOLVED 2026-06-22
- **Resolved (Curtis): build the Stitch.** Curtis chose his Stitch layout over §8's "buttons in rail"
  wording. The rail holds **WC/WFS pricing + Approve/Decline**; the six sections move to a **Submission
  tab**; **Overview** is the collaboration hub; the header carries a **6-phase macro tracker**. §8's
  functional requirements are unchanged. The comms hub's AI/RFI logic is **deferred to P6** (UI now).
- **Doc sync (open):** §8's text now lags the build — paste the replacement §8 from
  [`2026-06-22-4c-stitch-section8-update.md`](2026-06-22-4c-stitch-section8-update.md) into the State
  Document (Curtis owns the doc) so they match again.
- **Refs:** State Doc §8/§11; decision #1; `phase-4c-deal-card.md`.

### 7. Phase 4C header stage tracker: 6 macro phases vs binding 10-stage  ⚠ binding
- **Open:** needs **Curtis** if a header tracker is built; otherwise default to the binding 10 stages.
- **What:** the Stitch shows a **6-phase** tracker (Submission Pending → Indication → U/W Review →
  Approved/Declined → Binding → Implementation). §8 does **not** ask for any header-tracker change, and
  §11 **binds the pipeline to 10 stages**. So 4C should **not** introduce the 6-phase tracker; if a
  header lifecycle indicator is wanted, it's a distinct binding decision for Curtis.
- **Refs:** State Doc §8 (silent on header) + §11 (10-stage pipeline, binding).

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
