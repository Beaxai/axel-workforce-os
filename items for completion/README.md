# Producer Appointment — Completion Register

This folder tracks unavailable inputs, unresolved decisions, and remaining
integration work for the producer registration and appointment initiative.
It is not a launch approval or a claim that the end-to-end flow is complete.

## Current decision — manual appointment workflow

**September 21, 2026:** the user chose a manual, staff-managed process for the
entire appointment workflow. Previous automation plans below remain future
backlog, not instructions to implement them now. Automation may be reconsidered
for individual steps later. See the
[dated decision](../docs/decisions/2026-09-21-manual-appointment-workflow.md).
This documentation update does not implement manual controls or disable existing
runtime behavior.

## Current priority: demo readiness, not production launch

The current user-approved goal is a demo. The production completion records below
remain accurate backlog, **not a requirement to finish every integration before
demonstrating the product**. The demo must nevertheless use real tools and real
workflow transitions. Only test business/applicant data and missing documents
may be fictional; simulated provider events, signing, approval or activation
are not a substitute for working integration. See
[demo readiness](demo-readiness.md) for the corrected scope and action plan.
This scope decision does not mean those integrations are already implemented.

Actual email sends to test accounts, including bulk tests, are authorized.
Email previews do not replace real delivery acceptance. Keep recipients test-only and use
each environment's existing webhook; do not automatically release old blocked
notifications or extend this permission to real contacts.

## Review scope and status meanings

This register has been reconciled against the current local implementation,
including configuration-availability and scheduling retry/resend changes.
This includes the September 21 manual scheduling-email milestone and its dated
Development provider evidence. It is not a production or end-to-end test run.

- **Built:** implemented locally; this does not assert it is published.
- **Incomplete:** code or workflow still needs implementation.
- **Input/configuration pending:** requires approved inputs or environment-specific
  setup; a configured secret's presence does not establish correctness.
- **Acceptance unverified:** requires recorded verification, not necessarily new code.

**Resend clarification:** in addition to existing deal email, a closed-by-default
producer worker/adapter now delivers newly requested manual `scheduling_link`
notifications when the enable flag, test-recipient allowlist, sender, and provider
key all pass. Historical blocked rows and all other producer lifecycle events
remain blocked. This narrow milestone is not full appointment delivery acceptance.

The user clarified that email domains are shared, but Development and production
have separate existing webhooks. Reuse the correct webhook for each environment,
with its matching signing secret; do not move the Development webhook into
production. Existing email API-key reuse remains the stated intent, not a claim
that webhook secrets are shared. Appointment wiring and verification remain.

## Latest audit

See [supplied-document review](supplied-document-review.md) for the latest
attachment findings: four fillable source PDFs and Exhibit A are available;
45-minute Calendly duration and intake duplicate responses are specified.
Final legal revisions, W-9 mapping exceptions and secure voided-check handling
are distinguished from remaining implementation work.

See [Appointment audit and test matrix](appointment-audit-and-test-matrix.md)
for dated passing checks, resolved historical defects, current implementation
gaps, and blocked tests with their step-by-step completion plans.
The narrow Development manual-email result is recorded separately in
[`producer-scheduling-delivery-verification.md`](../docs/implementation/producer-scheduling-delivery-verification.md).

## Current coverage

| Part | Available implementation | Remaining gate |
|---|---|---|
| 1 — Website intake | Additive registration/owner/document/job schema, derived statuses, signed transport, synthetic connectivity test | Actual website field mapping, real intake persistence and validation, private document ingestion |
| 2 — SignWell | Tested document/recipient planner, intended access rules, countersign prerequisites | Approved PDFs, field placement, proven provider visibility and external approval hold, real dispatch and verified webhooks |
| 3 — Calendly | Signed receiver, durable deduplication/review inbox, matching and booking/cancellation ordering, persisted booking state; manual scheduling-link delivery worker | Signing key, API event-type URI, trusted organization configuration, subscription and live booking acceptance; cancellation and lifecycle notices remain blocked |
| 4 — Applications | Network Applications list/detail, staff booking attention queue, call completion, role/scoping/redaction, explicit unavailable approval/credential/document controls, safe decline without a provider envelope | Agency/partner/contact provisioning, duplicate reconciliation, provider release/void, activation, credential handoff, private document access |
| 5 — Email | Appointment templates, safe inputs/outbox/status, reminder due predicates, retry/resend action identity, and closed-gate worker/Resend adapter for new manual scheduling links | Remaining lifecycle delivery, automated reminders, bounce/reconciliation operations, recipient policy, UI acceptance, and production verification |
| Resources | Compensation Schedules and Guidelines entry clearly marked as awaiting an approved document | Approved content and authorized download |
| Final acceptance | Local checks and development verification | Real website → signing → booking → approval → countersigning → credentials dry run |

## Detailed completion records

- [Website connection and real intake](website-connection-handoff.md)
- [SignWell documents, provider controls, and controlled test](signwell-appointment-packet.md)
- [Calendly setup and live acceptance](calendly-appointment-setup.md)
- [Admin activation, private files, and credentials](appointment-admin-activation.md)
- [Email delivery and scheduling](appointment-email-delivery.md)

## Action-plan index and dependency order

**Current handoff:** manual scheduling-email delivery has been verified in
Development. The working link opens Curtis's page. Calendly booking return-path
configuration and live acceptance are deferred at the user's request; see the
resume checklist in [Calendly setup](calendly-appointment-setup.md).
Approval/provisioning and activation are now staff-managed under the manual
workflow decision; their automation is deferred. Existing signing, identity,
privacy and access prerequisites remain in force.

Each detailed record separates implemented behavior from open work and gives
numbered actions and required completion evidence. An item is not complete merely
because its plan exists.

| Remaining item | Status | Step-by-step plan |
|---|---|---|
| Actual website intake, atomic persistence, document ingestion | Incomplete + approved contract needed | [Website handoff](website-connection-handoff.md) |
| SignWell packet generation, send/release/void, verified events and executed files | Incomplete + approved documents/provider controls needed | [SignWell packet](signwell-appointment-packet.md) |
| Live Calendly subscription, event type/duration and Zoom acceptance | Configuration/acceptance unverified; local receiver built | [Calendly setup](calendly-appointment-setup.md) |
| Duplicate reconciliation, approval provisioning, countersign activation and credentials | Incomplete | [Admin activation](appointment-admin-activation.md) |
| Private authorized document viewing | Incomplete | [Admin activation](appointment-admin-activation.md); ingestion depends on website plan |
| Appointment email delivery, safe backlog treatment, reminders, recipients and acceptance | Manual scheduling worker built and Development provider delivery verified; remaining lifecycle incomplete | [Appointment email](appointment-email-delivery.md) |
| Historical backfill and decline enforcement across all writers | Reconciliation/verification pending; baseline decisions require Ready for Decision | [Audit action plans](appointment-audit-and-test-matrix.md) |
| Notification constraints and event dedupe scope | Policy/hardening review; not proven exploits or independently established launch blockers | [Audit action plans](appointment-audit-and-test-matrix.md) |
| Activity actor/change display, legacy public handoff and phone navigation | Incomplete | [Audit action plans](appointment-audit-and-test-matrix.md) |
| Compensation Schedules and Guidelines | Approved content + access implementation needed | Plan below |
| CSA call-completion policy confirmation | Built behavior; policy confirmation only | Plan below |
| Release/schema readiness and full acceptance | Unverified | Plan below and [audit matrix](appointment-audit-and-test-matrix.md) |

Recommended order:
1. Approve website/document contracts, signer and recipient policies, duplicate
   handling, and test recipients. Configuration-dependent decisions can run in parallel.
2. Complete intake/private ingestion and durable provider actions; verify each
   boundary with synthetic fixtures.
3. Complete signing, approval/activation and private access, then extend the
   narrow manual scheduling transport to approved lifecycle mail and reminders.
   Keep unavailable actions blocked until their dependencies are actually ready.
4. Finish staff/public UX gaps and resource delivery.
5. Run the authorized integrated acceptance and release procedure below.

### Compensation Schedules and Guidelines

Evidence: `artifacts/axel-workforce-os/src/pages/Resources.tsx` displays a disabled
“Awaiting Approved Document” button. This is an honest placeholder, not a download.

1. Obtain the approved, versioned document and confirm which roles may view it.
2. Store it in the approved location and connect the Resources entry to an
   authenticated access path; reuse existing resource infrastructure where suitable.
3. Replace the placeholder only when the approved file is available; handle missing
   or superseded documents explicitly.
4. Test allowed/denied roles and file contents, and record the approved version.
   **Done:** authorized users can retrieve the correct document; others cannot.

### CSA call-completion policy

1. Confirm the existing policy: trusted Admin/CSA may record call completion;
   only Admin may decide or request scheduling/credentials.
2. If confirmed, record policy approval without unnecessary code changes. If changed,
   update permission projection, mutation authorization and UI together.
3. Verify Admin/CSA/Agent/untrusted/other-organization cases against the approved policy.
   **Done:** policy sign-off and role-test evidence agree.

### Release/schema readiness and final acceptance

1. Assemble the intended release diff and reviewed migrations/backfill. Inspect the
   target environment's actual schema through an authorized read-only check; do not
   assume development and production match.
2. Approve backup/recovery and migration order, then apply only reviewed migrations
   with release authorization. Never use blanket schema push against the shared
   database or run DDL at application startup. Successful post-merge dependency
   setup is not migration evidence.
3. Verify expected constraints/functions/triggers and historical-data preservation.
   Record environment, migration evidence and rollback/recovery procedure.
4. Select explicitly authorized fictional-data recipients and verify provider
   sender, subscription and signer controls for the intended environment.
5. After the dependent plans pass, run website → ingestion → signing → call →
   approval → countersign → activation → credential setup/login. Also run decline,
   retry/replay, restricted-document, duplicate and provider-failure paths.
6. Record screenshots, API/database outcomes, actual recipient/provider evidence
   and fixture cleanup in `docs/implementation/producer-appointment-verification.md`.
7. Obtain separate publishing/production authorization. Verify the intended code
   is deployed and run approved production acceptance; do not infer this from
   local tests or existing Resend configuration.

**Done:** all release gates have environment-specific evidence, no unresolved
critical acceptance failure remains, and an authorized release decision is recorded.

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

This review inspected the local `appointment/01-intake` branch. Development schema
changes affect the shared development database, not an isolated Git-branch
database. Do not assume any of this code is published or that provider
subscriptions are configured. The narrow real email test was Development-only;
no production database changes, signing packets, or email acceptance are claimed.