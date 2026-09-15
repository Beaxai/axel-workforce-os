---
name: Multi-market build scope
description: Product-owner scope boundary and confirmed proposal-distribution trigger for the multi-market work.
---

Keep the multi-market build directly tied to the supplied Markdown specification. Do not add speculative workflow gates, redesigns, or future rated-era behavior ahead of the requested launch scope.

The working application journey is: onboard agencies and individual Agents; let Agents complete Part 1 and receive the proper indication; let them complete Part 2 and request a proposal; that proposal request immediately triggers Resend delivery to the configured markets; inbound email responses return to the correct per-market thread on the deal card.

Each engaged market must have its own tab on the deal card inside the Overview dialog. A market tab contains only that market's outbound submission, inbound replies, quote activity, and status; correspondence must never bleed across tabs.

U/W Review is not an additional manual approval gate before sending unless the specification is explicitly revised to require one.

Launch assignment blanks are intentional: Axel is never vertically ranked because it is the manual keep/cherry-pick market, and Cannabis has no ranks 1/2/3; Vensure remains `E` for manual submission. The supplied workbook is authoritative.

Completing Part 2 is the proposal request and immediately distributes to eligible ranks 1/2/3. An `E` market can be added later as a separate send/thread without changing the initial batch. Axel keep is available to Admin, Underwriter, and CSA and may coexist with wholesale threads until final selection. ASO is Axel-only unless the assignment grid explicitly adds a wholesale ASO partner.

Launch and rated-era routing share one `deal_markets` lifecycle. Rated-era work may automate Primary selection from price, but must not replace the launch engagement, dispatch, status, selection, or thread model.

Private external-market correspondence is limited to Axel's own internal Admins and CSAs. Authorization must verify trusted internal-Axel organization membership and the allowed role together; an external agency's Admin or CSA label never qualifies. Unproven internal membership must deny access, including through direct APIs, activity previews, attachments, and notifications. Keep this correspondence policy separate from operational market-management permissions.

**Why (correspondence boundary):** The owner explicitly clarified that external agents and their staff must have zero market-thread visibility regardless of role names. Axel manually communicates broker/agent updates through its separate Axel-branded channel.

**How to apply (correspondence boundary):** Use an authoritative internal organization identity, current user/membership eligibility, and explicit organization context for multi-org users; never infer internal staff from an organization display name or a role string. Include denial tests for external CSA and external Admin memberships.

Development trust authorization does not authorize production provisioning or assignment of legacy unowned deals.

**Why:** On 2026-09-15 the owner explicitly confirmed the existing Axel Workforce Solutions organization as internal for Development only, with production and unowned deals excluded from the confirmation.

**How to apply:** Preserve those boundaries during publishing and data cleanup; obtain separate authorization before trusting a production organization or assigning legacy ownership.

**Why:** The product owner explicitly prioritized a working end-to-end application and rejected extras beyond the supplied build document. They clarified the distribution trigger, overflow recovery, Axel permissions, ASO scope, and shared lifecycle so future work preserves intentional launch behavior.

**How to apply:** Evaluate every multi-market change against the supplied spec, authoritative workbook, and this end-to-end journey. Defer unrelated improvements and later rated-era automation. Preserve the completed agency/Agent onboarding foundation. Do not auto-rank Axel, auto-send Vensure for Cannabis, fold a later `E` send into the initial batch, or distribute ASO wholesale unless the owner explicitly revises the assignment.