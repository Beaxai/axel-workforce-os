# Producer Appointment — Development Verification

Reviewed September 20, 2026 (America/New_York).

## Local checks

- API, frontend, and shared-library TypeScript checks passed.
- Focused intake transport, derived status, packet planner, Calendly,
  notification, and review-projection tests passed.
- The notification regression covers legacy PostgreSQL organization UUIDs;
  the projection regression ensures CSA receives no restricted document metadata.
- OpenAPI client/Zod generation succeeded.
- API and web workflows started successfully; login preview rendered.
- Final targeted diff whitespace check passed.

The earlier whole-workspace check had unrelated mockup-sandbox errors; the
successful package checks above do not claim those unrelated errors were fixed.

## Database checks

Applied the additive activity, Calendly, and notification migrations to
Development only. Independently queried the new tables and indexes.

`lib/db/migrations/verify_producer_appointment_operations.sql` passed in a
transaction ending in ROLLBACK. It verifies:

- Cross-organization activity, booking, provider-event, and notification writes
  are rejected.
- Duplicate provider events and notification dedupe keys are rejected.
- A sent notification cannot be asserted without its required sent timestamp.
- A newly queued notification remains blocked.

No verification fixture remained after rollback. The two historical registration
rows remained present. No production DDL was performed.

## Browser and authenticated API checks

The review journey used disposable fictional application/document fixtures and
existing seeded Development staff sessions; no existing accounts were modified.

- Historical registration screen redirects to Network → Applications.
- Application list, booking attention queue, detail, milestones, and blockers render.
- Required call notes save; Ready for Decision and activity persist after reload.
- Scheduling-link request returns 202 with `DELIVERY_NOT_ENABLED`; blocked
  delivery is visible in the UI rather than reported as sent.
- Approval returns `appointment_activation_not_configured` without changing the
  decision or activating identities.
- Premature credential issuance returns `credentials_not_ready`.
- Cross-organization application reads return 404.
- CSA receives a redacted payload, cannot approve, cannot retrieve restricted
  files, and receives no W-9/ACH/combined-packet document metadata.
- Legacy public creation and authenticated historical writes return 410.
- Resources shows Compensation Schedules and Guidelines as awaiting an approved
  document, without a fake download.
- At 390×844, application detail scrolls and closes successfully.

Two defects found during the journey were corrected and checked: UUID validation
in the notification enqueue path, and CSA restricted-document metadata projection.
All disposable journey fixtures were removed after each run. No emails, packets,
credential activation, provider subscription changes, or real file access occurred.

## Known limitation

The existing desktop sidebar causes horizontal clipping of the underlying
Network screen at phone widths. The new detail modal itself scrolls and closes.
This broader navigation-layout issue was not silently treated as a passing
mobile-page check and is recorded in the completion register.

## Not established by these checks

These results do not prove real website intake, private file ingestion, live
Calendly subscriptions, legal packet privacy, externally held countersigning,
agency activation, delivered email, or production credential issuance. Those
gates remain in `items for completion/README.md` and its linked checklists.