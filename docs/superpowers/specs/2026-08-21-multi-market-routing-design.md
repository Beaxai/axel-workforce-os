# Multi-Market Rating, Ranking, Routing, and Communication

**Date:** August 21, 2026  
**Status:** Approved design  
**Product:** Axel Workforce OS

## Goal

When a broker, agent, or client completes a marketplace submission, Axel Workforce OS should:

1. Find active, appointed WC carriers or PEO programs that match the selected product lane, vertical, state, class code/industry, payroll, expected premium, and headcount.
2. Generate a market-specific rate for every eligible, approved market.
3. Rank equivalent markets by generated rate, lowest first.
4. Show only the Primary market's pricing to the submitting party.
5. Automatically send the complete submission to the Primary market and up to three next-closest markets in rank order.
6. Keep each market's outbound and inbound correspondence in a separate deal-card communication tab.
7. Preserve one authoritative ranked market set for indication, proposal, routing, communication, audit, and administration.

There is no separate carrier-send button. The automatic dispatch begins only after the final submission and its required package are durably complete.

## Approved Product Rules

- WC carriers compete only with WC carriers.
- PEO programs compete only with PEO programs.
- ASO is outside the first release of automatic multi-market routing.
- All five core eligibility filters are required:
  - selected vertical/product;
  - applicant state;
  - class code or industry;
  - active/appointed market status;
  - configured submission underwriter and routing email.
- Payroll, generated-premium range, and headcount are also required appetite inputs when configured.
- Each appetite rule names one primary routing underwriter.
- Rank 1 is the Primary market.
- Only the Primary market's rate is shown on the indication and final proposal.
- Ranks 1 through 4 receive the complete submission; when fewer than four markets qualify, all qualifying markets receive it.
- Dispatch is ordered, not a simultaneous multi-recipient blast.
- The first provider-accepted market send permanently locks the ranked set.
- A failed send is retried, later ranks continue, and ADMIN/CSA are alerted when retries are exhausted.
- Only ADMIN and CSA can view the complete ranking and all generated rates.
- Existing deals and persisted listener-address test data are not backfilled and do not trigger automatic routing.

## Current-State Constraints

The current application has several useful foundations:

- a WC rating engine and persisted quotes;
- generic partner records for carriers and PEOs;
- deal-scoped outbound email through Resend;
- one listener address and subject token per deal;
- three-layer inbound routing by recipient, subject token, and Message-ID;
- inbound webhook idempotency;
- deal-card activity and communication surfaces.

The following capabilities do not exist yet:

- distinct generated rates for each carrier or PEO program;
- structured market appetite linked to a market and underwriter;
- a first-class market-to-underwriter relationship;
- ranked deal-to-market records;
- durable ordered dispatch with retries;
- market-specific listener addresses and correspondence;
- server-enforced secondary-market visibility rules.

The current P5 inbound resolver returns only a deal ID. Its deal-level recipient match runs before Message-ID matching, so normal replies cannot identify the originating market. Multi-market communication therefore requires an explicit deal-market thread identity.

## Chosen Architecture

Use a first-class market domain rather than storing appetite and rating rules in generic partner JSON metadata.

This provides:

- structured validation and database constraints;
- effective-dated appetite and rate configuration;
- deterministic ranking;
- explicit underwriter assignment;
- one source of truth for every consuming screen;
- safe audit history;
- a normalized boundary for future rate-sheet imports and carrier APIs.

### Alternatives Rejected

#### Extend generic partner metadata

This would be faster initially, but appetite queries, overlap validation, effective dating, multiple underwriters, and future imports would be fragile and weakly typed.

#### Route first and rank returned underwriter quotes

This would use actual underwriter responses, but it cannot provide a Primary indication before submission and reverses the required workflow.

## Domain Model

### `markets`

One row represents one standalone WC carrier or one PEO program.

Required concepts:

- ID and display name;
- market type: `WC_CARRIER` or `PEO_PROGRAM`;
- optional link to an existing partner or organization;
- active status;
- appointment/approval status;
- effective dates;
- administrative notes;
- created and updated timestamps.

A market cannot participate in automatic routing unless it is active and appointed/approved for the effective date.

### `market_underwriters`

One row represents an underwriter or routing contact belonging to a market.

Required concepts:

- market ID;
- contact name and routing email;
- optional linked application user ID;
- active status and effective dates;
- created and updated timestamps.

An email-only underwriter contact is valid; an Axel account is not required merely to receive a submission. If an underwriter has an account, the link enables role-scoped access to the market's own deal thread.

### `market_appetite_rules`

Appetite is structured and effective-dated.

Required concepts:

- market ID;
- product lane and vertical;
- eligible states;
- eligible class codes and/or industries;
- payroll minimum and maximum;
- generated-premium minimum and maximum;
- headcount minimum and maximum;
- appetite strength: `MATCHED`, `CONDITIONAL`, or `REFERRAL`;
- machine-checkable conditions for conditional rules;
- primary routing underwriter ID;
- active status, effective dates, and administrative notes;
- created and updated timestamps.

Rules must reference an active underwriter belonging to the same market.

#### Overlap behavior

The most specific active rule wins. Specificity is determined by the number of constrained dimensions, with exact class-code and state matches taking precedence over broad vertical-only rules.

If two active rules are equally specific for the same inputs but disagree on outcome, rate source, or routing underwriter, configuration validation rejects the conflict. Runtime matching must never choose arbitrarily.

#### Appetite outcomes

- `MATCHED`: eligible for automatic rating and ranking.
- `CONDITIONAL`: eligible only when every configured machine-checkable condition is satisfied; satisfied conditional results rank after otherwise tied matched results.
- `REFERRAL`: visible to ADMIN/CSA as an internal review result but never automatically ranked or emailed.

### `market_rate_sets`

A rate set is a versioned, effective-dated source of market pricing rules.

Required concepts:

- market ID and product lane;
- source type: `MANUAL`, with future support for `IMPORT` and `API`;
- version and status;
- effective and expiration dates;
- source reference and audit metadata;
- created and updated timestamps.

Only one unambiguous active rate set may apply to a market, product lane, and effective date.

### Typed market rate rules

Manual rate rules are stored as product-specific, validated records rather than generic partner metadata.

- WC rules include market-specific state/class-code rates, modifiers, minimum premium, and other supported WC rating inputs.
- PEO rules include the program-specific WC and workforce-service pricing components required to calculate a comparable annual PEO result.

The manual implementation, future imports, and future APIs all implement the same normalized market-rate provider interface. Ranking consumes the normalized result and does not depend on its source.

### Normalized market-rate result

Each successful calculation returns:

- market ID;
- product lane;
- comparable generated annual amount used for ranking;
- user-display pricing components for that lane;
- calculation breakdown;
- rate-set/source identity and version;
- calculation timestamp;
- warnings or referral indicators.

WC and PEO results are never mixed in one ranking.

### `deal_markets`

This is the authoritative one-to-many source for market selection on a deal. One row represents one eligible, approved, successfully rated market for that deal.

Required fields:

- ID;
- deal ID;
- market ID and market type;
- matched appetite-rule ID;
- assigned underwriter ID;
- rate-set/source identity and version;
- generated rate;
- immutable rate-breakdown snapshot;
- rank;
- `is_primary`;
- `is_routed`;
- appetite status;
- ranking state;
- rolled-up send status, attempt count, last error, and `sent_at`;
- `locked_at`;
- created and updated timestamps.

Required constraints:

- unique deal ID plus market ID;
- unique rank within a deal;
- rank is a positive integer;
- generated rate is non-negative;
- only rank 1 may be Primary;
- only ranks 1 through 4 may be routed;
- exactly one Primary exists when at least one eligible result exists;
- the Primary is routed.

The boolean fields are convenience fields for common queries; their values must remain consistent with rank through transactional write logic and database constraints where practical.

### Dispatch records

Durable dispatch requires more history than rolled-up fields on `deal_markets`.

Use:

- one dispatch batch per finalized submission routing run;
- one ordered dispatch item per routed `deal_market`;
- one or more attempt records per item.

Attempt records include:

- attempt number;
- provider idempotency key;
- provider message ID when available;
- started and completed timestamps;
- outcome;
- error category and error detail.

Only one live batch may exist for a deal. A successful item is terminal and cannot be resent by worker recovery.

### Market-specific email addresses

Keep the existing deal listener table for general correspondence. Add a separate market-thread address record with:

- deal-market ID;
- deal ID;
- market ID;
- unique listener address under `submissions.axelins.com`;
- unique opaque subject token;
- created timestamp.

The token and address must not expose rank or competing-market information.

### Email and activity relationships

Add a nullable `deal_market_id` relationship to:

- outbound deal emails;
- inbound deal emails;
- market-scoped activity records.

The exact deal-market relationship is safer than storing only a market ID because it preserves the deal-specific rank, underwriter assignment, routing state, and locked context. Market ID is resolved through the relationship.

General deal correspondence keeps a null `deal_market_id`.

## Rating and Ranking Flow

### Draft deal creation

The existing indication can be calculated before a final deal is created. The new flow must create or resume a draft deal once the minimum rating inputs are present and before market rating begins.

This avoids a second temporary ranking store and lets the indication, proposal, routing worker, and deal card read the same `deal_markets` rows.

Draft creation and resume must be idempotent for a quote-flow draft.

### Eligibility and rating algorithm

For a rating request:

1. Normalize product lane, vertical, effective date, locations/states, class codes/industry, payroll, headcount, and existing rating modifiers.
2. Select only markets in the requested WC or PEO product lane.
3. Exclude markets that are inactive, unappointed, ineffective, or missing an active routing underwriter/email.
4. Match vertical/product, state, class/industry, payroll, and headcount appetite.
5. Exclude referrals and conditional rules whose conditions are not satisfied.
6. Generate a market-specific rate for each remaining candidate.
7. Apply the market's generated-premium appetite range to its calculated result.
8. Record internal diagnostics for excluded and failed candidates.
9. Rank the remaining eligible market results.
10. Transactionally replace the deal's provisional `deal_markets` rows.

A failure to rate one market does not prevent valid markets from ranking. If no valid result remains, the indication is an explicit internal-review state. The system must not silently show zero, the legacy benchmark, or another fallback as a market rate.

### Ranking order

Sort by:

1. generated rate ascending;
2. appetite strength, with `MATCHED` before satisfied `CONDITIONAL`;
3. stable market ID as the final deterministic tie breaker.

Set:

- rank 1 as Primary;
- ranks 1 through 4 as routed;
- every eligible row as routed when fewer than four exist.

### Visibility

Indication and proposal APIs for brokers, agents, clients, and market users return only authorized Primary pricing.

ADMIN/CSA may retrieve the full eligible ranking, generated rates, matched rules, underwriters, and routing status.

Secondary data must be removed by server authorization and response shaping. Hiding it only in the browser is not acceptable.

## Ranking Lifecycle and Locking

The state flow is:

```text
provisional -> queued -> dispatching -> locked
                                  \-> failed (only when nothing was accepted)
```

### Provisional

Before final submission, a re-rate transactionally regenerates and re-ranks the deal's provisional rows.

### Queued

Final submission freezes the current set operationally and creates an idempotent dispatch batch. Automatic re-rating is blocked while the batch is queued or dispatching so recipients and message contents cannot change underneath the worker.

### Locked

The first provider-accepted send to any routed market permanently locks:

- market membership;
- generated rates and breakdown snapshots;
- ranks;
- Primary;
- routed set;
- assigned underwriters.

This includes the edge case where the Primary send fails but a secondary is accepted.

Later re-rates may be stored as internal comparisons, but they cannot replace, reorder, reroute, or change user-visible Primary pricing on the locked deal.

### Failed before delivery

If every market attempt fails and no provider has accepted any message:

- the set is not permanently locked;
- ADMIN/CSA may repair the same configuration and restart the batch;
- ADMIN/CSA may explicitly cancel the undelivered batch before permitting a new rating;
- no automatic reranking occurs merely because a send failed.

All repair and cancellation actions are audited.

## Final Submission and Automatic Dispatch

### Ready-to-send definition

A submission is ready only when:

- required answers pass validation;
- the draft deal and Primary quote are durably stored;
- required application documents are generated;
- required uploaded documents are available;
- a valid provisional market ranking exists;
- the complete outbound submission package can be assembled.

The system must not email an incomplete package. Package assembly or attachment-size failures move the deal to internal review and create an ADMIN/CSA alert.

### Submission transaction

Final submission performs one database transaction that:

- finalizes the draft deal and quote;
- marks the submission complete;
- freezes the current ranked rows into `queued`;
- creates one dispatch batch and ordered items for ranks 1 through 4;
- records the automatic-routing activity event.

Provider email calls do not run inside this transaction.

### Ordered worker

A durable worker processes one deal batch at a time:

1. Primary;
2. rank 2;
3. rank 3;
4. rank 4.

Each market receives:

- a separate personalized message;
- the complete submission package;
- its own Reply-To address;
- its own opaque subject token;
- no competing-market identity, rank, or rate information.

The worker waits for the current provider attempt to resolve before moving to the next rank. It does not wait for an underwriter reply.

### Retry and duplicate safety

- Transient failures use bounded exponential backoff.
- Permanent failures are not retried indefinitely.
- An exhausted failure does not block later-ranked markets.
- ADMIN/CSA receive an alert and activity event for exhausted failures.
- Successful items are never sent again.
- Worker restart resumes at the first unfinished item.
- A stable provider idempotency key is used where supported.
- An attempt with an uncertain provider outcome is marked `DELIVERY_UNKNOWN` and escalated rather than blindly retried.

## P5 Inbound Email Extension

The existing Resend webhook and receiving subdomain remain in place.

### Market routing order

Resolve inbound market correspondence by:

1. exact market-specific listener recipient;
2. opaque market-thread token in the subject;
3. `In-Reply-To` or `References` match to a market-scoped outbound Message-ID;
4. existing deal-level recipient and subject-token fallback;
5. unmatched inbound queue.

The resolver returns:

- deal ID;
- deal-market ID when identified;
- route method.

### Storage and activity

The inbound row stores the resolved `deal_market_id`. Its activity event uses the same relationship. Webhook replay protection remains enforced by the unique inbound provider Message-ID.

Messages from an unexpected sender are retained in the identified market thread and visibly flagged for internal review. They are not silently discarded.

### Compatibility

Existing deal-level listener rows continue to work for general correspondence. Existing persisted test rows on old domains are not migrated or deleted.

## Deal-Card Experience

### Market communication tabs

At the top of the Overview communication area:

- render one tab per routed deal-market;
- order tabs by rank;
- show Primary first with a Primary badge to ADMIN/CSA;
- show per-market send state;
- bind every compose/reply action to the selected `deal_market_id`.

Inside a market tab, show only that market's:

- original automatic submission;
- attachments;
- inbound replies;
- outbound follow-ups;
- delivery and failure state;
- timestamps and participating underwriter;
- market-scoped activity.

General deal activity remains outside the market filter.

### Role behavior

#### ADMIN and CSA

- See all routed market tabs.
- See the complete eligible ranking and all generated rates.
- See appetite result, matched rule, assigned underwriter, lock state, retries, and failures.
- May perform audited recovery actions on a fully undelivered batch.

#### Broker, agent, and client

- See only Primary pricing on indication and proposal.
- See only permitted Primary communication information.
- Never receive secondary market names or rates.

#### Carrier and PEO market users

- See only their own market's thread and permitted deal content.
- Never see competitors, ranks, Primary designation, or competing rates.

### Internal routing summary

ADMIN/CSA receive a compact Overview summary sourced from `deal_markets`:

- market and type;
- generated rate and rank;
- Primary and routed indicators;
- appetite result and matched rule;
- assigned underwriter;
- queued, sending, retrying, sent, failed, or unknown state;
- ranking lock timestamp.

The browser does not calculate rank or Primary status.

## Admin Configuration Experience

Add a first-class Markets area under Network.

ADMIN can:

1. Create a WC carrier or PEO program.
2. Link it to an existing partner/organization when applicable.
3. Add and deactivate market underwriters.
4. Create effective-dated appetite rules and select each rule's primary routing underwriter.
5. Create and version manual rate sets.
6. Preview a market calculation.
7. Run a no-send simulation showing inclusion, exclusion reasons, rates, tie breaking, and expected top four.
8. Activate a validated market.

Activation is blocked when the market lacks:

- an active appointment/approval;
- an active routing underwriter and email;
- applicable appetite;
- a usable effective rate set;
- valid effective dates.

The editor must identify overlapping/conflicting rules before activation.

## Authorization and Data Isolation

Every market-ranking and market-thread endpoint enforces role and deal access on the server.

Requirements:

- external clients cannot request an expanded ADMIN/CSA response through query parameters;
- a market user must be related to the requested market;
- a market user cannot infer another market through IDs, counts, ranks, errors, or timing metadata;
- email bodies and inbound HTML are sanitized before rendering;
- configuration mutations require ADMIN authorization;
- simulation does not send email or modify a locked ranking.

## Failure Handling

### No eligible markets

- Complete the submission into internal review.
- Send no market email.
- Show the submitting party a neutral review message.
- Show ADMIN/CSA detailed exclusion reasons.

### Partial rating failure

- Exclude only the failed market.
- Rank valid markets.
- Record an internal diagnostic with no sensitive provider detail exposed externally.

### No valid generated rate

- Produce no Primary.
- Do not display zero or legacy benchmark pricing.
- Move to internal review.

### Configuration changes

`deal_markets` stores the exact appetite and rate-source versions used. Later admin edits do not rewrite a provisional result until a new rating occurs and never rewrite a locked result.

### Dispatch failure

- Retry transient errors.
- Continue later ranks.
- Mark exhausted and unknown outcomes distinctly.
- Alert ADMIN/CSA.
- Never silently claim that all markets received the package.

### Unrouted inbound

Attempt the deal-level fallback. If no deal can be identified, retain the message in the unrouted queue.

## Operational Modes and Rollout

Use one audited server-side routing mode:

### Off

- Configuration is available.
- No automatic market ranking or dispatch occurs.

### Dry run

- Generate provisional `deal_markets`.
- Show ADMIN/CSA the expected ranking and routing.
- Send no market email.

### Live

- Generate rankings.
- Automatically create and process dispatch batches on final submission.

### Rollout sequence

1. Deploy schema, APIs, admin configuration, and UI with routing Off.
2. Configure real WC and PEO markets, underwriters, appetite, and manual rate sets.
3. Validate conflicts and run representative simulations.
4. Enable Dry run.
5. Validate ranking and Primary-only visibility on controlled deals.
6. Perform controlled email tests for each market-thread routing path.
7. Enable Live for new submissions.
8. Monitor rating exclusions, retries, delivery-unknown events, and unrouted inbound messages.

Existing deals do not automatically acquire rankings or dispatch batches.

This rollout does not authorize removal of the old Resend domain configuration. That remains gated by the separate production email round-trip validation.

## API and Service Boundaries

Implementation should keep these responsibilities isolated:

### Market configuration service

- CRUD and validation for markets, underwriters, appetite, and rate sets.
- No deal ranking and no email delivery.

### Appetite matcher

- Accepts normalized submission inputs and effective date.
- Returns deterministic matched, conditional, referral, and excluded results with reasons.
- Does not send email.

### Market rate provider

- Accepts normalized inputs plus an applicable market rate source.
- Returns a normalized result.
- Manual, import, and API sources share the same interface.

### Deal-market ranker

- Persists provisional rows transactionally.
- Applies deterministic ranking and top-four routing.
- Enforces lock state.

### Submission package assembler

- Produces the immutable document manifest used for dispatch.
- Blocks routing when the complete required package is unavailable.

### Dispatch worker

- Processes one ordered batch.
- Owns retry, idempotency, attempt history, and roll-up state.
- Does not recalculate appetite or ranking.

### Inbound market router

- Resolves exact market thread identity.
- Preserves deal-level fallbacks.
- Stores idempotently.

### Role-filtered query layer

- Serves Primary-only marketplace and proposal responses.
- Serves full ADMIN/CSA routing views.
- Serves one-market-only carrier/PEO views.

## Testing Strategy

### Unit tests

- all required appetite filters;
- payroll, premium, and headcount boundaries;
- effective dates and inactive configuration;
- appointment and routing-contact gating;
- rule specificity and conflict detection;
- matched, satisfied conditional, unsatisfied conditional, and referral outcomes;
- WC/PEO product-lane isolation;
- normalized manual rating;
- premium-band filtering after rate calculation;
- ascending rate ranking;
- appetite-strength and stable-ID tie breakers;
- Primary and top-four invariants;
- fewer-than-four behavior;
- role-based response shaping.

### Database and service integration tests

- idempotent draft-deal creation;
- transactional provisional-row replacement;
- unique deal-market and rank constraints;
- re-rating before queueing;
- rejection of automatic re-rating while queued/dispatching;
- permanent immutability after first accepted delivery;
- rate-source snapshot preservation;
- atomic final submission and batch creation;
- ordered dispatch;
- retry and later-rank continuation;
- worker restart recovery;
- successful-send duplicate prevention;
- all-failed cancellation and rerating path;
- listener, subject-token, and Message-ID market resolution;
- deal-level fallback;
- webhook replay idempotency;
- unexpected-sender flagging.

### UI and end-to-end tests

- ADMIN market setup and activation validation;
- dry-run simulation;
- non-admin indication shows only Primary pricing;
- final proposal shows only Primary pricing;
- ADMIN/CSA full ranking view;
- market tabs ordered by rank;
- broker/agent/client Primary-only thread behavior;
- carrier/PEO own-thread isolation;
- automatic final submission trigger with no send button;
- four separate ordered provider sends;
- replies land once in the correct market tab;
- exhausted failure appears in routing summary and internal activity;
- no eligible market produces internal review rather than a fake rate.

## Acceptance Criteria

The feature is complete when:

1. ADMIN can configure and validate real WC and PEO markets, underwriters, appetite, and manual rate sets.
2. A rating creates one authoritative provisional `deal_markets` set for the draft deal.
3. Equivalent markets are ranked deterministically by generated rate.
4. Only the Primary rate appears to non-ADMIN/CSA users at indication and proposal.
5. Final submission automatically queues up to four separate market sends without a carrier-send button.
6. Sends occur Primary first and then in rank order.
7. Failure retries do not block later ranks or duplicate successful sends.
8. The first accepted market send permanently locks the ranking.
9. Each routed market has a distinct listener address, token, outbound record, and communication tab.
10. External replies route idempotently to the exact deal-market tab.
11. ADMIN/CSA see the full ranking and dispatch state; every other role is server-filtered to its permitted view.
12. Existing deals and old listener test data remain untouched.
13. Off, Dry run, and Live modes support a controlled production rollout.

## Non-Goals

- Automatic ASO market routing in the first release.
- Migrating or deleting existing listener-address test data.
- Backfilling historical deals with ranked markets.
- Removing the old Resend domain before the separate live round-trip validation.
- Building carrier API integrations in the first release.
- Automatically choosing a different market after any market has received the submission.