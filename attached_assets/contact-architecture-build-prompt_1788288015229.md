# BUILD PROMPT — CONTACT ARCHITECTURE, NETWORK REWORK, AGENT DETAIL REDESIGN

**Branch: feature/contact-architecture. Do all work on this branch.**

## CONTEXT

Axel Workforce OS, existing Replit build. React 18 + TypeScript + Tailwind,
Node/Express, PostgreSQL + Drizzle ORM. Do not introduce new libraries.

Design system (non-negotiable): background #060608, glassmorphism panels
(rgba(255,255,255,0.05) bg, blur(12px), 1px solid rgba(255,255,255,0.08)
border), solid pink #E91E8C accent, purple #7C3AED support, gradients ONLY
on CTA buttons (135deg purple to pink), Inter font, Lucide icons. No
gradients anywhere else.

## SAFETY RULES — APPLY TO EVERY PART

1. Before any schema change: create backup copies of every table you alter
   (tablename_backup_YYYYMMDD). Confirm each backup exists and report row
   counts before running the migration.
2. Do not drop any table or column in this build. Deprecated columns stay
   in place, unused.
3. Commit after each Part with a message naming the Part, e.g.
   "Part 1: agencies table + extraction backfill".
4. All work runs against the Development database only. Never connect to
   or modify the Production database.
5. Report explicit pass/fail against every acceptance test at the end of
   each Part. Do not self-certify a Part complete without listing results.

---

## PART 0 — VERIFY BEFORE BUILDING

Run and report results before any schema work:

1. Full table list: SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public' ORDER BY table_name;
2. agent_registrations has columns partner_id (uuid) and user_id (uuid).
   Identify what they reference: check for a partners table, check FK
   constraints (information_schema.table_constraints /
   key_column_usage). Report what you find.
3. Confirm contacts has 0 rows and agent_registrations has 1 row
   ("Test Agency" / Brendy record).
4. Inspect which table the Network > Agents tab currently queries
   (trace the API route the frontend calls).
5. Report the schema of market_underwriters (0 rows) and how it is
   referenced in code. If it stores carrier underwriter people/emails
   for deal routing, it stays for routing; the contacts table (Part 3)
   is the directory of people. If it overlaps with a person directory,
   report before building Part 3 so we unify rather than duplicate.

If partner_id references an existing partners table that already acts as
the agent/partner entity, STOP and report its schema before proceeding —
Parts 1–2 may need to extend it rather than create a new agents table.
Otherwise proceed.

---

## PART 1 — AGENCIES TABLE + EXTRACTION

The current agent_registrations table embeds agency data as flat text
columns (agency_name, agency_dba, agency_address, agency_phone,
agency_website, agency_npn, states_licensed, lines_of_authority). Agencies
must become first-class records.

1. New table: agencies
   - id (uuid pk, default gen_random_uuid())
   - legal_name (text, not null)
   - dba (text)
   - status (text check in: pending, active, suspended, terminated;
     default 'pending')
   - main_phone (text)
   - website (text)
   - address (text)
   - agency_npn (text)
   - states_licensed (jsonb)
   - lines_of_authority (jsonb)
   - created_at, updated_at (timestamptz, default now())

2. Alter agent_registrations: add agency_id (uuid, FK to agencies.id,
   nullable for now).

3. Backfill: for each existing registration row, create an agencies row
   from its agency_* text columns and set agency_id. Dedupe by
   lower(trim(agency_name)) — identical names share one agency record.
   The existing agency_* text columns stay in place (rule 2), the
   agencies table is now the source of truth.

4. Going forward: when a registration is approved (status transition to
   approved/active), the approval handler creates-or-matches an agencies
   record from the registration's agency fields and sets agency_id.
   Match on lower(trim(agency_name)); if a near-match exists (same name
   differing only in case/whitespace/punctuation), attach to it rather
   than creating a duplicate.

## PART 2 — AGENTS AS ENTITIES

agent_registrations is an intake/workflow record (it carries status,
reviewed_by, decline_reason, agreement and zoom timestamps). The agent as
a person needs its own entity record that the Network module reads.

1. New table: agents
   - id (uuid pk)
   - agency_id (uuid, FK agencies.id, not null)
   - registration_id (uuid, FK agent_registrations.id)
   - user_id (uuid, nullable — links to login account when one exists)
   - first_name (text, not null), last_name (text, not null)
   - title (text)
   - email (text, not null), phone_direct (text), phone_mobile (text)
   - individual_npn (text), license_numbers (jsonb)
   - status (text check in: pending, active, suspended, terminated)
   - created_at, updated_at

   (If Part 0 found an existing partners table serving this purpose,
   extend it with any missing columns above instead of creating agents,
   and report the mapping.)

2. Backfill: create one agents row from each existing approved/active
   registration (first_name, last_name, title, email, phone →
   phone_direct, individual_npn, license_numbers, agency_id, user_id).

3. Approval handler (extends Part 1 item 4): approving a registration
   creates the agents row.

4. Point the Network > Agents tab API at agents joined to agencies.

## PART 3 — CONTACTS TABLE EXTENSION

The contacts table exists and is empty. Its current columns: id, org_id,
deal_id, first_name, last_name, email, phone, mobile, title, role,
created_at. Extend it — do not create a new table:

1. Add columns:
   - entity_type (text check in: client, agency, carrier, peo_partner,
     vendor)
   - entity_id (uuid)
   - is_primary (boolean, not null default false)
   - notes (text)
   - updated_at (timestamptz default now())
2. Keep org_id and deal_id as-is (rule 2). New code writes entity_type +
   entity_id; for client contacts entity_id is the accounts.id.
3. role stays a free text column; the UI offers a role vocabulary per
   entity_type and writes the selected value:
   - client: decision_maker, day_to_day, billing, claims, other
   - carrier: underwriter, customer_service, accounting, claims,
     appointments_licensing, other
   - peo_partner: implementation, payroll_ops, benefits, risk_claims,
     accounting, relationship_manager, other
   - vendor: account_manager, support, billing, other
   - agency: office_manager, accounting, licensing, other (agency
     PEOPLE who are not producing agents; producing agents live in the
     agents table, never in contacts)
   Store the raw value; render a human label in the UI. The vocabulary
   lives in one shared constant so adding a role later is a one-line
   change.
4. Partial unique index: at most one is_primary = true per
   (entity_type, entity_id).
5. Email format validated at the API layer on create/update.

## PART 4 — SHARED CONTACTCARD COMPONENT + NETWORK REWORK

Build ContactCard as a single reusable component with variants:
agency | agent | client_contact | staff.

Layout (all variants):
- Glassmorphism panel per design system
- Row 1: name (white, semibold) left; status pill right (Active green,
  Pending amber, Suspended/Terminated red — pill bg at 15% opacity of
  its color). client_contact variant shows a pink "Primary" badge
  instead of a status pill when is_primary.
- Row 2: muted secondary line — agent: "{title} · {agency name}" with
  agency name linking to the agency; agency: "{n} agents · {states}";
  client_contact: "{title} · {role label}"; staff: "{title} · {role}"
- Row 3: contact row — mail icon + email (mailto, pink #E91E8C), phone
  icons + numbers (tel links, muted). Omit empty fields entirely.
  Never render placeholder dashes anywhere.
- Footer (agent + agency variants): "{deals referred} deals ·
  ${WC premium} WC premium" computed from deals. Agency footer rolls up
  its agents.

Network > Agents tab rework:
- Top level renders agency cards sorted by active deal count desc
- Agency card expands inline (accordion) to its agent roster as
  agent-variant ContactCards
- Search matches agency name, agent name, agent email across both levels
- Add Partner flow: step 1 select existing agency or create new
  (required: legal_name, main_phone), step 2 add agent (required:
  first_name, last_name, email), step 3 optional contacts
- Header partner count counts agencies

Carriers / PEO Partners / Vendors tabs (same pattern as Agents):
- Each tab renders org cards for its entity type (carriers, PEO
  partners, vendors — use whichever existing tables hold these org
  records; report in Part 0 findings which they are, e.g. markets for
  carriers)
- Org card expands inline to its contact roster: contact-variant
  ContactCards where entity_type matches and entity_id = org id,
  secondary line "{title} · {role label}"
- Each org card has an Add Contact action opening the same modal as
  client contacts but with that entity type's role vocabulary
- is_primary applies per org: one primary contact per carrier, per PEO
  partner, per vendor — same partial unique index, no extra work
- Roles render as a small muted chip so a carrier card scanning reads:
  underwriters first, then service, accounting, claims. Sort roster by
  role in the vocabulary's order, then last name.

Client contacts in Accounts:
- Account detail page gets a "Contacts" section rendering client_contact
  ContactCards (entity_type = client, entity_id = account id)
- Add Contact button (solid pink, NOT gradient) opens a glassmorphism
  modal: first_name, last_name, email required; role required from the
  five options; title/phones optional
- Setting a new primary automatically unsets the previous one in one
  transaction
- Accounts with zero contacts show inline amber warning: "No primary
  contact on file"

## PART 5 — DISPLAY NAME FIX

No name migration is needed — first_name and last_name already exist and
are populated. The current UI renders "Brendy" because it is not
composing the full name.

1. Audit every place an agent name renders (Network cards, detail page,
   deal cards, activity log, @mentions) and render
   first_name + " " + last_name consistently.
2. Add a shared displayName(person) helper; use it everywhere. Trim and
   collapse whitespace; if last_name is null, render first_name alone.

## PART 6 — AGENT DETAIL PAGE REDESIGN

Rebuild the agent detail page layout. Keep the existing URL/route.

Header:
- Back link: "Back to {agency name}" (to the agency in Network)
- Avatar circle (initials, purple tint rgba(124,58,237,0.18), #AFA9EC
  text)
- Name + status pill inline; secondary line: "{title} · {agency link} ·
  Registered {date from agreement_signed_at or created_at}". Omit
  missing segments.
- Actions: Edit (solid pink, only primary action on the page) and an
  overflow (kebab) menu containing Suspend agent and Terminate agent.
  Both destructive actions open a confirm dialog stating consequences
  (portal access revoked, open deals need reassignment).

Stat row (3 metric cards):
- Deals referred (count)
- WC premium (sum, $ with thousands separators)
- Registration chip derived from the linked agent_registrations row:
  Agreement signed (green) / Awaiting signature (amber) / Call scheduled
  (amber) / No registration (muted text, not a warning)

Info cards (2-column grid):
- Contact: email (mailto, pink), direct phone, mobile with muted type
  labels. Only populated fields.
- Licensing: NPN, license states as pill chips, E&O status line:
  "E&O current through {eo_expiration_date}" (green) or "E&O expired
  {date}" (red) when eo_expiration_date exists on the registration.
  If the entire card would be empty, omit it and let Contact span full
  width.

Associated deals: full-width card, rows of client name left and
"{stage} · ${premium}" right, row opens the deal card modal. Empty
state: single muted line "No deals referred yet".

REMOVE from the current page: the Contact Info card (duplicate
name/email), the Commission Summary placeholder card (do not render
until the commission module exists), the Registration Status placeholder
card (replaced by the chip).

## PART 7 — VALIDATION + SOFT GATE

- Required on agent create: first_name, last_name, email, agency_id,
  status. NPN, license data, E&O optional at creation.
- Soft gate at the deal-agent association point: attaching an agent to a
  deal at U/W Review or later requires individual_npn present, at least
  one license state, and E&O not expired (eo_expiration_date null OR
  >= current_date on the linked registration; null means not yet
  evidenced — blocked). Inline message: "Add NPN, license state, and
  current E&O before this agent can be attached to quoted deals."
- The gate does not affect login or existing associations; it applies
  only to new attachments.

## PART 8 — STAFF PROFILES + INTERNAL DIRECTORY

Axel staff are users, not contacts. Do not put staff in the contacts
table.

1. New table: staff_profiles — user_id (uuid pk/FK to the users/auth
   table identified in Part 0), title (text), phone_direct (text),
   phone_mobile (text), department (text), updated_at.
2. Internal-only Team directory view (visible to internal roles only)
   listing staff as staff-variant ContactCards, populated from the user
   record + staff_profiles.
3. Surface assigned staff contextually: the deal card modal shows the
   assigned team members' name/title/email from this data. Do not
   duplicate staff into contacts.

---

## ACCEPTANCE TESTS — ALL MUST PASS, REPORT EACH EXPLICITLY

1.  Part 0 findings reported (partner_id/user_id references, Network
    data source) before any migration ran
2.  Backup tables exist for every altered table; row counts reported
3.  Existing "Test Agency" registration produced one agencies row and
    one agents row; agency_id set; nothing dropped
4.  Approving a new registration auto-creates/matches agency and creates
    the agent; near-duplicate agency names attach, not duplicate
5.  Creating a second agent under an existing agency groups both under
    one agency card in Network
6.  contacts extended in place — table was not recreated; new columns
    present; org_id/deal_id intact
7.  Setting a new primary contact unsets the previous one; the partial
    unique index rejects a forced duplicate
8.  Invalid email rejected at API on contact and agent create
9.  Agent detail page renders no dashes and no placeholder cards;
    removed cards are gone
10. "Brendy" now renders as the full first + last name everywhere it
    appears
11. Suspend requires confirm dialog; on confirm status changes and
    portal access is revoked
12. Registration chip reflects agent_registrations status transitions
13. Agent without NPN or with expired E&O cannot be attached to a deal
    at U/W Review+; same agent attaches fine at Submission Review
14. Client contact cards appear only in Accounts; staff appear only in
    the internal directory; neither shows in Network partner tabs
15. No gradients anywhere except CTA buttons; Add Contact button is
    solid pink
16. Search in Network returns an agency when only an agent's email
    matches
18. A carrier can hold multiple contacts with different roles
    (underwriter, claims, accounting); each renders under the carrier's
    card with its role chip; the underwriter sorts first; exactly one
    can be primary
19. The Add Contact modal shows the client vocabulary in Accounts and
    the carrier vocabulary under a carrier card — vocabularies never
    bleed across entity types
17. One commit per Part exists on feature/contact-architecture with the
    Part named in the message

---

## PRODUCTION PROMOTION CHECKLIST (for Curtis/Brendan at publish time —
not for the agent to execute now)

1. All 17 acceptance tests passed in Development and verified by a human
2. feature/contact-architecture pushed; merged via PR so the diff was
   reviewed
3. Production database backup taken immediately before deploy (confirm
   point-in-time restore is available in the Production Database panel;
   if not, create manual backup tables there first)
4. Migrations run against Production once, verified by re-running the
   information_schema queries against prod
5. Prod smoke test: Network tab loads, existing registration data
   visible under its agency, agent detail page renders, no console
   errors
6. Backup tables retained until one full business cycle confirms
   stability; only then schedule removal
