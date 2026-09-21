# Canonical appointment approval and identity reconciliation

## Confirmed policy

Reuse unambiguous existing records; require manual review for conflicting or
ambiguous matches. The user approved this policy on September 21, 2026.
Preserve established compliance information and existing access. Newly created
identities remain inactive until authoritative countersigning is verified.

This policy confirmation is not approval of an undocumented intake field
contract, automatic cross-organization linking, or a simulated signing workflow.

## Recommended approach

Build on the canonical producer application workflow, using one deterministic
identity resolver for both the staff review and the final approval transaction.
Do not reactivate the legacy approval endpoints.

Alternatives considered:

- Always create records: simpler but creates duplicate agencies and accounts.
- Manually review every existing match: conservative but needlessly blocks clear
  matches and differs from the confirmed policy.
- Reuse clear matches and block conflicts: the selected approach.

## Matching and data protection

Resolve agency, principal, portal user, separate contact, and owners independently
from validated intake data. Inspect and document the actual supported payload
fields during implementation; reject missing or unsupported identity inputs
instead of inventing website fields or filling required values with defaults.

| Situation | Outcome |
|---|---|
| Existing application links remain valid, organization-scoped, and consistent with supplied identity evidence | Reuse those records |
| Exactly one compatible candidate is supported by exact identity evidence | Reuse without overwriting established compliance data |
| No candidate and sufficient validated identity data | Create pending/inactive records |
| Multiple candidates, conflicting identifiers, or a match outside authorized organization scope | Block for manual review; make no approval writes |
| Missing identity evidence | Explain missing inputs; do not guess or provision |
| Existing active user or agency | Preserve existing state and permissions; grant no additional access prematurely |

Agency identifiers and person identifiers must be evaluated together with
existing links for contradictions. Similar names are not sufficient evidence.
A normalized email match may identify an account candidate but is not by itself
authorization to grant membership, transfer ownership, or merge identities.
Never match missing identifiers to each other.

The initial manual-review behavior is a visible blocker with a safe reason, not
an unrestricted merge button or a bypass for lifecycle checks.

## Staff behavior and approval transaction

The application detail shows whether records will be reused, created pending,
or require review. Sensitive identifiers remain restricted to authorized staff.
The server recomputes the result during approval; browser previews are not
authority to reuse a record.

Approval requires a trusted authorized administrator, correct organization,
verified applicant packet completion, completed call, pending decision, complete
validated identity data, and the required countersign-release integration.

Within a single transaction, lock the application and relevant existing
identities, recheck eligibility and matches, create or link pending records,
record the decision and safe audit, and persist the countersign-release request.
Concurrent approvals must not create duplicate identities; use database-backed
uniqueness/serialization appropriate to the existing schema, not only an
application-level lookup. Exact replays return the established result.
Failures leave no partial identities or approval.

## Integration boundaries

Calendly return-path configuration remains deferred. Do not manufacture bookings
or call completion to make approval pass.

Real producer SignWell dispatch, verified applicant signing, held countersign
release, and executed-document handling remain prerequisites for a real
end-to-end approval. Preserve explicit blockers where these capabilities are
absent. Development database fixtures can test transactional rules, but cannot
be reported as actual signing or activation.

New identities activate only after authoritative countersignature, and credential
handoff remains gated on activation. Never return passwords or setup tokens from
the approval response. Existing active access must not be revoked or broadened
as a side effect of processing a new application.

## Verification and completion

Cover new identities, exact reuse, existing active access, missing data,
contradictory identifiers, multiple candidates, cross-organization denial,
concurrent duplicate approvals, exact replay, rollback, and no access before
countersigning. Verify the staff UI exposes the same decisions as the server.

Record implemented behavior separately from real provider acceptance. This item
is not end-to-end complete until an actual signed test application can be
approved, countersigned, activated, and given the approved credential handoff.
No production data changes, historical reconciliation, provider subscriptions,
or release of previously blocked mail are authorized by this design.