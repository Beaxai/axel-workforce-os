# Producer appointment admin activation — completion blockers

This file records unavailable or unverified work. None of these items should be
treated as complete based only on the canonical Applications API.

- Obtain and approve the exact duplicate agency, user, principal, contact, and
  owner reconciliation policy. Approval currently fails closed with
  `appointment_activation_not_configured` and creates no identities.
- Verify in the authorized SignWell account that owner document visibility and
  externally held countersigner release meet the legal packet design. Implement
  persisted release and void actions only after that verification.
- Implement and acceptance-test provider packet voiding. Applications with an
  existing envelope cannot be declined until then.
- Configure an approved trusted-staff distribution source for broader
  `ready_for_decision` delivery. Call completion currently persists a blocked
  notification for the trusted staff actor and does not guess other recipients.
- Enable and operationally verify notification delivery. Requests remain
  durably `blocked` with `DELIVERY_NOT_ENABLED`; a queued row is not evidence of
  an email being delivered.
- Define a private object-key namespace dedicated to producer documents and
  integrate a short-lived server-side signed URL issuer. Do not infer a bucket
  or permit arbitrary keys. Document access remains blocked until configured.
- Implement a safe credential handoff and verify the existing credential
  delivery flow. The API never falls back to legacy issuance or returns setup
  secrets.
- Development activity, Calendly, and notification migrations have been applied
  and independently checked. Both rollback verification scripts passed again
  during the current audit. Production migration readiness is not established.
- Keep the legacy router ADMIN-only/read-only with writes failed closed; do not
  auto-migrate legacy rows or infer milestones.
- Complete rollback-database and provider acceptance coverage for external
  tenant denial, lifecycle concurrency, private object signing, provider void
  failures, and actual notification delivery.