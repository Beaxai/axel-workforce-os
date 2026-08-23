# Multi-Market Routing Review Tracker

This companion tracks the review of
[the verbatim routing reference](multi-market-routing-verbatim.md). The source
reference remains unchanged. Use strike-through here only when a requirement has
been verified as implemented **and** its business decision is settled.

## Review Status

| Source section | Decision / intent | Current status |
|---|---|---|
| Eligibility Filters | Required routing facts should fail closed when a market has a corresponding requirement. | Decision made; implementation pending. |
| Scale Context | Use a carrier-first model: carrier owns shared identity and a program/market owns routing behavior. | Decision made; implementation pending. |
| Primary / Secondary: rank eligible markets | ~~Rank qualifying markets by generated rate, then appetite strength, then a deterministic ID tie-breaker.~~ | Verified implemented. |
| Primary / Secondary: visible price | Show only the Primary market's indicative price. | Awaiting Curtis decision; recorded in `docs/questions-for-curtis/open-questions.md`. |
| Primary / Secondary: routed markets | ~~Route the Primary market plus the next three ranked markets; route all when fewer than four qualify.~~ | Verified implemented. |
| Primary / Secondary: dispatch order | ~~Deliver Primary first, then secondary markets in rank order; do not send simultaneously.~~ | Verified implemented. |
| Per-Market Communication Tabs | Show market/program-specific correspondence in rank order. | Pending section-by-section review. |
| How to Store the Ranking | Use `deal_markets` as the one-to-many, authoritative source. | Pending section-by-section review. |

## Review Notes

### Eligibility Filters

The UI and routing engine already support product/vertical, state, class
code/industry, active/appointed status, routing contacts, payroll, premium, and
headcount constraints. The remaining work is to ensure missing class-code,
payroll, or headcount data prevents a constrained market from qualifying rather
than allowing a partial match.

### Scale Context

The current system can rank and route the expected number of PEO programs and WC
markets. It is still market-first, though: a carrier is not yet a first-class
parent record. The target structure is:

```text
Carrier
  └─ Programs / Markets
      ├─ Product lane
      ├─ Appetite
      ├─ Assigned routing underwriter
      └─ Indicative pricing configuration
```

### Primary / Secondary Logic

Ranking, Primary-plus-three routing, sequential dispatch, delivery locking, and
per-market tracking are verified. The outstanding business decision is whether
the indication and proposal screens should show the Primary market rate only or
an earlier general master-rate-sheet estimate before market ranking occurs.