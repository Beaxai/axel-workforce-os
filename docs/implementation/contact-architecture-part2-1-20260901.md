# Contact Architecture Part 2.1 — Portal Access Gate

Date: 2026-09-01  
Environment: Development only  
Branch: `feature/contact-architecture`

## Backup Rule

Part 2.1 changes application behavior only. It adds no table, column, index,
constraint, or other schema change, so no database backup was required.

## Implemented Gates

### Forgot password

`POST /api/auth/forgot-password` retains the same generic `{ "ok": true }`
response for all requests. A reset token is created only when:

- the user exists;
- `users.status` is exactly `active`; and
- the user already has a `user_credentials` row.

Invited users and users without credentials cannot enter the reset flow.

### Reset password

`POST /api/auth/reset-password` now:

- requires a valid, unexpired, unused reset token;
- requires an existing `user_credentials` row;
- updates only the existing credential;
- never creates a first credential; and
- never changes `users.status`.

### First credential issuance

`POST /api/agent-registrations/:id/issue-credentials` is ADMIN-only. In one
transaction it:

- locks the registration and linked user;
- requires `zoom_completed_at`;
- requires canonical approved status and links to both a user and Agent partner;
- requires the user to remain `invited`;
- rejects users that already have credentials;
- creates an unreachable temporary credential;
- invalidates earlier unused reset tokens;
- creates a one-hour invitation/setup token;
- promotes the user from `invited` to `active`; and
- writes an `AGENT_CREDENTIALS_ISSUED` activity record with issuing admin and
  issuance timestamp.

The returned setup token is used with the existing reset-password endpoint to
choose the real password.

### Existing active-user reuse

When approval matches an already-active user by email, it writes an
`AGENT_INHERITED_PREEXISTING_ACCESS` activity record. The record identifies
the registration, linked partner, linked user, approving administrator, and
timestamp through the activity log's standard fields and metadata.

The same check covers an active user already present in
`agent_registrations.user_id`, including the completed-approval retry path.
The warning is idempotent, and registrations with a legitimate
`AGENT_CREDENTIALS_ISSUED` audit are not mislabeled as inherited access.

## Development Verification

Disposable Development records were created for the checks below and removed
afterward.

| Test | Result |
|---|---|
| Approve creates invited user with no credential | Pass |
| Invited forgot-password response remains generic | Pass — HTTP 200, `{ "ok": true }` |
| Invited forgot-password creates no reset token | Pass — token count remained 0 |
| Reset with a valid injected token and no credential | Pass — HTTP 400 |
| Reset creates no first credential | Pass — credential count remained 0 |
| Reset promotes no invited user | Pass — status remained `invited` |
| Credential issuance before onboarding call | Pass — HTTP 409 |
| Failed issuance leaves credential/status unchanged | Pass — 0 credentials, `invited` |
| Pending registration with user/partner links and completed call | Pass — HTTP 409; remained invited with 0 credentials |
| Credential issuance after `zoom_completed_at` | Pass — HTTP 201 |
| Successful issuance creates one credential | Pass |
| Successful issuance promotes invited to active | Pass |
| Successful issuance creates one unused setup token | Pass |
| Successful issuance invalidates earlier unused token | Pass |
| Issuance activity contains admin and timestamp | Pass |
| Setup token changes the existing credential | Pass — HTTP 200 |
| Setup reset leaves status unchanged | Pass — remained `active` |
| Agent login after setup | Pass — HTTP 200, role `AGENT` |
| Approval reusing an active user emits warning activity | Pass |
| Pre-linked active user emits warning during approval | Pass |
| Approval retry duplicates inherited-access warning | Pass — remained exactly 1 row |

After cleanup, original Development counts were restored:

- `agent_registrations`: 1
- `partners`: 2
- `agencies`: 2
- `agent_profiles`: 1
- `name_review`: 1
- disposable users: 0
- disposable activity records: 0

`Test Agency` was restored to its original pending status.