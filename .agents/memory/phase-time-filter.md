---
name: Deal-card phase time filter
description: Gotchas around the milestone-tracker stage-span time filter in the deal card
---

- Stage moves are logged under THREE activity event types: `STAGE_CHANGE` (kanban PATCH /deals), plus `deal_approved` and `deal_declined` (deal-card decisions). All carry `metadata.from_stage`/`to_stage`. Any timeline reconstruction must include all three or approve/decline flows produce wrong windows.
- **Why:** the architect caught a mis-filter when only STAGE_CHANGE was read; and a single min/max envelope wrongly includes gaps when a deal re-enters a span — keep the multi-interval union in `timeWindow` (DealCardShell) / `winHas` (SupportingTabs).
- Playwright synthetic mouse drags do NOT fire `pointerenter` chains across the tracker nodes — automated tests must use the shift-click fallback to select a span; drag can only be verified manually.
