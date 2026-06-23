---
name: CA WC rating requires a persisted ZIP
description: Why CA workers-comp quotes need a 5-digit ZIP and where it must be persisted to allow later re-rating
---

# CA WC rating requires a persisted ZIP

CA workers-comp pricing resolves a territorial rating factor from the business ZIP
(`resolveTerritory` in `utils/caTerritory.ts` throws `TerritoryRatingError` if the ZIP
is not a valid 5-digit string). So any code path that re-rates a stored CA quote must
supply the original ZIP.

**The trap:** the `quotes` table has no `zip` column. The ZIP only survives inside the
rating breakdown JSON. `calculateWCPremium` must persist the full `zip` in
`breakdown.inputs` (the `calculation.caZipPrefix` is only the 3-digit prefix and is NOT
enough to re-rate). Multi-location ZIPs live in `workforce_profile.locations[].zip`.

**Why:** any feature that re-rates an existing quote (quote variations, what-if levers,
re-quote) reads the breakdown to recover inputs. If the ZIP isn't there, every CA
re-rate 500s with TerritoryRatingError even though the original quote priced fine.

**How to apply:** when building anything that re-prices a saved quote, recover the ZIP
from `wcRatingBreakdown.inputs.zip` (single) or `workforceProfile.locations[].zip`
(multi) and thread it through the engine call. Prefer the stored `quotes.wcPremium` as
the displayed base premium instead of re-rating the base. Legacy quotes created before
the engine persisted `inputs.zip` will still lack it — needs a fallback (deal/account
location) or an explicit actionable error.
