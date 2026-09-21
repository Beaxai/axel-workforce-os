# Producer appointment — audit, gaps, and testability

**Original audit date:** September 20, 2026, America/New_York.
**Current code reconciliation:** September 21, 2026 (including the manual
scheduling-email Development milestone).
**Verdict:** Not ready for end-to-end acceptance or launch.

## Current status key and evidence boundary

- **Built:** present in the current repository and supported by source/tests.
- **Incomplete:** required implementation or an approved policy is absent.
- **Configuration pending:** implementation exists, but authorized environment or
  provider configuration has not been established.
- **Acceptance unverified:** implementation/configuration may exist, but the
  authorized external, release, mobile, or production acceptance evidence does not.

The latest September 21 reconciliation inspected current source and includes a
separate controlled Development test of the new manual scheduling delivery path.
It did not inspect production or verify a Calendly booking. Historical results
remain labeled below.

## Historical fix verification — September 21, 2026

The following results were recorded by the earlier fix work and are retained
from its merged verification report; they were not rerun during this documentation
review. They supersede the September 20 failing results in section 3. The original
run's exact time was not recorded here; no new timestamp or fresh pass is asserted.

The five reproduced defects below are now resolved. The original September 20
findings are retained as historical evidence, not current failures.

- Persisted Calendly timestamps are normalized and validated before ordering
  comparisons. Canonical PostgreSQL UUID syntax is accepted without weakening
  the trusted-organization database check or changing existing IDs.
- The Calendly request model is named in the OpenAPI source and regenerated,
  removing the shared-library export collision without manual generated edits.
- Declined applications no longer advertise scheduling permission; notification
  recipients are trimmed/lowercased before email validation and deduplication.
- The earlier run of the six existing appointment suites plus the offline audit suite recorded:
  **57 tests passed, zero failed/skipped**.
- `bash scripts/typecheck-baseline.sh` passed in that run, including the shared-library build
  and zero API/web TypeScript errors.
- The explicitly opted-in Development persistence audit passed in that run: the trusted
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

## Historical original-audit narrative

This was a fresh audit of the then-current implementation, not a repeat of the
earlier completion summary. Application behavior was not changed during that audit.
Regression/audit tests and documentation were added. No live provider calls,
emails, signing packets, credentials, production writes, or existing-account
changes were performed.

## 1. Historical reproduced defects — all resolved in current source

### Resolved; historical high — persisted Calendly booking transitions failed

The real Development database/in-process signed-router audit reproduced
`500 calendly_event_processing_failed` for cancellation of an existing booking,
replacement booking, and an older cancellation after a booking exists.

**Cause:** `artifacts/api-server/src/routes/producer-calendly.ts`, near lines
170–179, asserts raw SQL `sourceEventAt` is a `Date`. The database driver returns
a timestamp string. The helpers in
`services/producer-appointment/calendly.ts`, near lines 35 and 49, call
`.getTime()` on it. A read-only SQL probe and isolated reproduction confirmed
`TypeError: ...getTime is not a function`.

**Historical remediation required at the time:** explicitly normalize/validate timestamps at the raw-SQL boundary,
then pass the persisted cancellation/replacement/stale-event audit. Confirm
booking clearing and the blocked cancellation notification in the database.
Initial booking success and pure helper tests do not prove these transitions.

### Historical high — Calendly rejected the existing Development organization

The Calendly configuration UUID validator requires RFC version/variant bits,
but the existing trusted Development organization's PostgreSQL UUID does not
have those bits. A correctly signed synthetic event returns
`503 calendly_not_configured`. This is a code compatibility defect, not evidence
of a missing key or subscription.

**Historical remediation required at the time:** accept the project's stored UUID syntax while retaining the trusted
organization database check. Re-test the current trusted organization; do not
change existing organization IDs to accommodate the validator.

### Historical high — shared-library compilation failed

`pnpm run typecheck:libs` fails with:

```text
lib/api-zod/src/index.ts:2:1 TS2308:
Module "./generated/api" has already exported a member named
'ReceiveProducerCalendlyEventBody'.
```

The baseline quality gate also fails at this step. API/frontend package
typechecks pass individually, but do not override this shared-library failure.

**Historical remediation required at the time:** resolve the source/export or generation naming collision without
hand-editing generated output, regenerate if necessary, and pass the shared
library and baseline build checks.

### Historical medium — declined application scheduling permission was misleading

`services/producer-appointment/review.ts` reports `canSendSchedulingLink: true`
for declined Admin applications; the mutation correctly rejects them.
The new regression test fails. This is a UI/API permission mismatch, not an
observed backend authorization bypass.

**Historical remediation required at the time:** align capability projection with the mutation's lifecycle gate.

### Historical low — notification helper rejected padded email addresses before normalization

`services/producer-appointment/notifications.ts` validates `z.email()` before
its trimming/lowercasing step. A valid address with surrounding whitespace
fails the new regression. Current callers that pre-normalize can avoid this,
but the helper's normalization is not reliable as an interface guarantee.

**Historical remediation required at the time:** normalize before validation or explicitly require normalized input
and align the helper contract/tests.

## 2. Current completion register

### Built and reconciled

- **Calendly persistence fixes are built.** Timestamp normalization, compatible
  PostgreSQL UUID syntax, dedupe, booking ordering, cancellation/replacement, and
  staff-review persistence are in current source. Live provider acceptance is
  still unverified; see gap 7 below.
- **Manual scheduling action idempotency and narrow delivery are built:**
  `POST /:id/send-scheduling-link` requires `{ actionId: UUID, intent: "send" | "resend" }`.
  Generate a fresh action ID for an intentional send/resend; transport retries
  must reuse both values. Identity is scoped to organization + registration +
  action ID (intent cannot be changed for an existing identity; that returns 409).
   Registration row locking and one transaction persist exactly one notification
   and matching requested/blocked audit per action. Audit `after` records action
   ID, intent, notification ID and initial status.
  Replays return the original notification ID with `replayed: true` and add no audit.
   A new resend ID creates a distinct item; historical registration-wide
  items remain untouched. The staff UI retains unresolved IDs in session storage
  through transport errors/reloads, clearing them only on a successful response.
  Role/trusted-staff, organization, declined-registration and validated-recipient
   gates remain enforced. A closed-by-default worker/Resend adapter now handles
   new `scheduling_link` rows only when enablement, provider configuration, and
   the complete recipient allowlist pass. It atomically claims, retries known
   transient failures with a stable idempotency key, records provider acceptance,
   and treats unknown/stale outcomes conservatively. Historical blocked rows and
   every other event remain blocked.
  Development route regression evidence: eight concurrent requests for one resend
  produced one blocked outbox item and one audit; seven replies were replays.
  Sequential retries, changed-intent conflicts, a distinct new resend, strict body
  validation, and role/trust/tenant/lifecycle/recipient gates passed.
   A later real Development test invoked the authenticated route twice with the
   same action, then the worker: one notification attempt was made, Resend
   accepted it, and an independent read-only provider lookup returned HTTP 200
   with `last_event: delivered`. This is provider-reported delivery, not proof of
   human reading. Browser verification confirmed an actual resend and persistent
   accepted statuses; a stale queued callout was fixed afterward and covered by
   three passing regression tests, without another browser send.
- **Configuration availability is now built.** The detail API returns separate
  availability objects for approval, credential issuance, and document access.
  The current modal displays the reasons and disables those controls when
  unavailable. This resolves the stale “known-unavailable controls are offered”
  finding; it does not complete the underlying activation, handoff, or file work.

### Outstanding items, each with completion steps and evidence

1. **Real website intake — incomplete; configuration and acceptance pending.**
   Follow the numbered implementation and acceptance sequence in
   [Website connection and real intake](website-connection-handoff.md), especially
   items 11–21. Dependency: approved real website contract and secure shared
   configuration. Completion evidence: authorized responses for valid `201`,
   bad signature `401`, replay `409`, invalid/missing fields `422`, low-E&O flag,
   and concurrent duplicate prevention, plus atomic registration/owner/document/
   job rows and zero unintended provider actions.

2. **SignWell packet lifecycle — incomplete; provider capability/configuration
   and acceptance pending.** Follow
   [SignWell documents, provider controls, and controlled test](signwell-appointment-packet.md)
   in its stated order: approve artifacts/mappings, verify account visibility and
   external countersign hold, implement durable send/event/release/void/download,
   then run controlled provider acceptance. Completion evidence must include the
   5+N packet, field accuracy, principal/owner isolation, authoritative event
   verification, replay/late-event safety, countersign release, void, and executed
   file retrieval. Planner unit tests alone are insufficient.

3. **Activation, duplicate reconciliation, and credentials — incomplete.**
   Follow [Admin activation, private files, and credentials](appointment-admin-activation.md):
   (1) approve reconciliation policy; (2) implement atomic identity linking or
   creation without overwriting compliance facts; (3) require verified
   countersignature; (4) implement safe activation and credential handoff;
   (5) exercise duplicate, pending-identity, rollback, and login paths.
   Dependencies: gap 2 and approved identity policy. Completion evidence: one
   durable approval result, expected linked identities, no duplicate/deactivated
   legitimate account, no early access, and successful disposable-user login.

4. **Decline with an existing provider envelope — incomplete.** (1) Complete
   provider void verification from gap 2; (2) persist an idempotent void action;
   (3) wait for authoritative void confirmation; (4) commit decline and enqueue
   the neutral notice exactly once; (5) test provider failure, retries, replay,
   and late signed events. Completion evidence: envelope voided at the provider,
   one final decline/audit/notice, and unchanged decision on failed void.

5. **Private document ingestion and access — incomplete; storage/scanning
   configuration and acceptance pending.** (1) Approve source allowlists, limits,
   and producer-only object namespace; (2) implement bounded SSRF-safe fetch,
   type/size/hash checks, malware decision, and recoverable jobs; (3) implement
   authenticated short-lived signing for allowlisted keys only; (4) verify expiry,
   bytes/hash, and CSA denial/redaction including combined packets. Dependencies:
   real intake/provider files and approved storage. Completion evidence: successful
   approved-file retrieval before expiry, denial after expiry/cross-tenant/CSA,
   and explicit recoverable failures. Also follow the private-file steps in
   [Admin activation](appointment-admin-activation.md).

6. **Producer lifecycle email and reminders — incomplete; manual scheduling
   delivery is built and narrowly verified in Development.** Execute the remaining
   ordered requirements in [Email delivery and scheduling](appointment-email-delivery.md):
   approve broader sender/recipient policy, retain the closed gate and historical
   backlog policy, add reconciliation/operations, implement lifecycle producers
   and scheduler, and run controlled staging acceptance for every template.
   Dependency: SignWell/Calendly reminder policy and safe document origin.
   Completion evidence still required: provider evidence for every remaining template, exactly-once
   48-hour nudge/conditional 24-hour reminder, bounded retry/bounce handling,
   monitoring, and no sensitive provider payload. Existing blocked rows must not
   be replayed or reinterpreted without an explicit reviewed migration policy.

7. **Calendly environment and live acceptance — configuration pending and
   acceptance unverified.** Follow
   [Calendly setup and live acceptance](calendly-appointment-setup.md) in order:
   secure key/event-type/trusted-org configuration, subscription, reminder and
   specified 45-minute Zoom configuration (`30min` is only the slug), then authorized live cases. Completion
   evidence: booking visible within one minute, Zoom/meeting URL, duplicate,
   cancellation, replacement, out-of-order, unmatched/ambiguous review, and
   provider-compatible reschedule. Current synthetic/local evidence is not live.

8. **Unmatched-booking outbound staff alert — incomplete.** (1) Approve a trusted
   staff distribution source; (2) enqueue `unmatched_booking` from the durable
   review outcome with event-level idempotency; (3) deliver it through gap 6;
   (4) verify no applicant data beyond approved template fields. Completion
   evidence: one review record and one delivered staff alert per unmatched event,
   with duplicate deliveries producing neither duplicates nor cross-tenant data.

9. **Activity feed — incomplete.** Current API serialization includes raw
   `before`/`after`, but the UI renders only action, time, and raw actor ID.
   (1) Define an action-by-action safe change allowlist; (2) project only those
   fields server-side; (3) resolve actor display name/role within the tenant while
   retaining a “System” label; (4) render human-readable changes; (5) test CSA
   redaction, cross-tenant denial, deleted actors, and scheduling action metadata.
   Completion evidence: the UI identifies who changed what without exposing
   payload, notes, recipient addresses, storage keys, or provider secrets.

10. **Legacy public screens — incomplete UX; backend protection is built.**
    (1) Inventory every old producer-registration route/link/bookmark; (2) replace
    the public screens with a clear handoff to the real website flow; (3) retain
    `410` on retired unsigned/write APIs and ADMIN-only read-only history;
    (4) test direct URLs, browser back/refresh, and unauthenticated access.
    Dependency: confirmed website destination from gap 1. Completion evidence:
    no dangling form or implied in-app submission path and continued failed-closed
    backend writes.

11. **Mobile Applications experience — incomplete; acceptance unverified.**
    (1) Define supported phone breakpoints; (2) fix the expanded sidebar/Network
    clipping; (3) verify list, attention queue, detail modal, availability reasons,
    documents, activity, errors, and action footer at each breakpoint; (4) verify
    keyboard, focus, scroll lock, and close behavior. Completion evidence:
    screenshots and interaction results at the approved phone widths. Historical
    modal scroll/close evidence at 390×844 does not establish full mobile readiness.

12. **Database policy constraints — decision and hardening incomplete.**
    (1) Review all writers against the directive's Ready-for-Decision decline
    gate; early decline would require a separately approved policy change;
    (2) encode the approved invariant in database
    constraints/triggers or restrict all writes to one transactional boundary;
    (3) require failure codes for blocked/failed notification states and define
    legal worker transitions; (4) update rollback verification for direct writes
    and concurrency. Completion evidence: approved policy plus passing rollback
    SQL that rejects each invalid state and permits each intended state.

13. **Calendly dedupe scope — policy risk unresolved, not a proven exploit.**
    The unique payload hash is currently global while one configured organization
    is supported. Before multi-organization receiving: (1) decide whether provider
    delivery identity is global; (2) if not, migrate uniqueness to organization +
    hash with collision/replay analysis; (3) test same hash across tenants and
    duplicate hash within one tenant. Completion evidence: documented scope,
    migration/rollback if needed, and tenant-isolation results.

14. **Historical backfill — incomplete and deliberately blocked.** (1) Inventory
    legacy records and stable identifiers read-only; (2) approve explicit mapping
    for registration links and every nullable milestone; (3) define conflicts,
    rerun/idempotency, rollback, and audit provenance; (4) dry-run and reconcile
    counts; (5) execute only in an authorized environment. Never infer signatures,
    calls, countersignatures, or credentials from status text. Completion evidence:
    reviewed mapping, before/after reconciliation, idempotent rerun, rollback
    result, and per-row provenance.

15. **Refresh/cache behavior — acceptance unverified.** Historical browser
    observation found stale attention cards after fixture cleanup until refresh;
    it did not show database residue. (1) define expected invalidation after every
    mutation/event; (2) add query invalidation or bounded polling/event refresh;
    (3) verify list, attention queue, and open detail converge without a hard
    refresh. Completion evidence: deterministic UI convergence against confirmed
    database state.

16. **Production release and end-to-end acceptance — unverified and unauthorized
    by this audit.** Complete gaps 1–15, then: (1) approve migrations/configuration,
    rollback, fictional recipients, and release window; (2) verify production
    provider/account settings without recording secrets; (3) apply the approved
    release procedure; (4) run separate approval and decline journeys; (5) capture
    API, database, provider, UI, delivery, privacy, monitoring, and rollback
    evidence. Completion evidence is an authorized sign-off package. No current
    statement in this document means production was inspected or passed.

## Current manual scheduling-delivery verification (September 21)

This milestone is separate from, and does not rewrite, the dated historical test
table below:

| Test group | Result | What it establishes |
|---|---|---|
| Delivery adapter/templates/audit unit suites | **23 passed** | Gate, provider classifications/idempotency, safe templates, and audit behavior |
| Real Development DB with mocked provider | **3 passed** | Concurrency/receipt, retry while blocked backlog stays untouched, and stale-claim handling |
| Baseline API/web/shared typecheck | **Passed** | Current source and regenerated contract typecheck |
| Real authenticated route replay + worker | **Passed for one retained fixture** | Two same-action route calls produced one notification attempt; provider accepted it |
| Independent Resend read-only lookup | **HTTP 200; `last_event: delivered`** | Provider reported delivery; not human-open/read evidence |
| UI browser acceptance | **Real resend/persistence verified; callout fix unit-tested afterward** | Two accepted rows; no duplicate third row; no full clean browser rerun claimed |

The first helper provider lookup timed out; the later independent read-only
lookup supplied the provider-delivery evidence. No schema change or migration was
part of this milestone. Exact sanitized fixture identifiers and the retention
reason are in
`docs/implementation/producer-scheduling-delivery-verification.md`.

## 3. Historical tests actually run (September 20–21 only)

These results were not rerun during the September 21 source reconciliation.

| Test group | Historical result | What this established at that time |
|---|---|---|
| Existing six appointment test files | **46 passed, 0 failed** | Signed transport, status priority, packet planning, pure Calendly matching/ordering, safe notification templates/outbox, review projections |
| New offline audit suite | **5 passed, 2 failed** | Additional malformed-event/URL/signature/ambiguity/safe-projection cases; failed declined permission and padded email regressions |
| Shared-library build | **Failed TS2308** | Reproducible generated export collision |
| API package typecheck | **Passed** | API source typing only; does not negate shared-lib failure |
| Web package typecheck | **Passed** | Frontend source typing only |
| Baseline quality gate | **Failed** | Stops at shared-library build |
| Foundation SQL verification | **Passed; rolled back** | Registration schema and lifecycle constraints exercised by verification script |
| Operations SQL verification | **Passed; rolled back** | Cross-org rejection, duplicate event/outbox constraints, sent timestamp invariant, blocked defaults |
| Authenticated review journey | **Passed tested cases** | Admin/CSA/AGENT/unauth permissions, tenant denial, call concurrency, decline idempotency, outbox dedupe, UI and Resources |
| Signed Calendly + actual database audit | **Failed overall** | Initial creation/dedupe and review cases work; existing-booking transitions fail |

### Historical authenticated integration details

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

### Historical Calendly persistence details

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

## 4. Blocked acceptance matrix

Every row maps to a numbered current gap above; those entries contain the exact
steps, dependencies, and required completion evidence.

| Blocked test / acceptance requirement | Current classification | Completion plan |
|---|---|---|
| Real website payload validation, 201/409/422, concurrency, warnings, atomic jobs | Incomplete; configuration/acceptance pending | Gap 1 |
| Historical backfill equivalence without invented milestones | Incomplete; policy pending | Gap 14 |
| Signed-source ingestion, SSRF, limits, hash/scanning, recovery | Incomplete; configuration/acceptance pending | Gap 5 |
| Actual download, expiry, bytes/hash, combined-file privacy | Incomplete; configuration/acceptance pending | Gap 5 |
| SignWell 5+N files, fields, recipient isolation, countersign hold | Incomplete; provider configuration/acceptance pending | Gap 2 |
| Expiry/decline, countersign, replay/late events, PDF retrieval/splits | Incomplete | Gaps 2 and 4 |
| Approval mapping, duplicates, activation, credential handoff/login | Incomplete | Gap 3 |
| Envelope-present decline with void and delivered neutral notice | Incomplete; delivery configuration pending | Gaps 4 and 6 |
| Live Calendly timing, Zoom link, reschedule compatibility | Configuration pending; acceptance unverified | Gap 7 |
| Exactly-once 48-hour nudge / conditional 24-hour reminder | Incomplete | Gap 6 |
| Remaining-template Resend receipt, bounce/failure reconciliation, sender/staff routing | Incomplete; manual scheduling only verified in Development | Gap 6 |
| Human-readable safe activity with actor identity and changes | Incomplete | Gap 9 |
| Legacy route handoff and direct-URL UX | Incomplete UX; backend denial built | Gap 10 |
| Full phone navigation and Applications journey | Incomplete; acceptance unverified | Gap 11 |
| Direct-writer constraints and notification state invariants | Policy/hardening incomplete | Gap 12 |
| Multi-organization Calendly dedupe | Policy risk unresolved | Gap 13 |
| UI convergence without manual refresh | Acceptance unverified | Gap 15 |
| Full website → signing → booking → approval/decline → activation | Multiple dependencies incomplete | Gap 16 after gaps 1–15 |
| Production schema/provider/deployment readiness | Acceptance unverified; not inspected | Gap 16 |

Pure mocks and synthetic fixtures cannot prove legal document visibility, actual
delivery, live subscriptions, production readiness, or successful unfinished
endpoints. These are **blocked**, not passed or merely skipped for convenience.

## 5. Historical reproduction commands

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

## 6. Historical cleanup and evidence boundaries

Authenticated review fixtures: 4 registrations, 3 documents, 4 notifications,
7 activities; final fixture residue 0 for registrations/documents/notifications/
activity/bookings.

Final Calendly persistence run: 5 registrations, 6 committed events, no notices;
all were removed along with the one temporary trust row and organization.
Earlier legacy-ID probing also cleaned its five registrations. Existing
organization/trust/account data was not modified.

Stale migration/router/legacy-protection checklist entries were corrected during
the historical audit. The five reproduced code defects are now resolved; the
outstanding completion gaps are listed in section 2 and must not be hidden by
historical passing unit tests. No production inspection or production acceptance
was performed.