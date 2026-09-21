# Supplied directive and PDF review

This review examined the newly supplied directive ending `1789959978531.txt`
and all four PDFs ending `1789959996682.pdf` in `attached_assets/`: extracted
text, PDF field inventory, and rendered form/signature/Exhibit A pages.
It did not modify legal forms, create packets, verify provider configuration,
or send emails. Source documents supplied is not the same as approved final
documents or working integration.

## Inputs now available

| Supplied file | Verified structure | What this resolves |
|---|---|---|
| Producer Appointment Application | 3 pages, 103 text/checkbox fields | Source form, seven printed legal questions, owner/sub-producer tables, certification and signature layout are available |
| National Producer Agreement | 11 pages; 9 fields on page 10, 3 on page 11 | Agreement is pages 1–10; standalone Exhibit A source is page 11; no need to request a separate source copy before extraction |
| ACH Authorization | 1 page, 21 text/checkbox fields | Company/account fields and authorization/signature layout are available |
| W-9 | Rev. March 2024; 6 pages, 23 fields on page 1 | Requested revision and fillable source are available; pages 2–6 are instructions |

These are AcroForm text/checkbox fields, not proof of SignWell signing fields.
Field mapping, signer ownership, flattening/preservation, and rendered prefill
acceptance remain implementation work.

## Policy clarified by the supplied directive

- Calendly is **45 minutes, Zoom**. `/30min` is explicitly only the URL slug.
  This is no longer an open duration decision; actual account configuration
  and the API event-type URI still need verification.
- Intake idempotency header equals `meta.reference`. New valid intake returns
  `201 {id, reference}`; an existing reference returns `409 {reference}`.
  Header/body mismatch handling and the exact website schema still need agreement.
- Both decisions are gated by **Ready for Decision**: producer signatures and
  completed call. Early decline would be a change request, not an unanswered
  baseline policy. Admin decides; CSA reads. The directive does not explicitly
  assign the Mark Call Complete action to a role, so the existing CSA permission
  remains a narrow policy-confirmation item.
- Packet composition, principal/owner assignments, approval-held NPA
  countersignature, three-day reminders and 30-day expiry are specified.
- Do **not** require an individual producer-license upload. The supplied
  application checklist still says otherwise; the directive explicitly assigns
  that document correction, the NPA signature label correction and provider
  wording review to Curtis/David.
- The directive's “production email is stubbed” statement is dated September 11.
  It does not override today's source evidence: generic deal Resend integration
  exists, while appointment delivery remains blocked.

## Remaining inputs and ordered actions

### 1. Final packet assets and mapping
1. Inventory/hash these existing PDFs and map their actual field names and pages.
2. Obtain Curtis/David's final wording or explicit authorization of an interim
   revision; do not silently rewrite legal documents.
3. Extract Exhibit A page 11 into a separate per-owner document and retain
   NPA pages 1–10. Verify extraction preserves intended fields and content.
4. Obtain the current official CFPB rights-summary PDF; it is not among these
   uploads. Version and privately store the approved packet sources.
5. Implement and preview mappings/signing fields against fictional payloads.
   **Done:** approved version inventory plus correct provider previews and
   recipient-specific visibility evidence. See the SignWell completion plan.

### 2. W-9 mapping exception
The directive proposes agency legal name on line 1, DBA on line 2, LLC checkbox
for LLCs and agency EIN. The supplied IRS form explicitly gives different
instructions for sole proprietors/disregarded entities, including owner name,
owner tax classification and the matching TIN.
1. Have business/tax compliance approve a mapping that follows the form's
   instructions for each supported tax classification.
2. Leave uncollected/ambiguous tax facts for the signer rather than inventing
   an owner name, tax classification or TIN from agency legal structure.
3. Test ordinary entity, sole proprietor and disregarded-entity examples.
   **Done:** approved mapping and accurate previews with no tax data in logs/email.

### 3. ACH voided-check handling
The supplied ACH form and application checklist request a voided check; the
directive does not define its upload workflow.
1. Confirm whether the check is required and which secure provider/private upload
   path is approved. Bank data must not move into the public intake or email.
2. Implement approved collection, limits, private storage and Admin-only access,
   treating the check like the ACH document rather than a generally visible file.
3. Verify principal upload and Admin access, plus CSA/public denial and absence
   of bank data in email/logs.
   **Done:** approved handling policy and secure attachment acceptance evidence.

### 4. Website contract
1. Obtain Gershom's actual versioned JSON schema and fictional payload, including
   exact field keys/types, legal answers/explanations, document URLs and metadata.
   The narrative references this spec but does not contain it.
2. Reconcile that contract with the now-known forms and explicit idempotency rules.
3. Implement and test the adapter/atomic persistence using the website plan.
   **Done:** approved contract and passing real-intake 201/409/422 cases.

### 5. Remaining integrations and acceptance
1. Follow the existing SignWell, Calendly, activation, private-file and appointment
   email plans; these files do not implement or verify those integrations.
2. Obtain missing configuration/provider capability evidence, approved staff and
   test recipient identities, and Compensation Schedules/Guidelines content.
3. Run authorized end-to-end acceptance after the dependent implementations.
   **Done:** recorded provider/recipient results and environment-specific release
   evidence, not merely PDF availability.

The NPA DOCX mentioned in the directive was not supplied. It is optional for
engineering if final corrected PDFs are supplied; do not make DOCX availability
an artificial implementation blocker.