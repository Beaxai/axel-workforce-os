# P5-WC · WC-1 Phase Report — Bind Subjectivities Checklist

Branch: `p5b-journey-engine` · Tasks 1–4 committed (final code commit `cfe9266`) · This report closes WC-1.

## Scope delivered

- **Task 1 — Schema** (`a26ab19`): three subjectivity tables (`subjectivity_templates`, `subjectivity_template_items`, `deal_subjectivities`) plus `loss_history_documents.valuation_date` (date). Pushed via drizzle.
- **Task 2 — Seed** (`48fc2ac`): the 10 §6A items seeded as a locked system template (`SUBJ_*` system keys in `artifacts/api-server/src/lib/subjectivities.ts`; idempotent `seed:subjectivities` script). Item 9 (currently valued loss history) conditional via the staleness rule; item 10 (Axel broker fee) non-blocking.
- **Task 3 — Generation** (`8ee3cf3`): `generateSubjectivitiesForDeal` runs on entry to BIND_ORDER inside the existing FOR-UPDATE deal-stage transaction; `evaluateLossHistoryStaleness` implements the 60-day valuation rule **fail-closed** (any missing input flags the item, never silently satisfies); regeneration is idempotent (skips if a checklist exists).
- **Task 4 — API** (`cfe9266`): ADMIN+CSA-gated endpoints —
  - `GET /api/deals/:dealId/subjectivities` (checklist in sort order)
  - `PATCH /api/subjectivities/:id` (status enum + notes; SATISFIED stamps satisfiedAt/satisfiedBy; recompute can never set it)
  - `POST /api/deals/:dealId/subjectivities/recompute` (refreshes ONLY the item-9 auto-flag reason, never status)
  - automatic recompute after every loss-run upload in `loss-history.ts`.
  Contract added to `openapi.yaml` (DealSubjectivity, UpdateSubjectivityRequest) with clean orval codegen.

## Verification

- Harness: **ALL PASS 36/36**, rollback-only (`(DB rolled back — no permanent rows written.)`).
- Typecheck: zero new errors both via `scripts/typecheck-baseline.sh` (web 0/0, api-server 0/0 vs baseline) and direct `pnpm --filter @workspace/api-server typecheck` (clean).
- Live proof (deal AX-E2E2-PIPE):
  - All 10 items generated at Bind Order in sort order; item 9 auto-flagged ("No desired effective date on the deal — cannot verify the 60-day valuation window."); item 10 `isBlocking:false`.
  - PATCH SATISFIED → 200 with satisfiedAt/satisfiedBy stamped; PATCH `"BOGUS"` → 400.
  - Recompute → 200 `{updated:true, stale:true, reason:…}`.
  - Auto-recompute chain: uploading a loss run changed item 9's reason to `Loss run "lossrun.pdf" has no valuation date recorded.` — status stayed OPEN.
  - Deal moved to BOUND with 9/10 items OPEN → succeeded; IMPLEMENTATION tracker instantiated; `GET /api/deals` unaffected by the additional `/deals` mount.

### Step 1 regression output (verbatim)

```
ALL PASS: 36/36 checks passed.
(DB rolled back — no permanent rows written.)

==> Typechecking web (@workspace/axel-workforce-os)…
    web errors: 0 (baseline 0)
==> Typechecking api-server (@workspace/api-server)…
    api-server errors: 0 (baseline 0)
PASS: no new typecheck errors beyond baseline.

pnpm --filter @workspace/api-server typecheck → tsc -p tsconfig.json --noEmit (no output; clean)

pnpm --filter db push:
[✓] Pulling schema from database...
[✓] Changes applied        (no-op — this drizzle version prints this even when nothing is applied)

SELECT count(*) FROM deals WHERE archived_at IS NOT NULL;
 count
-------
    37          ← unchanged, as expected
```

## Test-data inventory (INVENTORY ONLY — nothing deleted)

```
SELECT reference_code, business_name, product_type, stage, archived_at IS NOT NULL AS archived
FROM deals WHERE archived_at IS NULL ORDER BY created_at;

 reference_code  |    business_name    | product_type |       stage       | archived
-----------------+---------------------+--------------+-------------------+----------
 AX-E2E-PIPE     | __E2E__ pipeline    | WC           | BOUND             | f
 AX-E2E-DEALSPG  | __E2E__ dealspage   | WC           | SUBMISSION_REVIEW | f
 DL-MRQSFNFU     | __E2E__ submission  | WC           | SUBMISSION_REVIEW | f
 AX-E2E2-PIPE    | __E2E2__ pipeline   | WC           | BOUND             | f
 AX-E2E2-DEALSPG | __E2E2__ dealspage  | WC           | SUBMISSION_REVIEW | f
 DL-MRQUM7EI     | __E2E2__ submission | WC           | SUBMISSION_REVIEW | f
(6 rows)

SELECT count(*) FROM implementation_trackers;   → 2
SELECT count(*) FROM deal_subjectivities;       → 10

Accounts (note: the accounts table has no `name` column — the spec query was adjusted to
`business_name`, the actual column):

    business_name    | client_stage
---------------------+---------------
 __E2E__ dealspage   | Prospect
 __E2E__ submission  | Prospect
 __E2E__ pipeline    | Active Client
 __E2E2__ pipeline   | Prospect
 __E2E2__ dealspage  | Prospect
 __E2E2__ submission | Prospect
(6 rows)
```

**Summary:** 6 non-archived deals exist and **all 6 are `__E2E__`/`__E2E2__` test artifacts** — the real pipeline remains fully archived (37 archived deals, unchanged). The test deals drag along: 6 test accounts, 2 implementation trackers (both from the two BOUND test deals), 10 deal_subjectivities rows (all on AX-E2E2-PIPE), 2 quotes, and 1 loss-history document (plus its file upload). Nothing was deleted; cleanup is Brendan's call.

## Flags for Curtis

1. **CONFIRMED BY TEST, NEEDS HIS RULING — open subjectivities do NOT block Bound.**
   A deal moved to BOUND with 9 of 10 items OPEN and succeeded. This implements his stated
   logic (broker fee explicitly non-blocking; the CSA *monitors* the checklist; the carrier
   decides when to bind). If he wants binding gated on the blocking items, it is a small
   change — but it is his call, not ours.

2. **BLOCKER FOR ITEM 9 — the loss-run valuation date has no UI field.**
   §6A item 9 needs the date the carrier VALUED the loss run. `loss_history_documents` had
   no such column, so it was added in Task 1. But nothing captures it at upload, so item 9
   currently reports "no valuation date recorded" for every uploaded run and the 60-day rule
   never actually evaluates. It fails closed (stays open, never silently satisfied), which is
   safe — but **the rule is inert until the upload form captures a valuation date.**
   Recommend adding that field.

3. **State notices (item 6) ships as ONE generic item.** §6A calls for a state-specific set
   per deal state; no state→notices mapping exists to populate. Needs his list.

4. **Broker fee (item 10) is a tracked, non-blocking checklist line only.** The 7% deal-level
   field, invoicing, paid tracking, and the unpaid-at-bind dunning automation with payment
   link are WC-2, not built here.

5. **NOTE — Bind Order has no readiness gate.** Unlike BOUND, entering BIND_ORDER requires
   nothing, so a checklist can generate before the effective date or loss run exists. The
   recompute (manual endpoint + automatic on loss-run upload) is what keeps item 9 current
   afterwards. Flagging in case he wants a gate on Bind Order too.

## Deferred / not in WC-1

- Checklist UI on the deal card (waits on his 4C ruling)
- Per-state notices mapping
- Broker-fee module (WC-2)
- HelloSign signing of these documents (WC-4)
