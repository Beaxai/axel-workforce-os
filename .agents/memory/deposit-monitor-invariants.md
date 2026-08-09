---
name: Deposit monitor invariants
description: §6E carrier-deposit monitor rules — non-gating, system-managed columns, atomicity.
---

**Rules:**
- The deposit monitor is parallel and NON-GATING: it must never block or influence stage transitions, trackers, or the Active Client conversion. Monitor startup runs AFTER the Bound transaction commits (best-effort, try/catch), never inside it.
- `deposit_status` / `deposit_due_date` / `deposit_day21_task_at` are system-managed: stripped from generic POST/PATCH deal payloads. The only mutation paths are the bind trigger, the hourly day-21 sweeper, and the ADMIN/CSA-only `POST /deals/:id/deposit/{confirm|cancel-notice}` route.
- Transitions: MONITORING→AT_RISK (cancel notice), MONITORING/AT_RISK→CONFIRMED; CONFIRMED is terminal (cancel notice after confirm → 409). Resolve uses a row-locked tx; the sweep stamps+creates task+logs in one per-deal tx with a MONITORING predicate.

**Why:** architect review found the original in-tx startup could roll back a bind on deposit failure, and generic PATCH let AGENT/UNDERWRITER forge deposit state.

**How to apply:** any new deal-lifecycle side monitor should follow the same pattern. Also: after stripping fields from a PATCH payload, guard the empty-object case — drizzle `.set({})` throws "No values to set" (500).
