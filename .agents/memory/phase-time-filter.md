---
name: Deal-card phase time filter
description: Gotchas around the milestone-tracker stage-span time filter in the deal card
---

- Stage moves are logged under THREE activity event types: `STAGE_CHANGE` (kanban PATCH /deals), plus `deal_approved` and `deal_declined` (deal-card decisions). All carry `metadata.from_stage`/`to_stage`. Any timeline reconstruction must include all three or approve/decline flows produce wrong windows.
- **Why:** the architect caught a mis-filter when only STAGE_CHANGE was read; and a single min/max envelope wrongly includes gaps when a deal re-enters a span — keep the multi-interval union in `timeWindow` (DealCardShell) / `winHas` (SupportingTabs).
- Per-node `pointerenter` drags were unreliable (Playwright drags never fired them). Fixed by a window-level `pointermove` that hit-tests clientX against the tracker row rect and snaps to the nearest flex cell — real drags now work and are Playwright-testable with stepped mouse.move.
- Click semantics (user-specified, keep): unlimited extend clicks — each click on a new node extends the span to include it; only re-clicking the node just clicked (tracked via a lastClick ref, reset on clear/deal-switch) reverts to the full timeline. Drag handle follows the exact pointer and snaps only within ~35% of a cell width of a node center.
- The deal-card dialog must keep a FIXED height (`height: 92vh`, not maxHeight) and a fixed-height pill slot — content-driven height makes the dialog jump when filters shrink the feed.
