# Contact Architecture Part 3 — Contacts Table Extension

Date: 2026-09-01  
Environment: Development only  
Branch: `feature/contact-architecture`

## Pre-migration Backup

The required backup was created before any contacts migration:

- Source table: `contacts`
- Source row count before migration: 0
- Backup table: `contacts_backup_20260901`
- Backup row count: 0

The empty table was backed up intentionally to preserve the pre-Part 3 schema
record.

## In-place Extension

The existing `contacts` table was altered in place. It was not dropped,
renamed, or recreated.

Added columns:

- `entity_type text`
- `entity_id uuid`
- `is_primary boolean not null default false`
- `notes text`
- `updated_at timestamptz not null default now()`

The existing `org_id` and `deal_id` columns and foreign keys remain intact.

Added database controls:

- `contacts_entity_type_check` permits only `client`, `agency`, `carrier`,
  `peo_partner`, and `vendor` when `entity_type` is populated.
- `contacts_one_primary_per_entity` is a partial unique index on
  `(entity_type, entity_id)` where `is_primary = true`.

## API Behavior

- Contact creates and updates validate populated email addresses.
- Creating or updating a contact as primary transactionally unsets the prior
  primary for that entity before saving the new primary.
- A transaction-scoped advisory lock serializes concurrent primary changes for
  the same entity.
- Agent registration creates now validate email addresses at the API schema.
- Contact role vocabulary is exported once from the shared database package,
  keyed by contact entity type. `role` remains free text in PostgreSQL.

## Acceptance Results

### 6. Contacts extended in place

**PASS**

- All five requested columns are present.
- `org_id` and `deal_id` remain present.
- Their original foreign keys remain present.
- The existing table was extended through `ALTER TABLE`; it was not recreated.
- Source and backup counts were both 0 before migration.

### 7. Primary contact replacement and uniqueness

**PASS**

- Created a first client contact with `is_primary = true`.
- Created a second contact for the same account.
- Updating the second contact to primary set the first contact to false and
  the second to true.
- A direct forced update attempting to set both contacts primary failed with:
  `duplicate key value violates unique constraint
  "contacts_one_primary_per_entity"`.

### 8. Invalid contact and Agent emails

**PASS**

- Invalid contact create returned HTTP 400 and inserted no row.
- Invalid contact update returned HTTP 400 and preserved the valid email.
- Invalid Agent registration create returned HTTP 400 and inserted no row.

## Cleanup

All disposable contacts were deleted. Final Development counts:

- `contacts`: 0
- `contacts_backup_20260901`: 0
- contacts with test invalid emails: 0
- Agent registrations with the test invalid email: 0