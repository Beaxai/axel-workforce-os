# RATING ENGINE UPDATE — BENCHMARK 2026 RATES + CA TERRITORIAL RATING

This work order has two parts. Complete Part 1 fully (including its acceptance tests) before starting Part 2.

Two files have been uploaded to the project:
- **BIC_2026_Rates.csv** — replacement WC base rate table
- **CA_Territorial_Rates.csv** — new California territorial rating schedule

---

# PART 1 — REPLACE THE WC BASE RATE TABLE

## Context (no prior knowledge assumed)

This platform has a WC rating engine whose rate data lives in a PostgreSQL table (Replit PostgreSQL + Drizzle ORM) originally imported from BIC.csv (Benchmark Insurance Company rates). Benchmark has issued new 2026 rates in **BIC_2026_Rates.csv**. Schema:

`State, EffectiveDate, ClassCode, Description, Base Rate`

The file contains **25,093 valid data rows** plus 60 fully blank rows (intentionally cleared — codes with no description were removed). Skip any row with an empty ClassCode during import.

## Requirements

1. **Back up before touching anything.** Before any write, copy the current rate table to a timestamped backup table (e.g., `rates_backup_20260610`). Report the backup table name and its row count when done.

2. **Full replace, not merge.** Truncate the existing rate table and import all valid rows from BIC_2026_Rates.csv. Do NOT upsert row-by-row against the old data. Skip blank rows (empty ClassCode); import everything else exactly as provided.

3. **ClassCode must be stored as TEXT, exactly as it appears in the CSV.** Codes are zero-padded to 4 digits (e.g., `0005`, `0035`, `8810`). Do not cast the column to integer — that would strip the leading zeros. If the existing column is numeric, migrate it to text as part of this task. The rating engine's class code lookup must normalize both sides: trim whitespace and strip leading zeros for comparison, so a quote entered as `35`, `0035`, or `35.0` resolves to the same stored code `0035`.

4. **Duplicate keys are intentional.** 86 State + ClassCode combinations appear twice — once with the standard NCCI description and once with a cannabis-specific description (e.g., AK 2003 "Bakery and Drivers" and AK 2003 "Manufacturer of cannabis-infused baked goods"). Both rows carry the identical rate. Import both rows. Rate lookups must return one rate per State + ClassCode; do not error or dedupe on import.

5. **EffectiveDate is reference-only.** It must NOT be used to filter or select rates. The standing rule is unchanged: always use the most recent rate per State + ClassCode. Dates in the file legitimately span 2024–2026 (carrier filing dates vary by state) — this is correct data, do not "fix" it.

6. **Removed codes will miss.** 60 codes that existed in the old table (e.g., CA 7227A/7227B, MN 6845F) were intentionally removed. If a quote requests a code not in the table, the engine's existing miss behavior stands — do not infer or substitute rates.

7. **Do not touch historical data.** Existing quotes, policies, and their stored `rating_breakdown` JSON must remain exactly as they are. This update affects new rate lookups only.

## Part 1 Acceptance Tests — run all, report results

1. Row count in the rate table = **25,093**.
2. ClassCode column type is TEXT and `SELECT` returns `0035` (with leading zeros), not `35`.
3. Lookup `AK / 0035` → Base Rate = **1.68** (description: "Cultivators (Farm - Florist & Drivers)"). Lookup with input `35` (no padding) returns the same rate.
4. Lookup `AK / 2003` → returns rate **2.53** (duplicate-key case — must return one rate, not an error).
5. Lookup `VA / 7228` → Base Rate = **3.22**.
6. Lookup `DE / 9740` (Terrorism) → Base Rate = **0.01**.
7. Lookup `CA / 7227A` → no match; confirm the engine handles the miss gracefully (no crash, clear no-rate response).
8. Minimum premium ($500) still applies on a small test quote.
9. Report the backup table name and row count.

---

# PART 2 — CALIFORNIA TERRITORIAL RATING FACTOR

## Context

California WC pricing for this carrier includes a territorial rating factor based on the location of the business. The schedule is in **CA_Territorial_Rates.csv**:

`ZipPrefixMin, ZipPrefixMax, Territory, Counties, Multiplier`

12 territories. Territory assignment is by the **first 3 digits of the business ZIP code** (e.g., ZIP 90012 → prefix 900 → Territory 1 → multiplier 1.20). The prefix ranges are continuous from 900 to 961 with no gaps or overlaps. The Counties column is reference text for display only — never use it for matching; ZIP prefix is the sole lookup key.

## Requirements

1. **New table.** Create `ca_territorial_rates` via Drizzle schema + migration with columns: zip_prefix_min (integer), zip_prefix_max (integer), territory (integer), counties (text), multiplier (numeric(4,2)). Import all 12 rows from CA_Territorial_Rates.csv.

2. **Formula change — CA quotes only.** The WC premium formula gains one factor, applied ONLY when the quote state is CA:

   `Premium = (Payroll ÷ 100) × Class Code Rate × EMod × Schedule Rating × Territory Multiplier`

   For all other states the formula is unchanged (equivalently, Territory Multiplier = 1.00 for non-CA).

3. **Lookup logic.** Take the first 3 digits of the business ZIP code as an integer; find the row where `zip_prefix_min <= prefix <= zip_prefix_max`; use that row's multiplier.

4. **Quote input.** CA quotes require a business ZIP code to rate. If the quote flow does not currently capture ZIP at rating time, add it (required field for CA, optional elsewhere). 

5. **Edge cases.** If the state is CA and the ZIP prefix falls outside 900–961 (or ZIP is missing/invalid), do NOT silently default to 1.00 — return a clear rating error identifying the bad ZIP, same pattern as a class code miss. A mispriced bind is worse than a blocked quote.

6. **Audit trail.** The stored `rating_breakdown` JSON must include the territory number, the ZIP prefix used, and the multiplier applied on every CA quote. Non-CA breakdowns are unchanged.

7. **Minimum premium and PEO discount unchanged.** The $500 minimum applies after all factors including territory. The 10% PEO bundled WC discount logic is untouched (it applies to the WC component after the full formula, as currently built).

## Part 2 Acceptance Tests — run all, report results

1. `ca_territorial_rates` row count = **12**.
2. ZIP 90012 (LA) → Territory 1, multiplier **1.20**.
3. ZIP 94105 (San Francisco) → Territory 7, multiplier **0.90**.
4. ZIP 95814 (Sacramento) → Territory 11, multiplier **0.95**.
5. End-to-end CA quote: Payroll $1,000,000, CA class 0035 (Base Rate 7.55), EMod 1.0, Schedule 1.0, ZIP 90012 → Premium = (1,000,000 ÷ 100) × 7.55 × 1.20 = **$90,600.00**. Confirm `rating_breakdown` shows territory 1, prefix 900, multiplier 1.20.
6. Same quote with ZIP 94105 → (1,000,000 ÷ 100) × 7.55 × 0.90 = **$67,950.00**.
7. Non-CA quote (e.g., AK 0035, $500,000 payroll) → Premium = **$8,400.00** with NO territory factor in the breakdown — confirms non-CA states are untouched.
8. CA quote with ZIP 89101 (out of range) → clear rating error, no premium produced.
9. CA quote with missing ZIP → clear rating error prompting for ZIP.

---

## What NOT to do (both parts)

- Do not change any other rating formulas, UI screens, or quote flow beyond what Part 2 specifies.
- Do not delete the backup table.
- Do not "improve," reformat, or dedupe either CSV — import as provided (blank rows in the rate file excepted).
- Do not strip leading zeros from class codes anywhere in the pipeline.
- Do not apply the territorial multiplier to any state other than CA.

When complete, reply with: backup table name + row count, both import row counts, and pass/fail on all 18 acceptance tests (9 + 9).
