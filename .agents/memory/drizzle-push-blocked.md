---
name: Drizzle push blocked by pre-existing drift
description: Why schema DDL on this repo is applied via direct SQL, not drizzle-kit push
---

# Drizzle push is a landmine on this project

`pnpm --filter @workspace/db run push` (drizzle-kit push) hangs on an interactive
prompt caused by **unrelated pre-existing drift** between the Drizzle schema and the
live DB — notably wanting to add `deals_reference_code_unique` and TRUNCATE `deals`.

**Rule:** apply schema changes via direct `psql`/SQL DDL (`CREATE TABLE`, `ALTER TABLE ... DROP CONSTRAINT`) while keeping the Drizzle schema files as the source of truth. Do NOT run push to apply a single change — it will block and could prompt destructive `deals` truncation.

**Why:** push is all-or-nothing against the whole schema; the drift is not ours to resolve and accepting its prompts risks data loss.

**How to apply:** any time you add/alter a table or constraint here, edit the Drizzle schema file for documentation/source-of-truth, then mirror it with explicit SQL DDL against `$DATABASE_URL`.

**Gotcha:** Postgres-auto-generated constraint names can diverge from the schema's explicit `unique("name")`. The wc_rates uniqueness lived under the default name `wc_rates_state_class_code_effective_date_key`, not the schema's explicit name. Always look up the real constraint name from the catalog before dropping.
