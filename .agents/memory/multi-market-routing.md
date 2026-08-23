---
name: Multi-market routing
description: Approved invariants for market-specific rating, ordered submission routing, ranking locks, and correspondence isolation.
---

Use first-class, structured markets, underwriters, appetite rules, and source-neutral rate rules. WC and PEO are separate ranking lanes. `deal_markets` is the authoritative ranked source for indication, proposal, dispatch, and the deal card.

**Why:** The existing engine produces one benchmark rate and the existing P5 listener identifies only a deal. Automatic multi-market placement needs deterministic per-market rates, strict secondary-market privacy, and correspondence that cannot leak across markets.

**How to apply:** Show only Primary pricing outside ADMIN/CSA. Route separate messages to ranks 1–4 in order. Give every routed deal-market its own listener/thread identity. The first provider-accepted market send permanently locks the ranked set; later re-rates cannot change recipients, ranks, or visible Primary pricing.

Routing failures keep an audit deal with `routing_failed`, but that record must not block a corrected resubmission. Resolve eligibility before writing quotes, generated documents, success activity, or a dispatch batch.

**Why:** The API must return a deal ID for internal review without turning a correctable no-market result into a duplicate-submission dead end.

**How to apply:** Duplicate checks ignore routing-failed deals. Queue only after the completed application package is persisted.

Dispatch uses a durable per-batch worker lease. Cancellation is unavailable while a worker owns the batch, and an abandoned started provider attempt becomes `DELIVERY_UNKNOWN`, never an automatic retry.

**Why:** Email delivery can outlive a process or database request; retrying an uncertain attempt can send duplicate submissions or route after cancellation.

**How to apply:** Claim before provider I/O, verify the claim before every send, preserve attempt history across manual retries, and require human review for uncertain delivery.