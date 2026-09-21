# Producer appointment admin activation — current completion review

**Reviewed against current source:** September 21, 2026.
**Scope:** repository evidence only. No production database, object store,
SignWell account, credential channel, Resend account, or deployed configuration
was checked.

## Status summary

### Built in source

- Canonical staff list/detail APIs are organization-scoped and restricted to
  trusted Axel ADMIN/CSA users. CSA projections omit the full payload, call
  notes, and W-9/ACH/executed-packet metadata.
- Call completion locks the registration, requires notes, is replay-safe, and
  records actor plus safe before/after activity.
- Decision permissions are lifecycle-derived. Decline requires readiness,
  records actor/reason, creates no identity, and persists a neutral blocked
  applicant notice when no provider envelope exists.
- Approval, credential issuance, and document access deliberately fail closed.
  Their configuration availability is returned separately from role/lifecycle
  permission and rendered in the Admin UI:
  `appointment_activation_not_configured`,
  `credential_handoff_not_configured`, and
  `document_access_not_configured`.
- Decline fails closed with `packet_void_not_configured` when a SignWell envelope
  exists.
- The current manual scheduling-link action has transactionally coupled
  action-ID idempotency and audit semantics, and the UI distinguishes a retry
  from an intentional resend. Availability remains blocked because producer
  delivery is unfinished.
- The historical `agent-registrations` router is ADMIN-only and read-only at its
  middleware boundary; all non-GET/HEAD requests return 410 before the old
  approval/credential handlers. Those old handlers are not evidence that the
  canonical producer workflow is activated.

### Incomplete in source

- Canonical approval never creates/links pending agency, principal, contact,
  owner, user, membership, or profile records; it always returns the activation
  blocker after readiness checks.
- There is no approved duplicate-reconciliation policy or canonical mapping from
  immutable intake payload to those records.
- The packet planner expresses desired recipient/document policy only and always
  returns `dispatchEnabled: false`. No producer-specific SignWell dispatch,
  externally held countersign release, authoritative webhook lifecycle, executed
  document split, or persisted release action is implemented.
- Provider packet voiding is absent.
- Ready-for-decision addresses only the actor who completed the call, and all
  producer notifications remain blocked.
- Document access has no approved private producer key namespace or signed URL
  issuer.
- Credential issuance has no canonical safe handoff integration and never
  records successful issuance.
- No reviewed migration/reconciliation path exists for historical registrations.

### Configuration pending

Approved trusted-staff distribution, private object-store namespace/signing
configuration, credential handoff channel, SignWell producer packet controls,
producer email delivery, and production migration state remain unestablished.

### Acceptance unverified

External-tenant denial, lifecycle concurrency, duplicate reconciliation,
pending-to-active identity transitions, provider release/void failures, private
object signing, credential handoff, actual notification delivery, rollback, and
production behavior have not been accepted in this review.

## Completion plan for every remaining gap

### 1. Approve the canonical identity mapping and duplicate policy

**Policy confirmed September 21, 2026:** reuse unambiguous existing agency/user
matches; require manual review for conflicts. Preserve established compliance
data and access; new identities remain inactive until verified countersigning.
See the [approval design](../docs/superpowers/specs/2026-09-21-appointment-approval-design.md).
Exact intake-field mapping and provider lifecycle implementation are still
required; this policy decision alone does not complete approval or activation.

**Dependencies:** complete intake field contract; data, compliance, and business
owners.

1. Define exact mappings for agency, principal partner/profile, portal user,
   separate contact, and each owner.
2. Define matching keys and precedence for agency NPN/EIN, person NPN, normalized
   email, existing partner/user links, and already-active identities.
3. Define outcomes for exact match, partial match, conflicting compliance data,
   active existing access, multiple candidates, and rejected duplicate.
4. Require manual review for ambiguity and prohibit overwriting established
   compliance data from an application payload.
5. Approve pending statuses at decision time and the exact verified
   countersignature transition that activates each record.

**Completion evidence:** signed mapping/reconciliation matrix and fixture tests
covering new, exact existing, inherited active access, conflicting, ambiguous,
and concurrent duplicate cases.

### 2. Implement transactional canonical approval

**Dependencies:** item 1; packet release design in item 3.

1. Lock the registration and all candidate identity rows; recheck signed packet,
   completed call, pending decision, role, tenant, and no conflicting action.
2. Create/link agency, principal, separate contact, owners, user, membership, and
   profile according to the approved mapping, all in pending/inert states.
3. Persist the approved decision, actor/time, links, safe before/after audit, and
   a durable countersign-release action in one transaction.
4. Make exact request replay return the established result and make conflicting
   concurrent decisions fail without partial identities.
5. Keep activation and credentials blocked until authoritative
   countersignature.

**Completion evidence:** database integration tests for mapping, rollback,
concurrency, idempotency, no partial writes, and no active identity/access before
countersignature.

### 3. Verify and implement the producer-specific SignWell lifecycle

**Dependencies:** approved legal assets/field mappings and authorized provider
test recipients; see `signwell-appointment-packet.md`.

1. In the authorized SignWell account, prove owner file-level visibility and an
   externally controlled countersigner hold, including completed copies and
   notifications.
2. Obtain approval for the packet design; if either control is unsupported,
   approve a revised legal workflow before code changes.
3. Implement persisted packet creation/dispatch and store authoritative packet,
   document, and recipient IDs.
4. Implement authenticated, replay-safe provider processing with provider-state
   verification for producer completion, owner Exhibit A completion,
   decline/expiry, and countersignature.
5. Implement a durable release worker that acts only after approved decision and
   completed call; activate linked identities only after verified
   countersignature.
6. Store executed documents privately and separately protect W-9/ACH and any
   combined packet containing them.

**Completion evidence:** provider capability record, approved design, integration
tests for replay/out-of-order/late events, and controlled acceptance showing
producer completion distinct from countersignature and activation.

### 4. Implement packet voiding before decline with an envelope

**Dependencies:** item 3 provider adapter and approved decline policy.

1. Persist a void action transactionally with the decline request rather than
   calling SignWell inside the decision transaction.
2. Define whether decision remains pending-until-void or enters a distinct
   decline-pending state; approve recovery for provider rejection/timeout.
3. Make the worker idempotent, verify authoritative provider state, and record a
   safe audit.
4. Prevent later signing events from approving, activating, or issuing
   credentials for a declined/voided registration.

**Completion evidence:** acceptance for successful void, duplicate request,
already completed envelope, 4xx/5xx/timeout, late webhook, rollback, and proof
that no identities/credentials are created on decline.

### 5. Configure trusted staff notification recipients

**Dependencies:** approved staff distribution source and producer email delivery.

1. Choose an organization-scoped allowlisted distribution list or trusted
   membership resolver and assign ownership.
2. Resolve recipients at event creation without accepting arbitrary client
   addresses.
3. Use it for ready-for-decision, unmatched booking, packet failure, and
   countersign-needed events; define missing-recipient escalation.
4. Keep tenant scope and safe payload rules at the final send boundary.

**Completion evidence:** recipient-policy tests, membership/change tests,
cross-tenant denial tests, and controlled mailbox receipt for each staff event.

### 6. Complete producer notification delivery safely

**Dependency:** all steps in `appointment-email-delivery.md`.

1. Implement the producer-specific provider boundary and atomic outbox worker.
2. Preserve the latest scheduling action-ID/retry/resend semantics through the
   delivery boundary.
3. Apply an approved disposition to pre-enable blocked rows; do not release them
   merely because delivery becomes available.
4. Add monitoring, reconciliation, operator retry/suppress controls, and
   controlled acceptance for applicant/staff messages.

**Completion evidence:** worker and failure-mode test results, audited transition
report, authorized mailbox receipts, and operational sign-off. An outbox row is
not delivery evidence.

### 7. Implement bounded private document access

**Dependencies:** approved object store, producer-only namespace, retention, and
role policy; executed-document outputs from item 3.

1. Define an immutable producer-document key prefix and reject every key outside
   it; never infer a bucket/key from client input.
2. Verify registration/document/organization scope, ingestion completion, and
   ADMIN-only restrictions for W-9, ACH, and sensitive combined packets.
3. Issue a short-lived server-side signed URL with bounded method, expiry, and
   content disposition; return no storage credentials or raw key.
4. Audit access without logging signed URLs or sensitive metadata.

**Completion evidence:** tests for valid access, traversal/prefix confusion,
cross-tenant access, CSA restriction, expired signatures, alternate endpoints,
and a controlled download from the intended private object.

### 8. Integrate safe credential handoff

**Dependencies:** items 1–3; security-approved credential/reset flow; existing
credential owners.

1. Define whether the canonical flow creates a one-time setup/reset token or
   delegates to the existing credential subsystem; never return a password or
   setup secret from the appointment API.
2. Lock and recheck approval, call completion, verified countersignature,
   identity activation, recipient ownership, and no prior issuance.
3. Persist issuance state/audit atomically with the handoff request and make
   retries idempotent.
4. Record `credentials_issued_at` only after the handoff system reports the
   approved durable success condition; route delivery through its approved
   channel.

**Completion evidence:** tests for premature/concurrent/replayed issuance,
wrong-recipient and cross-tenant denial, token expiry/single use, delivery
failure/recovery, and absence of secrets in responses/logs.

### 9. Define historical registration treatment

**Dependencies:** item 1 policy, legal/data-retention review.

1. Inventory historical rows and their linked users/agencies without changing
   them.
2. Classify rows as read-only history, explicitly migrated after manual review,
   or excluded; never infer canonical milestones from legacy status fields.
3. Design an idempotent, reversible migration with per-row provenance and an
   ambiguity report.
4. Keep the current legacy router read-only until migration acceptance is
   complete.

**Completion evidence:** approved classification report, dry-run counts,
rollback-tested migration, sampled reconciliation, and zero fabricated
signature/countersignature/credential milestones.

### 10. Complete environment, rollback, and end-to-end acceptance

**Dependencies:** items 1–9 and approved target-environment migrations/config.

1. Verify migration order, constraints, indexes, trust anchors, object-store
   policy, provider configuration, and all gates in a controlled non-production
   environment.
2. Run new applicant and exact-existing-identity approvals through producer
   signing, call completion, approval, held release, verified countersignature,
   activation, document access, and credential handoff.
3. Run decline/void, ambiguous duplicate, external tenant, CSA, concurrent
   decision, provider outage, delivery failure, and rollback scenarios.
4. Reconcile database links, statuses, activity actors/before-after values,
   provider IDs, private files, and mailbox delivery.
5. Assign operational owners and rehearse rollback/recovery before a separately
   approved production release.

**Completion evidence:** dated acceptance matrix, sanitized SQL/provider/object
evidence, authorized mailbox receipts, rollback result, security/legal/operations
sign-off, and a distinct production release record. Non-production evidence must
not be represented as production verification.

## Historical evidence (not current or production proof)

`docs/implementation/producer-appointment-verification.md` records a September
20 Development-only migration/rollback/API/UI pass and explicitly says it is not
a current all-green certificate. The packet checklist records historical offline
planner tests. Current source contains additional availability and scheduling
action regression tests, including an opt-in Development database audit. This
review did not rerun any of them. None proves provider controls, activation,
credential delivery, or production readiness.

No app/configuration/database change, migration application, provider call,
email send, secret inspection, packet action, or credential action was performed
for this review.