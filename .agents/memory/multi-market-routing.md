---
name: Multi-market routing
description: Product invariants for market-specific rating, ordered dispatch, ranking locks, package readiness, and correspondence isolation.
---

WC carriers and PEO programs are separate ranking lanes. A persisted per-deal ranking snapshot is authoritative for pricing, proposals, dispatch, and correspondence.

**Why:** Automatic multi-market placement needs deterministic per-market rates, strict secondary-market privacy, and correspondence that cannot leak between recipients.

**How to apply:** Show only Primary pricing outside ADMIN/CSA. Route ranks 1–4 in order with separate market thread identities. The first provider-accepted send permanently locks membership, order, and pricing.

Correctable routing failures must remain auditable without blocking a corrected resubmission.

**Why:** Internal review needs a durable trace, but incomplete or no-market submissions must not become duplicate-submission dead ends.

**How to apply:** Record the failure before returning it, keep success-only side effects out, and exclude failed routing attempts from active-submission duplicate checks.

Only a complete, validated carrier application package may enter dispatch. Configured WC modifier bounds are hard eligibility limits, not warnings.

**Why:** Markets must never receive blank forms or pricing outside their configured underwriting guardrails.

**How to apply:** Fail closed before queue creation when canonical answers, required documents, exact state/class rules, eMod bounds, or schedule-rating bounds are incomplete.

Provider dispatch is at-most-once per recorded attempt; uncertain delivery requires human review instead of an automatic resend.

**Why:** Provider I/O can outlive a worker process, and retrying an uncertain attempt can send duplicates or route after cancellation.

**How to apply:** Serialize queue/cancel operations, preserve attempt history, and treat a started attempt with no durable completion as terminally uncertain.