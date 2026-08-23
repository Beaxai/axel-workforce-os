# Verbatim Multi-Market Routing Reference

The following source text is intentionally preserved word for word. Use it as
planning context for carrier eligibility, market ranking, routing, and
market-specific correspondence.

```text
Two connected things here: the answer to the eligibility-filter prompt on screen, and the full multi-market routing architecture it belongs to — including how to store the ranking so every screen reads from one source. Build all of it together.

ELIGIBILITY FILTERS (the on-screen question)
Check all five, including "Class code or industry" — our carriers and PEO programs are assigned to verticals by underwriting appetite, which is class-code/industry driven, so that's a required match, not optional. In the "other matching rule" box, add payroll/premium range and headcount, since appetite can depend on size. So: selected vertical/product, applicant's state, class code/industry, carrier active/appointed, carrier has a submission email contact — all required.

SCALE CONTEXT
We will have roughly 8 PEO programs (an underwriter each) and at least 3 standalone WC carriers (about 3 underwriters each), assigned to marketplace verticals by underwriting appetite. Any submission may have many eligible markets — the system has to rank and choose among them, not just filter.

PRIMARY / SECONDARY MARKET LOGIC
1. From the eligible, appetite-matched, approved markets, rank by generated rate, lowest first.
2. The lowest-rate market is the PRIMARY market. The user only ever sees the Primary market's rates — at the indication screen and at the final proposal screen. They never see the other markets.
3. On submission completion, the complete submission goes to the Primary underwriter PLUS the 3 next markets whose rates are closest to the Primary (ranks 2–4). Four total.
4. Send sequence is prioritized: Primary first, then the three secondaries. Not a simultaneous blast.

PER-MARKET COMMUNICATION TABS (deal card)
On the deal card Overview/communication section, add a tab per market at the top; clicking a market's tab shows only the correspondence between us and that market's underwriter. Primary tab first, then secondaries in rank order. Inbound listener emails and outbound sends thread into the correct market's tab.

Keep it safe as you proposed: only active carriers with a configured routing contact and matching appetite are eligible, and the activity log shows exactly which markets received the submission and when.

HOW TO STORE THE RANKING
Build this as its own table rather than fields on the deal — it's a one-to-many (many markets per deal), and every screen reads from this one source.

NEW TABLE: deal_markets (Drizzle) — one row per eligible market per deal, generated at rating time. Suggested columns:
- id, deal_id (FK)
- market_id (FK to the carrier / PEO program)
- market_type (WC carrier | PEO program)
- underwriter_id (assigned underwriter for this market on this deal)
- generated_rate (rated premium for this market)
- rank (integer; 1 = lowest rate = Primary, then 2, 3, 4 by ascending rate)
- is_primary (boolean; true only where rank = 1 — convenience flag)
- is_routed (boolean; true for Primary + the 3 next-closest that receive the submission)
- appetite_status (matched | referral | conditional)
- send_status, sent_at (per-market dispatch tracking for the prioritized send)
- created_at, updated_at

RULES
1. Rows generated at rating time, ranked by ascending generated_rate among eligible/approved markets.
2. rank = 1 is Primary and is the ONLY market whose rates the user sees. Indication and proposal screens both query deal_markets WHERE deal_id = ? AND is_primary = true.
3. Routing sends to is_routed = true rows (Primary + next 3), dispatched in rank order — Primary first.
4. Comm tabs render one tab per is_routed row, ordered by rank, filtering activity/emails by market_id. Add a market_id column to the relevant activity/email records so threads route to the correct tab.
5. Fewer than 4 eligible markets: route to all of them.
6. Rate ties: break by appetite strength (matched beats conditional), so ranking is deterministic.
7. Re-rating regenerates and re-ranks the deal_markets rows for the deal.

One thing to confirm back to me: item 4 (market_id on activity/email records) needs to fit cleanly with the P5 listener-email ingestion — inbound carrier replies now have to land in the right market's tab, not just on the deal. If that creates any conflict with how you've structured ingestion, flag it before you wire it.
```