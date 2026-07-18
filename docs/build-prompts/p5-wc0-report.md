# P5-WC · WC-0 — Phase Report: WC Tracker Reconciliation

Branch: `p5b-journey-engine` · Closed: 2026-07-18 · Tasks committed: 1, 2, 2.1, 3, 4, 4.1, 4.2

## Scope delivered

- **Task 1** — one product-matched tracker at Bound (v2.4 §8 amended rule), deterministic
  tie-break (exact product → highest version → earliest created), losers reported in
  `ambiguous` and never created
- **Task 2** — system-owned templates: `isSystem`, `systemKey` on template phases/tasks AND on
  live tasks; delete guards returning 409
- **Task 2.1** — system rows cannot be renamed or unlocked via PATCH; empty-payload bodies now
  400 instead of 500
- **Task 3** — Curtis's four-phase WC Implementation Tracker (§6D) seeded as a system template;
  idempotent seed script; harness made hermetic
- **Task 4** — tracker completion flips the account to Active Client (§6D), idempotent, never
  downgrades
- **Task 4.1** — task completion + progress recompute are atomic
- **Task 4.2** — per Curtis's 2026-07-16 ruling, system phases cannot be added or reordered;
  supplemental to-dos inside phases remain fully editable

## Verification

Harness 30/30 rollback-only; typecheck zero new; live HTTP proof of every guard (409s) AND of
the authorized surface (201/204); live data confirmed unchanged before/after (accounts stage
counts identical, seed tripwire 1/true).

### Step 1 regression output (verbatim, 2026-07-18)

```
ALL PASS: 30/30 checks passed.
(DB rolled back — no permanent rows written.)

==> Typechecking web (@workspace/axel-workforce-os)…
    web errors: 0 (baseline 0)
==> Typechecking api-server (@workspace/api-server)…
    api-server errors: 0 (baseline 0)
PASS: no new typecheck errors beyond baseline.

> @workspace/api-server@0.0.0 typecheck /home/runner/workspace/artifacts/api-server
> tsc -p tsconfig.json --noEmit
(exit 0 — no errors)
```

`pnpm --filter db push`:

```
Reading config file '/home/runner/workspace/lib/db/drizzle.config.ts'
Using 'pg' driver for database querying
[✓] Changes applied
```

Note: this drizzle-kit version prints "[✓] Changes applied" even when the diff is empty —
no DDL statements were proposed or listed (a real change prints the SQL first, as it did
when Task 2's columns were applied). Schema is in sync; nothing was applied.

## Legacy empty-tracker audit (Step 2 — INVESTIGATE ONLY, nothing modified)

```
                  id                  |               deal_id                |      type      | product_type | template_id |   status    | overall_progress |          created_at           | stage
--------------------------------------+--------------------------------------+----------------+--------------+-------------+-------------+------------------+-------------------------------+-------
 fa144415-7e5b-4dfd-aa77-8e2ab04f47b1 | 51b906ca-a0d8-4435-92a3-4ccd1f201c4b | IMPLEMENTATION | WC           |             | IN_PROGRESS |                1 | 2026-07-01 16:28:54.338533+00 | BOUND
 534db08b-694a-498f-95e4-cd1418c3b6a3 | c8a29e44-af83-45a9-80de-3757997d43be | IMPLEMENTATION | WC           |             | IN_PROGRESS |                1 | 2026-07-01 16:32:42.442892+00 | BOUND

SELECT count(*) FROM implementation_phases;  → 0
SELECT count(*) FROM implementation_tasks;   → 0
```

Answers:

- **(a)** 2 trackers exist. Both have `template_id` NULL — both are pre-P5b legacy shells.
  ZERO trackers came from the P5b engine so far.
- **(b)** Both shells are `(IMPLEMENTATION, WC)`. Both deals are in stage **BOUND**
  (deals 51b906ca… and c8a29e44…). There are 0 phases and 0 tasks in the entire live
  tables — the shells are completely hollow.
- **(c)** **YES — blocked.** `instantiateJourneysForDeal` skips when a tracker already exists
  for (dealId, type=IMPLEMENTATION, productType=WC), so a re-bind of either deal will be
  skipped and neither can ever receive Curtis's seeded WC tracker while its shell remains.

Nothing was deleted or modified. Decision belongs to Brendan/Curtis (Flag 4 below).

## Deferred out of WC-0 (with reason)

- **§6D auto-satisfy** (binder/policy upload completes Phase 1, or Phases 1+2). There is
  currently NO binder/policy upload anywhere in the codebase — `policy_documents` is only
  ever read, never written. The upload is net-new and belongs to the §6C Bound-flow plan;
  the hook lands with it. `systemKey` already ships so it has a stable target.

## Flags for Curtis

1. **RULING IMPLEMENTED** — his 2026-07-16 ruling is enforced in code: the four phases cannot
   be added to, removed, renamed, or reordered; supplemental to-dos within phases work and are
   deletable by their author.
2. **NEEDS CONFIRMATION** — phase timing (`targetOffsetDays`) is deliberately left EDITABLE.
   §6D cites an SLA range ("carrier SLA 24 hours to 7 days"), which reads as operational
   tuning rather than baked-in rule. Confirm timing may be tuned, or we lock it too.
3. **NEEDS CONFIRMATION** — superseding rule: if an admin creates their own WC template,
   Curtis's seeded tracker still wins unless the new one has a HIGHER version number. Confirm
   that version-bump is the intended way to supersede.
4. **NEEDS DECISION** — legacy empty trackers (see the audit above): pre-P5b shells with no
   phases/tasks. They can block affected deals from ever receiving the real WC tracker.
   Recommend deleting them; awaiting approval since they attach to real deals.
5. **NOTE** — ONBOARDING journeys no longer auto-instantiate at Bound (instantiation is now
   filtered to type = IMPLEMENTATION, one tracker per deal per his amended rule). This is
   consistent with v2.4, where PEO folds employee onboarding into the PEO tracker rather than
   running a separate client journey.

## State after WC-0

The system is **LIVE** — a bound WC deal now stamps out Curtis's four-phase tracker with real
due dates. Previously it produced nothing.
