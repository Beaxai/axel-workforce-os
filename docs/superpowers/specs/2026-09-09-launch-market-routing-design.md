# Launch Market Routing Design

## Purpose

Implement the launch routing workflow from the authoritative Multi-Market Rating, Routing & Distribution specification using one shared `deal_markets` lifecycle that continues into the rated era.

Completing Part 2 is the formal proposal request. It immediately distributes the submission to eligible wholesale markets ranked `1`, `2`, and `3`. Markets ranked `E` remain available for later manual submission. Axel remains unranked and is available through a manual keep/cherry-pick action.

## Scope

This implementation includes:

- Launch eligibility resolution from the imported market-assignment configuration
- Per-deal assignment snapshots in `deal_markets`
- Immediate dispatch to eligible rank `1`, `2`, and `3` markets
- Later, independent sends to eligible `E` markets
- Manual “Keep with Axel” action for Admin, Underwriter, and CSA users
- One status lifecycle and isolated correspondence identity per engaged market
- Minimal deal-card controls needed to promote `E` markets and keep an account with Axel

This implementation does not include rated-era automatic Primary selection, automatic market selection for binding, or an assignment-grid editor.

## Confirmed Product Rules

- Final Part 2 submission is the proposal-request and distribution trigger. There is no additional approval or send step.
- Wholesale rankings are product-specific and currently apply to PEO.
- ASO is Axel-only at launch. No wholesale ASO distribution occurs unless a future assignment grid includes an ASO partner.
- Axel is one PEO/ASO market, is never vertically ranked, and is never auto-submitted as a wholesale market.
- Cannabis has no rank `1`, `2`, or `3` wholesale market. Vensure remains `E` and is sent only after an explicit manual action.
- If a vertical has fewer than three eligible preferred markets, the system sends to the eligible preferred markets that exist.
- An `E` market may be promoted at any time after initial distribution. Its send and thread are additional; they never reopen, replace, or resend the initial ranked batch.
- “Keep with Axel” is available to Admin, Underwriter, and CSA users and may coexist with wholesale engagements until a final market is selected.
- Launch market selection is manual per deal. The workbook’s reference-only `Is Primary?` value never chooses or routes a market.

## Shared `deal_markets` Lifecycle

The existing `deal_markets` table remains the single per-deal market model. Its rated-era-only assumptions are relaxed rather than replaced.

Each row represents one market’s relationship to one deal and stores:

- Deal and market identity
- Snapshot of the deal vertical and assignment product
- Snapshot rank: `1`, `2`, `3`, `E`, or null for Axel
- Engagement source: automatic preferred, manually promoted overflow, or Axel keep
- Availability versus active engagement
- Generated rate, nullable for unrated wholesale markets
- Market status: available, sent, quote received, declined, no response, or selected
- Send status and timestamps
- Selected/final-market state
- Existing rated-era fields needed for future computed ranking

Database constraints enforce one row per deal and market, valid launch ranks/statuses, and at most one selected market per deal. They do not treat rank `1` as Primary at launch and do not limit routing to numeric top-four generated-rate rows.

The launch fields are additive or nullable-compatible so future rated routing can compute rates and Primary selection without replacing the lifecycle.

## Eligibility Resolver

At final Part 2 submission, the resolver evaluates the immutable submitted application snapshot against current configuration:

1. Determine the submitted product and canonical vertical.
2. Load matching `market_vertical_rank` assignments.
3. Join each assignment to its market metadata.
4. Require the market to be active and appointed.
5. Require a submission email for wholesale dispatch.
6. Require the market to write the applicant’s state:
   - `ALL_STATES` accepts every state.
   - `EXPLICIT` requires the state in the imported list.
   - `RATE_TABLE` derives state support from applicable loaded rates.
7. Apply existing class-code, industry, payroll, headcount, effective-date, and appetite checks where configured.
8. Preserve only product-compatible assignments.

Eligibility is resolved once for the proposal request and snapshotted into the deal. Later changes to the assignment grid do not silently rewrite an existing deal’s market lineup.

For PEO:

- Eligible ranks `1`, `2`, and `3` are created as active automatic engagements.
- Eligible `E` markets are created as available, unsent engagements.
- Axel is exposed separately as an available internal keep option.

For ASO:

- No wholesale assignments are created unless the grid explicitly contains ASO assignments.
- Axel is exposed as the available internal keep option.

## Proposal-Request Transaction

The final Part 2 submission transaction:

1. Validates and persists the canonical submitted application.
2. Creates the deal, quote, documents, and existing audit records.
3. Resolves eligible launch markets.
4. Snapshots preferred, overflow, and Axel availability into `deal_markets`.
5. Commits all submission and routing state together.
6. Enqueues dispatch for active preferred markets only after the transaction and required documents are complete.

If no preferred market is eligible, the submission still completes. Available `E` markets and Axel remain usable according to their eligibility. Cannabis therefore completes without an automatic wholesale send.

Configuration or eligibility failures are explicit and recorded. They do not silently fall back to the old generated-rate ranking algorithm.

## Dispatch

Initial dispatch creates one independently tracked send item for each active rank `1`, `2`, or `3` engagement, ordered by vertical rank. A provider-accepted send updates only that market’s engagement.

Manual `E` promotion:

1. Checks that the caller is authorized.
2. Locks the deal-market row.
3. Verifies it is still available and has not already been sent.
4. Marks it active and creates a new dispatch item.
5. Sends through its own independent batch/send record.

The new send does not modify initial ranked dispatch records. Repeated promotion requests are idempotent and cannot send the same market twice.

“Keep with Axel” activates the Axel engagement and creates its internal market thread. It does not send a wholesale email and does not automatically mark Axel as the final selected market.

## Market Status and Selection

An engaged market follows this lifecycle:

`available → sent → quote_received → declined | no_response | selected`

Axel may move from available to an active internal engagement without a sent-email requirement.

Authorized internal users manually select the final market. Selection marks one engagement selected and de-emphasizes, but does not delete, other engagements. Historical sends, quotes, and correspondence remain available for fallback and audit.

Automatic rated-era Primary selection is deferred.

## Correspondence Isolation

Every wholesale send carries the `deal_market_id` through outbound email and dispatch records. Inbound replies resolve back to that same market engagement using the existing listener-address, subject-token, and message-header routing strategy.

Deal-card market tabs query correspondence by `deal_market_id`, not only by deal ID. A message linked to one market can never appear in another market’s thread. General deal correspondence remains separate from market-specific correspondence.

## API and Permissions

Existing authenticated deal access rules remain in force.

New or extended actions include:

- Read active and available markets for a deal
- Submit an available `E` market
- Keep the account with Axel
- Update market status
- Select the final market
- Read market-specific thread activity

Admin, Underwriter, and CSA users may keep an account with Axel. Manual overflow submission, market-status updates, and final selection use the existing internal market-management role policy unless a stricter existing policy applies.

All mutation endpoints are transactional, validate the current row state, and return conflicts for duplicate or invalid transitions.

## Minimal Deal-Card UI

The deal card shows:

- Active market tabs for auto-sent preferred markets, promoted `E` markets, and Axel after “Keep with Axel”
- An available-markets section containing eligible unsent `E` markets with “Submit to [market]”
- “Keep with Axel” for authorized users when Axel is still available
- Per-market status and selection controls
- Correspondence isolated to the selected market tab

Cannabis initially shows Vensure in the available list and no auto-sent wholesale tab. ASO initially shows only the Axel keep option.

## Error Handling

- Missing market email excludes a wholesale market and records the reason.
- Inactive, unappointed, state-ineligible, product-incompatible, or appetite-ineligible markets are excluded with machine-readable reasons.
- Dispatch failures remain isolated per market and use existing retry classification.
- A failed market does not roll back successful sends to other markets.
- Duplicate `E` promotion, Axel keep, or final-selection requests return the existing state without repeating side effects when safe; incompatible transitions return a conflict.
- Inbound messages that cannot resolve a market remain quarantined or deal-level according to the existing email-ingestion policy and never guess a market thread.

## Verification

Automated tests cover:

- Final Part 2 submission triggers launch resolution and dispatch
- Construction creates active Cornerstone `1`, Decision HR `2`, and Peoplease `3`
- Construction stores the four confirmed `E` markets as available
- Cannabis sends no wholesale market automatically and stores Vensure as available `E`
- ASO creates no wholesale sends and exposes Axel only
- Axel is never assigned a rank or wholesale dispatch item
- State, product, active, appointed, email, and appetite filters
- Fewer than three preferred markets
- Snapshot stability after configuration changes
- Later `E` promotion creates one independent send and is idempotent
- Axel keep authorization for Admin, Underwriter, and CSA
- Manual final-market selection
- Per-market inbound and outbound correspondence isolation
- Existing rated-routing tests remain passing or are explicitly migrated to the shared lifecycle semantics

The full project typecheck, focused API tests, workflow restart, and deal-card preview must pass before delivery.

## Explicitly Deferred

- Rated-era automatic price ranking and Primary selection
- Automatically changing existing deals when the assignment grid changes
- Wholesale ASO routing without ASO assignment data
- Assignment-grid administration UI
- Additional workflow gates between Part 2 and distribution