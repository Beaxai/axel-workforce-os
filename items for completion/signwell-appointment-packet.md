# SignWell Appointment Packet — Completion Gate

**Status:** Part 2 preparation, not a completed signing integration.
**Reviewed:** September 20, 2026 (America/New_York).

No legal packet has been created or sent. The existing deal/bind signing flow
must remain separate from producer appointment signing.

## Preparation implemented

The internal packet planner at
`artifacts/api-server/src/services/producer-appointment/packet-plan.ts`:

- Produces the required ordered `5 + N` document manifest.
- Selects owners at or above 10% and assigns each a separate Exhibit A.
- Reuses the principal recipient for their own qualifying Exhibit A.
- Records the intended read/sign permissions for every document.
- Checks approval, producer signatures, and call completion before reporting
  countersignature eligibility.
- Reports missing approved assets, provider confirmations, and authorized
  test recipients.
- Always returns `dispatchEnabled: false`; it cannot send a packet.

Run its offline tests with:

```sh
pnpm --filter @workspace/api-server run test:producer-appointment-packet-plan
```

Ten unit tests passed, and the API typecheck passed. These are internal policy
checks, not a live provider acceptance run. No schema migration, new screen,
signature field placement, webhook processing, or document delivery was added
in this preparation step.

## Required provider confirmations

- [ ] Demonstrate file-level visibility within one packet: each additional
  owner can access only their own Exhibit A plus the read-only CFPB rights
  summary, not the application, NPA, W-9, ACH, or other owners' disclosures.
- [ ] Demonstrate a true externally controlled countersign hold: Curtis cannot
  sign the NPA until the call is complete and Axel approves, even after all
  producer-side signers finish.
- [ ] Verify the final document downloads and completion emails preserve those
  same visibility restrictions. Protecting signing fields alone is insufficient.
- [ ] Confirm three-day reminders, 30-day expiration, and authenticated webhook
  handling with live provider-state verification.

### What the official documentation confirms

The published OpenAPI describes:

- Draft creation that does not send the packet.
- Signing order.
- Embedded-signing email controls.
- Sending an entire draft document.
- Updating recipients on eligible already-sent documents.

The reviewed API schema does **not establish** per-file recipient visibility or
an external approval-held countersignature. This is an unverified capability,
not a claim that SignWell cannot support it.

The sending-order help page says waiting recipients receive notifications and
sign sequentially. Disabling a notification is not the same as blocking signing
access until an approval recorded in Axel. The sales-document “Approve” button
is also not evidence of an Axel-admin-controlled hold.

Sources:

- [Official SignWell OpenAPI](https://developers.signwell.com/openapi/resources-and-endpoints.json)
- [Using the Features in the Send Modal](https://help.signwell.com/article/261-using-the-features-in-the-send-modal)
- [Update Recipients](https://developers.signwell.com/reference/updaterecipients)

### Questions to resolve with SignWell

1. What exact API parameter or endpoint restricts a specific uploaded file to
   specified recipients, including the completed copies and email attachments?
2. What exact API action keeps a final recipient's signature unavailable until
   an external application explicitly releases it?
3. Can both controls operate together in a packet containing multiple files,
   separate owner disclosures, and an approval-held NPA countersignature?
4. How are signed copies retrieved without exposing W-9/ACH to other owners?

Do not silently substitute multiple envelopes, a second NPA, a placeholder
countersigner, or an email-only hold. If the required arrangement is unsupported,
obtain business approval for a revised workflow before implementing it.

## Approved assets needed

- [ ] Producer Appointment Application, approved fillable PDF.
- [ ] National Producer Agreement, approved pages 1–10.
- [ ] Standalone Exhibit A source PDF, separate from the NPA.
- [ ] Current CFPB Summary of Rights PDF, read-only.
- [ ] IRS W-9, Rev. 3-2024.
- [ ] ACH Authorization, approved PDF.
- [ ] Reviewed field mappings, template identifiers or page coordinates, and
  private asset storage keys for the approved revisions.

Do not use existing ACORD, carrier, or workers' compensation forms as substitutes.
Do not collect bank details through the website or the packet-planning inputs.

## Controlled test acceptance

- [ ] Authorize a principal test recipient and a different owner test recipient.
- [ ] Confirm the countersigner identity and test authorization.
- [ ] Inspect the prefilled draft without sending email.
- [ ] Verify `5 + N` documents, where `N` is the number of owners at or above 10%.
- [ ] Verify each Exhibit A is standalone and recipient-restricted.
- [ ] Verify a principal who is also a qualifying owner signs their own Exhibit A without becoming two recipients.
- [ ] Verify CFPB summary is read-only and available to required recipients.
- [ ] Finish producer-side signatures; verify Curtis remains blocked before approval.
- [ ] Complete the call and approve; verify only then that Curtis can countersign.
- [ ] Confirm owner signature timestamps and producer packet completion separately from countersignature.
- [ ] Store executed PDFs privately; restrict W-9, ACH, and any combined packet containing them to Admin.
- [ ] Confirm decline voids the packet, creates no credentials, and cannot be reversed by a late webhook.

The packet planner records the desired document and recipient policy only.
Passing its unit tests is not proof that SignWell enforces these restrictions.
Real sending remains disabled until the provider controls, approved assets,
field mapping, and authorized test process are verified.