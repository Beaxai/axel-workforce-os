---
name: Dev DB schema drift vs drizzle push
description: Shared dev DB carries columns from unmerged branches; drizzle push data-loss prompt aborts silently (exit 0) with closed stdin.
---

The shared dev database can hold columns created by unmerged feature branches (e.g. the deposit-monitor branch added `deposit_status`, `deposit_due_date`, `deposit_day21_task_at` on `deals`).

**Why:** `pnpm --filter db push` (drizzle-kit) shows an interactive data-loss prompt when the code schema lacks columns that exist in the DB. With stdin closed (post-merge script), the prompt gets EOF, selects "No, abort" — and still exits 0, so the script reports success while the push was never applied. Any real schema change then silently fails to land.

**How to apply:** Do not run blanket `db push` in automatic post-merge setup and never force a truncation/drop prompt. Setup installs dependencies and builds shared libraries; it does not certify database migration completion. Apply required reviewed migrations explicitly to Development and independently verify their effects. Reconcile schema declarations when appropriate rather than dropping other branches' data. A successful setup result alone is not migration evidence.

Automatic introspection can also wait on a unique-constraint truncation prompt
and exhaust the runner timeout. Increasing the timeout or passing `--force`
does not resolve this safety problem.
