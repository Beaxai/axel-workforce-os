# Phase 4C — Replit kickoff (paste this into Replit)

> Copy everything in the block below into Replit/Claude Code to start the Phase 4C build. It points
> the agent at the full build prompt (`phase-4c-deal-card.md`) and restates the hard rules. Everything
> referenced is already on `origin/awf-os-brendy-sprint-1`.

---

Phase 4C — Deal Card Submission Panel. Build mode, on branch `awf-os-brendy-sprint-1` — never commit, merge, or PR to `main`.

Read and follow `docs/build-prompts/phase-4c-deal-card.md` in full. Its source of truth for behavior is `docs/superpowers/specs/2026-06-15-4c-deal-card-design.md` — where the two disagree, the spec governs, except the layout, which is locked to Approach B.

Before writing code, audit the actual files on this branch (don't trust memory or docs for exact figures). Then build the deal card per the prompt. Non-negotiables:

- Layout = Approach B only: six submission sections as completeness buttons in the right rail; WC + WFS pricing in the KPI strip; Approve/Decline as header actions. No "Submission" sub-nav tab.
- Comms is static in 4C: Overview = read-only activity feed + manual notes. Do NOT build RFIs, AI quote-variation, or the AI composer — those are deferred to P6.
- Completeness is computed server-side; the client only renders it.
- Roles are server-enforced: ADMIN/CSA edit all; UNDERWRITER edits none (PATCH → 403); AGENT edits own deals; EMPLOYER edits a subset (Loss History view-only); Approve/Decline = UNDERWRITER/ADMIN only.
- Split the ~1,879-line `DealCardModal` into the components listed in the prompt.
- Schema via explicit SQL DDL, not a blanket `drizzle-kit push` (the `deals` drift hangs). The likely change is a narrow `deals.rating_stale` boolean.
- API changes: update `lib/api-spec/openapi.yaml` → regenerate Orval hooks + Zod. Never hand-edit anything under `generated/`.
- Design: tokens only (pink primary / purple support / single `--gradient-cta`), Inter/Jost, the two glass recipes. Verify light AND dark.
- One thing to STOP on: the header stage tracker is an unresolved binding decision (6 macro phases vs the real 10-stage pipeline). Build everything else; gate only the header stepper and ask Curtis before choosing.

When done: run the 10 acceptance tests in the prompt and report pass/fail for each; run `pnpm typecheck` two ways (`scripts/typecheck-baseline.sh` 0/0 and `pnpm typecheck` exit 0); commit `docs/build-prompts/phase-4c-report.md` with the results; and push to `awf-os-brendy-sprint-1`. Put light + dark screenshots in chat — do not commit images.

---
