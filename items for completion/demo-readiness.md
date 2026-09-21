# Appointment demo readiness — real workflow, test data

## Scope correction

The demo must exercise the actual tools and application workflow. The earlier
proposal to simulate signatures, bookings, approval, countersigning or activation
is superseded. “Demo” relaxes final content and production-release requirements,
not the requirement for functioning integrations.

Fictional data means test agency/applicant names and nonsensitive sample details
associated with controlled, working test inboxes. Documents not yet supplied may
be clearly marked mock documents. Use the supplied PDFs rather than replacing
them with placeholders. Do not fabricate valid bank/tax identities or expose
real sensitive data.

## What must be real

| Area | Required demo behavior |
|---|---|
| Intake | Submit test input through the actual validated intake and persistence path. A test client can exercise the API while the website contract is pending, but does not prove the website connection. No direct database seeding counted as intake acceptance. |
| SignWell | Create an actual test packet, sign through SignWell, verify authoritative provider events/state, enforce owner visibility and approval-held countersigning, and retrieve executed files. |
| Calendly | Make an actual test booking and cancellation/reschedule; process real signed callbacks and update the application. |
| Email | Send through Resend to controlled test accounts and observe actual outcomes. Bulk test sends are authorized. A preview or “sent” animation is not delivery evidence. |
| Approval | Use the real staff action and transaction to create/link test agency and person records, with the real lifecycle/role gates. |
| Activation/credentials | Activate only after verified countersignature, perform actual test-account credential setup, and verify login/access. Do not manually set completion timestamps. |
| Documents | Use the actual storage/access path and role restrictions. Clearly labeled mock content is acceptable only for missing source documents; it does not establish legal/content readiness. |
| Decline | Exercise actual decline/void handling and neutral email delivery, with no resulting activation. |

## Non-negotiable safeguards

- Identify controlled test recipients before provider sends. This is not authority
  to send to unrelated real contacts or release all historical blocked mail.
- Use the correct environment-specific webhook and signing secret. Shared email
  domains do not make Development and production webhooks interchangeable.
- Preserve role/organization checks, restricted document access, sensitive-data
  redaction, real lifecycle gates, replay safety and existing-account protections.
- Keep test records identifiable and cleanup narrowly scoped. Real test-account
  creation is intentional; modifying unrelated actual accounts is not.
- Confirm the provider's test execution approach before signing legal-looking
  packets. Do not claim that a “demo” label automatically prevents legal effect.
  Do not silently rewrite the supplied agreements.
- Missing provider capabilities or application code are genuine blockers.
  Report them plainly rather than substituting a simulated successful step.

## Step-by-step implementation and acceptance plan

1. Inventory actual working paths and missing code, using the detailed completion
   plans. Establish controlled test participants and the provider test approach.
2. Implement real intake/atomic persistence/private ingestion. Obtain the actual
   website contract; until then, report API-only tests separately from website
   acceptance and do not invent its field names.
3. Map the supplied PDFs and prepare clearly marked mock assets only where source
   documents are absent. Verify SignWell privacy and approval-hold capabilities,
   then implement actual dispatch, event processing, release, void and retrieval.
4. Connect appointment emails to the existing Resend setup and test actual delivery,
   intentional resend and retry behavior with test recipients.
5. Configure/verify Calendly and exercise booking, cancellation and rescheduling.
6. Complete the real approval, test-identity provisioning, countersign-triggered
   activation, credential setup and login paths.
7. Run both approval and decline journeys. Record provider IDs, safe application
   and database outcomes, mailbox receipt, access-denial checks and test cleanup.
   Do not count synthetic callbacks alone as live provider acceptance.

**Demo done:** the actual workflow succeeds using real tools and controlled test
data, with any missing-document mocks disclosed and no simulated milestones
presented as acceptance evidence.

Final legal/content approval, historical backfill and production release checks
can remain deferred where they are not necessary to safely execute this test.
Deferral does not establish readiness for real applicants or production launch.