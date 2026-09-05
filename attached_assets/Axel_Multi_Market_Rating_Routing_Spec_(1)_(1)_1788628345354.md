# Axel Workforce OS — Multi-Market Rating, Routing & Distribution Spec

**Build prompt for Replit / Claude Code. Product owner: Curtis Prince.**
Implements rating, market-matching, distribution, and per-market communication. Inspect actual files/schema before building; do not rely on conversation memory. Confirmed stack (React 18 + Vite + TS, Node/Express 5, Replit PostgreSQL + Drizzle) and locked design system.

> **Launch vs. rated-era.** At launch we do NOT have most partners' rates, so the system cannot rank markets by price. Launch routing uses **manual per-vertical market ranking** (curated by Curtis). When a market later provides its rates + underwriting logic, it becomes **rated** and the system can rank it by price. Both models are described; build the **launch model** first.

---

## 1. Business model (read this first — it drives everything)

- **Axel cherry-picks.** Axel writes only the accounts it wants (its own PEO/ASO program). Most submissions are deliberately placed OUT to wholesale PEO markets. Axel is a **selective** market, not the default winner.
- **Getting a PEO quote is a relationship, not a transaction.** Each engaged market is an active, back-and-forth communication thread. The point of this system is to streamline that currently-manual, cumbersome process.
- **Preferred markets are curated per vertical.** For each vertical, Curtis designates the **top 3 wholesale PEOs** we always submit to (rank 1/2/3). These are relationship/economics/fit choices, NOT rate — we don't have rates at launch. The top 3 differ by vertical.
- **The rest are eligible-on-demand.** Other markets that write the vertical are eligible but not auto-submitted; we submit to them manually when we want more competition or the top 3 don't produce.

---

## 2. Two-part submission (unchanged)

- **Part 1** collects data to determine market eligibility (company, payroll, appetite fields). On completion, the applicant sees an **indication**: Benchmark for WC, Axel for PEO/ASO (our rated markets).
- **Part 2** is the full submission then formal proposal request then U/W Review, then distribution to markets.
- The applicant never sees a generic estimate — only our rated markets' numbers (Benchmark WC / Axel PEO-ASO). Wholesale PEO quotes come back through the market threads, not the applicant-facing indication.

---

## 3. Launch markets

| Market | Product | Role | Rating |
|---|---|---|---|
| **Benchmark (BIC)** | WC | Rated WC market, all verticals | Priced from loaded BIC rate table (state eligibility derived from the data — no separate list) |
| **Axel** | PEO / ASO | Rated; the account we keep when we cherry-pick | Priced from our PEPM formula |
| **Wholesale PEOs** (Cornerstone, Decision HR, Peoplease, Employers Personnel, SouthEast, Vensure, WBS, etc.) | PEO | Eligibility-only; ranked per vertical | No rates in engine yet |

---

## 4. Assignment data (data-driven, per-vertical rank)

Source: the Market Assignment Grid (provided by Curtis). Import it into config tables. **Do not hardcode.**

**`markets`:** `id`, `name`, `market_type` (`wc_carrier` | `peo_aso_provider`), `is_rated` (bool), `states` (or "per rate table" for Benchmark / "all" for Axel), `submission_email`, `phone`, `underwriter`, `other_contacts`, `active` (appointed/active status).

**`market_vertical_rank` — one row per market x vertical it writes:**
- `market_id` (FK)
- `vertical`
- `rank` — `1` | `2` | `3` = always-submit secondary market for that vertical; `E` = eligible but not top-3 (manual/on-demand); (no row / null = doesn't write that vertical)
- `product` (`PEO` | `ASO` | `WC` | `PEO+WC`)

Rank is **per vertical** — a market can be rank 1 for Construction and only `E` (or absent) for Cannabis. Example: Cannabis is written only by Axel and Vensure, so its ranked markets differ from other verticals.

---

## 5. Launch routing workflow (BUILD THIS)

On a completed Part-2 submission for a given vertical + state:

1. **Determine eligible markets** — those whose `market_vertical_rank` row matches the vertical, that write the applicant's state, product matches, market active, has a submission email. (Eligibility filters, section 7.)
2. **Auto-submit to the vertical's ranked markets** — the markets with `rank` 1, 2, 3 for that vertical (in that order). These become **active market threads** on the deal card.
3. **Axel cherry-pick / triage** — Axel is offered as a "keep this account" option, not auto-submitted as a wholesale market. [CONFIRM decision, section 6.]
4. **Hold the `E` markets as an on-demand overflow list** — eligible, not yet submitted. Each has a one-click **"Submit to [market]"** action that promotes it into an active thread when the user wants more competition or the ranked 3 don't produce.
5. If a vertical has fewer than 3 ranked markets (e.g., Cannabis), auto-submit to however many exist; the rest of eligible are `E` overflow.

**This replaces the rate-based "Primary + 3 secondaries" model at launch.** Ranking is manual preference, not price.

---

## 6. Axel's role — cherry-pick / triage [CONFIRM]

Axel writes only accounts it wants. Decision needed on how the "keep vs. send out" triage happens:
- **(a)** Every submission auto-goes to the vertical's top-3 wholesale PEOs; Axel is a manual "keep this one" action on accounts we want to write ourselves; OR
- **(b)** Axel gets first look via its own appetite rules; accounts Axel declines auto-flow to the top-3 wholesale markets.

Until confirmed, build (a) — simpler, fully manual triage — and leave a hook for Axel appetite rules to automate it later.

---

## 7. Eligibility filters (auto-send gate)

A market is eligible only when ALL match: selected vertical/product; applicant's state (in the market's state set; Benchmark via BIC rate presence); **class code / industry** (appetite is class-code driven — required); market active/appointed; market has a submission email contact. Optional: payroll/premium range, headcount.

Submission branch behavior (unchanged): **Ineligible** then automated ineligibility response, stops. **Blocked by prior submission** then automated response, cannot re-enter. **Referral/flags** then does not block; U/W package annotated.

---

## 8. Deal card — market management (BUILD THIS: two tiers)

The card must make many markets manageable without drowning the user in parallel threads. Two tiers:

**A. Active markets** — the vertical's ranked 1/2/3 that we auto-submitted to (plus any `E` market the user manually promoted, plus Axel if kept). Each active market is a full **communication thread** where the back-and-forth quoting happens. Presented as **per-market tabs**, ordered by rank, each showing only that market's correspondence. Inbound listener emails and outbound sends are tagged with `market_id` and thread into the correct tab.

**B. Available markets** — the `E` markets eligible for this vertical/state but not yet submitted. A collapsed list, each with a **"Submit to [market]"** action that moves it into the Active tier on demand.

**Market status per market on the deal:** `sent` then `quote_received` then `declined` / `no_response` then `selected`. A **"Select Market / Set Primary"** action lets the user designate the one market to proceed to binding with; on selection the card emphasizes that market and the others go quiet (but remain visible for fallback).

The activity log records which markets received the submission and when. `market_id` must be added to the relevant activity/email records — **confirm this fits the P5 listener-email ingestion before wiring.**

---

## 9. `deal_markets` — per-deal market state

One row per market engaged (or eligible) for a deal:
- `id`, `deal_id`, `market_id`, `market_type`, `underwriter_id`
- `vertical_rank` (the market's rank for this deal's vertical: 1/2/3/E)
- `generated_rate` (null at launch for wholesale PEOs; populated for rated markets)
- `is_active` (submitted / working) vs. available
- `market_status` (`sent` | `quote_received` | `declined` | `no_response` | `selected`)
- `is_selected` (the market we proceed to bind with)
- `send_status`, `sent_at`, `created_at`, `updated_at`

At launch, ordering/auto-submit is driven by `vertical_rank`. In the rated era, `generated_rate` enables price ranking and the system can auto-select Primary (section 10).

---

## 10. Rated era (LATER — do not build yet, design for it)

When a market provides rates + underwriting logic (`is_rated = true`): the engine prices it, ranks rated markets by ascending rate, and can auto-designate the Primary (lowest rate) and the 3 next-closest as the submit set — automating the manual selection of sections 5/8. The launch structure (distribute then threads then select one then bind) stays identical; only "who is Primary/ranked" shifts from manual per-vertical preference to computed price rank. Manual preference may remain a tiebreaker/override even then.

---

## 11. No-WC-rate handling (e.g., NY)

When the applicant's state has no available WC rate (Benchmark doesn't write it; it's our only rated WC market at launch): do NOT block. Same two-part flow; in place of the WC indication/proposal number show **"[State] WC rates pending"**; PEO/ASO indication shows normally via Axel; submission still completes and routes. Applies at both indication and proposal. Resolves automatically when a WC carrier writing that state is added.

---

## 12. Build order

1. **Launch:** Benchmark WC rating + Axel PEO/ASO indication; per-vertical ranked auto-submit to wholesale PEOs (top 3) + `E`-market manual overflow; two-tier card with per-market threads and manual market selection; Axel manual cherry-pick (section 6a). Config via the assignment grid.
2. **As partners provide rates:** flip to `rated`, enable price ranking and auto-Primary (section 10).

---

## 13. Acceptance tests

- Importing the assignment grid populates per-vertical ranks; a Construction submission auto-submits to Construction's rank 1/2/3 markets; a Cannabis submission auto-submits only to cannabis-writing markets (Vensure/Axel), not the others.
- `E` markets for the vertical appear as an available list with a working "Submit to [market]" action that moves one into an active thread.
- Each active market is its own tab; inbound listener email tagged to a market lands in that market's tab, not just on the deal.
- Market status transitions work (sent then quote_received then declined/no_response then selected); "Select Market" designates one and de-emphasizes the rest without deleting them.
- Axel is not auto-submitted as a wholesale market; the manual "keep account with Axel" action works.
- A NY submission shows "WC rates pending" at indication and proposal, still shows Axel PEO/ASO, still routes.
- Adding/reassigning a market via the grid changes routing with no code change.
- Both light and dark mode; tokens only; typecheck clean.
