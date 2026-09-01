# Contact Architecture Parts 5–6 — Agent Identity and Detail

Date: 2026-09-01
Environment: Development only
Branch: `feature/contact-architecture`

## Database and Backup

Parts 5 and 6 required no schema changes or migrations. Because no migration
was performed, no database backup was created.

## Delivered

- Added one shared Agent display-name helper with structured-profile,
  legacy-partner, and safe fallback precedence plus whitespace normalization.
- Applied the helper to Network, Agent detail, deal teams, activity actors,
  mentions, and Agent registration surfaces.
- Additively enriched the existing Agent detail response without removing,
  renaming, or retyping its legacy fields.
- Resolved Agent-associated deals and Network rollups through the Agent
  profile's portal user ID.
- Redesigned Agent detail with metrics, registration state, populated-only
  Contact and Licensing sections, and clickable associated deals.
- Added structured profile editing for ADMIN and CSA users.
- Added an ADMIN-only Agent status action with atomic partner status change,
  portal-user deactivation, session deletion, and password-reset-token deletion.
- Protected the legacy partner update route against Agent status changes and
  partner-type reclassification bypasses.

## Acceptance Results

### 9. Agent detail has no dash placeholders or removed cards

**PASS**

- Full and sparse Agent pages rendered without dash placeholders or undefined
  text.
- The legacy Contact Info, Commission Summary, and Registration Status cards
  are absent.
- Optional Contact and Licensing content is omitted when not populated.

### 10. Agent display-name precedence

**PASS**

- A structured profile with padded first and last names rendered as
  `Avery Stone`, not the intentionally different legacy partner name.
- Brendy rendered correctly from a first name without a last name.
- A disposable no-profile Agent rendered the whitespace-normalized legacy
  partner name `Legacy Fallback`.
- Network, detail, deal-card, activity, mention, and registration paths use the
  same display-name rules.

### 11. Suspend confirmation and portal revocation

**PASS**

- Suspend required a confirmation dialog that states portal-access and
  open-deal consequences.
- Cancel left the Agent active.
- The visible confirm button changed the Agent to Suspended.
- The linked user became deactivated and all linked sessions were deleted.
- A non-ADMIN status request returned 403.
- The generic partner update route rejected Agent status changes and both
  tested partner-type reclassification bypass payloads.
- The partner status, user deactivation, session deletion, and reset-token
  deletion execute in one database transaction.

### 12. Registration chip transitions

**PASS**

- No agreement/call timestamps rendered `Awaiting signature`.
- An agreement timestamp rendered `Agreement signed`.
- Adding a call timestamp while retaining the agreement timestamp rendered
  `Call scheduled`.

## Backward Compatibility

- The existing `GET /partners/:id` route remains in place.
- All legacy response keys were verified present with their previous names and
  types.
- Legacy `licenseStates` remains an array; structured profile states are
  exposed separately as `agentLicenseStates`.
- New detail, registration, deal, and metric fields are additive.

## Additional Verification

- Baseline TypeScript validation passed for shared libraries, web, and API.
- Authenticated browser coverage passed for the full and sparse Agent detail
  states, associated-deal opening, registration transitions, Agent editing,
  status confirmation, role authorization, and Network rollups.
- Focused architecture and security review reported no commit blockers.
- API and web workflows restarted cleanly with no blocking runtime errors.

## Screenshot Evidence

Authenticated 1440×1100 browser screenshots were captured for:

1. Full-data Agent Avery Stone with Agreement signed, Contact, Licensing,
   current E&O, one associated deal, and $128,450 WC premium.
2. Sparse Agent Brendy with no phones or licensing, email-only Contact, no
   registration, and no placeholder content.

## Cleanup

All disposable Agents, portal users, registrations, sessions, accounts, and
deals were removed from Development. Brendy's temporarily masked phone and
licensing values were restored exactly.