# SignWell Appointment Packet — Accuracy Review and Completion Plan

**Overall status:** Incomplete. A desired-policy planner exists, but no producer
appointment packet producer, provider lifecycle, or dispatch path exists.
**Reviewed against current code:** September 21, 2026 (America/New_York).

No legal packet was created or sent during this documentation review. The
existing deal/bind SignWell integration is real application code, but it is not
a producer appointment implementation and must remain isolated from it. Nothing
below claims that a provider account, staging runtime, or production runtime was
configured or checked.

## Current status by category

### Built in the repository

The pure planner in
`artifacts/api-server/src/services/producer-appointment/packet-plan.ts`:

- Strictly validates principal, owner, and countersigner identities without
  accepting bank or tax data.
- Selects owners at or above 10% and plans one separate Exhibit A for each.
- Reuses the principal recipient when that principal is also a qualifying owner.
- Plans an ordered `5 + N` manifest: application, NPA, `N` Exhibit A files,
  CFPB summary, W-9, and ACH authorization.
- Records the intended read/sign recipients and read-only CFPB policy.
- Requires approval, producer-side completion, call completion, and policy
  readiness before reporting countersigner release eligibility.
- Reports missing/duplicate assets, unverified provider controls, reminder
  readiness, and missing authorized test-recipient roles.
- Always returns `policyKind: "desired_policy_only"` and
  `dispatchEnabled: false`.

The schema also has appointment-facing placeholders:
`signwellEnvelopeId`, owner `signwellRecipientId` and `exhibitASignedAt`, packet
sent/signed timestamps, countersigned timestamp, and SignWell-sourced document
rows. These columns are not populated by a producer SignWell workflow.

### Existing deal integration — reusable primitives, not appointment completion

`signwellService.ts` currently supports generic document creation, live document
fetch, completed-PDF download, reminders, and deletion. The deal/bind flow:

- Sends one document immediately unless explicitly created as a draft.
- Gives the provider a list of files and recipients but supplies no signature
  field placement.
- Sets `reminders: true` without proving a three-day cadence or 30-day expiry.
- Sets `apply_signing_order: false`.
- Does not express file-level recipient visibility or an externally released
  countersigner.
- Uses a `signature_requests` record tied to a deal/bind package.
- Treats webhooks as hints, re-fetches the live SignWell document, and finalizes
  only when the live status is `completed`.
- Downloads a combined completed bind PDF to local `uploads/` storage.

That webhook looks up only `signature_requests.hellosignSignatureRequestId`.
It does not look up `producer_registrations.signwellEnvelopeId`, update owner
Exhibit A timestamps, distinguish producer completion from countersignature,
enforce appointment decline/approval transitions, or store appointment files.
The generic combined-PDF/local-storage behavior is not sufficient for W-9/ACH
privacy or durable private appointment storage.

### Genuinely incomplete in code

The supplied application, NPA, W-9 and ACH PDFs have now been reviewed for text,
fillable fields and visual structure. NPA pages 1–10 and Exhibit A page 11 are
available. Final legal approval, field mapping and provider suitability remain
open. See [supplied-document review](supplied-document-review.md), including
the W-9 mapping exception and secure voided-check handling.

- No approved appointment source assets or revision registry is wired into the
  application. No appointment field mapping, template IDs, page coordinates,
  or generated tagged PDFs exist.
- No service converts a packet plan into a SignWell draft.
- No provider payload encodes the planner's per-file visibility policy.
- No provider action holds Curtis's NPA signature until Axel approval and call
  completion, then releases only that signature.
- No appointment send, release, reminder schedule, expiration, void, recipient
  correction, or controlled draft-inspection path exists.
- No appointment webhook/event ledger or live-state reconciler exists.
- No producer-versus-owner signature milestone calculation exists; the
  appointment route relies on timestamps that nothing currently sets from
  SignWell.
- No private, role-restricted retrieval of executed W-9, ACH, individual
  Exhibit A, or completed packet files exists.
- Approval intentionally returns
  `appointment_activation_not_configured`; decline refuses to proceed when a
  provider envelope ID exists because safe voiding is not implemented.
- There is no provider contract/integration test proving required visibility,
  held countersigning, completed-copy privacy, reminders, expiry, or webhook
  reconciliation.

### Provider/configuration pending

- Provider confirmation of per-file recipient visibility, including completed
  downloads and completion emails.
- Provider confirmation of a true externally controlled countersign hold and
  release API.
- Confirmed reminder, expiration, recipient-update, void, and completed-file
  behavior for the chosen packet structure.
- Approved provider account/workspace, verified account email, API key in the
  intended runtime, webhook registration/authentication method, test mode, and
  authorized test recipients.
- Approved countersigner identity and authority.

### Acceptance unverified

There is no evidence of an appointment draft in SignWell, field-placement
inspection, restricted owner access, approval-held countersigning, authenticated
appointment webhook, separate completed files, or private executed-document
retrieval. No production capability or configuration was checked.

## Provider questions that must be answered with demonstrable evidence

1. Which exact API fields or endpoint restrict each uploaded file to named
   recipients, including in signing sessions, completed downloads, completion
   email attachments, audit reports, and any combined archive?
2. Which exact API operation keeps the countersigner unable to view/sign the
   NPA signature field until Axel explicitly releases it after approval and call
   completion?
3. Can both controls operate in one packet containing the application, NPA,
   separate owner Exhibit A files, CFPB summary, W-9, and ACH authorization?
4. Can the principal sign the common documents and their own Exhibit A as one
   recipient while every other qualifying owner sees only their Exhibit A and
   the CFPB summary?
5. Can Axel retrieve separately permissioned executed files so W-9/ACH and a
   combined packet are never exposed to additional owners or CSA users?
6. What API settings enforce reminders every three days and expiration at 30
   days, and what live statuses/events prove each state?
7. What authenticated webhook mechanism is available, and which live-document
   fields authoritatively prove each recipient signature, decline, cancellation,
   expiry, and completion?

Published SignWell material establishes ordinary draft creation, signing order,
embedded-signing email controls, whole-draft sending, and recipient updates on
eligible sent documents. It does not, by itself, establish the two stronger
controls above. Per-recipient fields are not proof of per-file privacy, and a
suppressed email or sequential order is not an Axel-controlled release hold.

Do not silently substitute multiple envelopes, a second NPA, a placeholder
countersigner, or an email-only hold. If one-packet requirements are unsupported,
obtain written business/legal approval for a revised workflow before changing
the implementation.

## Required approved assets

1. Producer Appointment Application, approved fillable PDF.
2. National Producer Agreement, approved pages 1–10.
3. Standalone Exhibit A source PDF, separate from the NPA.
4. Current CFPB Summary of Rights PDF, approved as read-only.
5. IRS W-9, Rev. 3-2024.
6. Approved ACH Authorization PDF.
7. Revision identifiers, private storage keys, field ownership rules, and
   approved template IDs or page coordinates for every field and signature.

No matching approved packet PDFs were found in the inspected repository paths.
Do not substitute ACORD, carrier, workers' compensation, or loss-history forms.
Do not collect bank details through website intake or planner inputs.

## Numbered completion plan

Each step states its dependency and required closeout evidence.

1. **Approve the legal packet inventory and revisions.**
   **Dependency:** Legal/business owners provide the six source documents and
   confirm the `5 + N` composition and 10% owner rule.
   Store each approved revision under an opaque private key and record its
   checksum, approval owner/date, effective date, and replacement policy.
   **Completion evidence:** signed asset register with six checksums and a
   private-storage access review; no public URLs.

2. **Approve the recipient and field matrix.**
   **Dependency:** Step 1 and countersigner authority confirmation.
   For every field and signature, identify its source value, editable/read-only
   status, recipient, document/page/coordinate or provider template field, and
   required validation. Explicitly map the principal's own Exhibit A without
   creating a duplicate recipient.
   **Completion evidence:** legal/business-approved matrix covering every
   document and qualifying-owner case, plus a no-unmapped-required-fields check.

3. **Obtain provider capability evidence.**
   **Dependency:** Steps 1–2 provide the exact packet shape.
   Have SignWell identify the exact API contract for file visibility,
   completed-copy restrictions, external countersign hold/release, reminders,
   expiry, void, and webhook authentication. Reproduce those controls in an
   isolated provider draft with authorized fictional recipients only.
   **Completion evidence:** provider response/API references and redacted
   screenshots or API results showing each role's file list before and after
   completion and the blocked countersigner state. A sales statement alone is
   insufficient.

4. **Resolve any provider mismatch before implementation.**
   **Dependency:** Step 3.
   If every required control is supported, freeze the verified provider
   contract. If not, stop and obtain written business/legal approval for the
   exact alternate envelope/document/privacy workflow; update the planner only
   after that approval.
   **Completion evidence:** signed capability decision naming the accepted
   packet topology and its privacy/countersign controls.

5. **Create a producer-specific provider boundary.**
   **Dependency:** Step 4.
   Add appointment-specific typed create-draft, inspect, send, release, remind,
   void, fetch-live-state, and retrieve-file operations. Keep deal metadata,
   `signature_requests`, webhook transitions, and storage paths separate. Do not
   fall back to `stub_` success for appointment operations.
   **Completion evidence:** unit tests proving appointment metadata cannot be
   mistaken for a deal/bind document and missing configuration fails closed
   without setting packet timestamps.

6. **Build the draft packet producer.**
   **Dependency:** Steps 1, 2, and 5.
   Load only approved asset revisions, build the planner from persisted
   registration/owner data, place all approved fields, create the verified
   recipient/file permissions, set three-day reminders and 30-day expiry, and
   create a draft without sending. Persist the provider ID and recipient IDs
   only after a successful provider response, under a registration row lock.
   **Completion evidence:** contract test showing ordered `5 + N` files,
   checksums/revisions, exact field placement, one principal recipient, separate
   qualifying owners, and no email generated.

7. **Add staff draft inspection and dispatch gating.**
   **Dependency:** Step 6.
   Permit authorized Admin inspection of a redacted draft summary and provider
   preview; block send unless all assets, mappings, provider capabilities,
   authorized recipients, and current registration invariants are satisfied.
   Use an idempotent send claim so concurrent requests cannot send twice.
   **Completion evidence:** tests for every blocker and a concurrency test
   showing one provider send, one envelope ID, and one `packetSentAt`.

8. **Implement authoritative appointment reconciliation.**
   **Dependency:** verified webhook authentication/live-state contract from
   Step 3 and appointment provider IDs from Step 6.
   Authenticate the webhook when the provider supports it, treat the payload as
   a hint, fetch live state server-to-server, store provider event identity for
   idempotency, and update only the matching organization/registration under a
   lock. Never route appointment events through deal `signature_requests`.
   **Completion evidence:** forged, stale, duplicate, out-of-order, wrong-org,
   and live-fetch-failure tests showing no false transition.

9. **Derive producer-side signature milestones separately.**
   **Dependency:** Step 8 and approved field/recipient matrix.
   Record each qualifying owner's Exhibit A timestamp from authoritative live
   recipient/field state. Set `packetSignedAt` only when the principal's
   application, NPA, W-9, ACH and own Exhibit A (if applicable), every other
   qualifying Exhibit A, and required acknowledgements are complete. Do not
   equate provider document `completed` with producer-side completion while the
   countersigner remains held.
   **Completion evidence:** scenario tests for principal-owner deduplication,
   under-10% owners, partial owners, declined/expired packets, and late events.

10. **Implement approval-held countersigner release.**
    **Dependency:** Steps 3–4 establish a real provider release control; Step 9
    supplies producer completion; the call and approval flows are durable.
    In one locked transition, require pending decision, `packetSignedAt`,
    `callCompletedAt`, Admin approval authority, and live provider state; persist
    approval and invoke/reliably queue the provider release with idempotent
    recovery. Never expose Curtis's signature before all gates pass.
    **Completion evidence:** tests proving producer completion alone, call alone,
    or approval alone cannot release; one combined eligible transition releases
    exactly once and records actor/time/provider result.

11. **Implement safe decline, expiry, and void behavior.**
    **Dependency:** Step 5 void operation and Step 8 reconciliation.
    Before final decision, atomically claim decline, void the live packet when
    present, and prevent late provider events from approving, releasing,
    countersigning, or creating credentials. Define retry/manual-review behavior
    when void confirmation is unavailable.
    **Completion evidence:** decline-before-send, decline-after-send, provider
    failure, expiry, duplicate event, and late-completion tests with terminal
    declined state preserved.

12. **Store executed files privately with role enforcement.**
    **Dependency:** provider's separately permissioned retrieval behavior from
    Step 3 and approved private object storage/scanning.
    Download over bounded trusted URLs or provider bytes, validate type/size,
    hash and scan, and store individual executed files plus any combined packet
    under opaque keys. W-9, ACH, and any combined packet containing them must be
    Admin-only; additional owners must never receive or retrieve another
    person's files.
    **Completion evidence:** checksum/file inventory, Admin access success,
    CSA/additional-owner/public denial, expired-link checks, and proof storage is
    durable rather than local `uploads/`.

13. **Complete countersignature and notification transitions.**
    **Dependency:** Steps 8–12 and the separately approved email-delivery gate.
    Set `countersignedAt` only from authoritative live state after release and
    Curtis's actual signature. Queue completion notices and credential
    eligibility only after that transition; do not treat a queued or blocked
    notification as delivered.
    **Completion evidence:** live-state transition test separating
    `packetSignedAt` and `countersignedAt`, one notification intent, and no
    credential issuance before verified countersignature.

14. **Run a controlled provider acceptance sequence.**
    **Dependency:** Steps 1–13 deployed to the approved non-production
    environment; principal, different qualifying owner, and countersigner are
    explicitly authorized test recipients.
    Inspect the unsent draft; verify `5 + N`; verify field placement; verify
    owner/principal/Curtis visibility; send; verify reminders/expiry settings;
    complete producer signatures; prove Curtis remains blocked; complete the
    call and approve; release and countersign; verify final-copy privacy,
    webhook reconciliation, stored files, and separate timestamps. Run a
    separate decline/void case.
    **Completion evidence:** redacted provider views for every role, API/event
    IDs, Axel activity/timestamps, private-file access results, and decline-path
    record. Passing planner tests is not a substitute.

15. **Authorize production separately.**
    **Dependency:** Step 14 passes and legal, security, and business owners sign
    the evidence.
    Configure the verified account/key/webhook/assets through the production
    change process and enable dispatch only in the approved release. Do not infer
    production status from test mode or a deal/bind SignWell success.
    **Completion evidence:** signed release approval, production release and
    configuration version identifiers, and a separately authorized production
    acceptance record.

## Requirements provenance

Packet assets, seven legal responses, three-day reminders and 30-day expiry
come from the existing [appointment scope](../docs/producer-registration-appointment-scope.md)
and the supplied directive
`attached_assets/Pasted--Axel-Workforce-OS-Producer-Registration-Appointment-Pl_1789945553279.txt`.
They are not new requirements invented by this review. The specified W-9 revision
is a directive input, not a claim that it remains the latest IRS revision.
Business/compliance must approve the actual current legal assets and any changes
before dispatch.

## Historical evidence boundary

The packet-planner test file currently contains ten unit cases covering manifest
order, the 10% threshold, principal deduplication, desired visibility,
countersigner prerequisites, readiness blockers, strict identity validation,
sensitive-input rejection, and private asset keys. The September 20, 2026
record says those ten tests and the API typecheck passed at that time. That is
historical internal-policy evidence only; this review did not rerun it, and it
does not prove current build health or any SignWell behavior.

Current code references:

- `artifacts/api-server/src/services/producer-appointment/packet-plan.ts`
- `artifacts/api-server/src/tests/producer-appointment-packet-plan.test.ts`
- `artifacts/api-server/src/services/signwellService.ts`
- `artifacts/api-server/src/services/helloSignService.ts`
- `artifacts/api-server/src/routes/webhooks.ts`
- `artifacts/api-server/src/routes/producer-registrations.ts`
- `lib/db/src/schema/producer-registrations.ts`

Provider documentation reviewed in the earlier capability assessment:

- [Official SignWell OpenAPI](https://developers.signwell.com/openapi/resources-and-endpoints.json)
- [Using the Features in the Send Modal](https://help.signwell.com/article/261-using-the-features-in-the-send-modal)
- [Update Recipients](https://developers.signwell.com/reference/updaterecipients)