# Producer appointment email delivery — current completion review

**Reviewed against current source and Development verification:** September 21,
2026.
**Evidence scope:** the staff-requested `scheduling_link` path only. Its transport
is automated once requested; “manual” below describes the staff action, not
manual email delivery. Production, mailbox reading, and the remaining appointment
lifecycle notifications were not verified.

## Status summary

### Current hybrid direction (target, not current completion)

The approved operating model is hybrid. Staff owns qualification and call notes,
approval/decline, ambiguous identity resolution, and deliberate resend decisions.
Software should persist intake, deliver mail, update bookings, track verified
signatures, create or link an unambiguous identity after manual approval, and
withhold activation and secure credentials until verified countersignature. This
is the target responsibility split; only the narrow Development scheduling-link
delivery described below is built and externally verified. It does not establish
automated delivery for the rest of the lifecycle.

### Confirmed configuration direction

The user clarified that Development and production share email domains but have
separate existing webhooks. Reuse each environment's own webhook and matching
signing secret; do not repoint or reuse the Development webhook for production.
The earlier intent to reuse email API keys was not retracted, but does not mean
webhook signing secrets are interchangeable. Replacement domains or webhooks are
not a prerequisite. Verify routing without changing working configuration.
The user authorizes actual sends, including bulk email tests, to test accounts.
Do not block tests merely because they send email; confirm test-only recipients
and use the appropriate environment webhook. This permission is not evidence
that delivery has been tested, nor permission to mail unrelated real contacts.

### Built in source

- `producer_notifications` has organization-scoped deduplication, delivery-state
  fields, recipient and state constraints, and registration/organization scope
  enforcement (`lib/db/src/schema/producer-notifications.ts` and
  `lib/db/migrations/20260912_producer_notifications.sql`).
- All declared producer events have branded HTML/text templates. Template input
  is strict, recipients are normalized and deduplicated, sensitive extra fields
  are rejected, and links are allowlisted
  (`services/producer-appointment/notifications.ts`).
- `enqueueProducerNotification` is persistence-only and does not call Resend.
  Every event defaults to `blocked/DELIVERY_NOT_ENABLED`; only the authenticated
  staff-requested `scheduling_link` route can opt a newly created row into
  `pending` after the delivery gate passes.
- Current producers enqueue blocked requests for ready-for-decision, decline,
  and Calendly cancellation. Staff-requested scheduling rows are pending or
  blocked according to the gate. The staff detail API and UI expose persisted
  status and failure code.
- The latest staff-requested scheduling-link action is implemented separately from
  delivery: a strict caller UUID plus `send`/`resend` intent, registration lock,
  atomic outbox/audit write, replay of the original result, conflict on intent
  reuse, and a fresh ID for an intentional resend. The browser retains an
  unresolved action ID in session storage.
- A producer-specific Resend adapter and 15-second application-process worker are
  built for `scheduling_link` only. New authenticated staff requests become
  `pending` only when `PRODUCER_SCHEDULING_DELIVERY_ENABLED=true`, the provider
  key and sender are configured, and every normalized recipient is in
  `PRODUCER_SCHEDULING_TEST_RECIPIENTS`. Otherwise the route persists a blocked
  request with an explicit gate failure.
- The worker atomically claims bounded batches with `FOR UPDATE SKIP LOCKED`,
  uses a notification-derived Resend idempotency key, records attempts and
  provider acceptance, retries known 429/5xx responses with bounded backoff,
  stops retrying ambiguous transport outcomes, rejects declined registrations,
  fences concurrent/stale claims, and refuses late retries beyond the provider
  idempotency window. It selects only `pending scheduling_link` rows, so
  historical blocked rows and every other event remain blocked.

### Existing infrastructure that is **not** producer delivery

`services/emailService.ts` also contains real Resend transport for deal MARKET,
BROKER, and a narrow system-notice channel. It is coupled to deals,
correspondence threads, deal recipient policy, reply routing, and
`deal_outbound_emails`. The new producer scheduling adapter is separate and does
not route producer mail through that deal contract.

### Incomplete in source

- The worker is deliberately limited to staff-requested `scheduling_link`. There
  is still no dispatcher for the other producer events, scheduler,
  bounce/webhook status reconciliation, monitoring, or operator
  retry/reconciliation control.
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
  silently reclassified or released; the worker currently leaves them untouched.

### Configuration pending

Email domains are shared; existing webhooks remain environment-specific.
Remaining appointment-specific decisions concern sender identity within that
setup, applicant recipient rules, trusted-staff distribution, authenticated
application origin, SignWell notification policy and Calendly reminder policy.
New staff-requested scheduling rows additionally require the explicit enable
flag, test-recipient allowlist, and provider sender/key configuration. Actual
production delivery and correct deployed routing remain acceptance checks, not
requests for new credentials or replacement webhooks.

### Acceptance unverified

Development now has one real staff-requested scheduling-link delivery result. The
authenticated route was invoked twice with the same action identity, producing
one notification attempt. Resend accepted it, and a later independent read-only
Resend `GET` returned HTTP 200 with `last_event: delivered`. The first helper
lookup timed out; the subsequent lookup supplied the delivery evidence. This is
provider-reported delivery, not proof that a human opened or read the message.
The retained fixture and exact identifiers are recorded in
`docs/implementation/producer-scheduling-delivery-verification.md`.

The browser check confirmed a real intentional resend, two accepted notifications
and persisted Delivery Status after reopening. It exposed a stale queued callout,
now fixed and covered by three passing focused tests; no full clean browser rerun
is claimed. No controlled
acceptance exists for the other templates, bounce handling, alerts, mailbox
reading, or production.

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

### 2. Complete the producer-specific provider boundary

**Dependencies:** item 1; reuse the existing Resend setup with the correct
environment-specific webhook and matching signing secret.

1. **Built for staff-requested scheduling only:** the adapter accepts a persisted
   `scheduling_link`, is independent of deal correspondence, uses a stable
   notification-derived provider key, persists the provider ID in appointment
   activity, and distinguishes retryable, permanent, and unknown outcomes.
2. Extend the reviewed boundary only when each additional lifecycle event has an
   approved recipient policy and trigger.
3. Add provider delivery/bounce webhook reconciliation and the associated safe
   status model; do not equate provider acceptance with inbox delivery.
4. Keep secrets out of rows, logs, API responses, and documentation.

**Completion evidence:** boundary tests with a fake provider for success,
permanent error, transient error, timeout-after-acceptance, duplicate key, and
redacted logging; reviewed provider payload fixtures.

### 3. Complete safe outbox dispatch and recovery

**Dependencies:** item 2 and the migrated notification table in the target
environment.

1. **Built for new staff-requested scheduling rows:** bounded atomic claims, concurrent
   worker exclusion, pre-I/O attempt recording, bounded known-failure retries,
   terminal unknown handling, stale-claim fencing, and provider receipt audit.
2. Add provider reconciliation for unknown/stale outcomes rather than
   automatically resending them.
3. Add operator views/actions for inspect, retry-as-new-attempt, suppress, and
   reconcile, all audited.
4. Add metrics and alerts for blocked backlog, claim age, failure rate,
   exhausted retries, and delivery-unknown rows.

**Completion evidence:** concurrency tests proving one claim/send per attempt,
crash-boundary tests, retry-limit tests, operator-audit tests, and observable
test alerts/metrics.

### 4. Define the enablement and historical-row transition

**Dependencies:** items 1–3 and controlled staging acceptance in item 7.

1. **Built for staff-requested scheduling:** an explicit environment gate defaults closed
   and additionally requires provider configuration and a complete recipient
   allowlist match. Organization-level policy remains to be approved if needed.
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

1. Build on the one Development scheduling-link provider-delivery result:
   send every remaining applicant/staff template in controlled staging and
   verify HTML, text, links, sender identity, receipt, and no sensitive provider
   payload.
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

## Verification evidence (not production proof)

The current milestone recorded **23 passing unit tests** across the delivery
adapter, templates, and audit behavior; **3 passing real-Development-database
tests** with a mocked provider covering concurrency/receipt, retry/backlog, and
stale claims; and a passing baseline API/web/shared typecheck. The generated API
contract was updated. No schema change or migration was required.

The real Development send proves only the narrow staff-requested path and
provider-reported delivery. Production remains unverified/test-only, and full
lifecycle mail, reminders, bounce reconciliation, and actual Calendly booking
remain open.