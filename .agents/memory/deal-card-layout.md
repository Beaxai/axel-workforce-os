---
name: Deal card layout history
description: Documents the layout evolution of DealCardShell — specifically what lives in the right rail vs. left nav tabs.
---

# Deal Card Layout — Settled State (2026-08-09)

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
