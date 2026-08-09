---
name: Broker fee invariants (WC-2)
description: Axel broker fee — single premium source, non-blocking rule, status transitions.
---

The Axel broker fee (default 7%) is TRACKED NON-BLOCKING: nothing about it may ever gate submission or binding.

**Single amount source:** the server computes the fee amount from the deal's LATEST quote's WC premium (falling back to deal.wcPremium/estimatedPremium) in `computeBrokerFee`. Every surface — rail card, quote/proposal panels, dunning email — must display the server amount; the client never recalculates. **Why:** an architect review found the rail, proposal snapshot, and GET endpoint diverging after re-rates.

**Status transitions:** UNPAID → PAID or WAIVED; PAID/WAIVED exit only via "reinstate as unpaid" — no direct paid↔waived shortcut, so a waiver can't silently become a payment. Status changes mirror to checklist item SUBJ_BROKER_FEE (PAID→SATISFIED, WAIVED→WAIVED, UNPAID→reopen). Fee columns are system-managed and stripped from generic deal POST/PATCH.

**Dunning:** fires once after the bind tx commits (claim-once stamp under row lock), best-effort, dev_logged until RESEND_API_KEY exists; payment link is a stub pending open Q14 (no payment provider).
