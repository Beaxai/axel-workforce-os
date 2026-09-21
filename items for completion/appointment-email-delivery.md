# Producer appointment email delivery — current completion review

**Reviewed against current source:** September 21, 2026.
**Scope:** repository evidence only. No production environment, Resend account,
sender domain, secret, recipient mailbox, deployed worker, or provider delivery
was checked.

## Status summary

### Confirmed configuration direction

The user confirmed that the email keys and webhooks currently in use are intended
to apply in production. Reuse the existing Resend setup; obtaining replacement
keys or rebuilding webhook infrastructure is not an outstanding requirement.
This confirmation is not a new production-delivery test. Preserve endpoint and
signing-secret pairing, and verify deployment routing without changing working
configuration or sending live mail merely to check it.

### Built in source

- `producer_notifications` has organization-scoped deduplication, delivery-state
  fields, recipient and state constraints, and registration/organization scope
  enforcement (`lib/db/src/schema/producer-notifications.ts` and
  `lib/db/migrations/20260912_producer_notifications.sql`).
- All declared producer events have branded HTML/text templates. Template input
  is strict, recipients are normalized and deduplicated, sensitive extra fields
  are rejected, and links are allowlisted
  (`services/producer-appointment/notifications.ts`).
- `enqueueProducerNotification` is intentionally persistence-only: every new row
  is written as `blocked` with `DELIVERY_NOT_ENABLED` and zero attempts. It does
  not call Resend.
- Current producers enqueue blocked requests for ready-for-decision, decline,
  manual scheduling-link actions, and Calendly cancellation. The staff detail
  API and UI expose blocked status and failure code.
- The latest manual scheduling-link action is implemented separately from
  delivery: a strict caller UUID plus `send`/`resend` intent, registration lock,
  atomic outbox/audit write, replay of the original result, conflict on intent
  reuse, and a fresh ID for an intentional resend. The browser retains an
  unresolved action ID in session storage. This proves action persistence and
  idempotency, not email delivery.

### Existing infrastructure that is **not** producer delivery

`services/emailService.ts` contains real Resend transport for deal MARKET,
BROKER, and a narrow system-notice channel. It is coupled to deals,
correspondence threads, deal recipient policy, reply routing, and
`deal_outbound_emails`. Its presence does not make the separate
`producer_notifications` outbox deliverable, and producer code does not call it.
Reusing provider-boundary ideas is possible, but routing producer mail through
the deal service as-is would violate its contract.

### Incomplete in source

- There is no producer notification dispatcher/worker, atomic claim operation,
  Resend adapter, retry loop, stale-claim recovery, provider-result persistence,
  monitoring, or operator retry/reconciliation control.
- Most lifecycle events are templates only. No current producer calls enqueue
  `registration_received`, `packet_sent`, `exhibit_a_request`, `call_reminder`,
  `scheduling_nudge`, `approved_countersigned`, `credentials_issued`,
  `new_registration`, `packet_declined_or_expired`, `unmatched_booking`, or
  `countersign_needed`.
- `isSchedulingNotificationDue` implements only the pure 48-hour/24-hour due
  rules; no scheduler invokes it.
- Ready-for-decision currently addresses only the staff actor who completed the
  call. No approved staff distribution resolver exists.
- Existing blocked rows have no approved disposition policy. They must not be
  silently reclassified or released when delivery is later enabled.

### Configuration pending

Existing email keys and webhooks are designated for production reuse by the user.
Remaining appointment-specific decisions concern sender identity within that
setup, applicant recipient rules, trusted-staff distribution, authenticated
application origin, SignWell notification policy and Calendly reminder policy.
Actual delivery and correct deployed routing remain acceptance checks, not
requests for new credentials or replacement webhooks.

### Acceptance unverified

No controlled producer-template receipt, provider idempotency, transient/permanent
failure, delivery-unknown recovery, stale claim, alert, mailbox, or production
acceptance evidence exists in this review. Production readiness is not claimed.

## Completion plan for every remaining gap

### 1. Approve the producer delivery contract and recipient policy

**Dependency:** business/security owners for sender identity, applicant routing,
staff distribution, and sensitive-data policy.

1. Approve the exact From/Reply-To identities and the verified Resend domain.
2. Define authoritative recipient resolution for each applicant, owner,
   countersigner, and staff event; define missing/ambiguous-recipient failure
   behavior.
3. Approve whether staff mail uses an organization-scoped distribution list or
   an allowlisted membership resolver, including change ownership.
4. Review every template/provider payload against the prohibited sensitive
   fields and approve the authenticated document-access origin.

**Completion evidence:** signed recipient/event matrix, sender/domain approval,
security review, and tests that reject unapproved recipients and sensitive
payload fields.

### 2. Implement the producer-specific provider boundary

**Dependencies:** item 1; reuse the existing Resend keys and webhook setup.

1. Add a producer mail adapter that accepts only a persisted producer
   notification and does not depend on deal IDs or deal correspondence tables.
2. Use a stable provider idempotency key derived from the notification attempt;
   persist the provider message ID and a safe response classification.
3. Distinguish permanent failure, retryable failure, and delivery-unknown. Never
   automatically duplicate a send whose provider outcome is uncertain.
4. Keep secrets out of rows, logs, API responses, and documentation.

**Completion evidence:** boundary tests with a fake provider for success,
permanent error, transient error, timeout-after-acceptance, duplicate key, and
redacted logging; reviewed provider payload fixtures.

### 3. Implement safe outbox dispatch and recovery

**Dependencies:** item 2 and the migrated notification table in the target
environment.

1. Claim eligible rows atomically with bounded batches and concurrent-worker
   exclusion; record `sending_started_at` and increment attempts before provider
   I/O.
2. Persist terminal status and provider metadata, schedule bounded backoff for
   retryable failures, and quarantine exhausted/unknown outcomes.
3. Add stale-claim recovery that requires provider reconciliation when delivery
   may have occurred.
4. Add operator views/actions for inspect, retry-as-new-attempt, suppress, and
   reconcile, all audited.
5. Add metrics and alerts for blocked backlog, claim age, failure rate,
   exhausted retries, and delivery-unknown rows.

**Completion evidence:** concurrency tests proving one claim/send per attempt,
crash-boundary tests, retry-limit tests, operator-audit tests, and observable
test alerts/metrics.

### 4. Define the enablement and historical-row transition

**Dependencies:** items 1–3 and controlled staging acceptance in item 7.

1. Add an explicit environment/organization delivery gate that defaults closed.
2. Inventory every pre-enable `blocked/DELIVERY_NOT_ENABLED` row by event and
   age without changing it.
3. Approve a disposition for each class: suppress, regenerate from current
   lifecycle state, or deliberately release. Do not bulk reinterpret blocked
   rows as pending or sent.
4. Require an audited operator action and bounded batch for any approved
   historical release; keep the original row/history.
5. Document immediate rollback to closed mode without losing in-flight state.

**Completion evidence:** approved disposition report, dry-run counts, audited
staging transition, zero unintended historical sends, and rollback rehearsal.

### 5. Wire every required lifecycle producer

**Dependencies:** authoritative intake, SignWell, activation, credential, and
Calendly milestones; items 1–3.

1. Enqueue immediate `registration_received` and `new_registration` only after
   durable intake commits.
2. Enqueue packet, Exhibit A, packet-failure, and countersign events from
   authenticated authoritative signing state, not client assertions.
3. Enqueue approval/countersign and credential events only after their database
   milestones commit.
4. Add the approved staff recipients to ready-for-decision and unmatched booking
   paths.
5. Give every trigger a stable domain dedupe key and transactionally couple it
   to the milestone it reports.

**Completion evidence:** integration tests for each event, duplicate/concurrent
replay tests, event-to-recipient matrix coverage, and database assertions that a
notification cannot precede its authoritative milestone.

### 6. Implement scheduling nudge and reminder jobs

**Dependencies:** Calendly booking persistence, item 3, approved reminder policy.

1. Approve the 48-hour nudge clock and cancellation/reschedule exclusions.
2. Verify and record that Calendly reminders are disabled before allowing Axel's
   24-hour reminder; otherwise keep that event disabled.
3. Build a resumable scheduler that selects due registrations, rechecks state
   under lock, and enqueues with a stable time-window dedupe key.
4. Prevent reminders for canceled, declined, completed, already elapsed, or
   newly rescheduled calls.

**Completion evidence:** boundary-time, timezone, cancellation, reschedule,
concurrency, and replay tests plus staging rows showing one due notification and
none for excluded states.

### 7. Complete controlled acceptance and production readiness

**Dependencies:** items 1–6; authorized non-production recipients and approved
provider configuration.

1. Send every applicant/staff template in controlled staging and verify HTML,
   text, links, sender identity, receipt, and no sensitive provider payload.
2. Exercise duplicate delivery, 4xx, 429, 5xx, timeout, stale claim, suppression,
   operator retry, and rollback.
3. Record support owner, dashboards, alert routes, retention, incident response,
   and provider reconciliation procedure.
4. Separately verify target production configuration and migration state through
   the approved release process before enabling the closed gate.

**Completion evidence:** dated acceptance record with provider message IDs and
mailbox receipts for authorized tests, failure/recovery results, operational
sign-off, and a production release record. Staging evidence must not be labeled
as production evidence.

## Historical evidence (not current or production proof)

`docs/implementation/producer-appointment-verification.md` records a September
20 Development-only migration and UI/API verification. Current source also
contains offline notification tests and an opt-in Development scheduling-action
audit. This review did not rerun them. Those records establish historical
development checks only; they do not establish delivered producer email or
production readiness.

No provider call, send, secret inspection, configuration change, migration
application, database write, or worker startup was performed for this review.