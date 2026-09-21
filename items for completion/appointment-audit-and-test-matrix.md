# Producer appointment — audit, gaps, and testability

**Audit date:** September 20, 2026, America/New_York.  
**Verdict:** Not ready for end-to-end acceptance or launch.

## Fix verification — September 21, 2026

The five reproduced defects below are now resolved. The original September 20
findings are retained as historical evidence, not current failures.

- Persisted Calendly timestamps are normalized and validated before ordering
  comparisons. Canonical PostgreSQL UUID syntax is accepted without weakening
  the trusted-organization database check or changing existing IDs.
- The Calendly request model is named in the OpenAPI source and regenerated,
  removing the shared-library export collision without manual generated edits.
- Declined applications no longer advertise scheduling permission; notification
  recipients are trimmed/lowercased before email validation and deduplication.
- The six existing appointment suites plus the offline audit suite pass:
  **57 tests passed, zero failed/skipped**.
- `bash scripts/typecheck-baseline.sh` passes, including the shared-library build
  and zero API/web TypeScript errors.
- The explicitly opted-in Development persistence audit passes: current trusted
  legacy organization booking, concurrent dedupe, cancellation clearing,
  replacement, stale cancellation, cancel-before-create, and staff-review cases.
  The cancellation notification remained blocked.
- Exact fixture cleanup removed 6 registrations, 10 events, 1 blocked notice,
  and the disposable organization/trust pair. Registration, booking, event, and
  notification residue was **0**; the existing organization/trust row remained
  unchanged.

This verification used synthetic local signed deliveries only. No production
changes, live emails, signing packets, or credentials were issued. Real intake,
signing, delivery, activation, and the separately documented prerequisites in
sections 2 and 4 remain blocked; these fixes do not establish launch readiness.

## Original audit

This is a fresh audit of the current implementation, not a repeat of the earlier
completion summary. Application behavior was not changed during this audit.
Regression/audit tests and documentation were added. No live provider calls,
emails, signing packets, credentials, production writes, or existing-account
changes were performed.

## 1. Reproduced defects, in priority order

### High — persisted Calendly booking transitions fail

The real Development database/in-process signed-router audit reproduced
`500 calendly_event_processing_failed` for cancellation of an existing booking,
replacement booking, and an older cancellation after a booking exists.

**Cause:** `artifacts/api-server/src/routes/producer-calendly.ts`, near lines
170–179, asserts raw SQL `sourceEventAt` is a `Date`. The database driver returns
a timestamp string. The helpers in
`services/producer-appointment/calendly.ts`, near lines 35 and 49, call
`.getTime()` on it. A read-only SQL probe and isolated reproduction confirmed
`TypeError: ...getTime is not a function`.

**Needed:** explicitly normalize/validate timestamps at the raw-SQL boundary,
then pass the persisted cancellation/replacement/stale-event audit. Confirm
booking clearing and the blocked cancellation notification in the database.
Initial booking success and pure helper tests do not prove these transitions.

### High — Calendly rejects the existing Development organization

The Calendly configuration UUID validator requires RFC version/variant bits,
but the existing trusted Development organization's PostgreSQL UUID does not
have those bits. A correctly signed synthetic event returns
`503 calendly_not_configured`. This is a code compatibility defect, not evidence
of a missing key or subscription.

**Needed:** accept the project's stored UUID syntax while retaining the trusted
organization database check. Re-test the current trusted organization; do not
change existing organization IDs to accommodate the validator.

### High — shared-library compilation fails

`pnpm run typecheck:libs` fails with:

```text
lib/api-zod/src/index.ts:2:1 TS2308:
Module "./generated/api" has already exported a member named
'ReceiveProducerCalendlyEventBody'.
```

The baseline quality gate also fails at this step. API/frontend package
typechecks pass individually, but do not override this shared-library failure.

**Needed:** resolve the source/export or generation naming collision without
hand-editing generated output, regenerate if necessary, and pass the shared
library and baseline build checks.

### Medium — declined application scheduling permission is misleading

`services/producer-appointment/review.ts` reports `canSendSchedulingLink: true`
for declined Admin applications; the mutation correctly rejects them.
The new regression test fails. This is a UI/API permission mismatch, not an
observed backend authorization bypass.

**Needed:** align capability projection with the mutation's lifecycle gate.

### Low — notification helper rejects padded email addresses before normalization

`services/producer-appointment/notifications.ts` validates `z.email()` before
its trimming/lowercasing step. A valid address with surrounding whitespace
fails the new regression. Current callers that pre-normalize can avoid this,
but the helper's normalization is not reliable as an interface guarantee.

**Needed:** normalize before validation or explicitly require normalized input
and align the helper contract/tests.

## 2. Other gaps and decisions identified

- **Actual intake is not implemented:** signed real applications still return
  `503 application_contract_pending`; no real intake 201/409/422, atomic child/job
  persistence, warning flags, or document ingestion acceptance can pass.
- **SignWell is a planner, not a signing integration:** dispatch, field placement,
  authenticated authoritative event verification, producer signature tracking,
  countersign release, voiding, and executed-file retrieval are unfinished.
- **Approval remains a deliberate 409:** pending identity provisioning,
  duplicate reconciliation, countersignature-driven activation, and credential
  handoff are not implemented. Valid credentials issuance cannot be tested.
- **Decline is only partially operational:** no-envelope decline works and is
  idempotent; any existing provider envelope causes `packet_void_not_configured`.
- **Private files are not delivered:** role redaction/denial is testable, but
  ingestion, source-fetch safety, hashes, malware scanning, signed download expiry,
  and actual file contents are not implemented end to end.
- **Email is blocked outbox/templates:** no delivery/retry worker or automatic
  reminder scheduler. The 48-hour/24-hour predicates pass offline tests, not
  scheduled delivery acceptance. Ready-for-decision currently targets the acting
  staff member, not an approved staff distribution.
- **Unmatched booking has a staff inbox, not outbound alert delivery:** review
  markers persist, but the defined `unmatched_booking` email is not enqueued.
- **Manual scheduling resend semantics resolved (blocked delivery only):**
  `POST /:id/send-scheduling-link` requires `{ actionId: UUID, intent: "send" | "resend" }`.
  Generate a fresh action ID for an intentional send/resend; transport retries
  must reuse both values. Identity is scoped to organization + registration +
  action ID (intent cannot be changed for an existing identity; that returns 409).
  Registration row locking and one transaction persist exactly one blocked
  notification and one matching `SCHEDULING_LINK_DELIVERY_BLOCKED` audit per action.
  Audit `after` records action ID, intent, notification ID and blocked status.
  Replays return the original notification ID with `replayed: true` and add no audit.
  A new resend ID creates a distinct blocked item; historical registration-wide
  items remain untouched. The staff UI retains unresolved IDs in session storage
  through transport errors/reloads, clearing them only on a successful response.
  Role/trusted-staff, organization, declined-registration and validated-recipient
  gates remain enforced. No worker, provider call or live delivery was enabled.
  Development route regression evidence: eight concurrent requests for one resend
  produced one blocked outbox item and one audit; seven replies were replays.
  Sequential retries, changed-intent conflicts, a distinct new resend, strict body
  validation, and role/trust/tenant/lifecycle/recipient gates passed.
- **Activity feed is incomplete:** safe before/after data is not exposed/rendered;
  the current DTO/UI shows action, timestamp, and actor ID rather than a resolved
  actor label and the required safe changes.
- **Known-unavailable controls are still offered:** eligible approval/document/
  credential actions can invite attempts that will inevitably return a
  configuration blocker. Backend denial is correct, but availability should be
  explicit before the click.
- **Legacy public screens remain dangling:** the backend's 410 protection passed,
  so this is a broken/outdated onboarding UX, not a proven intake bypass.
- **Phone layout is incomplete:** the pre-existing expanded sidebar clips Network
  at 390px; modal scrolling/closing was previously verified. Do not claim the
  whole Applications screen is mobile-ready.
- **Refresh behavior:** the browser can display stale staff attention cards after
  fixture cleanup until refresh. This did not establish database residue.

### Hardening/policy risks, not proven current exploits

- Database decline constraints do not enforce the API's Ready-for-Decision gate.
  Decide whether every background/direct writer must obey that gate, accounting
  for the still-open early-decline policy.
- Notification constraints allow blocked/failed states without a failure code;
  complete worker transition rules are not yet defined.
- Calendly event dedupe is global by payload hash, not organization + hash.
  The current single-configured-organization receiver limits exposure; review
  before supporting multiple independently configured organizations.

## 3. Tests actually run

| Test group | Current result | What this establishes |
|---|---|---|
| Existing six appointment test files | **46 passed, 0 failed** | Signed transport, status priority, packet planning, pure Calendly matching/ordering, safe notification templates/outbox, review projections |
| New offline audit suite | **5 passed, 2 failed** | Additional malformed-event/URL/signature/ambiguity/safe-projection cases; failed declined permission and padded email regressions |
| Shared-library build | **Failed TS2308** | Reproducible generated export collision |
| API package typecheck | **Passed** | API source typing only; does not negate shared-lib failure |
| Web package typecheck | **Passed** | Frontend source typing only |
| Baseline quality gate | **Failed** | Stops at shared-library build |
| Foundation SQL verification | **Passed; rolled back** | Registration schema and lifecycle constraints exercised by verification script |
| Operations SQL verification | **Passed; rolled back** | Cross-org rejection, duplicate event/outbox constraints, sent timestamp invariant, blocked defaults |
| Current authenticated review journey | **Passed tested cases** | Admin/CSA/AGENT/unauth permissions, tenant denial, call concurrency, decline idempotency, outbox dedupe, UI and Resources |
| Signed Calendly + actual database audit | **Failed overall** | Initial creation/dedupe and review cases work; existing-booking transitions fail |

### Authenticated integration details

- Three concurrent call completions plus a repeat: all 200, original completion
  note preserved, one `CALL_COMPLETED` audit event and one blocked ready notice.
- Historical audit: four scheduling requests were all 202 explicitly blocked;
  one notification row (the old registration-wide identity; superseded by the
  per-action contract above).
- Ready no-envelope decline and retry: both 200, one decision/audit/blocked notice,
  no new identities.
- Envelope-present decline: 409 and unchanged pending decision.
- CSA call completion: 200; CSA approval, decline, scheduling, credentials: 403.
- CSA payload redacted; restricted tax/banking/combined document metadata omitted;
  direct tested restricted-file requests: 403.
- AGENT list/detail/call: 403; unauthenticated requests: 401.
- Admin/CSA reads of another organization's fixture: 404.
- Authorized malformed IDs: 400. Unauthorized users are denied before validation.
- Browser rendered Applications list/detail, blocked actions, and Resources.

### Actual Calendly persistence details

Using a disposable RFC-valid organization and trust row, with no users or access
tokens, allowed testing beyond the legacy-ID defect:

- Initial booking/canonical schedule persisted correctly.
- Concurrent identical signed events yielded one event and one active booking.
- Cancellation arriving before creation prevented stale creation.
- Unmatched and ambiguous events persisted staff-review flags.
- Declined application stayed declined and unbooked.
- Existing-booking cancellation/replacement/stale cancellation failed with 500.
- Cancellation notice persistence consequently did not pass.

The legacy trusted-ID 503 was successfully **reproduced**, not counted as a
working booking feature.

## 4. Tests that cannot currently be completed

| Blocked test / acceptance requirement | Why blocked | Needed to unblock |
|---|---|---|
| Real website payload validation, 201/409/422, concurrent intake, warning flags and atomic jobs | Adapter/persistence unimplemented; exact payload contract unavailable | Approved website field keys/sample payloads and completed adapter/transaction implementation |
| Historical backfill equivalence without invented milestones | No reviewed migration/backfill mapping | Explicit reconciliation/backfill policy and implementation |
| Real signed-source document ingestion, SSRF defenses, size/type/hash/scanning and recoverable expiry | Ingestion/storage workflow unfinished | Bounded fetch implementation, allowlists, private namespace, scanning decision and fixtures |
| Authorized actual download, expiry, content/hash and combined-file privacy | Access endpoint deliberately blocked | Private-file signer/integration and approved stored test files |
| Real SignWell 5+N files, accurate fields, principal/owner isolation, approved countersign hold | Planner only; controls/assets unverified | Approved documents/mappings, account capability confirmation, authorized test recipients and implemented provider lifecycle |
| Declined/expired provider packet, verified countersign, replay/late event safety, PDF splits | No producer provider-event/release/void/download flow | Implement and configure authenticated authoritative provider processing and durable actions |
| Successful approval mapping, pending identities, duplicate resolution, activation and credential handoff | Successful transition code absent | Reconciliation policy, provisioning/release/activation implementation and verified countersign source |
| Envelope-present decline with actual void and neutral delivered notice | Void/delivery integrations absent | Durable void action, authoritative void confirmation, mail worker and authorized provider test |
| Live Calendly booking within one minute, actual Zoom link and reschedule payload compatibility | No authorized live provider acceptance setup; code defects also found | Fix reproduced defects, configure key/API event type/trusted org/subscription, resolve 45-minute-vs-30min slug policy |
| Automatic 48-hour nudge / conditional 24-hour reminder exactly once | Only due predicates exist; no scheduler/worker | Implement scheduler/idempotent delivery and confirm Calendly reminder policy |
| Real Resend receipt, retry/backoff, bounce/failure and safe sender/staff routing | Always-blocked outbox; no producer delivery worker | Verified sender/domain, approved recipients, worker/retry/event wiring and authorized delivery tests |
| Credential setup email success without early access, real login after countersign | Handoff intentionally blocked | Completed secure issuance/activation/delivery flow plus authorized disposable acceptance identity |
| Full website → signing → call → approval → countersign → activation → credentials | Multiple implementation and external gates above | Complete prerequisites and run both approval and decline journeys |
| Production schema/provider/deployment readiness | Audit authorized Development only | Explicit release authorization and production readiness procedure; no production writes were attempted |

Pure mocks and synthetic fixtures cannot prove legal document visibility, actual
delivery, live subscriptions, production readiness, or successful unfinished
endpoints. These are **blocked**, not passed or merely skipped for convenience.

## 5. Reproduction commands

```sh
pnpm --filter @workspace/api-server exec tsx --test \
  src/tests/producer-application-review.test.ts \
  src/tests/producer-appointment-notifications.test.ts \
  src/tests/producer-appointment-packet-plan.test.ts \
  src/tests/producer-calendly.test.ts \
  src/tests/producer-registration-status.test.ts \
  src/tests/public-producer-registrations.test.ts

pnpm --filter @workspace/api-server exec tsx --test \
  src/tests/producer-appointment-audit.test.ts

pnpm run typecheck:libs
pnpm --filter @workspace/api-server run typecheck
pnpm --filter @workspace/axel-workforce-os run typecheck
bash scripts/typecheck-baseline.sh

# Explicit opt-in: Development-only, temporary fixtures, cleanup in finally.
cd artifacts/api-server
RUN_PRODUCER_SCHEDULING_AUDIT=1 NODE_ENV=development \
  pnpm exec tsx --test src/tests/producer-scheduling-actions.test.ts
RUN_PRODUCER_CALENDLY_PERSISTENCE_AUDIT=1 NODE_ENV=development \
  pnpm exec tsx --test src/tests/producer-calendly-persistence.audit.ts
```

SQL files were executed as complete scripts against Development; both end in
ROLLBACK:

- `lib/db/migrations/verify_producer_registration_foundation.sql`
- `lib/db/migrations/verify_producer_appointment_operations.sql`

## 6. Cleanup and evidence boundaries

Authenticated review fixtures: 4 registrations, 3 documents, 4 notifications,
7 activities; final fixture residue 0 for registrations/documents/notifications/
activity/bookings.

Final Calendly persistence run: 5 registrations, 6 committed events, no notices;
all were removed along with the one temporary trust row and organization.
Earlier legacy-ID probing also cleaned its five registrations. Existing
organization/trust/account data was not modified.

Stale migration/router/legacy-protection checklist entries were corrected.
Failures above remain intentionally visible in regression tests; passing old
unit tests must not be used to hide them. No production application fixes were
made as part of this review-and-test request.