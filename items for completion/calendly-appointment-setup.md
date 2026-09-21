# Calendly appointment setup — current completion review

**Reviewed against current source:** September 21, 2026.
**Scope:** current source plus the separately recorded Development manual-email
milestone. No Calendly account, subscription, live booking, or production
database was checked.

## Status summary

### Pending setup — booking return path

The user confirmed that the scheduling email opens Curtis's existing Calendly
page. Return-path setup was initially deferred, then identified as the closest
next automation milestone under the agreed hybrid workflow. It is still pending,
not configured or verified by this documentation update. Preserve the working
link; do not replace it or simulate bookings. Applicants choose times; the system
should record bookings/cancellations, with staff resolving unmatched cases.

The Development inspection found `CALENDLY_SIGNING_KEY`, `CALENDLY_EVENT_URI`
and `PRODUCER_CALENDLY_ORG_ID` absent. The receiver exists, but no live Calendly
subscription or real booking-to-application update has been verified.
Production configuration was not inspected.

**Resume checklist:**

1. Authorize access to the existing Calendly account and inspect subscriptions
   before creating anything, preserving any production subscription.
2. Configure the Development signing secret securely, the correct API event-type
   URI, and the trusted Axel organization assignment.
3. Configure or verify signed booking/cancellation notifications to
   `/api/webhooks/calendly` in the intended environment.
4. Make a real controlled booking from the application's emailed link; verify
   reference matching, scheduled time, meeting link, and duplicate-event safety.
5. Verify real cancellation/rescheduling updates without fabricating provider
   events or marking the application complete manually.

**Completion evidence:** actual provider booking and signed callback, correct
application update, and recorded cancellation/rescheduling outcomes. A working
Calendly page alone does not satisfy this item.

### Built in source

- `POST /api/webhooks/calendly` is mounted before the global JSON parser and
  authenticates exact raw bytes. It rejects compression, oversized bodies,
  malformed signatures/payloads, missing configuration, and the wrong configured
  event type.
- Current parsing accepts only `invitee.created` and `invitee.canceled`, requires
  `payload.scheduled_event.event_type`, sanitizes optional meeting URLs, and
  never guesses the API event type from the public scheduling link.
- Persistence verifies the configured organization against
  `trusted_axel_organizations`, deduplicates the raw payload hash, scopes
  registrations by organization, matches reference before email, leaves
  unmatched/ambiguous events for staff review, and protects newer bookings from
  stale creates/cancellations.
- Matching bookings update the canonical registration and booking row. Current
  cancellations clear only the current booking and enqueue a blocked applicant
  rescheduling request when a validated address exists.
- Staff can see sanitized unresolved scheduling events, active meeting details,
  and blocked notification requests.
- The latest Admin scheduling-link action has strict `actionId` plus
  `send`/`resend` intent, atomic audit/outbox persistence, replay-safe retries,
  conflict detection, and UI retention of an unresolved action ID. New requests
  become pending only when the closed-by-default scheduling-delivery gate,
  provider configuration, and complete test-recipient allowlist pass.
- A worker and Resend adapter are built for those new manual `scheduling_link`
  requests only. They use atomic bounded claims, stable provider idempotency,
  bounded known-failure retries, conservative unknown/stale handling, declined
  registration checks, and provider-receipt audit. Historical blocked requests
  are not selected.

### Incomplete in source

- There is no Calendly subscription provisioning or reconciliation code.
- Unmatched/ambiguous events set `staff_needs_review`; they do not enqueue or
  deliver the declared `unmatched_booking` staff notification.
- Cancellation enqueues only the applicant `booking_canceled` request; the
  required staff notification is not implemented.
- The 48-hour scheduling-nudge and conditional 24-hour reminder exist only as a
  pure due predicate. No scheduler/worker invokes it.
- Delivery for cancellation notices and every other appointment lifecycle event
  remains unfinished and blocked. The manual scheduling worker does not select
  those events.
- Live account evidence that the selected event is a 45-minute Zoom meeting
  has not been recorded; the required duration itself is explicitly specified.

### Configuration pending

- `CALENDLY_SIGNING_KEY` through approved secret management.
- `CALENDLY_EVENT_URI` set to the Calendly API **event type URI**, not the human
  scheduling URL.
- `PRODUCER_CALENDLY_ORG_ID` set to an approved UUID already present in
  `trusted_axel_organizations`.
- A webhook subscription restricted to the approved organization/event type and
  the deployed HTTPS callback.
- Approved reminder ownership and verified 45-minute Zoom event configuration.

`https://calendly.com/axelworkforcesolutions/30min` is a human scheduling URL,
not an API event type URI. The directive explicitly specifies a 45-minute Zoom
meeting and states that `30min` is only the slug. Verify the account matches;
do not reopen this as an undecided product requirement.

### Acceptance unverified

Live booking visibility within one minute, actual signature verification from
Calendly, duplicate delivery, cancellation, reschedule, out-of-order delivery,
meeting-link visibility, unmatched/ambiguous operations, reminder behavior, and
production operation were not verified here.

Development configuration inspection found `CALENDLY_SIGNING_KEY`,
`CALENDLY_EVENT_URI`, and `PRODUCER_CALENDLY_ORG_ID` absent. A Calendly
integration is available but not connected. No fake booking should be used to
claim acceptance; actual booking remains open.

## Completion plan for every remaining gap

### 1. Approve the Calendly event type and meeting policy

**Dependency:** Calendly account owner and product/operations owner.

1. Inspect the intended Calendly event type in the authorized account.
2. Verify the event is configured for the specified 45-minute duration and Zoom
   location; confirm timezone behavior and the specified public URL.
3. Record the immutable Calendly API event type URI for that approved event.
4. Decide whether Calendly or Axel owns reminders; if Axel owns the 24-hour
   reminder, explicitly disable the overlapping Calendly reminder.

**Completion evidence:** dated owner approval containing the event type name,
duration, location, API URI, public URL, and reminder setting, without secrets.

### 2. Configure the receiver trust anchors

**Dependencies:** item 1; approved secret-management process; trusted Axel
organization selection.

1. Confirm the target organization is the intended tenant and is explicitly
   present in `trusted_axel_organizations`.
2. Store `CALENDLY_SIGNING_KEY` only in the approved secret manager.
3. Set `CALENDLY_EVENT_URI` to the approved API URI and
   `PRODUCER_CALENDLY_ORG_ID` to the trusted organization UUID.
4. Verify configuration separately in each target environment; do not copy
   Development evidence into a production claim.

**Completion evidence:** redacted configuration checklist, trust-anchor query
result, and a health/negative check showing missing or untrusted configuration
fails closed. No secret value belongs in the evidence.

### 3. Create and reconcile the webhook subscription

**Dependencies:** items 1–2 and an approved deployed HTTPS callback.

1. Create the subscription in the authorized Calendly account for only
   `invitee.created` and `invitee.canceled` within the approved scope.
2. Point it to `/api/webhooks/calendly`; confirm no proxy/parser changes the wire
   bytes.
3. Record subscription ID, scope, event list, callback, and owning account in the
   operational inventory.
4. Add a reconciliation procedure that detects missing, duplicate, broadened, or
   wrong-callback subscriptions.

**Completion evidence:** redacted provider subscription record and a signed
provider test event accepted by the intended environment; wrong signature and
wrong event-type tests must be rejected/ignored as designed.

### 4. Complete staff handling for unmatched, ambiguous, and canceled events

**Dependencies:** approved trusted-staff recipient source and producer email
delivery implementation.

1. Resolve staff recipients from the approved source; never guess a distribution
   address from the webhook payload.
2. Transactionally enqueue `unmatched_booking` for unmatched/ambiguous events and
   a staff cancellation event for an applied cancellation.
3. Add an audited resolution action for the staff review queue so operators can
   associate or dismiss an event without mutating sanitized source evidence.
4. Define escalation age and alerting for unresolved rows and missing applicant
   addresses.

**Completion evidence:** integration tests for unmatched, ambiguous,
cancellation, missing-recipient, resolution, dedupe, and tenant isolation;
staging evidence that both the queue and authorized staff notice reflect one
event.

### 5. Complete producer scheduling-link delivery acceptance and operations

**Dependency:** the worker and provider boundary in
`appointment-email-delivery.md`.

1. Preserve the current action-ID semantics: reuse the same ID/intent only for a
   transport retry and generate a new ID for an intentional resend.
2. **Built:** dispatch the persisted notification through the producer outbox
   rather than calling a provider from the HTTP route.
3. Keep declined, untrusted, cross-tenant, and missing-recipient requests
   unavailable; surface configuration availability separately from role and
   lifecycle permission.
4. Reconcile old `DELIVERY_NOT_ENABLED` rows under an approved historical-row
   policy; the current worker correctly leaves them untouched.

**Completion evidence:** concurrent retry/resend tests, provider idempotency
tests, UI/API acceptance showing delivered versus blocked/failed state, and no
unexpected release of older blocked requests.

The current Development milestone provides route replay, worker, and one real
provider-reported `delivered` result for a retained manual fixture. It is not a
human-read receipt, a full clean UI browser pass (a stale callout was fixed and
unit-tested after the real resend check), an actual
Calendly booking, or production proof. See
`docs/implementation/producer-scheduling-delivery-verification.md`.

### 6. Implement the 48-hour nudge and conditional 24-hour reminder

**Dependencies:** items 1 and 5; reliable worker clock; authoritative booking
rows.

1. Approve the packet-sent clock, timezone/display rules, and exclusions.
2. Build a resumable scheduler that selects due rows and rechecks booking,
   decision, completion, cancellation, and scheduled time under lock.
3. Enqueue the 48-hour nudge only when no active booking exists.
4. Enqueue the 24-hour reminder only when the approved record says Calendly
   reminders are disabled.
5. Use stable time-window dedupe keys and suppress stale reminders after a
   cancellation or reschedule.

**Completion evidence:** tests at exact time boundaries and for booking-before-
nudge, cancellation, reschedule, declined/completed records, concurrency, and
replay; controlled staging rows with exactly one eligible reminder.

### 7. Complete live non-production acceptance

**Dependencies:** items 1–6; authorized Calendly and email test recipients.

1. Book with reference tracking and verify canonical application visibility,
   active booking, scheduled time, and meeting link within one minute.
2. Replay the exact webhook and verify no duplicate event, booking regression,
   audit, or notification.
3. Reschedule and deliver old/new events out of order; verify the newest booking
   remains active.
4. Cancel the current booking and verify only it is cleared, staff review/notice
   occurs, and the applicant rescheduling request follows its delivery state.
5. Exercise unknown reference, duplicate email candidates, malformed event type,
   bad signature, missing recipient, and delayed delivery.
6. Verify the approved reminder owner produces one reminder, not duplicates from
   both systems.

**Completion evidence:** dated acceptance matrix with sanitized event IDs,
timestamps, database outcomes, UI observations, and authorized mailbox receipts.
Label it by environment; it is not production proof.

### 8. Establish production operations

**Dependencies:** successful item 7 and release approval.

1. Assign owners for subscription health, unresolved-event review, reminders,
   email failures, and incident response.
2. Add alerts for receiver 5xx/401 spikes, stale unresolved events, booking
   processing latency, scheduler failures, and delivery backlog.
3. Document key rotation, subscription recreation, replay/reconciliation, and
   rollback procedures.
4. Verify production configuration/subscription/database state through the
   approved release process before recording go-live.

**Completion evidence:** runbook, alert routing, recovery rehearsal, and dated
production release/acceptance record. Repository source alone is insufficient.

## Historical evidence (not current or production proof)

`docs/implementation/producer-appointment-verification.md` records that the
activity, Calendly, and notification migrations and a rollback verification were
checked in Development on September 20. Current source also contains offline
Calendly tests and an opt-in Development persistence audit. This review did not
rerun them. They are historical Development evidence only and do not prove a
live subscription or production configuration.

The later manual scheduling milestone did perform one controlled Development
provider send and retained its fixture for a future real booking test. It made no
schema/migration or Calendly subscription change and does not alter the
historical Calendly results above.