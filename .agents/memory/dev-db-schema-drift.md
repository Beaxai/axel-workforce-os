---
name: Dev DB schema drift vs drizzle push
description: Shared dev DB carries columns from unmerged branches; drizzle push data-loss prompt aborts silently (exit 0) with closed stdin.
---

The shared dev database can hold columns created by unmerged feature branches (e.g. the deposit-monitor branch added `deposit_status`, `deposit_due_date`, `deposit_day21_task_at` on `deals`).

**Why:** `pnpm --filter db push` (drizzle-kit) shows an interactive data-loss prompt when the code schema lacks columns that exist in the DB. With stdin closed (post-merge script), the prompt gets EOF, selects "No, abort" — and still exits 0, so the script reports success while the push was never applied. Any real schema change then silently fails to land.

**How to apply:** If `db push` output mentions a data-loss prompt, do NOT force the drop — the data may belong to an in-flight branch. Reconcile by declaring the drifted columns in `lib/db/src/schema/deals.ts` (or the relevant schema file) so push becomes a no-op, then re-run. Verify post-merge with `runPostMergeSetup()` and check the stdout log tail for "Changes applied", not just `success: true`.
