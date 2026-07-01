---
name: Bind (BOUND) stage transition atomicity
description: Why the PATCH /deals/:id BOUND path must stay transactional with a row lock
---

The BOUND stage transition in `deals.ts` PATCH runs the bind-readiness gate, stage
update, STAGE_CHANGE activity log, and the implementation-tracker trigger inside a
single `db.transaction`, reading the deal with `.for("update")` (row lock).

**Why:** These are separate statements. Without a transaction + row lock, concurrent
BOUND requests (or a UI double-fire) TOCTOU-race: both pass the readiness check and
both create trackers, since `implementation_trackers` has NO DB unique index on
`(deal_id, product_type)` — the trigger's idempotency is only a read-then-insert
guard. A failure after the stage update also left the deal BOUND without its tracker.

**How to apply:** Any helper that participates in this path (`isBindReady`,
`fireImplementationTrigger`) takes a `DbOrTx` handle and must be called with the `tx`,
never the outer `db`. If you ever move the trigger or add more BOUND side effects,
keep them in the same transaction. A DB-level unique index on
`implementation_trackers(deal_id, product_type)` + insert-on-conflict would be the
belt-and-suspenders alternative if the row-lock approach is ever removed.
