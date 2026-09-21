# Producer Registration & Appointment — Scope of Work

**Product:** Axel Workforce OS  
**Status:** Implementation scope; not a completion certificate  
**Source directive:** “Axel Workforce OS — Producer Registration & Appointment: Platform Implementation,” September 11, 2026  
**Source file:** `attached_assets/Pasted--Axel-Workforce-OS-Producer-Registration-Appointment-Pl_1789945553279.txt`

## 1. Purpose and intended outcome

Implement the complete producer registration and appointment lifecycle, connecting the public website to document signing, scheduling, internal approval, activation, and credential issuance.

Required flow:

```text
Website intake
  → private document ingestion
  → producer appointment packet sent through SignWell
  → producer-side signatures and onboarding scheduling, in either order
  → onboarding call completed
  → Admin approves or declines

Approve
  → pending agency/agent records provisioned
  → Curtis's NPA countersignature released
  → verified countersignature received
  → agency/agent records activated
  → existing credential issuance flow

Decline
  → packet voided
  → neutral decline notification
  → no new agency/partner records or credentials
```

**Appointing entity:** Airavata Group, LLC DBA Axel Workforce Insurance Solutions.  
**Countersignatory:** Curtis Prince, Founder & President.

The NPA must not become effective before approval and Curtis's countersignature. Signing and scheduling are independent milestones, not a single linear sequence.

## 2. Assessment basis and limitations

This scope follows a read-only review of the directive and current repository. It distinguishes reusable infrastructure from a completed producer workflow.

- No application behavior was changed during the assessment.
- Production database records, deployed configuration, and provider subscriptions were not verified.
- No live emails, signing packets, or booking events were sent.
- Existing code is evidence of implementation, not proof of successful production operation.
- The supporting legal PDFs/DOCX and Gershom's full field contract were not found during the review and remain required inputs.

## 3. Current implementation baseline

| Capability | Current state | Treatment |
|---|---|---|
| Agencies, partners, agent profiles | Existing foundation | Reuse |
| Registration storage | Legacy `agent_registrations` with contact, E&O, agreement, call, and review fields | Extend/migrate |
| Registration API | Create, list, detail, update, approve, issue credentials | Adapt and secure |
| Registration UI | Separate Admin-only basic table | Replace or route into Network → Applications |
| Approval provisioning | Transactional agency/principal/user/profile creation or linking | Reuse with corrected lifecycle |
| Credential issuance | Admin-only, completed-call and approved-status checks | Add countersignature gate |
| Activity logging | Some approval and credential events | Extend to complete registration audit |
| SignWell | Generic deal signing infrastructure | Add producer-specific packet and lifecycle |
| Resend | Generic outbound delivery infrastructure | Add producer-specific notifications |
| Calendly | No producer integration found | Build |
| Resources | Existing management API/UI | Add required placeholder |

### 3.1 Mandatory corrections to existing behavior

1. Block credential issuance until the required call, approval, and countersignature conditions are met.
2. Stop activating new agencies/partners at approval; activation follows verified countersignature.
3. Restrict approval and decline to Admin at the API as well as the UI.
4. Give CSA permitted read access without decision authority or restricted-document access.
5. Remove generic update paths that can directly fabricate lifecycle milestones or change protected links.
6. Close or constrain the legacy public registration path so it cannot bypass the signed intake contract.
7. Preserve existing records and legitimate existing access during migration; do not fabricate historical milestones or deactivate existing agencies as a side effect of a new application.

## 4. In-scope work

### Workstream A — Data model and derived state

#### Deliverables

- Introduce canonical `producer_registrations` storage by renaming/extending the legacy model.
- Preserve compatibility with existing references, including an old-name view where needed.
- Define a reviewed backfill for legacy records and update API schemas/generated clients.
- Store:
  - UUID and unique `AXR-YYYYMMDD-XXXXXX` reference.
  - Source and immutable full intake payload.
  - Agency and principal-partner links, null until approval.
  - SignWell packet/envelope identifier.
  - Calendly event and invitee URIs.
  - Submitted, packet-sent, producer-packet-signed, scheduled-call, completed-call, decided, countersigned, and credentials-issued timestamps.
  - Decision (`pending`, `approved`, `declined`), deciding user, decline reason.
  - Created/updated timestamps and persistent warning flags.
- Add owner records containing name, title, ownership percentage, NPN, resident state, email, SignWell recipient ID, and Exhibit A completion.
- Add document records containing type, private storage key, filename, content type, size, SHA-256, uploaded timestamp, and source.
- Persist required call notes and registration activity records.

#### Derived display status

Calculate server-side in this priority order:

1. Declined.
2. Active — credentials issued.
3. Approved – Credentials Pending when countersigned but credentials have not
   yet issued; otherwise Approved – Countersign Pending.
4. Ready for Decision — producer packet signed and call completed.
5. Call Complete – Packet Pending.
6. Packet Signed – Call Pending.
7. Call Scheduled.
8. Packet Sent.
9. Submitted.

Do not infer missing milestones from a legacy status string. Foundation
implementation decision: use **Approved – Credentials Pending** after verified
countersignature and before credential issuance, rather than falsely showing
the application as countersign pending. This preserves the underlying
timestamps and keeps the directive's remaining priority unchanged.

#### Acceptance

- Independent SQL verifies schema, relationships, unique references, and backfilled records.
- Tests cover every status priority and both signature/booking orders.
- Migration preserves existing registrations and downstream references.

### Workstream B — Signed public website intake

#### Endpoint and contract

Implement `POST /api/public/producer-registrations`.

- No user login required.
- Limit requests to 10/minute/IP.
- Verify `X-Axel-Signature` using HMAC-SHA256 over the exact raw body and `WEBSITE_WEBHOOK_SECRET`.
- Return `401` for invalid signatures.
- Require `X-Axel-Idempotency-Key` to correspond to `meta.reference`.
- Enforce database-backed idempotency, including concurrent requests.
- Return `409 { reference }` for an existing submission.
- Validate Gershom's complete payload contract with Zod.
- Require contact, required agency fields, principal, all seven legal booleans, E&O, at least one owner with email, required documents, electronic consent, certification, and certified-by name.
- Require agency license and E&O certificate; do not require individual producer-license upload.
- Return `422` with field-level errors for invalid applications.
- Return `201 { id, reference }` for accepted applications.

#### Non-blocking warning flags

- E&O per-claim or aggregate limit below $1,000,000.
- E&O or agency license expiration less than 30 days away.
- Any affirmative legal disclosure.
- Duplicate EIN/NPN against existing agencies or open registrations.

#### Persistence and processing

- Insert registration, owners, and document metadata in one transaction.
- Persist retryable processing for document ingestion → packet sending → staff notification.
- Ensure a committed registration cannot be lost between database commit and job enqueue.
- Send the immediate registration acknowledgment at intake; do not defer it until signing completes.
- Prevent duplicate packets and notifications on retries.
- Expose processing failures to staff rather than silently advancing status.

#### Acceptance

| Scenario | Expected result |
|---|---|
| Signed valid payload | `201`; registration and child rows present |
| Tampered signature | `401`; no registration created |
| Replayed reference | `409`; no duplicate records or packet |
| Missing E&O certificate | `422` with field error |
| E&O below minimum | `201` with `eo_below_minimum` flag |
| Concurrent duplicate requests | One registration and one packet workflow |

### Workstream C — Private documents and sensitive data

#### Deliverables

- Ingest documents from supplied signed URLs.
- Validate allowed file types, sizes, and download destinations; protect against unsafe server-side URL fetching.
- Virus-scan where available and document the scanning capability.
- Store documents privately and record SHA-256.
- Support document types: agency license, E&O certificate, section 1033 consent, other, executed packet, W-9, and ACH authorization.
- Authorize every document retrieval and issue short-lived signed URLs.
- Restrict W-9 and ACH to Admin.
- Redact sensitive payload fields from all API responses except authorized Admin detail.
- Never log sensitive values or include them in Resend payloads.
- Handle expired source URLs and failed ingestion with visible, recoverable errors.

**Combined-document rule:** A full executed packet containing W-9/ACH pages must not bypass Admin-only restrictions. Restrict the combined packet or provide a separately sanitized version for permitted non-Admin viewers.

#### Acceptance

- Unauthorized and CSA requests cannot retrieve restricted documents, including through alternate endpoints or combined packets.
- Non-Admin payloads are redacted.
- Hashes and metadata match stored files.
- Logs and email payload tests show no sensitive-field leakage.

### Workstream D — SignWell appointment packet

#### Required ordered documents

1. Producer Appointment Application, prefilled from the approved mapping.
2. National Producer Agreement, pages 1–10.
3. Standalone Exhibit A for each applicable listed owner.
4. Current CFPB Summary of Your Rights Under the FCRA, read-only.
5. IRS W-9, Rev. 3-2024.
6. ACH Commission Payment Authorization.

Expected count: **5 + N documents**, where N is the applicable owner count.

#### Field mapping

- Application: agency identity, DBA, EIN, NPN, year established, phone, website, address, principal identity/contact/title/NPN, producer count, cluster information, license types/states, seven legal responses, E&O/cyber details, agency license information, ownership rows, certification name/title/date.
- Leave Main Marketing Contact, Main Accounting Contact, and Sub-Producers fields available for applicant completion.
- NPA: producer legal entity, principal name/title/NPN, resident license state.
- Exhibit A: owner printed name.
- W-9: legal name, DBA, business-type selection, address, EIN; leave LLC classification for applicant completion as specified.
- ACH: company, DBA, address, and accounting contact when available; leave bank fields for applicant entry.
- Use the exact appointing entity and countersignatory identified in section 1.

#### Recipient and lifecycle requirements

- Principal signs the application, NPA, own Exhibit A when applicable, W-9, and ACH.
- Each other owner receives/signs only their own Exhibit A.
- Avoid duplicate recipients/signature requirements when the principal is also an owner.
- Curtis signs the NPA only, after Admin approval.
- Reminders every three days; expiration at 30 days.
- Store provider packet, document, and recipient identifiers needed for reliable correlation.
- Authenticate provider webhook events and verify authoritative signing state.
- Track each owner's Exhibit A completion.
- Set packet-signed only when all required producer-side signatures are complete, independently of Curtis.
- Flag and notify staff for declined/expired packets.
- Release Curtis's step only after approval.
- On verified countersignature, store executed PDFs and separately restricted W-9/ACH files.
- Make webhook processing replay-safe and resistant to out-of-order events.

#### Provider feasibility checkpoint

Before committing to a packet design, verify SignWell supports both:

1. Owner-specific document visibility within the intended packet.
2. A countersigner held until an external approval action.

Sequential signing alone does not prove the second requirement. If the provider cannot support the specified arrangement, obtain approval for an alternative rather than silently changing the legal/signing flow.

#### Acceptance

- Test with an authorized principal address and a second owner address.
- Verify `5 + N` documents and all prefilled values in preview.
- Verify owner visibility isolation and Curtis's approval hold.
- Verify producer completion and countersignature produce distinct timestamps.
- Verify executed documents and restricted splits land in private storage.

### Workstream E — Calendly

#### Deliverables

- Use `https://calendly.com/axelworkforcesolutions/30min`; directive specifies a 45-minute Zoom meeting despite the slug.
- Subscribe only to the configured event type.
- Implement signature-verified `POST /api/webhooks/calendly`.
- Match `invitee.created` by `tracking.utm_content` reference, with contact/principal email fallback.
- Do not silently choose between ambiguous email matches.
- Store event/invitee URIs, scheduled time, and meeting link needed by the UI.
- On cancellation, clear the applicable booking, notify staff, and send a rescheduling link.
- Handle rescheduling and out-of-order events without clearing a newer booking.
- Alert staff for unmatched bookings.
- Add Admin **Send scheduling link** with the reference pre-populated.
- Send a nudge after 48 hours without a booking, measured from packet-sent time.
- Send a 24-hour call reminder only when Calendly reminders are disabled.

#### Acceptance

- Embedded booking populates the application within one minute.
- Cancellation clears the correct booking.
- Unmatched booking produces a staff alert.
- Retries do not duplicate reminders or regress newer booking state.

### Workstream F — Network → Applications and decisions

#### List and detail UI

- Add Applications to Network.
- List reference, agency, principal, derived status, warning chips, submitted time, and scheduled call.
- Default ordering prioritizes Ready for Decision.
- Permit Admin and CSA read access.
- Group application data as in the PDF.
- Highlight affirmative legal responses and explanations for authorized viewers.
- Provide authorized document viewers and recipient signing status.
- Show call time and meeting link.
- Require short notes for **Mark Call Complete**.
- Add a registration activity feed with actor, time, action, and safe before/after data.
- Show decision controls to Admin only; enforce permissions server-side.

#### Approval

- Permit only when packet-signed and call-completed requirements are satisfied.
- Transactionally create/link the agency, principal partner/agent profile, separate contact when applicable, and owner contacts.
- Keep new records in the required pending state.
- Record approved decision and actor/time.
- Persist an action to release Curtis's signature step and notify him.
- Activate records only on verified countersignature.
- Hand off to the existing credential flow with the strengthened gate.
- Record credentials-issued timestamp after successful issuance.
- Resolve duplicates explicitly without overwriting established agency compliance data or creating duplicate identities.

#### Decline

- Require a decline reason.
- Persist and execute packet voiding.
- Record declined decision and actor/time.
- Send neutral notice without reason details.
- Create no new agency/partner records or credentials.
- Ensure late provider events cannot activate a declined registration.

#### Reliability and lifecycle constraints

- External provider calls cannot participate in a database transaction. Use persisted, retryable actions for release, void, and notification work.
- Guard decisions and issuance against concurrent duplicate requests.
- Protect milestone timestamps and links from generic PATCH updates.
- Preserve legitimate existing users/agency records when a duplicate applicant is declined.
- Confirm whether decline is also allowed before Ready for Decision; the directive explicitly gates the Decision panel on that status.

#### Acceptance

- SQL verifies approval field mapping and principal/contact/owner relationships.
- Agency/agent activation waits for countersignature.
- Credentials are blocked before required milestones.
- CSA can read permitted details but cannot decide or retrieve restricted files.
- Decline voids the packet and creates no new partner records.
- Every material action appears in the audit feed without leaking sensitive values.

### Workstream G — Resend notifications

#### Applicant templates

- `registration_received`: contact and principal; reference, packet contents, scheduling link, credential timing.
- `packet_sent`: only when SignWell's own notifications are disabled.
- `exhibit_a_request`: additional owners; explain the standalone disclosure.
- `call_reminder`: conditional 24-hour reminder.
- `scheduling_nudge`: 48 hours without booking.
- `approved_countersigned`: principal; authorized executed-document access and credential timing.
- `credentials_issued`: connect the existing flow and verify delivery.
- `declined`: neutral wording, no decline reason, phone `(888) 997-2935`.

#### Staff templates

- `new_registration`
- `ready_for_decision`
- `packet_declined_or_expired`
- `unmatched_booking`
- `countersign_needed`

#### Shared requirements

- Axel styling: dark `#060608`, pink `#E91E8C`, Inter.
- No EIN, license numbers, legal answers, or bank data in email bodies or Resend payloads.
- Deduplicate recipients and event-triggered messages.
- Persist retryable sends and visible delivery failures.
- Confirm live production sender/domain configuration and actual delivery before go-live.

**Baseline caveat:** Current code contains real generic Resend delivery logic. The directive's statement that production delivery was stubbed must be verified operationally rather than assumed still true.

### Workstream H — Resources, configuration, and handoff

- Add a Resources placeholder for Compensation Schedules and Guidelines.
- Obtain approved PDFs/templates and exact website schema.
- Configure required settings through the approved secrets/configuration process:
  - `WEBSITE_WEBHOOK_SECRET`
  - `SIGNWELL_API_KEY`
  - `SIGNWELL_WEBHOOK_SECRET`
  - `SIGNWELL_TEMPLATE_IDS`
  - `CALENDLY_SIGNING_KEY`
  - `CALENDLY_EVENT_URI`
  - `RESEND_API_KEY`
  - `FCRA_SUMMARY_PDF_KEY`
- Verify provider-specific webhook authentication requirements before implementation.
- Register provider subscriptions and configure template/recipient identities.
- Give Gershom the staging endpoint and securely arrange secret handoff.
- Record a current handoff date; do not assume the directive's relative “Monday” deadline is current.
- Extend the go-live runbook with production checks, failure recovery, retry controls, and support ownership.

## 5. Required inputs and decisions

| Input/decision | Responsibility | Blocks |
|---|---|---|
| Full website field keys, required fields, sample payloads, HMAC encoding contract | Website owner/Gershom with implementation team | Final intake contract |
| Approved application, NPA, standalone Exhibit A, W-9, ACH | Business/legal owners | Packet implementation |
| Current CFPB rights-summary PDF | Business/compliance with implementation team | Packet completion |
| SignWell templates and confirmed recipient visibility/approval hold support | Implementation team with account owner | Signing design |
| Authorized principal, owner, and countersigner test recipients | Business owner | Provider acceptance run |
| Calendly event identity, webhook subscription, reminder policy | Scheduling account owner | Scheduling integration |
| Duplicate agency/contact reconciliation policy | Business owner with implementation team | Safe approval |
| Status between countersignature and credential issuance | Product/business owner | Exact status presentation |
| Whether decline may occur before Ready for Decision | Business owner | Decision permissions/state machine |
| Production sender readiness and staff notification recipients | Operations/business owner | Launch |

Do not request or record secret values in this document.

## 6. Out of scope

- Rewriting legal language or making legal judgments for Curtis/David.
- Changing NPA references to signing platforms or license labels without approved replacement documents.
- Requiring an individual producer-license upload.
- Collecting bank account details outside SignWell and the restricted executed ACH document.
- Running background investigations; this scope handles the required disclosure/authorization documents.
- Redesigning unrelated marketplace, quoting, carrier-routing, or deal-card workflows.
- Replacing the existing authentication system, database, or email provider.
- Publishing or sending real applications/envelopes without the separately authorized implementation/test process.

## 7. Implementation order and dependencies

1. Confirm inputs, legal document versions, and SignWell feasibility.
2. Implement schema/backfill, derived state, and lifecycle/permission protections.
3. Implement signed intake and private document ingestion.
4. Build producer packet and verify a controlled test envelope.
5. Implement Calendly and scheduling notifications.
6. Build Applications UI and approval/decline/countersignature transitions.
7. Implement lifecycle emails alongside the events that trigger them.
8. Add Resources entry, operational configuration, and runbook.
9. Complete end-to-end acceptance and production readiness verification.

No migration is complete without independent SQL verification. No integration is complete merely because an API call returns successfully; verify the user-visible and persisted outcomes.

## 8. Verification and definition of done

### Required test coverage

- Intake HMAC, exact raw-body verification, rate limit, validation, flags, idempotency, and concurrent duplicates.
- Data migration and timestamp-derived statuses.
- Private document access, combined-packet restrictions, redaction, and email/log privacy.
- Principal/owner signing, approval-held countersignature, expiry, decline, and executed-document ingestion.
- Signature/booking arrival in either order.
- Calendly matching, ambiguous matches, cancellations, rescheduling, and reminders.
- Admin/CSA permissions at both API and UI layers.
- Approval provisioning and duplicate identity reconciliation.
- Early credential issuance rejection.
- Duplicate/out-of-order webhooks and provider failures.
- Decline voiding with no new records/credentials and no late-event reactivation.

### End-to-end acceptance journey

```text
Gershom staging form
  → accepted signed intake
  → documents ingested
  → principal and second owner receive correct packet documents
  → producer-side signing completed
  → call booked and shown in Applications
  → call marked complete with notes
  → Admin approves
  → Curtis receives/releases and completes his signing step
  → executed documents stored with correct restrictions
  → agency/agents activate
  → credentials issued and notification delivered
```

Also verify a separate decline journey, CSA access, scheduling cancellation, and at least one recoverable provider failure.

### Completion evidence

- Independent SQL results after each migration and approval mapping check.
- Screenshots and acceptance results after each implementation part.
- Provider test evidence for packet routing and signing hold.
- Evidence of actual production Resend readiness before launch.
- Updated runbook and secure staging handoff.
- No unresolved security, privacy, credential-gate, or packet-routing blockers.

## 9. Repository evidence from the baseline review

| Source | Relevant existing behavior |
|---|---|
| `lib/db/src/schema/agent-registrations.ts` | Legacy registration model |
| `artifacts/api-server/src/routes/agent-registrations.ts` | Intake, update, approval, provisioning, credentials |
| `artifacts/api-server/src/routes/index.ts` | Public route and Admin/CSA mounting |
| `artifacts/api-server/src/app.ts` | Raw JSON body capture |
| `artifacts/axel-workforce-os/src/pages/AgentRegistrationsPage.tsx` | Basic registration table |
| `artifacts/axel-workforce-os/src/pages/Network.tsx` | Existing Network tabs |
| `artifacts/axel-workforce-os/src/App.tsx` | UI route permissions |
| `artifacts/api-server/src/services/signwellService.ts` | Generic signing integration |
| `artifacts/api-server/src/routes/webhooks.ts` | Existing provider event handling |
| `artifacts/api-server/src/services/emailService.ts` | Generic email delivery |
| `artifacts/api-server/src/routes/resources.ts` | Resources API |
| `artifacts/axel-workforce-os/src/pages/Resources.tsx` | Resources UI |

These references describe the assessed baseline. Recheck current source before implementation; this document is not a substitute for inspecting later changes.