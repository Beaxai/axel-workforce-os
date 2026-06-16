# Decision request — Phase 4C deal card layout

_To: Curtis · From: Brendan · Date: 2026-06-15 · Re: State Document §8 (Phase 4C, Deal Card Submission Panel)_
_Decision needed: approve a layout refinement to §8, or keep §8 as written._

---

## The ask (30 seconds)

Phase 4C turns the deal card into the submission/communication hub. Building off the **Google Stitch layout you shared**, I want to refine **one** detail of the §8 spec. Everything else in §8 stays exactly as you wrote it. Please pick **C** (my recommendation) or **B** (your spec as written).

## What's actually changing

§8 says: *"the deal card right rail holds the six submission sections as buttons with completeness indicators."*

The issue: a rail that must also show **pricing** (WC + WFS) and the **Approve/Decline** actions can't legibly hold six fully-editable sections too. So the question is just *where the six sections live and edit*.

| | Where the 6 sections live | Pricing | Approve/Decline | Notes |
|---|---|---|---|---|
| **B — your spec (§8 as written)** | Buttons in the right rail | Moves up to the KPI strip | Header buttons | Fully designed, ready, needs no approval |
| **C — proposed refinement** | **Completeness summary stays in the rail**; full editing on a dedicated "Submission" tab | Stays in the rail | In the rail | Keeps §8's intent (status visible in rail); editing gets real room |

(A third option — sections on their own tab with the rail *only* for pricing — was considered and set aside, because it hid completeness behind a tab click.)

## Why I recommend C

- **Honors §8's intent:** section completeness is still right there in the rail at a glance — you don't lose the "is this submission ready?" signal.
- **Better editing:** six sections with required-field validation need more room than a rail allows; the dedicated tab gives that without crowding pricing or the bind action.
- **Matches the layout you liked:** it's the closest faithful build of the Stitch reference in our actual brand (dark canvas, pink primary, purple support).
- **Tradeoff (honest):** the rail is taller. Mitigation: on short screens the section summary collapses to a single "Submission 3/6" line that expands on click, keeping pricing + Approve/Decline above the fold.

## What is NOT changing (your binding decisions all hold)

- Pink-primary / purple-support / single gradient-CTA design tokens — unchanged.
- Rating rules, lead-vs-account model, Replit Postgres + Drizzle — untouched.
- The six sections, completeness indicators, re-rate stale flag, role-aware access, account sync, activity logging — all per §8.

## Timing (this is not being built yet)

This is a design decision only. Implementation stays in build order (`3.5 → 4A → 4C`) and is gated on Phase 3.5 (auth/roles) and 4A (accounts) landing first. I'm getting the direction approved now so it's locked before it's 4C's turn.

## Visual

Side-by-side mockup of B and C in the real Axel brand: `docs/mockups/4c-deal-card/index.html` (open in a browser).

---

## Decision

- [ ] **Approve C** — I'll send you the exact replacement text for §8 to drop into the State Document, then it's locked.
- [ ] **Keep B (§8 as written)** — I'll build the spec-literal version; no doc change needed.
