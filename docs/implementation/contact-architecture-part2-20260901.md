# Contact Architecture Part 2 — Development Run Record

Date: 2026-09-01  
Environment: Development only  
Branch: `feature/contact-architecture`

## Pre-Migration Backup

Part 1 had already used the required date-only backup name, so Part 2 used a
Part-specific suffix rather than overwrite the earlier backup.

| Source table | Source rows | Backup table | Backup rows |
|---|---:|---|---:|
| `agent_registrations` | 1 | `agent_registrations_backup_20260901_part2` | 1 |

Before adding the foreign key, the existing data check found zero non-null
`agent_registrations.user_id` values without a matching `users.id`.

## Additive Migration

- Created `agent_profiles`, keyed one-to-one by `partners.id`.
- Created `name_review`, keyed by `partners.id`.
- Added the real `agent_registrations.user_id` foreign key to `users.id`.
- Dropped and renamed no tables or columns.
- Retained the Part 1 and Part 2 backup tables.

The interactive schema tool identified backup tables as possible rename
sources and exited without applying changes. To protect the backups, the
Development migration was applied as an explicit additive transaction that
only created the two new tables and added the validated foreign key.

## Existing Agent Backfill

The backfill ran twice to verify idempotency.

| Check | Result |
|---|---|
| Agent partners | 1 |
| Agent profiles | 1 |
| Agent partners missing profiles | 0 |
| Name-review rows | 1 |
| `Brendy` profile first name | `Brendy` |
| `Brendy` profile last name | `NULL` |
| `Brendy` original name queued for review | Yes |

Legacy field mapping:

- `partners.npn` → `agent_profiles.individual_npn`
- `partners.contact_phone` → `agent_profiles.phone_direct`
- Non-empty `partners.license_states` → structured
  `agent_profiles.license_numbers.statesLicensed`
- Empty legacy license-state arrays → `agent_profiles.license_numbers = NULL`

No surname was inferred for ambiguous names. Only names containing exactly two
whitespace-normalized tokens split into first and last name.

## Approval Verification

A disposable registration used the near-duplicate agency name
`Test...Agency`. Two approval requests were sent concurrently to the real
Development API.

| Check | Result |
|---|---|
| First approval response | `201` |
| Concurrent/retry response | `200` |
| Both responses returned the same partner | Yes |
| Agent partner rows created | 1 |
| Agent profile rows created | 1 |
| User rows created | 1 |
| Registration linked to partner and user | Yes |
| Matched agency | `Test Agency` |
| Agency count before and after | 2 |

The approval transaction locks the registration row before provisioning.
Completed approvals return their existing linkage rather than creating
duplicates.

All disposable registration, partner, profile, membership, user-profile, and
user rows were removed after verification. `Test Agency` was restored to its
original pending status. Final source counts were restored:

- `agent_registrations`: 1
- `partners`: 2
- `agencies`: 2
- `agent_profiles`: 1
- `name_review`: 1

## API Compatibility Verification

`GET /api/partners?type=Agent` returned HTTP 200 and retained every prior
partner field:

`id`, `partnerType`, `name`, `agencyName`, `agencyId`, `licenseStates`, `npn`,
`contactName`, `contactEmail`, `contactPhone`, `status`, `notes`, `metadata`,
`createdAt`, and `updatedAt`.

The response added profile and agency display fields without removing or
renaming existing fields.

`GET /api/partners/:id` returned HTTP 200 for the existing Agent. A browser
smoke test also loaded `/network/agents/:partnerId`, rendered the existing
Brendy detail page, and reported no browser console errors caused by the
additive response fields.

## Acceptance Results

| Acceptance test | Result |
|---|---|
| 3 — deferred `agent_profiles` clause | Pass |
| 4 — approval creates/matches agency, partner, profile, and registration link; near-duplicates attach | Pass |
| 4b — ambiguous/single-token names use `last_name = NULL` and enter `name_review` | Pass |
| 4c — Agent API is backward-compatible and existing detail route resolves | Pass |