# Appointment Part 1 — Foundation and Remaining Gate

**Branch:** `appointment/01-intake` (local; not pushed)  
**Status:** Database foundation verified; Part 1 intake endpoint is **not complete**.

## Implemented

- Additive producer registrations, owners, documents, and durable job-intent tables.
- Required organization linkage and optional unique legacy-registration linkage.
- Immutable intake payload protection and unique registration references.
- Approval, countersignature, credential, and call-note database prerequisites.
- Owner percentage bounds and document-completion metadata checks.
- Pure timestamp-derived status helper with automated tests.
- Explicit countersigned-but-not-credentialed display state, avoiding a misleading countersign-pending label.

The existing agent registration table, routes, users, agencies, and approval behavior have not been changed. A reviewed compatibility/backfill and legacy-route hardening step is still required before public intake is enabled.

## Verification completed

- Shared library typecheck: passed.
- API server typecheck: passed.
- Status unit tests: 3 test groups passed.
- Additive SQL applied to **Development only**.
- Independent SQL confirmed all four new tables and the registration triggers.
- Rollback-only SQL fixtures verified insert/child relationships, duplicate reference and job rejection, payload immutability, premature approval/countersign/credentials rejection, required call notes, owner percentage bounds, document metadata requirements, and restricted error-code format.
- Fixture rollback confirmed zero new registrations remain; the two existing legacy registrations remain.

Verification SQL: `lib/db/migrations/verify_producer_registration_foundation.sql`.

## Important environment boundary

Git branches isolate code, **not the shared development database**. The new tables were added without dropping, renaming, or backfilling existing tables. No production database changes were made. No worker, packet sending, email sending, or public intake endpoint was enabled.

Database triggers are part of the checked-in SQL. Do not assume a table-only schema synchronization installs trigger functions; confirm their presence in the approved deployment process before relying on these safeguards outside Development. Do not add startup-time schema mutation.

## Required inputs before the public endpoint can be finalized

1. Gershom's full website field-key/requiredness contract and one fictional sample payload.
2. Exact signature encoding/header convention agreed with the website implementation.
3. Secure configuration of `WEBSITE_WEBHOOK_SECRET`; do not send its value in chat or documents.
4. An explicitly selected trusted organization to own website registrations.

The directive identifies required concepts but not all exact legal-question keys, document URL keys, or required website fields. Do not fabricate that contract.

## Remaining Part 1 work

- Implement and document the signed, rate-limited public endpoint.
- Implement complete payload validation and field-level errors.
- Add warning flags and duplicate-agency detection.
- Atomically persist registration, owners, document metadata, and processing intents.
- Implement safe private document ingestion and retry handling.
- Reconcile/protect the legacy intake and update paths without breaking existing registrations.
- Add authenticated, role-scoped inspection and redaction for intake failures.
- Update OpenAPI and regenerate clients.
- Verify HTTP acceptance: valid 201, invalid signature 401, replay 409, missing document 422, low-E&O warning, and concurrent replay.

Job-intent storage is not an operational queue worker. No API, UI, document ingestion, or packet workflow should be described as delivered by the foundation alone.

## Later-part prerequisites found

- SignWell and Resend key existence was confirmed, not account capability or real delivery.
- Website webhook and Calendly signing secrets were not configured at inspection.
- Approved packet documents and Gershom's separate website contract were not found.
- Provider feasibility, template configuration, sender verification, Calendly subscriptions, and controlled test recipients remain unverified.

Continue on this branch after the website contract is supplied. Parts 2–5 remain separate milestones; no emails or legal packets should be sent until their inputs and test recipients are authorized.