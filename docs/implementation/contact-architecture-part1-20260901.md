# Contact Architecture Part 1 — Development Run Record

Date: 2026-09-01  
Environment: Development only  
Branch: `feature/contact-architecture`

## Pre-Migration Backups

The backups were created before the Part 1 migration. Source and backup row
counts matched:

| Source table | Source rows | Backup table | Backup rows |
|---|---:|---|---:|
| `agent_registrations` | 1 | `agent_registrations_backup_20260901` | 1 |
| `partners` | 2 | `partners_backup_20260901` | 2 |

## Additive Migration

- Created `agencies`.
- Added nullable `agency_id` foreign keys to `agent_registrations` and
  `partners`.
- Added the agency status constraint.
- Added normalized legal-name uniqueness across case, whitespace, and
  punctuation differences.
- No table or column was dropped.

## Backfill Verification

The backfill was run twice to confirm it is idempotent.

| Check | Result |
|---|---|
| `Test Agency` registration linked to a pending agency | Pass |
| Agent partners with a non-empty agency name linked to an agency | 1 of 1 |
| Normalized duplicate agency keys | 0 |
| `agent_registrations` rows after backfill | 1 |
| `partners` rows after backfill | 2 |

The two source agency names are genuinely different:

- `Test Agency` from the registration
- `Test Carrier Agency` from the existing Agent partner

They therefore correctly produced two agencies rather than being merged.

## Scope Note

`agent_profiles` is Part 2 and was not created during Part 1. The
agent-profile clause within acceptance test 3 cannot pass until Part 2 is
executed.