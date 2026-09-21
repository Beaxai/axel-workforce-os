# Appointment demo readiness

## Scope

The immediate goal is a credible demo, not production launch. Production
integration and legal-readiness plans remain deferred backlog. Prefer existing
working behavior and clearly labeled fictional examples over unnecessary live
provider work. This document defines the target; it does not claim these demo
substitutes are already built or verified.

## Acceptable for the demo

| Area | Acceptable demo substitute | Deferred until live use |
|---|---|---|
| Website intake | Fictional sample application loaded through a demo-only fixture path; label it sample data, not a website submission | Gershom's final contract and real website ingestion |
| Signing | Supplied blank/sample PDFs and simulated producer/countersigner milestones visibly marked “Simulated — not legally signed” | Final legal wording, CFPB asset, provider field/privacy/hold validation and live signatures |
| Calendly | Fictional scheduled call and cancellation/reschedule states; display the specified 45-minute Zoom intent without inventing a working meeting | Account/subscription setup and live booking acceptance |
| Email | Rendered previews and simulated delivery timeline; never label previews as actually sent | Appointment delivery worker, retries, real reminders and mailbox acceptance |
| Approval/credentials | Simulated pending approval, countersign and activation on isolated demo records; use an existing authorized demo login if needed | Real identity provisioning, duplicate reconciliation and credential issuance |
| Tax/bank documents | Blank or unmistakably fictional W-9/ACH samples | Final tax mapping and secure real voided-check collection |
| Resources | Clearly labeled sample or “Awaiting approved document” | Final compensation/legal content |

## Real concerns that remain mandatory

- Keep real applicant, bank, tax and credential data out of fixtures, previews,
  screenshots and logs.
- Preserve server-side role and organization authorization. Demo mode must not
  turn an ordinary user into Admin or expose restricted files.
- Keep demo fixtures isolated from actual accounts and agency records. Do not
  use broad deletes or shared-database schema pushes to reset a demonstration.
- Simulated signing, approval or delivery must never create live provider actions,
  activate actual accounts, issue credentials, or release old blocked email rows.
- Keep the real lifecycle gates intact. Simulations must be explicit demo-only
  behavior, not shortcuts added to real webhook/approval endpoints.
- Do not show success for an operation that failed. Distinguish a working feature,
  a simulation and an unavailable action.
- Fix crashes, broken navigation and unusable controls on the selected demo path.
  Full responsive polish can wait if the demo is desktop-only; privacy and
  authorization cannot.

## Step-by-step demo action plan

1. Select the shortest demonstration: sample application → packet preview →
   simulated signatures → scheduled/completed call → approval → simulated
   countersign/activation. Include a separate decline example.
2. Inventory existing screens and prepare fictional fixtures for the required
   states. Use isolated demo storage or explicitly scoped fixture records;
   choose the least invasive approach after inspecting existing fixture support.
3. Implement only the missing demo transitions/previews. Make simulations
   conspicuous and prevent their records/actions from entering real queues,
   provider callbacks, account provisioning or production workflows.
4. Exercise the walkthrough and reset. Check role restrictions, sensitive-file
   denial, lifecycle ordering, understandable blocked states and no outbound
   effects. Repair only the gaps necessary for a safe, repeatable demo.
5. Record which steps are real versus simulated and retain the production plans
   for later. Before live use, remove or tightly restrict demo entry points and
   complete the applicable production acceptance gates.

**Demo done:** a repeatable walkthrough with fictional data, no unintended
external/account effects, preserved access controls and no misleading claims of
live signing, delivery or production readiness.