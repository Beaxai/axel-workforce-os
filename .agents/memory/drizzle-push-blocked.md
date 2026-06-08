---
name: Drizzle push blocked by pre-existing constraint prompt
description: Why `pnpm --filter @workspace/db run push` (and push-force) can hang, and the safe workaround for additive columns.
---

`pnpm --filter @workspace/db run push` / `push-force` can stall on an interactive
TTY prompt (e.g. "add `deals_reference_code_unique` unique constraint … truncate?")
caused by **pre-existing schema↔DB drift**, not your change. Piping newlines does
not answer it, and `--force` still shows it.

**Why:** drizzle-kit reconciles the whole schema on every push; any unrelated drift
surfaces as a blocking prompt that the sandbox can't answer interactively.

**How to apply:** for a simple additive, nullable column, skip push and run the
targeted DDL directly: `psql "$DATABASE_URL" -c "ALTER TABLE <t> ADD COLUMN IF NOT
EXISTS <col> <type>;"`. The Drizzle schema file stays the source of truth (update it
too) so a future clean push reconciles everything. Don't truncate to satisfy the prompt.
