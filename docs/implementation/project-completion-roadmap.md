# Axel Workforce OS — Project Completion Roadmap

**Status:** Proposed execution plan; branches and sprints have not been created.  
**Goal:** Complete a reliable operating product, not a perfect redesign.  
**Basis:** June v2.1 scope, engineering instructions, current-source comparison, and the producer appointment directive.

## 1. What “complete” means

An authorized producer can become appointed, receive credentials, submit a valid business, obtain the correct indication, and send a complete application to eligible markets. Internal staff can receive market replies and quotes, approve a proposal, complete the correct signing/bind process, manage WC or PEO implementation, maintain client records, and track actual charges and commissions.

Every supported role must see only the records and actions it is permitted to see. Failures must be visible and recoverable. No screen may claim money was paid, documents signed, email delivered, or onboarding completed without the corresponding evidence.

### Launch standard

- Working UI and backend for the supported journey; neither alone counts.
- No known blocker involving access, data loss, incorrect price, duplicate payment, premature activation, or false completion.
- Existing architecture retained: Express, PostgreSQL/Drizzle, React/Vite and current providers.
- Current eight-stage pipeline retained unless the product owner explicitly changes it.
- All four original products accounted for: WC, PEO, ASO, ASO+Captive. Each has a documented, tested route and outcome; do not force non-insurance products through WC underwriting.
- Controlled manual work is acceptable when intentional, permissioned, auditable, and clearly labeled. Manual carrier policy upload and manual commission settlement recording can be valid initial operations.
- Production configuration and controlled delivery evidence are required; “the code supports it” is not enough.

### Scope references

- `docs/producer-registration-appointment-scope.md` is the detailed appointment scope.
- Uploaded June v2.1 scope and engineering instructions supply original acceptance requirements.
- Later approved business directives supersede older requirements. Milestone 0 records those decisions rather than silently choosing between conflicting documents.

## 2. Delivery approach

**Recommended: close complete business journeys in dependency order.**

Finishing every old phase in isolation risks repeating work already built. A single large cleanup branch makes regressions and review difficult. Instead, each milestone below produces a measurable outcome on its own branch, with smaller sprints and one acceptance gate.

Do not rebuild working components merely because their original phase label is old. Begin each sprint with a focused check of the existing implementation and close only the remaining gaps.

## 3. Branch and merge strategy

### Branches

- Proposed integration target: `awf-os-brendy-sprint-1`, subject to confirming its current remote and review process at M0.
- One independent branch per milestone, named in the roadmap below.
- Create each milestone branch from the integration target after its required predecessors have merged.
- Optional sprint branches: `<milestone-branch>/s1-<topic>`, merging back into the milestone branch.
- Milestone pull requests target the integration branch, **not `main`**.
- Never force-push, merge into, or publish changes to `main` as part of this plan.
- The local workspace currently uses a separate multi-market branch; do not assume its name identifies the correct remote integration base.
- This document proposes new milestone branches; confirm publishing permissions at M0 before creating remote branches. It does not itself create, switch, push, or merge branches.

### Merge gate

Each milestone PR must contain:

1. Scope completed and explicit exclusions.
2. Acceptance checklist with pass/fail and evidence.
3. API/schema changes and generated-client updates.
4. Migration/backfill and recovery notes, where applicable.
5. A short demonstration or screenshots for affected workflows.
6. Known nonblocking issues with an owner and destination milestone.

Merge only when its acceptance gate passes. A dependency is satisfied by a tested merge, not by the existence of a branch.

### Safe parallel work

- Default to sequential milestones; parallelize only disjoint changes.
- M4 can run alongside M3 after M2, but coordinate shared routing/role changes.
- M9 may prepare templates after M3, but integration waits for M7/M8.
- M10 can start after M8 while M9 closes appointment work.
- M12 documentation and test planning can start early; final acceptance waits for all launch gates.
- Shared schema, auth middleware, email boundary, and lifecycle state changes have one owner at a time.

## 4. Milestone overview

| ID | Outcome | Individual branch | Depends on |
|---|---|---|---|
| M0 | Agreed launch contract and repeatable baseline | `completion/m00-baseline` | None |
| M1 | Trustworthy identity and permissions | `completion/m01-access-control` | M0 |
| M2 | Canonical accounts, applications, and rating | `completion/m02-submission-rating` | M1 |
| M3 | Broker submission reaches the correct market | `completion/m03-market-delivery` | M2 |
| M4 | Durable, authorized document handling | `completion/m04-document-vault` | M1, M2 |
| M5 | Quote approval through binding works | `completion/m05-quote-to-bind` | M3, M4 |
| M6 | Bound client reaches operational go-live | `completion/m06-client-implementation` | M5 |
| M7 | Website producer application enters safely | `completion/m07-producer-intake` | M1, M4 |
| M8 | Producer packet and appointment decisions work | `completion/m08-producer-appointment` | M7 |
| M9 | Scheduling and lifecycle communications work | `completion/m09-scheduling-notifications` | M3, M7, M8 |
| M10 | Charges and commissions are accountable | `completion/m10-billing-commissions` | M6, M8 |
| M11 | Role workspaces are operational and truthful | `completion/m11-role-workspaces` | M6, M9, M10 |
| M12 | Integrated release passes launch acceptance | `completion/m12-launch-readiness` | M0–M11 |

The table is dependency order, not a requirement to postpone M7 until M6 when independent capacity is available.

## 5. Milestones and smaller sprints

### M0 — Lock the launch contract and baseline

**Outcome:** One agreed description of what is being completed and a stable starting point.

**Sprint 0.1 — Reconcile decisions**
- Record current pipeline stages, modal layout, SignWell/Resend provider choices, auth implementation, storage choices, and base-vs-market rating ownership.
- Define supported actions and completion criteria for WC, PEO, ASO, and ASO+Captive.
- Confirm commission formulas, rounding, recipients, earning trigger, settlement method, and reversal rules. Do not invent financial policy.
- Resolve $500 minimum timing relative to PEO discount.
- Confirm the carrier test journey: market inbox delivery is not the same as a carrier dashboard submission queue.
- Confirm whether a carrier-facing pending-submission workspace is an approved requirement. If approved, include it in M11; otherwise do not promise it.

**Sprint 0.2 — Establish baseline and fixtures**
- Confirm integration branch/remote and current work that must be retained.
- Record current build/typecheck/test results without silently allowing new failures.
- Read-only audit schema and migration state; inventory unresolved drift.
- Define non-sensitive fixtures for each product, each role, and unrelated organizations.
- Inventory document templates, provider settings, sender domains, and required business inputs without recording secrets.

**Done when**
- Every original requirement is mapped to a milestone, explicitly superseded decision, or approved deferral.
- All four product routes and the permission matrix are written down.
- Required owner decisions have named owners and closure dates.
- Baseline commands, fixtures, integration target, and migration approach are reproducible.

### M1 — Secure identity and record access

**Outcome:** Real users cannot impersonate roles or access unrelated records.

**Sprint 1.1 — Sessions and account controls**
- Remove or strictly development-gate all client role switching.
- Enforce deactivation for existing sessions as well as new logins.
- Verify password/reset/invite behavior and secure cookie configuration.
- Review the custom session implementation against the original maintained-library requirement; harden it or obtain an explicit approved change, avoiding an unnecessary auth rewrite.

**Sprint 1.2 — Permission enforcement**
- Apply role and record-level checks to deals, accounts, quotes, profiles, policies/documents, employees, commissions, markets, and administrative actions.
- Close update/delete paths that omit ownership checks.
- Prevent protected status/link fields from being altered through generic writes.
- Align frontend affordances with backend permissions.

**Sprint 1.3 — Contract and regression checks**
- Update touched API contracts and generated clients.
- Add focused auth and cross-organization tests.

**Done when**
- All eight role logins reach the correct workspace.
- Unauthenticated protected requests return 401; prohibited actions return 403 or intentionally non-disclosing 404.
- Cross-organization fixture tests expose zero unrelated records.
- Deactivation blocks an existing session on its next protected request.
- Production builds expose no role-switching control.
- Logout, refresh, password reset, and self-edit restrictions pass.

### M2 — Make account, submission, and rating data consistent

**Outcome:** A submission has one reliable source of business data and reproducible pricing.

**Sprint 2.1 — Accounts and lead conversion**
- Complete account field capture and normalized deduplication.
- Verify lead conversion and Convert & Start Submission.
- Repair/link legacy orphaned deals through a reviewed, idempotent backfill.
- Define and implement updates to existing curated account values rather than indiscriminately overwriting them.

**Sprint 2.2 — Canonical application sections**
- Derive completeness from product/vertical question requirements.
- Map every collected field to a canonical section or intentional excluded metadata.
- Complete edit permissions, field-level audit changes, KPI updates, and account synchronization.

**Sprint 2.3 — Rating consistency**
- Verify latest-rate lookup, WC formula, approved minimum/discount order, WFS fees, and CA territory behavior.
- Reconcile configurable market pricing with base indications and clearly label their sources.
- Persist full breakdowns; implement stale-rating/re-rate behavior across save, reload, and revision.
- Preserve ASO/ASO+Captive distinctions.

**Done when**
- Each product fixture saves the intended account/deal/application relationship.
- Same normalized FEIN does not create a second account.
- Backfill reports before/after counts and leaves no unexplained orphaned launch-scope deals.
- Every required application field participates in the correct completeness rules.
- Rating edit → stale state → successful re-rate → cleared stale state passes.
- Non-rating edits do not mark rating stale.
- Approved numeric fixtures reproduce expected totals and stored breakdowns exactly to defined rounding.

### M3 — Deliver submissions to the correct markets

**Outcome:** The broker can submit a deal, staff can prove where it went, and replies return to the correct private thread.

**Sprint 3.1 — Routing eligibility and ranking**
- Validate market/product/state/class eligibility and underwriting recipients.
- Distinguish Cornerstone (Demo) WC from Cornerstone PEO.
- Set up an authorized test recipient and explicit safe test-delivery configuration.
- Confirm primary/overflow behavior and ranking locks.

**Sprint 3.2 — Final submission and dispatch**
- Confirm save-indication vs request-proposal vs final-submit behavior in UI and API.
- Queue only complete valid packages.
- Persist recipient snapshot, dispatch state, provider identity, and idempotency.
- Provide useful failure and retry controls.

**Sprint 3.3 — Correspondence**
- Verify outbound/inbound threading and attachments.
- Preserve market isolation, sender verification, and held-message handling.
- Show truthful delivery state; queued/accepted is not delivered.

**Done when**
- Broker WC fixture submits to the configured Cornerstone Demo test inbox.
- A second eligible market receives only its own material.
- An ineligible market receives nothing.
- Retrying the same dispatch does not send a duplicate.
- Test reply and attachment appear in the correct thread.
- Unverified sender is held; unrelated roles cannot read private correspondence.
- Staff can see and recover a deliberate delivery failure.

### M4 — Complete durable document storage and access

**Outcome:** Uploaded and generated documents survive process/deployment changes and respect access rules.

**Sprint 4.1 — Storage and migration**
- Inventory local-disk document paths and existing storage integrations.
- Use the established durable storage solution where suitable; do not replace it merely to match an old provider name.
- Create a reviewed migration for existing documents with counts, hashes, and recovery steps.
- Validate upload size/type and safe remote ingestion.

**Sprint 4.2 — Permissions and generated PDFs**
- Enforce role/deal/registration access and short-lived authorized access links.
- Protect W-9/ACH and full packets containing their pages.
- Finish launch-required PDF mappings; explicitly document fields with no source-template destination.
- Replace silent critical mapping failures with visible errors.

**Done when**
- Upload, download, replace, and authorized delete behavior works for supported document types.
- Files remain accessible after a service restart and deployment-style storage check.
- Migration counts and hashes reconcile.
- Unauthorized URLs and alternate endpoints cannot expose restricted files.
- Generated fixture PDFs contain all required mapped values without clipping or silent critical omissions.

### M5 — Complete quote approval, signing, and binding

**Outcome:** A received market quote can become a valid bound deal without skipped prerequisites.

**Sprint 5.1 — Proposal and revision**
- Connect quote received, selection, approved pricing, proposal generation, and delivery.
- Preserve market quote attachments and revision history.
- Ensure UI, stored breakdown, and proposal totals agree.

**Sprint 5.2 — Signing and bind package**
- Complete required document placement/templates for launch workflows.
- Treat webhook events as hints and verify authoritative provider state.
- Handle signing failure, decline, expiration, and retry.
- Fail visibly if required production signing configuration is missing; do not mark stub results as real completion.

**Sprint 5.3 — Bind transition**
- Enforce role, approval, document, and subjectivity prerequisites.
- Keep Bound transition and tracker creation concurrency-safe.
- Verify policy/account linkage and correct product-specific behavior.

**Done when**
- WC and PEO fixtures complete approved quote → proposal → required signatures → bind.
- ASO/ASO+Captive complete their approved equivalent contract/activation paths.
- Invalid or incomplete bind attempts are blocked with specific reasons.
- Duplicate callbacks/concurrent bind attempts create one intended tracker/policy outcome.
- Executed documents are retained and accessible only to permitted roles.

### M6 — Finish implementation and client operations

**Outcome:** Bound clients can be onboarded and moved to Active Client with evidence.

**Sprint 6.1 — WC implementation**
- Verify binder/policy uploads, WC task automation, due dates, and account transitions.
- Make remaining manual deliverables explicit with actor, timestamp, and evidence.
- Complete policy record creation/linkage where required by the agreed workflow.

**Sprint 6.2 — PEO implementation**
- Verify CSA-PEO timing before/after Bound.
- Connect employee onboarding counts to authoritative employee/onboarding records.
- Verify payroll setup, payroll-start anchoring, and go-live blockers.
- Keep WC sub-items integrated into the PEO tracker.

**Sprint 6.3 — Client visibility and ongoing operations**
- Connect My Program to actual program/policy/document/implementation data.
- Verify account lifecycle and completed-onboarding presentation.
- Preserve non-gating treatment of broker fee/deposit where required.

**Done when**
- One WC and one PEO fixture reach Active Client through their correct gates.
- PEO go-live fails before employee/payroll prerequisites and succeeds after completion.
- Employee counts reconcile to the underlying records.
- Replayed events do not duplicate tasks or client records.
- Employer sees only its own real program information.
- Missing manual deliverables remain visibly incomplete, not automatically fabricated.

### M7 — Build secure producer website intake

**Outcome:** A website application becomes a complete, private, traceable registration.

**Sprint 7.1 — Registration model**
- Implement timestamp-derived state, reference, immutable payload, owners, documents, flags, and compatibility/backfill.
- Add protected milestone updates and registration audit events.

**Sprint 7.2 — Public endpoint**
- Implement HMAC raw-body verification, 10/minute/IP limit, idempotency, full schema validation, and warning flags.
- Close legacy bypass routes.
- Persist registration/children atomically and enqueue durable ingestion/packet work.

**Sprint 7.3 — Ingestion and staff visibility**
- Ingest private documents with hashes and safe download rules.
- Add basic Applications list/detail so staff can diagnose failures immediately.
- Apply Admin/CSA redaction and restricted-document rules.

**Done when**
- Valid request → 201; tampered signature → 401; replay → 409; missing required document → 422.
- Low E&O passes with the specified warning.
- Concurrent duplicates produce one registration.
- SQL verifies owner/document relationships and migration results.
- Staff can inspect a failed ingestion without exposing sensitive data.

### M8 — Complete producer packet and approval

**Outcome:** An applicant cannot become appointed or receive credentials prematurely.

**Sprint 8.1 — Packet**
- Confirm provider support for recipient-specific visibility and approval-held countersignature.
- Build Application, NPA, per-owner Exhibit A, FCRA rights summary, W-9, and ACH.
- Implement prefill, owner routing, reminders/expiration, and verified completion.

**Sprint 8.2 — Review and decisions**
- Complete Applications list/detail, recipient status, call notes, and audit feed.
- Admin alone approves/declines after the approved prerequisites.
- Approval creates/links pending agency/principal/contact/owner records and releases Curtis's signing action.
- Decline voids the packet without creating new partner records.

**Sprint 8.3 — Countersign and credentials**
- Store executed packet and protected splits.
- Activate only after verified countersignature.
- Issue credentials only after call, approval, and countersignature.
- Handle late callbacks and provider failures without false state advancement.
- Add the required Resources placeholder.

**Done when**
- Controlled principal + second-owner test proves document isolation and `5 + N` count.
- Curtis cannot sign through the intended flow before approval.
- Early credentials and CSA decision requests are rejected.
- Approval/countersign provisions correct linked records once.
- Decline produces no new agency/partner records or credentials.
- Both signature-before-call and call-before-signature orderings work.

### M9 — Connect scheduling and lifecycle notifications

**Outcome:** Appointments and implementation meetings are visible, and people receive the right actionable messages.

**Sprint 9.1 — Calendly**
- Verify signed events, configured event type, reference matching, email fallback, and ambiguity handling.
- Handle booking, cancellation, rescheduling, unmatched events, and meeting links.
- Connect implementation meetings where required.

**Sprint 9.2 — Templates and reminders**
- Implement producer and staff templates from the detailed appointment scope.
- Connect immediate acknowledgment, conditional signing notice, owner request, scheduling nudge, call reminder, countersign, credentials, and decline notices.
- Avoid duplicate provider reminders.
- Exclude sensitive fields from provider payloads.

**Sprint 9.3 — Operational delivery**
- Validate production sender configuration and provider subscriptions through controlled tests.
- Add retry state, delivery visibility, and failure handling.

**Done when**
- Booking is reflected within one minute under normal test conditions.
- Cancellation/reschedule cannot erase a newer booking.
- 48-hour nudge and conditional 24-hour reminder pass clock-controlled tests.
- Duplicate events send no duplicate notifications.
- Controlled recipient tests prove real delivery; sensitive-data assertions pass.

### M10 — Complete practical billing and commissions

**Outcome:** Staff can explain every charge, receipt, earned commission, and settlement from persisted records.

**Sprint 10.1 — Financial rules and records**
- Implement the approved M0 rules, not guessed percentages or triggers.
- Connect policies/deals, producers/agencies, charges, commission entries, statuses, and audit history.
- Use exact monetary representation and documented rounding.

**Sprint 10.2 — Charges and payment confirmation**
- Complete broker-fee invoice/payment-link operations and applicable billing views.
- Confirm payments from authoritative provider events/state, not a redirect or button click.
- Handle duplicate events, failure, refund, cancellation, waiver, and permitted correction states.
- Keep carrier-direct deposits distinct from money collected by Axel.

**Sprint 10.3 — Commission earning and reconciliation**
- Generate commissions once from the approved earning trigger.
- Support adjustments/reversals with audit trails.
- Provide outstanding/paid/reversed views and a reconcilable export.
- Allow authorized manual settlement recording for initial launch, with payment reference, date, amount, and actor; do not pretend this initiates a bank payout.

**Done when**
- Approved numerical fixtures match charges and commissions to the cent.
- Replayed payment/bind events create no duplicate money entries.
- One controlled payment and one refund/reversal reconcile correctly.
- Unpaid, waived, paid, and reversed balances are distinguishable.
- Producer views expose only their own permitted financial data.
- Staff can reconcile application totals to provider evidence or recorded external settlement.

### M11 — Make every role workspace usable and truthful

**Outcome:** Users can perform their permitted work without fake metrics or dead-end buttons.

**Sprint 11.1 — Dashboards and navigation**
- Replace constants with scoped aggregates or explicit “not available” states.
- Connect required quick actions; remove misleading unused controls.
- Verify Admin, CSA, Underwriter, Agent, Employer, Carrier, PEO, and Vendor journeys.
- If approved at M0, implement the minimal carrier pending-submission queue with market assignment and permissions; otherwise label email receipt as the supported path.

**Sprint 11.2 — Profiles and account operations**
- Finish role-specific profile data and required mini-profile entry points.
- Verify self/admin edits, contacts, tasks, account details, documents, and activity visibility.

**Sprint 11.3 — Functional UI cleanup**
- Fix blocking overflow, unreadable light/dark states, missing loading/error/empty states, and keyboard/accessibility failures.
- Correct touched token/gradient violations without a broad visual redesign.
- Do not implement optional canvas designs or existing cosmetic suggestions as an implicit dependency.

**Done when**
- Each role completes its defined primary task from its workspace.
- Every launch-visible KPI has a documented query/source or explicit unavailable state.
- Every primary action works or is intentionally unavailable with an explanation.
- Zero unrelated records/private notes appear in the role fixture matrix.
- Critical screens are usable at agreed desktop and narrow viewport sizes.

### M12 — Integrated acceptance and release readiness

**Outcome:** The whole product works together on release-like configuration.

**Sprint 12.1 — Integration and migration rehearsal**
- Reconcile all changed endpoints with OpenAPI and regenerate clients.
- Run typechecks/build and targeted regression suites.
- Rehearse migrations/backfills on a safe environment with before/after SQL.
- Confirm durable storage, workers, scheduled jobs, webhook routes, and production fail-closed configuration.

**Sprint 12.2 — Business acceptance**
- Execute the scenario matrix below.
- Record pass/fail, sanitized evidence, screenshots where useful, and any blockers.
- Fix blockers in the owning milestone area and rerun only affected checks plus final critical smoke tests.

**Sprint 12.3 — Controlled release**
- Complete runbook, support ownership, retry/recovery procedures, backups and recovery rehearsal.
- Run dependency/security checks and resolve launch-critical findings.
- Confirm monitoring for job failures, signing/email failures, billing exceptions, and failed logins.
- Obtain release approval and let the authorized owner publish.
- Perform a controlled post-release smoke test with approved recipients and transactions.

**Done when**
- All critical scenarios pass and no security/data/financial blocker remains.
- Schema, API contract, and generated code are aligned.
- No production-critical path silently uses stub success.
- Provider delivery and durable storage are proven.
- Operations has clear recovery instructions.
- Deferred items are explicitly accepted and do not prevent a supported journey.

## 6. Final measurable business scenario matrix

| Test | Required result |
|---|---|
| WC broker → Cornerstone Demo | Valid submission, correct recipient, real controlled receipt, isolated reply thread |
| PEO placement | Correct market pricing, quote/signing/bind, five-phase implementation, gated go-live |
| ASO | Correct fees, agreement/activation, employer program and billing outcome |
| ASO+Captive | Correct configured path and program-specific prerequisites; no forced WC-only assumptions |
| Producer approval | Intake → packet → booking/call → Admin approval → countersign → credentials |
| Producer decline | Void and neutral notice; no new agency/partner/credentials |
| Role isolation | Eight-role matrix and unrelated-organization attempts expose no unauthorized data |
| Rating revision | Changed inputs update canonical data, stale state, re-rate, breakdown and proposal consistently |
| Provider failure | Retry recovers without duplicate email, packet, tracker, payment, or commission |
| Financial reconciliation | Charge/payment/refund/commission balances match approved rules and external evidence |
| Record durability | Documents and lifecycle state survive restart and release-like deployment |

## 7. Sprint sizing and measurement

These milestones are outcomes, not calendar estimates. Do not promise dates before the first sprint confirms the remaining effort.

For each sprint:

1. Choose one coherent user-visible outcome.
2. List specific files/contracts owned and explicit exclusions.
3. Select 3–7 pass/fail acceptance checks.
4. Implement a vertical slice including UI, API, persistence, permissions, and failures.
5. Verify with the cheapest reliable checks; reserve browser testing for changed critical journeys.
6. Attach evidence and open the sprint/milestone review.

If a sprint cannot be demonstrated independently, split it further. If it requires unrelated schema/auth/provider changes, resolve the dependency first.

Track milestone state as **Not started → In progress → In review → Accepted → Merged → Verified in integration**. “Code written” is not a completion state.

### Sprint report template

```text
Milestone / Sprint:
Branch:
Outcome:
Dependencies satisfied:
Scope completed:
Acceptance checks: passed / failed / blocked
Evidence:
Schema/API changes:
Known nonblocking issues:
Recovery notes:
Reviewer:
Integration verification:
```

## 8. What can wait

Defer only items that do not block the agreed operating journey:

- Broad dashboard/marketplace visual redesigns and optional mockup variants.
- Animations, decorative polish, and advanced analytics.
- Optional AI insight/report features.
- Bulk lead import if manual creation/conversion supports the launch operation.
- Automated bank payout initiation if authorized manual settlement and reconciliation are accepted.
- Integrations that replace an already reliable, auditable manual operational step.

**Do not defer:** permissions, record isolation, correct pricing, required legal signatures, credential gates, durable documents, idempotency, truthful financial state, or basic failure recovery.

## 9. Immediate next action

Begin **M0 / Sprint 0.1**, confirm the integration branch and launch contract, and then start M1. Do not create all milestone branches from today's code: create each from the accepted integration state when its dependencies are ready.

This plan defines proposed work. It does not claim the milestones are already complete, authorize production data changes, or automatically publish the application.