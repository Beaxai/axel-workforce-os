# Producer Appointment — Completion Register

This folder tracks unavailable inputs, unresolved decisions, and remaining
integration work for the producer registration and appointment initiative.
It is not a launch approval or a claim that the end-to-end flow is complete.

## Latest audit

See [Appointment audit and test matrix](appointment-audit-and-test-matrix.md)
for current passing checks, reproducible failures, remaining implementation
gaps, and tests that cannot yet run with their exact unblock requirements.

## Current coverage

| Part | Available implementation | Remaining gate |
|---|---|---|
| 1 — Website intake | Additive registration/owner/document/job schema, derived statuses, signed transport, synthetic connectivity test | Actual website field mapping, real intake persistence and validation, private document ingestion |
| 2 — SignWell | Tested document/recipient planner, intended access rules, countersign prerequisites | Approved PDFs, field placement, proven provider visibility and external approval hold, real dispatch and verified webhooks |
| 3 — Calendly | Signed receiver, durable deduplication/review inbox, matching and booking/cancellation ordering, persisted booking state | Signing key, API event-type URI, trusted organization configuration, subscription and live acceptance; outbound notices remain blocked |
| 4 — Applications | Network Applications list/detail, staff booking attention queue, call completion, role/scoping/redaction, blocked action reporting, safe decline without a provider envelope | Agency/partner/contact provisioning, duplicate reconciliation, provider release/void, activation, credential handoff, private document access |
| 5 — Email | All requested templates, strict safe template inputs, persistent blocked outbox, visible delivery status, reminder due predicates | Verified sender/recipients, delivery/retry worker, automated scheduler, provider delivery and complete lifecycle wiring |
| Resources | Compensation Schedules and Guidelines entry clearly marked as awaiting an approved document | Approved content and authorized download |
| Final acceptance | Local checks and development verification | Real website → signing → booking → approval → countersigning → credentials dry run |

## Detailed completion records

- [Website connection and real intake](website-connection-handoff.md)
- [SignWell documents, provider controls, and controlled test](signwell-appointment-packet.md)
- [Calendly setup and live acceptance](calendly-appointment-setup.md)
- [Admin activation, private files, and credentials](appointment-admin-activation.md)
- [Email delivery and scheduling](appointment-email-delivery.md)

## Cross-cutting decisions and launch blockers

- [ ] Review the historical registration backfill/linking strategy. Do not infer
  signatures, call completion, countersignature, or credential timestamps from
  legacy status strings.
- [ ] Reconcile duplicate agencies and people explicitly. Approval must not
  overwrite existing agency compliance facts or deactivate legitimate existing
  users.
- [ ] Confirm whether a decline is permitted before Ready for Decision. Current
  canonical decision eligibility follows the directive's packet-signed and
  call-completed gate.
- [ ] Confirm that CSA may record call completion. Current implementation permits
  trusted Admin/CSA staff to record notes and completion but only Admin to decide
  or request scheduling/credentials.
- [ ] Configure private producer-file storage, safe signed-URL ingestion,
  bounded downloads, hashes, and malware scanning capability. Source URL
  allowlists and approved storage namespace are not to be guessed.
- [ ] Complete authenticated short-lived file viewing. W-9, ACH, and a combined
  packet containing them must never leak through CSA or public routes.
- [ ] Confirm provider webhook authenticity plus authoritative live SignWell
  verification, idempotent event processing, and declined-state protection.
- [ ] Implement durable provider actions for send, release, void, PDF download,
  and mail delivery. A stored intent or “blocked” outbox row is not a completed
  external action.
- [ ] Verify all database constraints, functions, and triggers in the approved
  release process; do not add schema mutations to application startup.
- [ ] Select authorized fictional-data test recipients. No real packet or
  applicant email should be sent merely to test configuration.
- [ ] Verify production Resend delivery. Existing generic Resend code and an
  API-key setting do not prove producer-flow production delivery.
- [ ] Complete the end-to-end dry run and record screenshots, API outcomes,
  database outcomes, provider visibility checks, and a separate decline path.

## Legacy workflow safety

Unsigned legacy public registration is retired. Historical registration writes,
approval, and new credential issuance through the legacy router are blocked.
Historical records are retained for trusted Admin review; existing accounts and
their access are not deactivated. The old registration screen redirects to
Network → Applications. A reviewed migration is required for historical
applications needing further processing.

## Release boundary

Verification evidence is recorded in
`docs/implementation/producer-appointment-verification.md`.

The existing desktop sidebar clips the underlying Network screen at phone
widths. The Applications detail modal was verified to scroll and close at
390×844; broader phone navigation remains a separate layout improvement.

Work remains on the local `appointment/01-intake` branch. Development schema
changes affect the shared development database, not an isolated Git-branch
database. Do not assume any of this code is published or that provider
subscriptions are configured. No production database changes or live signing
packets/emails are authorized by the local implementation checks.