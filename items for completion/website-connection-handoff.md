# Website Connection — Accuracy Review and Completion Plan

**Overall status:** Incomplete. The signed transport and synthetic connection
test are built, but the real application endpoint is intentionally disabled.
**Reviewed against current code:** September 21, 2026 (America/New_York).
**Branch inspected:** `appointment/01-intake`.

The existing website remains the application system of entry. Axel must receive
its backend-to-backend handoff; Axel must not replace the website form. Nothing
in this review establishes that staging or production is deployed, configured,
reachable, or accepting applications.

## Current status by category

### Built in the repository

- The API mounts `POST /api/public/producer-registrations` and
  `POST /api/public/producer-registrations/connection-test` before the global
  JSON parser, so the receiver can authenticate the exact request bytes.
- The receiver enforces HMAC-SHA256 in `X-Axel-Signature`, timing-safe digest
  comparison, uncompressed requests, a 256 KB limit, valid JSON, POST-only
  access, and a bounded process-local limit of 10 requests per socket address
  per minute.
- The synthetic endpoint accepts only `reference` and `test: true`, requires a
  matching `X-Axel-Idempotency-Key`, persists nothing, and returns
  `{"connected":true,...,"persisted":false}` on success.
- The real endpoint authenticates a JSON object but always returns HTTP `503`
  with `{"error":"application_contract_pending"}`. It has no application
  schema, adapter, persistence, or successful `201` path.
- The OpenAPI description accurately documents that disabled receiver and the
  synthetic test; it is not a real-application contract.
- Additive registration, owner, document, and job-intent tables exist in the
  Drizzle schema, including unique references and job intents plus approval,
  countersignature, credential, owner-percentage, and completed-document
  metadata checks. Their presence in source is not proof that a target
  environment has the required DDL and triggers.
- Unsigned legacy `POST /api/agent-registrations` returns `410`; authenticated
  non-read operations on historical registrations also return `410`.
- The internal `/agent-registrations` page route redirects staff to Network →
  Applications.

### Genuinely incomplete in code

- The website's exact field contract is not represented by a schema or adapter.
- Real intake does not validate applications, assign a trusted organization,
  generate or enforce application idempotency, persist a registration, owners,
  documents, and job intents atomically, detect duplicates, or set warning
  flags.
- Applicant document metadata is not converted into private ingestion work;
  there is no bounded downloader, source allowlist, hash/size/content checks,
  malware scan gate, retry worker, or completed private object storage path.
- The process-local limiter is not sufficient for trusted proxy or
  multi-instance deployment.
- Public legacy React routes remain registered at `/register/agent`,
  `/register/agent/agreement/:id`, and `/register/agent/onboarding/:id`. They
  still display an obsolete form, a simulated agreement action, and a simulated
  scheduling action. Backend `410` protection prevents writes but does not make
  these public screens an accurate handoff.
- Real-application acceptance and error semantics have no current integration
  or concurrency acceptance evidence.

### Configuration pending

- Confirmed staging and published Axel API origins.
- The same high-entropy `WEBSITE_WEBHOOK_SECRET` in the Axel API and website
  backend secret stores.
- The trusted Axel organization that owns website registrations.
- Trusted edge/shared per-client rate limiting and proxy identity rules.
- A controlled release of the current receiver to the intended environment.

### Acceptance unverified

No current evidence shows a deployed synthetic `200`, real intake `201`,
invalid-signature `401`, replay `409`, field/document `422`, low-E&O warning,
or concurrent duplicate prevention in any target environment. No production
check was performed for this documentation review.

## Connection contract already available to the website team

Call from the existing website's **backend**, never browser code:

- `POST /api/public/producer-registrations/connection-test`
- `POST /api/public/producer-registrations`

Set `AXEL_API_ORIGIN` to the separately confirmed API origin, with no trailing
slash and no `/api` suffix.

To sign a request:

1. Serialize the JSON once and retain those exact UTF-8 bytes.
2. Do not compress the request.
3. Compute HMAC-SHA256 over those bytes with `WEBSITE_WEBHOOK_SECRET`.
4. Send the 64-character lowercase hexadecimal digest in
   `X-Axel-Signature`; `sha256=<digest>` is also accepted.
5. For the synthetic test only, set `X-Axel-Idempotency-Key` to the reference.

The only permitted synthetic body is:

```json
{"reference":"AXR-20260131-A1B2C3","test":true}
```

The expected success body is:

```json
{"connected":true,"reference":"AXR-20260131-A1B2C3","persisted":false}
```

Do not send applicant data to the synthetic endpoint. Keep the shared secret
only in the two backend secret stores; never place it in source, frontend code,
URLs, logs, documentation, tickets, or chat.

## Requirements provenance

The requested seven legal responses and intake warning rules originate in the
existing [appointment scope](../docs/producer-registration-appointment-scope.md)
and supplied appointment directive, not this review. Their exact external field
keys still require the website team's approved contract; do not invent them.

## Numbered completion plan

Each step names its dependency and the evidence required to close it. Complete
the steps in order unless the stated dependency allows parallel work.

1. **Confirm the environment boundary.**
   **Dependency:** release owner identifies the intended staging API runtime.
   Record the staging API origin, published API origin, runtime topology
   (single or multi-instance), and trusted proxy/edge path without recording
   secrets.
   **Completion evidence:** release record naming both origins and topology,
   plus an HTTP route check showing only the intended environment was tested.

2. **Obtain and approve the actual website contract.**
   **Dependency:** Gershom/website owner supplies the current form contract.
   Capture exact field keys and types, required/optional and null rules, all
   seven legal-question meanings and accepted values, owner shape and
   percentage rules, document types and metadata/URL behavior, the website's
   stable submission identifier, E&O warning threshold inputs, and one fully
   fictional representative payload. Do not rename the website's keys or
   invent missing legal semantics.
   **Completion evidence:** versioned, business-approved contract and fictional
   fixture with every field traced to an Axel destination or explicit rejection.

3. **Implement the specified application idempotency contract.**
   **Dependency:** Step 2 provides the website's stable submission identifier.
   The supplied directive fixes the header to `meta.reference`, first success
   to `201 {id, reference}`, and an existing reference to `409 {reference}`.
   Confirm identifier normalization, header/body mismatch handling and retention
   with the actual website schema. Keep synthetic reference rules separate.
   **Completion evidence:** contract examples for first submission, exact
   replay, conflicting replay, and two concurrent identical submissions, with
   the expected `201`/`409` outcomes approved.

4. **Implement one strict website-to-Axel adapter.**
   **Dependency:** Steps 2–3.
   Add a strict input schema and one explicit adapter to registration, owner,
   document, flag, and job-intent values. Reject unknown or malformed legal and
   document fields with field-level `422` errors. Keep the original immutable
   payload for authorized audit; do not create a generic mapping engine.
   **Completion evidence:** adapter tests using the approved fictional fixture
   and negative fixtures for every required field, owner rule, legal answer,
   unknown field, and missing required document.

5. **Define trusted organization assignment.**
   **Dependency:** Axel administrator selects the owning organization.
   Resolve the organization from controlled server configuration, fail closed
   if absent or invalid, and never accept an organization ID from the website
   payload.
   **Completion evidence:** tests for configured, missing, and unknown
   organization values, plus a persisted fictional row linked only to the
   selected organization.

6. **Implement atomic intake persistence and duplicate handling.**
   **Dependency:** Steps 3–5 and target schema availability.
   In one transaction, lock/claim idempotency, insert the registration,
   qualifying owners, document metadata, warning/duplicate flags, and unique
   `ingest`, `send_packet`, and `notify_staff` intents as applicable. Return
   `201` only after commit; rollback every child on failure. Do not send email
   or a packet inside this request.
   **Completion evidence:** database integration tests proving all rows commit
   together, failure leaves none, exact replay creates none, and concurrent
   identical requests produce one registration and one set of job intents.

7. **Implement the required warning and duplicate policy.**
   **Dependency:** approved thresholds and matching rules from Step 2.
   Compute low-E&O and other specified warning flags without rejecting an
   otherwise valid submission; identify possible existing agency/person matches
   without auto-merging or overwriting compliance facts.
   **Completion evidence:** approved test cases showing warning/no-warning and
   match/no-match outcomes, with no existing agency or user mutated.

8. **Build private document ingestion.**
   **Dependency:** approved private storage namespace, source-host allowlist,
   download limits, content rules, retention policy, and malware scanner.
   Claim ingestion jobs durably; allow only approved HTTPS sources; block
   redirects to unapproved/private addresses; enforce timeout, byte, file-count,
   and MIME/signature limits; hash and scan each file; store only opaque private
   keys; update ingestion state and bounded retry metadata. Never log URLs with
   credentials or document contents.
   **Completion evidence:** tests for approved files, oversized/mislabeled/
   malicious files, redirect and SSRF attempts, retry exhaustion, duplicate
   jobs, and private-object access denial.

9. **Replace the obsolete public registration screens with a clear handoff.**
   **Dependency:** business supplies the external website destination.
   Remove simulated submission/signing/scheduling behavior from the three
   public legacy routes and present only the approved external-site handoff or
   retirement message. Keep historical staff reads and backend `410` guards.
   **Completion evidence:** route review at all three URLs showing no form,
   simulated signature, simulated Calendly action, or legacy write request.

10. **Add deployment-grade rate limiting.**
    **Dependency:** topology and trusted proxy rules from Step 1.
    Configure an edge/shared limiter keyed by the authenticated website client
    or a verified client address. Keep the process-local cap as defense in
    depth; do not trust arbitrary forwarded headers.
    **Completion evidence:** multi-instance or edge test showing the limit is
    cumulative and spoofed `X-Forwarded-For` does not bypass or collapse it.

11. **Configure the backend connection securely.**
    **Dependency:** Steps 1 and 10; secret-management access by authorized
    operators.
    Generate one high-entropy secret through the approved process and configure
    it separately as `WEBSITE_WEBHOOK_SECRET` in staging Axel and website
    backends. Configure `AXEL_API_ORIGIN` only on the website backend. No secret
    value belongs in the evidence.
    **Completion evidence:** secret-presence/version identifiers and deployment
    timestamps from both runtimes, with redacted values.

12. **Run synthetic transport acceptance.**
    **Dependency:** Step 11 and released receiver code.
    From the website backend, submit only the fictional connection body and
    verify `200` plus `persisted:false`; then verify tampering gives `401`,
    malformed authenticated JSON gives `422`, compression gives `415`, and an
    oversized body gives `413`. Confirm no registration, email, or packet was
    created.
    **Completion evidence:** redacted request/response transcript, release
    identifier, and zero-write database check.

13. **Run real-intake acceptance with fictional data.**
    **Dependency:** Steps 2–12, deployed adapter/worker, and authorized
    fictional documents.
    Verify valid `201`, invalid signature `401`, exact/conflicting replay `409`
    as specified, invalid fields and missing documents `422`, low-E&O warning,
    duplicate-match flagging, atomic rows, private ingestion, and concurrent
    duplicate prevention. Verify packet/email jobs remain blocked until their
    separate gates are enabled.
    **Completion evidence:** redacted API outcomes, row counts and relationships,
    stored hashes/private keys, worker state, and proof that no external message
    or packet was sent.

14. **Authorize production release separately.**
    **Dependency:** Step 13 passes and security/business owners approve the
    evidence.
    Repeat configuration through the production change process, confirm the
    published origin, and enable real acceptance only in the approved release.
    Do not infer production readiness from staging.
    **Completion evidence:** signed release approval, production release ID,
    redacted health/route checks, and a separately authorized acceptance record.

## Historical evidence boundary

The repository contains focused transport tests for raw-byte signatures,
tampering, missing configuration, malformed JSON, compression, process-local
rate limiting, payload size, and the synthetic request shape. The September 20,
2026 implementation report records earlier passing checks and Development-only
database verification. Those results are historical; this review did not rerun
them and they do not establish current deployment or production acceptance.

Current code references:

- `artifacts/api-server/src/routes/public-producer-registrations.ts`
- `artifacts/api-server/src/tests/public-producer-registrations.test.ts`
- `lib/db/src/schema/producer-registrations.ts`
- `lib/api-spec/openapi.yaml`
- `artifacts/axel-workforce-os/src/App.tsx`
- `artifacts/axel-workforce-os/src/pages/register/`