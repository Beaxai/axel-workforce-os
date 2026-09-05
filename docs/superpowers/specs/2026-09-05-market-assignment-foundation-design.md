# Market Assignment Foundation Design

## Purpose

Implement only the data foundation described by Sections 3 and 4 of the supplied Multi-Market Rating, Routing & Distribution specification. The Market Assignment Grid becomes validated database configuration rather than hardcoded routing logic.

This phase does not change quote indications, proposal submission, market dispatch, inbound email handling, or deal-card UI.

## Source of Truth

- Business roles come from Section 3, “Launch markets.”
- Configuration shape comes from Section 4, “Assignment data.”
- Initial values come from the supplied Market Assignment Grid workbook.
- When a workbook cell and a later routing acceptance test appear inconsistent, this foundation preserves the workbook. Behavioral reconciliation belongs to the routing phase.

## Launch Market Roles

- Benchmark/BIC is the rated WC market. Its state eligibility remains derived from loaded rate data rather than a separately imported state list.
- Axel is the rated PEO/ASO provider and remains a selective internal option, not an auto-submitted wholesale market.
- Wholesale PEOs are unrated at launch. Their curated vertical ranks determine whether they are preferred (`1`, `2`, or `3`), eligible on demand (`E`), or do not write a vertical (no row).

## Schema

### Existing `markets`

Extend the existing table additively with assignment-grid metadata:

- Stable import key
- Rated status
- State-writing mode and, where applicable, explicit states
- Submission email
- Phone
- Underwriter
- Other contacts

Existing `is_active` and `is_appointed` fields continue to represent operational availability. Existing `market_type` and `product_lane` fields remain intact for compatibility with current routing code. The importer maps the specification's `wc_carrier` role to the existing `WC_CARRIER` value and `peo_aso_provider` to `PEO_PROGRAM`.

Benchmark uses a rate-table state mode, Axel uses an all-states mode, and wholesale markets use explicit state lists or an all-states mode according to the workbook. Contact fields may be null when the workbook leaves them blank.

### New `market_vertical_rank`

Add one row for each market × vertical × product assignment represented by a nonblank workbook rank:

- `id`
- `market_id`
- `vertical`
- `rank`
- `product`
- Created and updated timestamps

Allowed ranks are `1`, `2`, `3`, and `E`. Allowed products are `PEO`, `ASO`, `WC`, and `PEO+WC`, matching the specification. A blank workbook cell produces no assignment row.

The table enforces:

- Unique market × vertical × product assignments
- Rank membership in `1`, `2`, `3`, or `E`
- Product membership in the specified product values
- Nonempty normalized vertical names
- At most one market at each preferred rank (`1`, `2`, or `3`) for a vertical and product

Multiple `E` markets are permitted for the same vertical and product.

## Importer

Create a dedicated command for importing the supplied assignment grid.

The workbook is normalized into a checked-in typed fixture so runtime operation does not depend on the uploaded attachment or introduce a spreadsheet parsing package. The fixture remains a direct transcription of the supplied workbook and is validated before any database write.

The importer runs in one database transaction:

1. Validate known columns, market identities, products, states, verticals, and rank cells.
2. Reject duplicate or conflicting preferred ranks.
3. Upsert markets by stable import key.
4. Upsert nonblank vertical assignments by market, vertical, and product.
5. Remove obsolete imported assignments for the managed markets so blanked workbook cells are faithfully represented.
6. Report inserted, updated, unchanged, and removed totals.

Re-running the same import is a no-op at the data level and cannot create duplicates. Validation failures abort the transaction without partial writes.

## Data Flow and App Impact

The importer writes configuration only:

`Market Assignment Grid → validated fixture → markets + market_vertical_rank`

No existing application path reads `market_vertical_rank` during this phase. Therefore:

- Current indications are unchanged.
- Current proposal submission is unchanged.
- Current market routing and dispatch are unchanged.
- No emails are sent.
- No market tabs or controls are added.
- Existing `deal_markets`, appetite rules, and rate tables are not repurposed.

A later routing phase will query this configuration and snapshot applicable assignments into per-deal market state.

## Verification

Automated validation covers:

- Accepted and rejected rank values
- Accepted and rejected products
- Duplicate market × vertical × product detection
- Duplicate preferred-rank detection
- Multiple `E` assignments for one vertical
- Blank-cell removal semantics
- Idempotent repeated imports

Database verification confirms Construction PEO assignments are:

- Cornerstone PEO — `1`
- Decision HR — `2`
- Peoplease — `3`
- Employers Personnel — `E`
- SouthEast Personnel — `E`
- Vensure — `E`
- WBS — `E`

The project typecheck must remain clean after the schema and importer are added.

## Explicitly Deferred

- Reading assignments during proposal requests
- Automatic submission to ranks `1`, `2`, and `3`
- Manual promotion of `E` markets
- Axel cherry-pick controls
- Proposal email distribution
- Market-specific deal-card tabs and correspondence
- Changes to `deal_markets`
- Rated-era price ranking