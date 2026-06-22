# Phase 4C — Replit kickoff (paste this into Replit)

> Copy the block below into Replit/Claude Code to start the Phase 4C build. It points the agent at the
> full build prompt (`phase-4c-deal-card.md`), which is State Document §8 restated 1:1. Everything
> referenced is already on `origin/awf-os-brendy-sprint-1` — pull first.

---

Phase 4C — Deal Card Submission Panel. Build mode, on branch `awf-os-brendy-sprint-1` — never commit, merge, or PR to `main`.

Read and follow `docs/build-prompts/phase-4c-deal-card.md` in full. It restates State Document §8 (`docs/STATE_DOCUMENT_v2.1.md` → Section 8) 1:1 — §8 is the source of truth; where anything disagrees, §8 wins.

Audit the actual files on this branch before writing code. Build exactly §8:

- Right rail: a summary block on top (business name, quote-type badge, state(s), effective date) + six section buttons as glass-card rows (Business Info, Locations, Workforce, Operations, Loss History, Coverage/Program), each with a completeness indicator. Remove payroll/headcount from the rail — the KPI strip owns them.
- Section fields derive from the existing submission schema (submission_questions/answers + lib/cannabis-application) — every field maps to exactly one section; no parallel list.
- Completeness (complete / N missing / not started + aggregate) is computed server-side.
- Clicking a section opens a heavy-glass overlay (blur 40) with inline Edit and Zod validation; saves write to the same records the rating engine and the 4A account read.
- Re-rate flag: rating-relevant edits (payroll, headcount, class codes, EMod, state, locations) set `rating_stale` on the deal and show a persistent "re-rate required" banner that clears after re-rate; non-rating edits don't.
- Every save logs a field-level activity diff and syncs company-level fields to the linked account (4A rules).
- Roles server-enforced: ADMIN/CSA edit all; UNDERWRITER edit none (PATCH → 403); AGENT edits own deals; EMPLOYER edits a subset (Loss History view-only); CARRIER/PEO view-only.
- API: GET sectioned payload + completeness; PATCH per section with role + field validation (FEIN format, class code must exist in wc_rates for the state). Update openapi.yaml → regenerate Orval/Zod; never hand-edit generated/.
- Schema via explicit SQL DDL, not a blanket drizzle-kit push (the likely change is a narrow deals.rating_stale boolean). No Supabase.
- Design: tokens only (pink primary / purple support / single gradient CTA), Inter/Jost, the two glass recipes. Verify light AND dark.

Do NOT build (not in §8 — the Stitch mockup shows some of these): Approve/Decline actions; relocating premium pricing; the comms hub / RFIs / AI quote-variation / AI composer (deferred to P6); the Stitch's 6-phase header tracker (pipeline is binding at 10 stages — flag to Curtis, don't build). The Stitch is a layout reference only — its blue/green colors are not the brand; re-skin to Axel tokens.

When done: run §8's acceptance tests and report pass/fail each; run `pnpm typecheck` two ways (`scripts/typecheck-baseline.sh` 0/0 and `pnpm typecheck` exit 0); commit `docs/build-prompts/phase-4c-report.md`; push to `awf-os-brendy-sprint-1`. Screenshots (light + dark) in chat only — do not commit images.

---
