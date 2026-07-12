# Phase 4.1 — Pipeline Stage Revert (10 → 8) — Acceptance Report

**Branch:** `awf-os-brendy-sprint-1` working tree (NOT merged — awaiting instruction)
**Date:** 2026-07-12
**Scope:** Revert the pipeline from the 10-stage sales funnel (erroneously documented in
State Document §11 and adopted by P4) back to the **8 operational stages**:
`SUBMISSION_REVIEW → INDICATION → UW_REVIEW → APPROVED_QUOTED → BIND_ORDER → BOUND → CLIENT → LOST`.
The orthogonal `outcome` axis is removed — **Lost is a real stage/column again**; `?includeLost=` is gone.

---

## 1. Pass/fail per R-step

| Step | Scope | Result |
|------|-------|--------|
| R1 | `@workspace/pipeline` shared constant reverted to the 8 canonical stages (keys, labels, order); `DealOutcome` removed from the lib | ✅ PASS |
| R2 | Reverse data migration (`revert-pipeline-stages.ts`, idempotent) — all 37 deals on canonical 8 keys, zero sales-stage leftovers, re-run changes 0 rows | ✅ PASS |
| R3 | `deals.outcome` column dropped; Drizzle schema updated; `drizzle-kit push` clean | ✅ PASS |
| R4 | Server routes: 8-key stage validation, decline → `stage='LOST'` + `closedAt`, approve → `APPROVED_QUOTED`, `includeLost` removed; `openapi.yaml` + Orval/Zod regenerated (clean diff, nothing hand-edited under `generated/`) | ✅ PASS |
| R5 | Frontend: Pipeline board renders 8 columns incl. Lost; Show/Hide-Lost UI removed; 6-phase tracker DECLINED driven by `stage==='LOST'`; all legacy stage literals replaced; e2e + architect review pass | ✅ PASS |
| R6 | Docs corrected (State Doc §11, CLAUDE.md, P4 spec, P4 report, demo script); full acceptance run; this report | ✅ PASS |

## 2. Reverse migration — before/after counts (37 deals)

```
BEFORE (10-stage + outcome)          AFTER (8-stage)
  NEW_LEAD          open   2          SUBMISSION_REVIEW   21
  QUALIFIED         open   1          INDICATION           9
  NEEDS_ANALYSIS    open  18          APPROVED_QUOTED      2
  NEEDS_ANALYSIS    lost   1          BIND_ORDER           1
  PROPOSAL_SENT     open   9          BOUND                3
  NEGOTIATION       open   2          LOST                 1
  DOCUMENTATION     open   1          ─────────────────────
  BOUND             open   3          Total 37 · sales-stage leftovers: 0
```

- First run changed **35 rows** (9 PROPOSAL_SENT + 25 bucket mappings + 1 lost-override).
- **Idempotency:** immediate re-run changed **0 rows**.
- The lost deal ("Acceptance Test Cannabis LLC SECOND") landed on `stage='LOST'` with
  `closed_at` preserved (2026-07-01 16:29:08+00).
- Post-R6 verification (2026-07-12): distribution unchanged — 21/9/2/1/3/1.

## 3. Typecheck — two ways, both clean

1. `pnpm run typecheck` (root: libs `tsc --build` + all leaf `tsc --noEmit`) — **0 errors**.
2. `bash scripts/typecheck-baseline.sh` — web **0 (baseline 0)**, api-server **0 (baseline 0)** → **PASS, no new errors vs baseline**.

`pnpm --filter @workspace/db run push` (drizzle-kit) — exits 0, `[✓] Changes applied`, no destructive prompt.

## 4. Changed API surface

- `PipelineStage` enum: 10 sales-funnel keys → the 8 operational keys.
- `DealOutcome` schema **removed**; `outcome` field removed from Deal request/response bodies.
- `GET /api/deals`: `?includeLost=` query param **removed** — LOST deals are returned like any stage.
- `PATCH /api/deals/:id`: stage validation now accepts only the 8 canonical keys (legacy keys → 400).
  Bind-readiness gate on entering `BOUND` retained (409 with reason when not bind-ready; transactional
  implementation-tracker trigger on success).
- `POST /api/deal-card/:id/decline`: sets `stage='LOST'` + `closedAt` (was `outcome='lost'`, stage preserved).
- Approve advances to `APPROVED_QUOTED` (was `NEGOTIATION`).
- Orval hooks + Zod schemas regenerated from `openapi.yaml`; codegen re-run produces an empty diff.

## 5. Final acceptance run (2026-07-12, Playwright e2e)

All pass, verified in one end-to-end session as ADMIN:

1. Board shows exactly **8 columns in order** (Submission Review → … → Client → Lost); **no Show/Hide Lost button**.
2. Lost column contains the lost deal; its modal tracker shows the **red DECLINED** marker at node 4.
3. Bound deal ("Ridgeline General Contractors") modal tracker highlights **IMPLEMENTATION**.
4. Stage move via `PATCH` (SUBMISSION_REVIEW → INDICATION) → 200, persists across reload; reverted afterward (DB restored, distribution unchanged).
5. Non-bind-ready deal → `PATCH {stage:"BOUND"}` → **409** (gate intact).
6. Legacy key `NEW_LEAD` → **400** (sales-funnel stages rejected).
7. Board legible in **both light and dark** mode.

Screenshots were shared in chat only; none committed to the repo.

## 6. Docs corrected (this step)

- `docs/STATE_DOCUMENT_v2.1.md` §11 — replaced with the 8-stage wording (per the supplied replacement text).
- `CLAUDE.md` — pipeline bullet corrected to 8 stages; Stage-1 name updated.
- `docs/superpowers/specs/2026-06-30-p4-pipeline-stage-reconciliation-design.md` — superseded banner added.
- `docs/build-prompts/phase-4-report.md` — superseded banner added.
- `docs/demo/record-demo.mjs` — narration/comments updated to 8 stages.
- Remaining "10-stage" mentions live only in clearly-historical, dated documents
  (decisions log, 2026-06-15 4C spec, 4C prompts/report, the original P4 prompt) — left as record.
- **Each corrected doc notes: Curtis's MASTER doc still needs the same §11 correction.**

## 7. Flags for Curtis

1. **Bind-readiness gate on entering Bound is NEW (added in P4)** — it was not in the original
   8-stage board. It has been retained through the revert (409 when not bind-ready; transactional
   implementation-tracker trigger on success). **Confirm keep.**
2. **The reverse data migration is best-effort where the 10→8 collapse was ambiguous.** The forward
   P4 migration collapsed INDICATION + UW_REVIEW → PROPOSAL_SENT without logging its moves, and
   `activity_log` holds no pre-P4 `from_stage` history — so **all 9 PROPOSAL_SENT deals fell to the
   INDICATION default**. Any deal that was truly in U/W Review before P4 now sits at Indication and
   would need a manual move.
