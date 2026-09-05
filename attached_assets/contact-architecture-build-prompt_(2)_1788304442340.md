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

## ARCHITECTURE DECISION (from Part 0 findings — settled, do not revisit)

partners remains the canonical Network entity for all four partner types.
Do NOT create a standalone agents table, do NOT migrate Agent-type
partner rows to a new table, do NOT change the /partners API contract or
the /network/agents/:partnerId route. Structure is added ALONGSIDE
partners:

- agencies (new) — the agency org record; Agent-type partners link to it
- agent_profiles (new, 1:1 with Agent-type partners) — structured
  person fields
- contacts (extended) — directory people for client/carrier/PEO/vendor/
  agency; entity_id for carrier, peo_partner, and vendor contacts is the
  partners.id of that org's partner row

OUT OF SCOPE: carrier identity is currently spread across partners,
markets, and organizations (policies.carrier_org_id → organizations).
Do not attempt to unify these in this build. Do not modify markets,
organizations, or policies. market_underwriters stays as-is for routing.

## PART 1 — AGENCIES TABLE + EXTRACTION

Agency data currently lives as flat text in two places:
agent_registrations (agency_name, agency_dba, agency_address,
agency_phone, agency_website, agency_npn, states_licensed,
lines_of_authority) and partners.agency_name on Agent-type rows.
Agencies become first-class records.

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

2. Alter agent_registrations: add agency_id (uuid, FK agencies.id,
   nullable). Alter partners: add agency_id (uuid, FK agencies.id,
   nullable — only meaningful on Agent-type rows).

3. Backfill, deduped by lower(trim(name)) across BOTH sources so the
   same agency named in a registration and on a partner row yields ONE
   agencies record:
   a. Each agent_registrations row: create-or-match an agencies row
      from its agency_* columns, set agency_id. (Current row: Test
      Agency, status pending — the agency record it creates is
      'pending', matching its registration status.)
   b. Each Agent-type partners row with non-empty agency_name:
      create-or-match an agencies row (legal_name = agency_name, status
      'active' since the partner is live), set partners.agency_id.
   All source text columns stay in place (rule 2); agencies is now the
   source of truth.

4. Going forward: when a registration is approved, the approval handler
   creates-or-matches the agencies record and sets agency_id on both the
   registration and the partner row it creates (Part 2 item 3). Match on
   lower(trim(agency_name)); near-matches (case/whitespace/punctuation
   differences only) attach rather than duplicate.

## PART 2 — AGENT PROFILES (1:1 WITH AGENT-TYPE PARTNERS)

partners rows for Agents carry only a single name text field and loose
contact fields. Structured person data goes in a profile table keyed to
the partner, so all existing wiring (Network API, detail routes, FKs)
keeps working untouched.

1. New table: agent_profiles
   - partner_id (uuid pk, FK partners.id) — one profile per Agent
     partner
   - registration_id (uuid, FK agent_registrations.id, nullable — the
     registration that spawned this agent, when one exists)
   - user_id (uuid, FK users.id, nullable — login account when issued)
   - first_name (text, not null), last_name (text)
   - title (text)
   - phone_direct (text), phone_mobile (text)
   - individual_npn (text), license_numbers (jsonb)
   - created_at, updated_at
   Email and status stay on partners (contact_email, status) — do not
   duplicate them.

2. Backfill for existing Agent-type partners rows: split partners.name
   on the first space into first_name/last_name. Names that do not
   split cleanly (single token like "Brendy", 3+ tokens, empty) get
   first_name = full value, last_name = NULL, and a row in a new
   name_review table (partner_id, original_value, created_at). Do not
   guess. Copy npn → individual_npn and license_states →
   license_numbers-adjacent data as appropriate; report the mapping.

3. Approval handler: approving a registration (a) creates-or-matches
   the agency (Part 1.4), (b) creates the partners row (partner_type
   'Agent', name composed from registration first/last, contact_email
   from registration email, agency_id set), (c) creates the
   agent_profiles row from the registration's person fields, and
   (d) sets agent_registrations.partner_id — the FK slot that already
   exists for exactly this purpose.

4. Also add a real FK from agent_registrations.user_id to users.id
   (Part 0 found the column exists with no enforced constraint).
   Validate existing values first (the one row has it unset, so this is
   safe); report if any value would violate the constraint instead of
   forcing it.

5. Network > Agents tab API keeps reading partners WHERE partner_type =
   'Agent', now joined to agent_profiles and agencies for display
   fields. Response shape may gain fields but must not remove or rename
   existing ones.

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
   - agency: principal, producer, account_executive, account_manager,
     accounting_manager, csr, marketing, other. Appointment is
     AGENCY-level: when an agency is appointed, its producers are
     appointed under it. The agents-vs-contacts boundary is platform
     participation, not appointment: producers who refer deals, need
     logins, and carry production attribution are agent entities
     (partners/agent_profiles); agency staff who are reached but do
     not act on the platform — including producers not set up as
     platform users — are contacts. The same person is never both.
   Store the raw value; render a human label in the UI. The vocabulary
   lives in one shared constant so adding a role later is a one-line
   change.
   DECISION (Part 10): contacts capture role only — the title field is
   not written or rendered on contacts. The contacts.title column
   remains in the schema untouched. Title continues to exist on agent
   profiles and staff profiles, where it renders on detail pages and
   the directory.
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

## PART 5 — DISPLAY NAME HELPER

1. Add a shared displayName helper used everywhere an agent renders
   (Network cards, detail page, deal cards, activity log, @mentions):
   agent_profiles first_name + " " + last_name when a profile exists
   (last_name null → first_name alone); fall back to partners.name when
   no profile exists. Trim and collapse whitespace.
2. Registrations render registration first_name + last_name (already
   split columns).
3. Rows in name_review render their fallback normally — the review
   queue is an admin cleanup list, not a display blocker.

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

Stat row (2 metric cards):
- Deals referred (count)
- WC premium (sum, $ with thousands separators)
(Part 11 decision: registration status and licensing are AGENCY-level
facts and render on the agency card, not the agent detail page.)

Info cards:
- Contact: email (mailto, pink), direct phone, mobile with muted type
  labels. Only populated fields. Spans full width — no Licensing card;
  licensing and E&O render on the agency card per Part 11.

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
- No compliance gate at deal-agent association (Part 11 decision):
  registration approval IS the compliance checkpoint — approved
  agencies and their agents are cleared to submit business. No NPN,
  license, or E&O checks fire at attachment at any stage.
- What remains at the association point, via the shared validator:
  (a) authorization — only ADMIN/CSA/UNDERWRITER may set or change the
  producing agent, on every path (dedicated endpoint, generic PATCH,
  deal create); (b) status — agent and agency must both be Active;
  Suspended/Terminated block new attachments. Suspension is the
  administrative lever for compliance problems (e.g. lapsed E&O),
  informed by the agency card's registration/E&O chips.
- The gate does not affect login or existing associations; it applies
  only to new attachments.

## PART 8 — STAFF PROFILES + INTERNAL DIRECTORY

Axel staff are users, not contacts. Do not put staff in the contacts
table.

1. A user_profiles table already exists (Part 0 table list). Inspect
   its columns and report them; ADD any of title, phone_direct,
   phone_mobile, department that are missing rather than creating a new
   table. Do not rename or repurpose existing user_profiles columns.
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
3.  Backfill: the Test Agency registration produced a pending agencies
    row; every Agent-type partners row has an agent_profiles row and
    (where agency_name was present) an agency_id; the same agency name
    across sources produced ONE agencies record; nothing dropped
4.  Approving a registration creates-or-matches the agency, creates the
    partners row and agent_profiles row, and sets
    agent_registrations.partner_id; near-duplicate agency names attach,
    not duplicate
4b. Single-token partner names (e.g. "Brendy") landed in name_review
    with last_name NULL — no guessed surnames anywhere
4c. GET /partners?type=Agent returns at least all fields it returned
    before this build (no removed/renamed fields); existing detail
    route /network/agents/:partnerId still resolves
5.  Creating a second agent under an existing agency groups both under
    one agency card in Network
6.  contacts extended in place — table was not recreated; new columns
    present; org_id/deal_id intact
7.  Setting a new primary contact unsets the previous one; the partial
    unique index rejects a forced duplicate
8.  Invalid email rejected at API on contact and agent create
9.  Agent detail page renders no dashes and no placeholder cards;
    removed cards are gone
10. displayName renders profile first+last where a profile exists and
    falls back to partners.name where it does not; no blank names, no
    "undefined", no dashes anywhere an agent renders
11. Suspend requires confirm dialog; on confirm status changes and
    portal access is revoked
12. Registration chip reflects agent_registrations status transitions
13. (Superseded by Part 11) No compliance gate fires at attachment: an
    agent with no NPN/license/E&O attaches successfully at U/W Review+.
    Suspended agent or suspended agency blocks NEW attachment; existing
    associations survive later suspension; AGENT role cannot set
    producingAgentId via any path
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
