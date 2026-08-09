---
name: Deal card layout history
description: Documents the layout evolution of DealCardShell — specifically what lives in the right rail vs. left nav tabs.
---

# Deal Card Layout — Settled State (2026-08-09)

## Submission tab (2026-08-09 update)
- Inline wizard-style form: six sections rendered as directly-editable fields (shared `FormFields` components), per-section Save/Discard row, drafts keyed per touched field.
- `SectionEditorOverlay.tsx` was DELETED; the card+overlay pattern is gone. Edit gating still comes from server `payload.access`; readOnly fields render as dashed non-editable values.
- Scope decision: keeps the existing deal/account-backed fields only — NOT a full wizard mirror (cannabis application answers in `submission_answers` are not editable from the card). Brendan chose "quick win, no backend changes."

## Current layout (graduated from Variant A mockup)
- **Right rail (264px, persistent):** `PricingRail` — WC Annual Premium card, WFS pricing card, Approve/Decline. Visible on every tab.
- **Left sub-nav (132px):** 7 tabs — Overview, Submission, Subjectivities, Documents, Quote, Policy, **Tasks** (restored).
- **Tasks tab content:** `TasksTab` from `SupportingTabs.tsx` — task list, add-task form, grouped Overdue/Open/Done.

## What was removed in this change
- `TaskDrawer` (the collapsible 264px right-rail task panel) is no longer imported or rendered in `DealCardShell`. The file `TaskDrawer.tsx` still exists on disk but is unused.
- The Quote-tab-only `PricingRail` card row (was in a `repeat(auto-fit, minmax(220px,1fr))` grid) was removed; pricing now lives in the persistent right rail.

## What was NOT restored
- The "Request Proposal / Next Action" card that the `TaskDrawer` surfaced prominently (using `nextAction` prop + `PinkButton`) is no longer visible. The `openIndicationForm` callback still exists in DealCardShell but is only reachable via the KPI strip badges in the header map area.

**Why:** Brendan approved Variant A from the canvas mockup and asked to graduate it. The next-action CTA location is a known gap — see follow-up task.

## How to apply
- Keep `PricingRail` in the right rail; do not move it back to the Quote tab card row.
- `TaskDrawer.tsx` can be deleted once confirmed no other import references it.
- If "Request Proposal" needs re-surfacing, the pattern is a pinned card at the top of the Tasks tab content (before `TasksTab`), using `openIndicationForm` and the `payload.sections` incomplete count hint.

## Pricing rail inline Modify (Aug 2026)
- Both rail cards have inline "Modify" editors: WC uses quote-variations preview/apply (Apply gated on a fresh preview; any lever edit invalidates it); WFS re-quotes via /rate/wfs with payroll/headcount overrides.
- PricingRail is keyed by dealId so editor state resets on deal switch; WFS + apply handlers are loadSeq-guarded.
- Levers hydrate from GET /quotes/by-deal, preferring workforceProfile values (multi-location quotes store levers there, not top-level columns — server variation base still reads columns; see task about wrong multi-location starting values).
