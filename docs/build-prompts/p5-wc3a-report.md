# P5-WC · WC-3a Phase Report — Binder/Policy Upload & Tracker Auto-Satisfy

Branch: `p5b-journey-engine` · Commits: 732e58e (Task 1), 3473aea (Task 2), bb29529 (Task 2.1)

## Scope delivered

- **Task 1 — binder/policy upload.** New `/api/policy-documents` router: `POST /:dealId/upload`
  (multer disk storage mirroring loss-history, PDF-only, 25MB cap, `documentType` binder|policy),
  `GET /:dealId`, `DELETE /:docId`. Rows land in `policy_documents` with `policyId` null (a binder
  precedes the policy record) and `source` MANUAL. Also hardened the loss-run `valuationDate` with
  a YYYY-MM-DD guard (clean 400 instead of a Postgres 500). Routes gated `requireRoles("ADMIN","CSA")`.
- **Task 2 — §6D auto-satisfy.** A binder upload completes Phase 1 (carrier acceptance); a direct
  policy release completes Phases 1 and 2 together. Only PENDING tasks are touched, so re-uploads
  are no-ops and a task a human completed is never overwritten. Document insert + activity log +
  tracker advance + `tracker_auto_advanced` activity row all commit in ONE transaction, and the
  upload response includes the auto-satisfy summary.
- **Task 2.1 — harness hardening.** The auto-satisfy checks previously hit a skip guard and were
  not exercising the code at all; the G block now clears the fixture tracker inside the rolled-back
  transaction and runs nine real assertions against the seeded four-phase WC tracker.

## Verification

- Harness: **ALL PASS 46/46**, rollback-only ("DB rolled back — no permanent rows written.").
- Typecheck: zero new errors both ways (baseline script: api-server 0 vs baseline 0; direct
  `pnpm --filter @workspace/api-server typecheck` clean).
- Live proof (Task 2, deal AX-E2E2-PIPE): tracker self-advanced 0% → 25% (binder) → 50% (policy),
  an idempotent no-op on binder re-upload, with matching `tracker_auto_advanced` activity-feed
  entries. Test documents and files were deleted afterwards.
- Sentinels unchanged: archived deals **37**; system journey templates **1 / active=true**;
  system subjectivity templates **1**.

## What now works end to end

Carrier sends a binder → rep uploads it → Phase 1 completes itself → policy arrives → Phase 2
completes itself → the remaining two phases (kit delivery, billing setup) are worked by the CSA →
100% → the account flips to Active Client automatically.

## FLAGS FOR CURTIS

### 1. RISK — uploaded documents are not on durable storage

Binders, policies, and loss runs are written to the Repl's **local filesystem**. Exact findings:

- Policy documents write to `path.join(process.cwd(), "uploads", "policy-documents")`; with the
  api-server workflow running from `artifacts/api-server`, that resolves to
  `/home/runner/workspace/artifacts/api-server/uploads/policy-documents`.
- Loss-history uploads write identically to
  `/home/runner/workspace/artifacts/api-server/uploads/loss-history`.
- Those paths are under the workspace filesystem, not `/tmp` — so they survive a workflow restart
  in development. What CANNOT be verified from inside the app: whether they survive a production
  redeploy or container replacement (deployment images are built from the repo; runtime-written
  files are not part of the build). They must be assumed **ephemeral in production**.
- Nothing backs these files up or copies them off the Repl. No backup job, no sync, nothing.
- `documents.ts` `/signed-url` is a stub. It returns, verbatim:
  `"File storage not configured — path reference only."` (with `signedUrl: null`).
- No S3/R2/object-storage integration exists anywhere in the backend. A grep for
  `s3|r2|cloudflare|aws-sdk|@aws|bucket` across `artifacts/api-server/src` matches only an
  unrelated variable name (`r2`) in the verify script and the word "bucket" in a comment in a
  pipeline-stage script — zero storage SDKs, zero storage config.

**Consequence:** a carrier binder — the legal evidence that coverage was bound — could be lost on
a redeploy or container replacement. This is PRE-EXISTING (loss runs already had it), not
introduced by WC-3a, but WC-3a is the first feature that puts legally significant carrier
documents into it. **Recommend prioritising real object storage before this is used with live
clients.**

### 2. CONFIRMED — §6D auto-satisfy is live

Phases 1 and 2 now advance from document uploads with no manual ticking, including the "direct
policy release completes both" rule.

### 3. CONSTRAINT — tracker selection is currently by product type "WC"

`applyWcDocumentUpload` finds the deal's tracker via productType = 'WC'. That is correct today,
but §6G's PEO tracker will need this generalised (a PEO deal folds WC deliverables in as
sub-items). Flagging before PEO work begins, not as a defect now.

### 4. CARRIED — still open from earlier phases

The 4C ruling (gates the checklist UI) and the HelloSign live API key (gates real signing). Both
remain blocking.

### 5. NOTE — test data

Six __E2E__ deals remain from validation, one tracker sits at 50% as test residue. The real
pipeline (37 deals) is still archived and untouched. Cleanup is a decision for Brendan, listed
here for visibility.

## Known tech debt (small, named)

Each multipart endpoint requires a hand-written re-export in `lib/api-zod/src/index.ts` because
orval emits the same name as both a zod const and a TS type. One instance today
(`UploadPolicyDocumentBody`); if a second or third appears, fix the orval config rather than
adding more manual lines.

## Appendix A — Step 1 regression output (verbatim)

```
ALL PASS: 46/46 checks passed.
(DB rolled back — no permanent rows written.)

==> Typechecking api-server (@workspace/api-server)…
    api-server errors: 0 (baseline 0)
PASS: no new typecheck errors beyond baseline.
```

Sentinels:

```
SELECT count(*) FROM deals WHERE archived_at IS NOT NULL;             → 37
SELECT count(*), bool_and(is_active) FROM journey_templates
  WHERE is_system;                                                    → 1 | t
SELECT count(*) FROM subjectivity_templates WHERE is_system;          → 1
```

## Appendix B — Step 2 storage findings (verbatim)

```
policy-documents.ts:13: const uploadDir = path.join(process.cwd(), "uploads", "policy-documents");
loss-history.ts:13:     const uploadDir = path.join(process.cwd(), "uploads", "loss-history");

documents.ts /signed-url response:
  { signedUrl: null, storagePath: <storage_path>,
    message: "File storage not configured — path reference only." }

grep -rniE "s3|r2|cloudflare|aws-sdk|@aws|bucket" artifacts/api-server/src --include=*.ts:
  scripts/revert-pipeline-stages.ts:78: // 2) Direct bucket mappings for the remaining sales stages.
  scripts/revert-pipeline-stages.ts:79: const buckets = await db.execute(sql`
  scripts/revert-pipeline-stages.ts:88: changed += buckets.rowCount ?? 0;
  scripts/revert-pipeline-stages.ts:89: console.log(`Bucket mappings ...`);
  scripts/verify-p5b.ts:174: const r2 = await instantiateJourneysForDeal(deal, tx);
  scripts/verify-p5b.ts:175: check("C. re-instantiate → skipped, not created", ...);
  (no storage SDK or config matches)
```

## Appendix C — Step 3 test-data inventory (verbatim)

```
 reference_code  |    business_name    | product_type |       stage
-----------------+---------------------+--------------+-------------------
 AX-E2E-PIPE     | __E2E__ pipeline    | WC           | BOUND
 AX-E2E-DEALSPG  | __E2E__ dealspage   | WC           | SUBMISSION_REVIEW
 DL-MRQSFNFU     | __E2E__ submission  | WC           | SUBMISSION_REVIEW
 AX-E2E2-PIPE    | __E2E2__ pipeline   | WC           | BOUND
 AX-E2E2-DEALSPG | __E2E2__ dealspage  | WC           | SUBMISSION_REVIEW
 DL-MRQUM7EI     | __E2E2__ submission | WC           | SUBMISSION_REVIEW
(6 rows)

 implementation_trackers:
 82280514-…  (AX-E2E-PIPE)   COMPLETE     100
 6eda6a92-…  (AX-E2E2-PIPE)  IN_PROGRESS   50   ← residue of Task 2's live test:
                                                  two phases auto-satisfied by test
                                                  uploads that were since deleted

 deal_subjectivities:      10
 policy_documents:          0
 loss_history_documents:    3
```
