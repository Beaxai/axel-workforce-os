---
name: Quote-flow wizard rehydration
description: How to programmatically resume an existing quote in the Axel quote-flow wizard without the store getting wiped.
---

# Resuming an existing quote in QuoteWizard

The quote-flow Zustand store is **not persisted** — it lives only in memory.
QuoteWizard's mount effect resets the store (`init`) **only when** the router
`location.state` carries both `vertical` and `coverageType`.

**Rule:** To rehydrate the store and resume at a specific step, set the store
fields first, then navigate to the wizard route **without** passing
`location.state`. Passing nav state would trigger the mount reset and wipe your
rehydration.

**Why:** The indication step recomputes from the store's locations on mount, so
rehydrating locations is enough to re-render — but the mount-time reset is the
trap that silently discards pre-set state.
