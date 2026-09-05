# Contact Architecture Part 4 — Contact Cards and Rosters

Date: 2026-09-01
Environment: Development only
Branch: `feature/contact-architecture`

## Database and Backup

Part 4 required no schema changes. The Part 3 contacts extension already
provided the required entity ownership, role, primary-contact, and notes
fields. Because no migration was performed, no Part 4 backup was created.

## Delivered

- Added one reusable contact-card presentation for Agents, agency contacts,
  partner contacts, and client contacts.
- Grouped Agents beneath expandable agency cards with status, licensed-state,
  referred-deal, and WC-premium summaries.
- Added structured agency/Agent creation, including optional agency contacts.
- Added expandable contact rosters for carriers, PEO partners, and vendors.
- Replaced the legacy Account contact-info block with scoped client contact
  cards and a shared add/edit modal.
- Added server-provided, entity-specific contact role vocabularies.
- Added entity-aware contact authorization, target and role validation,
  ownership preservation, and read-only Underwriter enforcement.
- Added single-primary locking/replacement to both direct contact writes and
  nested agency contacts created with an Agent.
- Retired the legacy global contacts page in favor of Account-scoped contacts.

## Acceptance Results

### 5. Second Agent groups under the existing agency

**PASS**

- A disposable second Agent was created under Test Carrier Agency.
- With search cleared, one expanded agency card displayed both existing and
  new Agents.

### 14. Client and staff contacts stay out of Network partner tabs

**PASS for the Part 4 boundary**

- Disposable client contacts rendered only in the Account detail Contacts
  section and did not render in Network.
- Network rendered Agent people and organization-scoped partner contacts, not
  internal staff.
- The legacy global contacts route now redirects to Accounts.
- Building the dedicated internal staff directory remains outside Part 4.

### 15. Gradient and Add Contact styling

**PASS**

- Part 4 cards and roster controls introduce no gradients.
- Account and partner Add Contact controls are solid pink.

### 16. Agent-email search bubbles up the agency

**PASS**

- Searching only the disposable second Agent email returned the parent agency.

### 18. Carrier multi-contact roster

**PASS**

- A disposable carrier rendered Underwriter, Accounting, and Claims contacts.
- Role vocabulary order placed Underwriter first.
- Exactly one Primary badge rendered.

### 19. Contact role vocabulary isolation

**PASS**

- The Account modal displayed only client roles.
- The carrier modal displayed only carrier roles.
- No carrier-only roles appeared in the Account modal.

## Additional Verification

- Baseline TypeScript validation passed for shared libraries, web, and API.
- Authenticated browser regression passed for all requested Part 4 flows.
- Contact authorization probes confirmed:
  - Agents cannot read unrelated client or Network rosters.
  - Underwriters can read client contacts but cannot mutate contacts.
  - PEO users cannot access structured Agent creation.
  - Invalid entity roles and nonexistent targets are rejected.
- Nested Agent-create payloads reject multiple primary agency contacts, while a
  single new primary transactionally replaces the prior primary.
- Focused architecture and security review reported no commit blockers.
- API and web workflows restarted cleanly with no application runtime errors.

## Screenshot Evidence

Authenticated browser screenshots were captured for:

1. Network Agents with Test Carrier Agency expanded, showing two Agents and the
   agency contact roster.
2. Summit Casualty carrier with its three-contact roster expanded.
3. TestCo Account detail with its client Contacts section.

## Cleanup

All disposable Part 4 Agents, partner organizations, profiles, and contacts
were removed from Development. Final disposable-row counts:

- contacts: 0
- partners: 0
- agent profiles: 0