# Contact Architecture — Parts 7–8

Date: 2026-09-01
Environment: Development only

## Delivered

- A single server validator gates every runtime write that creates or changes `producingAgentId`.
- New attachments at `UW_REVIEW` or later require an individual NPN, at least one structured license state, and a linked E&O registration expiring today or later.
- Existing associations, detach operations, Submission Review attachments, and stage-only changes remain unaffected.
- The dedicated assignment endpoint and generic deal PATCH reject AGENT callers changing the producing Agent.
- Internal `/team` directory, navigation, staff cards, searchable filtering, and first-class staff profile fields.
- Deal-card team popover uses the submission allowlist directly; it does not fetch the broader mini-profile endpoint.
- Non-admin profile responses omit private narrative fields and do not derive role-section values from `role_metadata`.

Exact gate message:

> Add NPN, license state, and current E&O before this agent can be attached to quoted deals.

## Endpoint and field exposure

| Endpoint | Allowed roles | Changed/exposed fields |
|---|---|---|
| `GET /api/users/team` | ADMIN, CSA, UNDERWRITER | Exactly `name`, `title`, `email`, `phoneDirect`, `phoneMobile`, `department` |
| `PATCH /api/users/:id/profile` | ADMIN for another user; self for existing self-service fields | ADMIN may write `phoneDirect`, `phoneMobile`, `department`; private `bio`, `internalNotes`, and `roleMetadata` remain ADMIN-only |
| `GET /api/users/:id/profile` | Existing relationship rules | Adds safe `phoneDirect`, `phoneMobile`, `department`; `bio` and `internalNotes` are ADMIN-only; non-admin role sections do not use `role_metadata` |
| `PATCH /api/deals/:id/producing-agent` | ADMIN, CSA, UNDERWRITER | Accepts only `producingAgentId`; returns the updated deal or 409 gate payload |
| `POST /api/deals` | Existing deal-create roles | Existing deal fields; new producing-Agent association is validated against resulting stage |
| `PATCH /api/deals/:id` | Existing deal-patch roles; only ADMIN, CSA, UNDERWRITER may change `producingAgentId` | Existing deal fields; producing-Agent changes share the gate |
| `GET /api/deal-card/:id/submission` | All authenticated party types with scoped deal access | Existing payload plus team `title`, `email`, `phoneDirect`, `phoneMobile`, `department`; no `bio`, `internalNotes`, or `roleMetadata` |
| `/team` UI route | ADMIN, CSA, UNDERWRITER | AGENT has no navigation item and is redirected to Unauthorized |

No runtime bulk/import path writes `producingAgentId`. `seed-keystone.ts` is a Development seed script, not an application write path.

## Acceptance 13 — Agent attachment gate

PASS:

- Incomplete Agent at U/W Review: 409 with exact message.
- Expired-E&O Agent at U/W Review: 409 with exact message.
- Same incomplete Agent at Submission Review: 200.
- Current, fully evidenced Agent at U/W Review: 200.
- Existing incomplete association survived a later-stage transition: 200.
- Generic PATCH bypass: 409 for internal staff; direct AGENT change: 403.
- Create-path bypass: 409.
- Dedicated assignment as AGENT: 403.
- Browser test rendered the exact message inline at the deal Agent selector.

## Acceptance 14 — Contact segregation and staff directory

PASS:

- Fixture client contact appeared in the Accounts contact API and did not appear in Team or Network partners.
- Internal staff appeared in Team and did not appear in Network partners.
- AGENT had no Team navigation, `/team` redirected to Unauthorized, and `GET /api/users/team` returned 403.
- Team endpoint returned only the six allowlisted fields.
- Deal-team responses for AGENT, CARRIER, PEO, VENDOR, and EMPLOYER returned the safe team projection with zero private fields.

## Verification

- Baseline typecheck: PASS (shared libraries, web, API; zero new errors).
- Browser acceptance: PASS.
- Architecture/security review: PASS after closing generic-PATCH authorization and metadata-derived profile exposure.
- Development schema backup: `backup_user_profiles_20260901_parts8`, 11 source rows and 11 backup rows before ALTER.
- Additive columns: `phone_direct`, `phone_mobile`, `department`.

The full regression sweep was intentionally not run; this batch stops at the requested boundary.