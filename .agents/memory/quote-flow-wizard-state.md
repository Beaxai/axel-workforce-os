---
name: Quote-flow wizard rehydration
description: How to programmatically resume an existing quote in the Axel quote-flow wizard without the store getting wiped.
---

# Resuming an existing quote in QuoteWizard

The quote-flow Zustand store (`src/lib/quote-flow-store.ts`) is **not persisted** — it
lives only in memory. `QuoteWizard.tsx`'s mount effect calls `store.init(vertical,
coverageType)` (which resets to `initialState`) **only when** the router
`location.state` contains both `vertical` and `coverageType`. If `store.vertical`
is unset and no nav state is given, it redirects to `/marketplace`.

**Rule:** To rehydrate the store and drop the user onto a specific step (e.g. the
indication screen at `phase=1, currentStep=5`), set the store fields first
(`useQuoteFlowStore.getState().reset()` then `.update({...})`), then
`navigate("/marketplace/quote/wizard")` **without** passing `location.state`.
Passing `{ vertical, coverageType }` in nav state would trigger `init()` and wipe
your rehydration.

**Why:** Step4Indication recomputes the indication from `store.locations` on mount,
so rehydrating `locations` (reconstructed from a saved quote's
`workforceProfile.locations`) is enough to re-render the indication. The mount-time
`init()` reset is the trap.

**How to apply:** Used by DealCardModal's "Continue Quote" button. Map
`deal.productType` -> `coverageType` ("PEO"/"ASO"/else "WC"); coverageType only
matters because Step4 branches on `=== "ASO"` / `=== "PEO"`.
