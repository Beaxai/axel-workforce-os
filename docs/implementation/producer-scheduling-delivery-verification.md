# Producer scheduling delivery verification

**Date:** September 21, 2026  
**Environment:** Development only  
**Scope:** authenticated manual `scheduling_link` action and its dedicated worker.
This is not production acceptance or full appointment-lifecycle acceptance.

## Implemented boundary

- The authenticated scheduling route persists a new manual request as `pending`
  only when `PRODUCER_SCHEDULING_DELIVERY_ENABLED=true`, the Resend key and From
  identity are configured, and every normalized recipient is on
  `PRODUCER_SCHEDULING_TEST_RECIPIENTS`. It otherwise fails closed into a blocked
  row with an explicit reason.
- The application starts a 15-second sweep. The worker selects only pending
  `scheduling_link` rows, atomically claims bounded batches, and uses
  `producer-scheduling-<notification UUID>` as the stable provider idempotency
  key.
- Known 429/5xx results receive bounded backoff. Permanent rejection and
  ambiguous transport results become terminal failures; ambiguous outcomes are
  not automatically resent. Stale claims become `DELIVERY_UNKNOWN`, declined
  registrations are suppressed, and retries beyond the provider idempotency
  window are refused.
- Provider acceptance is recorded in appointment activity with the provider
  message ID. Historical blocked rows and all non-`scheduling_link` lifecycle
  events are not eligible for this worker.

## Automated verification

- **23 passed:** adapter, notification-template, and appointment-audit unit tests.
- **3 passed against the real Development database with a mocked provider:**
  concurrent single claim plus durable receipt; known-failure retry with the same
  provider key while historical backlog remains blocked; stale-claim terminal
  handling without another provider call.
- Baseline API, web, and shared-library typecheck passed.
- The generated API contract now represents the persisted scheduling states and
  clarifies that `sent` means provider acceptance, not confirmed inbox delivery.
- No schema change or migration was made for this milestone.

## Real Development provider verification

The controlled test called the real authenticated scheduling route twice with
the same action identity and then invoked the worker through the verification
helper. The durable result was one notification and one delivery attempt. Resend
accepted the request. The helper's initial provider lookup timed out; a subsequent
independent read-only Resend `GET` returned HTTP 200 with
`last_event: delivered`.

That result is provider-reported delivery. No human-open or human-read claim is
made, and no mailbox address or credential is recorded here.

Sanitized durable identifiers:

- Reference: `AXR-20991231-B6CE67`
- Registration: `58d65dcc-e1d2-4e46-8307-c8de9daa3edf`
- Notification: `799b3e7c-974f-4eb7-bc0c-52757863deb3`
- Provider message: `01a0c486-4c53-70cc-aa36-838988d4487f`

The fixture is intentionally retained for a future authorized real booking test.
It is not evidence of real website intake.

## Explicitly still open

- Browser verification exercised an actual intentional resend and confirmed
  exactly two distinct notifications total, each accepted in one attempt.
  Delivery Status persisted correctly after reload/reopen and temporary staff
  access was removed. The tester observed a stale queued top callout during
  the run. That callout now derives from polled notification state; three focused
  regression tests and the web typecheck passed. No second browser send was
  performed to verify that fix, so a full clean browser pass is not claimed.
- Development currently lacks `CALENDLY_SIGNING_KEY`, `CALENDLY_EVENT_URI`, and
  `PRODUCER_CALENDLY_ORG_ID`. The available Calendly integration is not connected.
  Do not create a fake booking to claim acceptance.
- Actual Calendly booking/webhook acceptance, cancellation/rescheduling, full
  appointment lifecycle email, reminders, remaining templates, bounce/provider
  reconciliation, operator controls, and production verification remain open.
- Production remains unverified and test-only; this record authorizes no
  production enablement.