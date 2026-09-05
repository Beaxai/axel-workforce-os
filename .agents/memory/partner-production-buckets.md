---
name: Partner production buckets
description: Canonical production populations, product buckets, and amount precedence for agency and Agent metrics.
---

Agency and Agent production must use one shared server-side calculator over non-archived deals attached through the producing Agent user. Agency totals aggregate those Agent results.

- WC is `WC`.
- PEO is `PEO`.
- ASO combines `ASO` and `ASO_CAPTIVE`, and its dollars are always called fees.
- WC premium prefers stored deal WC premium, then the latest quote's WC premium/final premium, otherwise zero. Never use estimated premium.
- Annual service fees prefer stored annual amounts, then monthly amounts annualized, then the latest quote with the same annual-before-monthly order. Only when no stored fee exists may annual payroll times 2% be derived.
- PEO premium is the WC component plus annual service fees.
- ASO fees are annual service fees plus any stored or fallback WC component.

**Why:** The former combined rollup mislabeled mixed products as WC premium and could inflate results by falling back to estimated premium.

**How to apply:** Every agency tile, agency detail stat, Agent roster/detail metric, and deal-row dollar value must consume calculator-derived output rather than reading raw deal or quote fields in the UI.