# Phase 4C — Replit kickoff (paste this into Replit)

> Copy the block below into Replit/Claude Code to start the Phase 4C build. It points the agent at the
> full build prompt (`phase-4c-deal-card.md`). Everything referenced is already on
> `origin/awf-os-brendy-sprint-1` — pull first.

---

Phase 4C — Deal Card Collaboration Hub (Stitch layout). Build mode, on branch `awf-os-brendy-sprint-1` — never commit, merge, or PR to `main`.

Read and follow `docs/build-prompts/phase-4c-deal-card.md` in full. Build the deal card to Curtis's Stitch design (`docs/mockups/4c-deal-card/stitch-reference/screen.png` + `code.html`), re-skinned to the Axel tokens. §8's functional requirements still hold and move to the Submission tab.

Audit the actual files on this branch before writing code. Build:

- Layout (from the Stitch, re-skinned): left sub-nav (Overview · Submission · Documents · Tasks · Quote · Policy); header with company + badges + deal-team avatars; a 6-phase macro tracker band (Submission Pending → Indication → U/W Review → Approved/Declined → Binding → Implementation); KPI strip (Locations · Employees · Annual Payroll · ExMod).
- Overview = Collaboration Hub: day-grouped activity/message timeline + sticky composer.
- Right rail: WC Pricing (Total Est. Premium from rating_breakdown + Modify), WFS Pricing (+ per-employee + Modify), Submission Actions = Approve (the single gradient CTA) / Decline.
- Submission tab = the six §8 sections (Business Info, Locations, Workforce, Operations, Loss History, Coverage/Program), full-width, each with a completeness indicator; click opens a heavy-glass overlay (glass-panel, blur 40) with inline Edit + Zod validation (FEIN, class-code-in-wc_rates-for-state); saves write to the same records the rating engine + 4A account read; re-rate stale flag; field-level activity diff + account sync. Completeness computed server-side.
- Roles server-enforced: ADMIN/CSA edit all; UNDERWRITER edit none (PATCH → 403); AGENT own deals; EMPLOYER subset (Loss History view-only); CARRIER/PEO view-only. Approve/Decline = UNDERWRITER/ADMIN only (AGENT → 403).

TWO RULINGS (do not deviate):
1. The 6-phase header tracker is DISPLAY-ONLY and is mapped from the binding 10-stage pipeline (§11). Do NOT replace or shrink the 10-stage pipeline — it stays exactly as-is in the Kanban.
2. The hub is UI-now, logic-later: build the layout, a static activity feed (from activity_log), and a working composer that posts a persisted message. The AI quote-variation engine and RFI blocking/countdown logic are DEFERRED to P6 — render them as static placeholders, do not build the live engines.

Guardrails: tokens only — the Stitch's #E6007E / #00C875 / #FFCB00 are NOT the brand; re-skin to Axel (#E91E8C pink primary, #7C3AED purple support, single gradient CTA on Approve, canvas #060608/#f4f4f5, semantic green #22c55e / amber #eab308). Inter/Jost; two glass recipes (card blur-12, panel blur-40 for overlays). Schema via SQL DDL not drizzle-kit push (likely a narrow deals.rating_stale boolean); no Supabase. Update openapi.yaml → regenerate Orval/Zod; never hand-edit generated/. Verify light AND dark.

When done: run the acceptance tests in the prompt and report pass/fail each; run `pnpm typecheck` two ways (`scripts/typecheck-baseline.sh` 0/0 and `pnpm typecheck` exit 0); commit `docs/build-prompts/phase-4c-report.md`; push to `awf-os-brendy-sprint-1`. Screenshots (light + dark) in chat only — do not commit images.

---
