/**
 * market-routing.test.ts
 *
 * Pure unit tests for the market routing service.
 * Uses Node.js built-in test runner (node --test).
 * No email sent. No DB mutations. All data is in-memory.
 *
 * Covers:
 *   - normalizeRatingInput (including ratingUnits)
 *   - evaluateAppetiteRules (all-states, all-codes, all-industries coverage semantics)
 *   - WC rate calculation (exact match, no-fallback, multi-unit sum)
 *   - PEO rate calculation
 *   - rankCandidates (sort order, isPrimary, isRouted, premium bands, lane isolation)
 *   - calculateWcRate (direct unit tests)
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  normalizeRatingInput,
  rankCandidates,
  evaluateAppetiteRules,
  calculateWcRate,
  calculatePeoRate,
} from "../lib/market-routing.js";

import type {
  RatingInput,
  WcRatingUnit,
  MarketCandidate,
} from "../lib/market-routing.js";

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

type AppetiteRule = import("@workspace/db").MarketAppetiteRule;
type Market = import("@workspace/db").Market;
type MarketUnderwriter = import("@workspace/db").MarketUnderwriter;
type MarketRateSet = import("@workspace/db").MarketRateSet;
type MarketRateRule = import("@workspace/db").MarketRateRule;

function makeInput(overrides: Partial<RatingInput> = {}): RatingInput {
  return {
    productLane: "WC",
    effectiveDate: "2026-01-01",
    states: ["CA"],
    classCodes: ["5183"],
    annualPayroll: 500_000,
    headcount: 10,
    eMod: 1.0,
    scheduleRating: 1.0,
    ...overrides,
  };
}

function makeMarket(id: string, overrides: Partial<Market> = {}): Market {
  return {
    id,
    name: `Market ${id}`,
    marketType: "WC_CARRIER",
    productLane: "WC",
    partnerId: null,
    orgId: null,
    isActive: true,
    isAppointed: true,
    effectiveDate: "2026-01-01",
    expirationDate: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeUnderwriter(id: string, marketId: string, overrides: Partial<MarketUnderwriter> = {}): MarketUnderwriter {
  return {
    id,
    marketId,
    name: "Test UW",
    email: "uw@test.com",
    userId: null,
    isActive: true,
    effectiveDate: null,
    expirationDate: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

const UW_ID = "uw-fixed-id";

function makeAppetiteRule(
  id: string,
  marketId: string,
  overrides: Partial<AppetiteRule> = {},
): AppetiteRule {
  return {
    id,
    marketId,
    productLane: "WC",
    vertical: null,
    eligibleStates: null,
    eligibleClassCodes: null,
    eligibleIndustries: null,
    payrollMin: null,
    payrollMax: null,
    premiumMin: null,
    premiumMax: null,
    headcountMin: null,
    headcountMax: null,
    appetiteOutcome: "MATCHED",
    conditions: null,
    primaryUnderwriterId: UW_ID,
    isActive: true,
    effectiveDate: null,
    expirationDate: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeRateSet(id: string, marketId: string, version = 1, lane: "WC" | "PEO" = "WC"): MarketRateSet {
  return {
    id,
    marketId,
    productLane: lane,
    sourceType: "MANUAL",
    version,
    status: "ACTIVE",
    effectiveDate: null,
    expirationDate: null,
    sourceRef: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function makeWcRateRule(
  id: string,
  rateSetId: string,
  marketId: string,
  state: string,
  classCode: string,
  baseRate: number,
  minimumPremium = 0,
): MarketRateRule {
  return {
    id,
    rateSetId,
    marketId,
    ruleType: "WC",
    ruleData: { state, classCode, baseRate, minimumPremium },
    displayOrder: 0,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function makePeoRateRule(id: string, rateSetId: string, marketId: string, overrides: Partial<{ wcLoadFactor: number; wfsBasePepm: number; adminFeePercent: number }> = {}): MarketRateRule {
  return {
    id,
    rateSetId,
    marketId,
    ruleType: "PEO",
    ruleData: {
      wcLoadFactor: 0.04,
      wfsBasePepm: 85,
      adminFeePercent: 5,
      ...overrides,
    },
    displayOrder: 0,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/** Build a complete candidate with exact CA/5183 WC rule. */
function makeCandidate(
  marketId: string,
  baseRate: number,
  appetiteOverrides: Partial<AppetiteRule> = {},
  marketOverrides: Partial<Market> = {},
): MarketCandidate {
  const market = makeMarket(marketId, marketOverrides);
  const uw = makeUnderwriter(UW_ID, marketId);
  const rule = makeAppetiteRule(`rule-${marketId}`, marketId, { primaryUnderwriterId: UW_ID, ...appetiteOverrides });
  const rateSet = makeRateSet(`rs-${marketId}`, marketId);
  // Single CA/5183 WC rule with given base rate
  const rateRule = makeWcRateRule(`rr-${marketId}`, rateSet.id, marketId, "CA", "5183", baseRate, 500);
  return {
    market,
    underwriter: uw,
    appetiteMatch: { rule, outcome: "MATCHED" as "MATCHED" | "CONDITIONAL", specificity: 0 },
    rateSet,
    rateRules: [rateRule],
  };
}

// ---------------------------------------------------------------------------
// normalizeRatingInput
// ---------------------------------------------------------------------------

describe("normalizeRatingInput", () => {
  it("accepts valid WC input", () => {
    const r = normalizeRatingInput({ productLane: "WC", effectiveDate: "2026-06-01", states: ["CA", "TX"], annualPayroll: 100000 });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.input.productLane, "WC");
    assert.deepEqual(r.input.states, ["CA", "TX"]);
  });

  it("accepts valid PEO input", () => {
    const r = normalizeRatingInput({ productLane: "PEO", effectiveDate: "2026-06-01", states: ["FL"], headcount: 25, annualPayroll: 750000 });
    assert.equal(r.ok, true);
  });

  it("rejects missing productLane", () => {
    const r = normalizeRatingInput({ effectiveDate: "2026-01-01", states: ["CA"] });
    assert.equal(r.ok, false);
    if (r.ok) return;
    assert.ok(r.errors.some((e) => e.includes("productLane")));
  });

  it("rejects invalid effectiveDate", () => {
    const r = normalizeRatingInput({ productLane: "WC", effectiveDate: "01/01/2026", states: ["CA"] });
    assert.equal(r.ok, false);
  });

  it("rejects empty states array", () => {
    const r = normalizeRatingInput({ productLane: "WC", effectiveDate: "2026-01-01", states: [] });
    assert.equal(r.ok, false);
  });

  it("upcases state codes", () => {
    const r = normalizeRatingInput({ productLane: "WC", effectiveDate: "2026-01-01", states: ["ca"] });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.deepEqual(r.input.states, ["CA"]);
  });

  it("accepts ratingUnits and derives classCodes and totalPayroll", () => {
    const r = normalizeRatingInput({
      productLane: "WC",
      effectiveDate: "2026-06-01",
      states: ["CA", "TX"],
      ratingUnits: [
        { state: "ca", classCode: "5183", annualPayroll: 300_000 },
        { state: "TX", classCode: "8810", annualPayroll: 200_000 },
      ],
    });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.deepEqual(r.input.ratingUnits![0].state, "CA");
    assert.deepEqual(r.input.ratingUnits![1].state, "TX");
    assert.equal(r.input.annualPayroll, 500_000);
    assert.deepEqual(r.input.classCodes?.sort(), ["5183", "8810"]);
  });

  it("rejects ratingUnits with missing state", () => {
    const r = normalizeRatingInput({
      productLane: "WC",
      effectiveDate: "2026-01-01",
      states: ["CA"],
      ratingUnits: [{ state: "C", classCode: "5183", annualPayroll: 100_000 }],
    });
    assert.equal(r.ok, false);
    if (r.ok) return;
    assert.ok(r.errors.some((e) => e.includes("state")));
  });

  it("rejects ratingUnits with negative payroll", () => {
    const r = normalizeRatingInput({
      productLane: "WC",
      effectiveDate: "2026-01-01",
      states: ["CA"],
      ratingUnits: [{ state: "CA", classCode: "5183", annualPayroll: -100 }],
    });
    assert.equal(r.ok, false);
  });

  it("rejects empty ratingUnits array", () => {
    const r = normalizeRatingInput({ productLane: "WC", effectiveDate: "2026-01-01", states: ["CA"], ratingUnits: [] });
    assert.equal(r.ok, false);
  });
});

// ---------------------------------------------------------------------------
// evaluateAppetiteRules — all-values coverage semantics
// ---------------------------------------------------------------------------

describe("evaluateAppetiteRules — ALL-values coverage semantics", () => {
  it("unconstrained rule (null eligibleStates) matches any states", () => {
    const rule = makeAppetiteRule("r1", "m1");
    const input = makeInput({ states: ["CA", "TX", "FL"] });
    const result = evaluateAppetiteRules([rule], input);
    assert.ok(!("excluded" in result), "should match");
  });

  it("constrained eligibleStates: ALL submission states must be covered", () => {
    // Rule covers CA only; submission has CA+TX → should NOT match (TX not covered)
    const rule = makeAppetiteRule("r1", "m1", { eligibleStates: ["CA"] });
    const input = makeInput({ states: ["CA", "TX"] });
    const result = evaluateAppetiteRules([rule], input);
    assert.ok("excluded" in result, "should be excluded");
    assert.equal((result as { reason: string }).reason, "NO_APPETITE_MATCH");
  });

  it("constrained eligibleStates: all states covered → matches", () => {
    const rule = makeAppetiteRule("r1", "m1", { eligibleStates: ["CA", "TX"] });
    const input = makeInput({ states: ["CA", "TX"] });
    const result = evaluateAppetiteRules([rule], input);
    assert.ok(!("excluded" in result));
  });

  it("constrained eligibleClassCodes: ALL submission codes must be covered", () => {
    const rule = makeAppetiteRule("r1", "m1", { eligibleClassCodes: ["5183"] });
    const input = makeInput({ classCodes: ["5183", "8810"] }); // 8810 not in rule
    const result = evaluateAppetiteRules([rule], input);
    assert.ok("excluded" in result);
  });

  it("constrained eligibleClassCodes: all codes covered → matches", () => {
    const rule = makeAppetiteRule("r1", "m1", { eligibleClassCodes: ["5183", "8810"] });
    const input = makeInput({ classCodes: ["5183"] }); // subset is fine
    const result = evaluateAppetiteRules([rule], input);
    assert.ok(!("excluded" in result));
  });

  it("constrained eligibleClassCodes with no classCodes in input → no match", () => {
    // Rule constrains codes, but submission provides none → should not match
    const rule = makeAppetiteRule("r1", "m1", { eligibleClassCodes: ["5183"] });
    const input = makeInput({ classCodes: undefined });
    const result = evaluateAppetiteRules([rule], input);
    assert.ok("excluded" in result, "constrained rule should not match when input provides no class codes");
  });

  it("constrained eligibleIndustries: ALL submission industries must be covered", () => {
    const rule = makeAppetiteRule("r1", "m1", { eligibleIndustries: ["construction"] });
    const input = makeInput({ industries: ["construction", "manufacturing"] });
    const result = evaluateAppetiteRules([rule], input);
    assert.ok("excluded" in result);
  });

  it("constrained eligibleIndustries with no industries in input → no match", () => {
    const rule = makeAppetiteRule("r1", "m1", { eligibleIndustries: ["construction"] });
    const input = makeInput({ industries: undefined });
    const result = evaluateAppetiteRules([rule], input);
    assert.ok("excluded" in result);
  });

  it("REFERRAL outcome → excluded with REFERRAL_ONLY", () => {
    const rule = makeAppetiteRule("r1", "m1", { appetiteOutcome: "REFERRAL" });
    const result = evaluateAppetiteRules([rule], makeInput());
    assert.ok("excluded" in result);
    assert.equal((result as { reason: string }).reason, "REFERRAL_ONLY");
  });

  it("CONDITIONAL with unsatisfied conditions → excluded", () => {
    const rule = makeAppetiteRule("r1", "m1", {
      appetiteOutcome: "CONDITIONAL",
      conditions: [{ field: "annualPayroll", op: "gte", value: 1_000_000 }],
    });
    const input = makeInput({ annualPayroll: 500_000 }); // below threshold
    const result = evaluateAppetiteRules([rule], input);
    assert.ok("excluded" in result);
  });

  it("CONDITIONAL with satisfied conditions → matches", () => {
    const rule = makeAppetiteRule("r1", "m1", {
      appetiteOutcome: "CONDITIONAL",
      conditions: [{ field: "annualPayroll", op: "gte", value: 100_000 }],
    });
    const input = makeInput({ annualPayroll: 500_000 });
    const result = evaluateAppetiteRules([rule], input);
    assert.ok(!("excluded" in result));
    if ("excluded" in result) return;
    assert.equal(result.outcome, "CONDITIONAL");
  });

  it("inactive rule does not match", () => {
    const rule = makeAppetiteRule("r1", "m1", { isActive: false });
    const result = evaluateAppetiteRules([rule], makeInput());
    assert.ok("excluded" in result);
  });

  it("out-of-date-range rule does not match", () => {
    const rule = makeAppetiteRule("r1", "m1", { expirationDate: "2025-12-31" });
    const input = makeInput({ effectiveDate: "2026-01-01" });
    const result = evaluateAppetiteRules([rule], input);
    assert.ok("excluded" in result);
  });

  it("payroll band excludes below minimum", () => {
    const rule = makeAppetiteRule("r1", "m1", { payrollMin: "1000000" });
    const input = makeInput({ annualPayroll: 500_000 });
    const result = evaluateAppetiteRules([rule], input);
    assert.ok("excluded" in result);
  });

  it("headcount band excludes above maximum", () => {
    const rule = makeAppetiteRule("r1", "m1", { headcountMax: 50 });
    const input = makeInput({ headcount: 100 });
    const result = evaluateAppetiteRules([rule], input);
    assert.ok("excluded" in result);
  });

  it("more specific rule wins over less specific", () => {
    const broad = makeAppetiteRule("r-broad", "m1", { id: "r-broad" });
    const specific = makeAppetiteRule("r-specific", "m1", {
      id: "r-specific",
      eligibleStates: ["CA"],
      eligibleClassCodes: ["5183"],
    });
    const result = evaluateAppetiteRules([broad, specific], makeInput());
    assert.ok(!("excluded" in result));
    if ("excluded" in result) return;
    assert.equal(result.rule.id, "r-specific");
  });

  it("detects conflicting equally-specific rules (different outcome)", () => {
    const r1 = makeAppetiteRule("r1", "m1", { eligibleStates: ["CA"] });
    const r2 = makeAppetiteRule("r2", "m1", {
      eligibleStates: ["CA"],
      appetiteOutcome: "CONDITIONAL",
      conditions: [],
    });
    const input = makeInput({ states: ["CA"] });
    const result = evaluateAppetiteRules([r1, r2], input);
    // Two equally-specific rules with different outcomes → conflict → excluded
    assert.ok("excluded" in result);
    assert.equal((result as { reason: string }).reason, "NO_APPETITE_MATCH");
  });
});

// ---------------------------------------------------------------------------
// calculateWcRate — exact match, no fallback, multi-unit sum
// ---------------------------------------------------------------------------

describe("calculateWcRate — exact-match and no-fallback", () => {
  const rules: MarketRateRule[] = [
    makeWcRateRule("r-ca-5183", "rs1", "m1", "CA", "5183", 2.0, 0),
    makeWcRateRule("r-tx-8810", "rs1", "m1", "TX", "8810", 1.5, 0),
  ];

  it("exact match CA/5183 → correct premium", () => {
    const input = makeInput({ states: ["CA"], classCodes: ["5183"], annualPayroll: 100_000 });
    const result = calculateWcRate(rules, input);
    assert.ok(!("error" in result), `expected no error, got: ${"error" in result ? (result as { error: string }).error : ""}`);
    if ("error" in result) return;
    // 100_000 / 100 * 2.0 = 2000
    assert.equal(result.comparableAnnualAmount, 2000);
  });

  it("exact match TX/8810 → correct premium", () => {
    const input = makeInput({ states: ["TX"], classCodes: ["8810"], annualPayroll: 200_000 });
    const result = calculateWcRate(rules, input);
    assert.ok(!("error" in result));
    if ("error" in result) return;
    // 200_000 / 100 * 1.5 = 3000
    assert.equal(result.comparableAnnualAmount, 3000);
  });

  it("no-fallback: missing state returns error, not first rule result", () => {
    const input = makeInput({ states: ["FL"], classCodes: ["5183"], annualPayroll: 100_000 });
    const result = calculateWcRate(rules, input);
    assert.ok("error" in result, "expected an error result for missing FL/5183 rule");
    assert.ok((result as { error: string }).error.includes("FL/5183"));
  });

  it("no-fallback: wrong classCode returns error", () => {
    const input = makeInput({ states: ["CA"], classCodes: ["9999"], annualPayroll: 100_000 });
    const result = calculateWcRate(rules, input);
    assert.ok("error" in result, "expected error for CA/9999");
  });

  it("no-fallback: missing classCodes returns error", () => {
    const input = makeInput({ states: ["CA"], classCodes: undefined, annualPayroll: 100_000 });
    const result = calculateWcRate(rules, input);
    assert.ok("error" in result, "expected error when no classCodes provided");
  });

  it("minimumPremium floor applied", () => {
    const rulesWithMin = [makeWcRateRule("r1", "rs1", "m1", "CA", "5183", 1.0, 5000)];
    // 10_000 / 100 * 1.0 = 100 < minimum 5000
    const input = makeInput({ states: ["CA"], classCodes: ["5183"], annualPayroll: 10_000 });
    const result = calculateWcRate(rulesWithMin, input);
    assert.ok(!("error" in result));
    if ("error" in result) return;
    assert.equal(result.comparableAnnualAmount, 5000);
  });

  it("multi-unit sum: two different state/class units summed correctly", () => {
    const units: WcRatingUnit[] = [
      { state: "CA", classCode: "5183", annualPayroll: 100_000 },
      { state: "TX", classCode: "8810", annualPayroll: 200_000 },
    ];
    const input: RatingInput = {
      productLane: "WC",
      effectiveDate: "2026-01-01",
      states: ["CA", "TX"],
      ratingUnits: units,
      annualPayroll: 300_000,
      eMod: 1.0,
      scheduleRating: 1.0,
    };
    const result = calculateWcRate(rules, input);
    assert.ok(!("error" in result));
    if ("error" in result) return;
    // CA: 100_000/100 * 2.0 = 2000; TX: 200_000/100 * 1.5 = 3000; total = 5000
    assert.equal(result.comparableAnnualAmount, 5000);
  });

  it("multi-unit: one unit missing coverage → entire calculation fails", () => {
    const units: WcRatingUnit[] = [
      { state: "CA", classCode: "5183", annualPayroll: 100_000 },
      { state: "FL", classCode: "8810", annualPayroll: 50_000 }, // FL not in rules
    ];
    const input: RatingInput = {
      productLane: "WC",
      effectiveDate: "2026-01-01",
      states: ["CA", "FL"],
      ratingUnits: units,
      annualPayroll: 150_000,
      eMod: 1.0,
      scheduleRating: 1.0,
    };
    const result = calculateWcRate(rules, input);
    assert.ok("error" in result, "entire calculation must fail if any unit has no rule");
    assert.ok((result as { error: string }).error.includes("FL/8810"));
  });

  it("eMod applied correctly across units", () => {
    const units: WcRatingUnit[] = [
      { state: "CA", classCode: "5183", annualPayroll: 100_000 },
    ];
    const input: RatingInput = {
      productLane: "WC",
      effectiveDate: "2026-01-01",
      states: ["CA"],
      ratingUnits: units,
      annualPayroll: 100_000,
      eMod: 1.25,
      scheduleRating: 1.0,
    };
    const result = calculateWcRate(rules, input);
    assert.ok(!("error" in result));
    if ("error" in result) return;
    // 100_000/100 * 2.0 * 1.25 = 2500
    assert.equal(result.comparableAnnualAmount, 2500);
  });

  it("returns error when WC lane has no rules at all", () => {
    const input = makeInput({ states: ["CA"], classCodes: ["5183"], annualPayroll: 100_000 });
    const result = calculateWcRate([], input);
    assert.ok("error" in result);
  });
});

// ---------------------------------------------------------------------------
// rankCandidates — ranking order
// ---------------------------------------------------------------------------

describe("rankCandidates — ranking order", () => {
  it("sorts by generated rate ascending", () => {
    const input = makeInput({ annualPayroll: 100_000 });
    // CA/5183 rules with different base rates; payroll 100_000 → premium = payroll/100 * rate
    const candidates = [
      makeCandidate("m-1", 5.0),   // 5000
      makeCandidate("m-2", 2.0),   // 2000 → rank 1
      makeCandidate("m-3", 3.5),   // 3500
    ];
    const { ranked } = rankCandidates(candidates, input);
    assert.equal(ranked.length, 3);
    assert.equal(ranked[0].marketId, "m-2");
    assert.equal(ranked[1].marketId, "m-3");
    assert.equal(ranked[2].marketId, "m-1");
    assert.equal(ranked[0].rank, 1);
    assert.equal(ranked[0].isPrimary, true);
  });

  it("MATCHED before CONDITIONAL at identical rate", () => {
    const input = makeInput({ annualPayroll: 200_000 });
    const m1 = makeCandidate("m-1", 2.0);
    m1.appetiteMatch.outcome = "CONDITIONAL";
    const m2 = makeCandidate("m-2", 2.0);
    m2.appetiteMatch.outcome = "MATCHED";
    const { ranked } = rankCandidates([m1, m2], input);
    assert.equal(ranked[0].marketId, "m-2"); // MATCHED first
    assert.equal(ranked[1].marketId, "m-1"); // CONDITIONAL second
  });

  it("stable market-ID tiebreaker at identical rate and outcome", () => {
    const input = makeInput({ annualPayroll: 200_000 });
    const m1 = makeCandidate("zzz-market", 2.0);
    const m2 = makeCandidate("aaa-market", 2.0);
    const { ranked } = rankCandidates([m1, m2], input);
    assert.equal(ranked[0].marketId, "aaa-market");
    assert.equal(ranked[1].marketId, "zzz-market");
  });

  it("isPrimary true only for rank 1", () => {
    const input = makeInput({ annualPayroll: 100_000 });
    const candidates = [makeCandidate("m-1", 1.0), makeCandidate("m-2", 2.0), makeCandidate("m-3", 3.0)];
    const { ranked } = rankCandidates(candidates, input);
    assert.equal(ranked.filter((r) => r.isPrimary).length, 1);
    assert.equal(ranked[0].isPrimary, true);
    assert.equal(ranked[1].isPrimary, false);
  });

  it("isRouted true for ranks 1-4, false for rank 5+", () => {
    const input = makeInput({ annualPayroll: 100_000 });
    const candidates = Array.from({ length: 6 }, (_, i) => makeCandidate(`m-${i}`, i + 1));
    const { ranked } = rankCandidates(candidates, input);
    assert.equal(ranked.length, 6);
    for (const r of ranked) {
      if (r.rank <= 4) assert.equal(r.isRouted, true, `rank ${r.rank} should be routed`);
      else assert.equal(r.isRouted, false, `rank ${r.rank} should not be routed`);
    }
  });

  it("all candidates routed when fewer than 4", () => {
    const input = makeInput({ annualPayroll: 100_000 });
    const candidates = [makeCandidate("m-1", 1.0), makeCandidate("m-2", 2.0)];
    const { ranked } = rankCandidates(candidates, input);
    assert.equal(ranked[0].isRouted, true);
    assert.equal(ranked[1].isRouted, true);
  });

  it("returns empty ranked and no exclusions for empty candidates", () => {
    const { ranked, exclusions } = rankCandidates([], makeInput());
    assert.equal(ranked.length, 0);
    assert.equal(exclusions.length, 0);
  });

  it("rank values are sequential 1..N", () => {
    const input = makeInput({ annualPayroll: 100_000 });
    const candidates = [makeCandidate("m-1", 1.0), makeCandidate("m-2", 2.0), makeCandidate("m-3", 3.0)];
    const { ranked } = rankCandidates(candidates, input);
    ranked.forEach((r, i) => assert.equal(r.rank, i + 1));
  });
});

// ---------------------------------------------------------------------------
// rankCandidates — no-fallback exclusion via candidate
// ---------------------------------------------------------------------------

describe("rankCandidates — no-fallback WC exclusion", () => {
  it("market excluded when no exact WC rule for supplied state/classCode", () => {
    // Candidate has a TX/8810 rule but input asks for CA/5183
    const input = makeInput({ states: ["CA"], classCodes: ["5183"], annualPayroll: 100_000 });
    const market = makeMarket("m-bad");
    const uw = makeUnderwriter(UW_ID, "m-bad");
    const rule = makeAppetiteRule("rule-bad", "m-bad");
    const rateSet = makeRateSet("rs-bad", "m-bad");
    const rateRule = makeWcRateRule("rr-bad", rateSet.id, "m-bad", "TX", "8810", 2.0);
    const candidate: MarketCandidate = {
      market, underwriter: uw,
      appetiteMatch: { rule, outcome: "MATCHED", specificity: 0 },
      rateSet, rateRules: [rateRule],
    };
    const { ranked, exclusions } = rankCandidates([candidate], input);
    assert.equal(ranked.length, 0);
    assert.equal(exclusions.length, 1);
    assert.equal(exclusions[0].reason, "RATE_CALCULATION_ERROR");
    assert.ok(exclusions[0].detail?.includes("CA/5183"), `detail should mention CA/5183, got: ${exclusions[0].detail}`);
  });

  it("partial multi-unit coverage: any missing unit excludes entire market", () => {
    // Market has CA/5183 rule but NOT TX/8810
    const input: RatingInput = {
      productLane: "WC",
      effectiveDate: "2026-01-01",
      states: ["CA", "TX"],
      ratingUnits: [
        { state: "CA", classCode: "5183", annualPayroll: 100_000 },
        { state: "TX", classCode: "8810", annualPayroll: 200_000 },
      ],
      annualPayroll: 300_000,
      eMod: 1.0,
      scheduleRating: 1.0,
    };
    const market = makeMarket("m-partial");
    const uw = makeUnderwriter(UW_ID, "m-partial");
    const rule = makeAppetiteRule("rule-partial", "m-partial", {
      eligibleStates: ["CA", "TX"],
    });
    const rateSet = makeRateSet("rs-partial", "m-partial");
    // Only has CA/5183; no TX/8810
    const rateRule = makeWcRateRule("rr-partial", rateSet.id, "m-partial", "CA", "5183", 2.0);
    const candidate: MarketCandidate = {
      market, underwriter: uw,
      appetiteMatch: { rule, outcome: "MATCHED", specificity: 8 },
      rateSet, rateRules: [rateRule],
    };
    const { ranked, exclusions } = rankCandidates([candidate], input);
    assert.equal(ranked.length, 0, "should be excluded since TX/8810 has no rule");
    assert.equal(exclusions.length, 1);
    assert.equal(exclusions[0].reason, "RATE_CALCULATION_ERROR");
    assert.ok(exclusions[0].detail?.includes("TX/8810"));
  });

  it("multi-unit sum: two units each with valid rules → both included", () => {
    const input: RatingInput = {
      productLane: "WC",
      effectiveDate: "2026-01-01",
      states: ["CA", "TX"],
      ratingUnits: [
        { state: "CA", classCode: "5183", annualPayroll: 100_000 },
        { state: "TX", classCode: "8810", annualPayroll: 200_000 },
      ],
      annualPayroll: 300_000,
      eMod: 1.0,
      scheduleRating: 1.0,
    };
    const market = makeMarket("m-multi");
    const uw = makeUnderwriter(UW_ID, "m-multi");
    const rule = makeAppetiteRule("rule-multi", "m-multi", { eligibleStates: ["CA", "TX"] });
    const rateSet = makeRateSet("rs-multi", "m-multi");
    const rules = [
      makeWcRateRule("r-ca", rateSet.id, "m-multi", "CA", "5183", 2.0), // 2000
      makeWcRateRule("r-tx", rateSet.id, "m-multi", "TX", "8810", 1.5), // 3000
    ];
    const candidate: MarketCandidate = {
      market, underwriter: uw,
      appetiteMatch: { rule, outcome: "MATCHED", specificity: 8 },
      rateSet, rateRules: rules,
    };
    const { ranked, exclusions } = rankCandidates([candidate], input);
    assert.equal(exclusions.length, 0, `unexpected exclusions: ${JSON.stringify(exclusions)}`);
    assert.equal(ranked.length, 1);
    assert.equal(ranked[0].generatedRate, 5000); // 2000 + 3000
  });
});

// ---------------------------------------------------------------------------
// rankCandidates — product-lane isolation
// ---------------------------------------------------------------------------

describe("rankCandidates — product-lane isolation", () => {
  it("PEO rate rules used for PEO input", () => {
    const input = makeInput({ productLane: "PEO", headcount: 20, annualPayroll: 600_000 });
    const market = makeMarket("m-peo", { marketType: "PEO_PROGRAM", productLane: "PEO" });
    const uw = makeUnderwriter(UW_ID, "m-peo");
    const rule = makeAppetiteRule("rule-peo", "m-peo", { productLane: "PEO" });
    const rateSet = makeRateSet("rs-peo", "m-peo", 1, "PEO");
    const rateRule = makePeoRateRule("rr-peo", rateSet.id, "m-peo");
    const candidate: MarketCandidate = {
      market, underwriter: uw,
      appetiteMatch: { rule, outcome: "MATCHED", specificity: 0 },
      rateSet, rateRules: [rateRule],
    };
    const { ranked, exclusions } = rankCandidates([candidate], input);
    assert.equal(ranked.length, 1, `exclusions: ${JSON.stringify(exclusions)}`);
    assert.ok(ranked[0].generatedRate > 0);
  });

  it("WC candidate excluded from PEO ranking (no PEO rate rules)", () => {
    const input = makeInput({ productLane: "PEO", headcount: 20, annualPayroll: 600_000 });
    const wcCandidate = makeCandidate("m-wc", 2.0);
    const { ranked, exclusions } = rankCandidates([wcCandidate], input);
    assert.equal(ranked.length, 0);
    assert.equal(exclusions.length, 1);
    assert.equal(exclusions[0].reason, "RATE_CALCULATION_ERROR");
  });
});

// ---------------------------------------------------------------------------
// rankCandidates — premium band filtering
// ---------------------------------------------------------------------------

describe("rankCandidates — premium band filtering", () => {
  it("excludes below minimum premium", () => {
    // 100_000/100 * 1.0 = 1000 < premiumMin 5000
    const input = makeInput({ annualPayroll: 100_000 });
    const c = makeCandidate("m-1", 1.0, { premiumMin: "5000" });
    const { ranked, exclusions } = rankCandidates([c], input);
    assert.equal(ranked.length, 0);
    assert.equal(exclusions[0].reason, "PREMIUM_BAND_FAIL");
  });

  it("excludes above maximum premium", () => {
    // 100_000/100 * 5.0 = 5000 > premiumMax 2000
    const input = makeInput({ annualPayroll: 100_000 });
    const c = makeCandidate("m-1", 5.0, { premiumMax: "2000" });
    const { ranked, exclusions } = rankCandidates([c], input);
    assert.equal(ranked.length, 0);
    assert.equal(exclusions[0].reason, "PREMIUM_BAND_FAIL");
  });

  it("includes within premium band", () => {
    // 100_000/100 * 2.0 = 2000
    const input = makeInput({ annualPayroll: 100_000 });
    const c = makeCandidate("m-1", 2.0, { premiumMin: "1000", premiumMax: "5000" });
    const { ranked } = rankCandidates([c], input);
    assert.equal(ranked.length, 1);
  });
});

// ---------------------------------------------------------------------------
// rankCandidates — minimumPremium floor via fixture
// ---------------------------------------------------------------------------

describe("rankCandidates — minimumPremium floor", () => {
  it("applies minimum premium when raw premium is below floor", () => {
    // makeCandidate uses minimumPremium: 500
    // 5_000/100 * 2.5 = 125 < 500 → floored to 500
    const input = makeInput({ annualPayroll: 5_000 });
    const c = makeCandidate("m-1", 2.5); // fixture has minimumPremium 500
    const { ranked } = rankCandidates([c], input);
    assert.equal(ranked.length, 1);
    assert.equal(ranked[0].generatedRate, 500);
  });
});

// ---------------------------------------------------------------------------
// rankCandidates — comprehensive snapshot
// ---------------------------------------------------------------------------

describe("rankCandidates — comprehensive snapshot", () => {
  it("5 markets: ascending rates, correct rank/isPrimary/isRouted", () => {
    const input = makeInput({ annualPayroll: 1_000_000 });
    const rates = [4.0, 1.5, 3.0, 2.0, 5.0];
    const candidates = rates.map((rate, i) => makeCandidate(`m-${i}`, rate));
    const { ranked, exclusions } = rankCandidates(candidates, input);
    assert.equal(exclusions.length, 0);
    assert.equal(ranked.length, 5);
    for (let i = 1; i < ranked.length; i++) {
      assert.ok(ranked[i].generatedRate >= ranked[i - 1].generatedRate, `rank ${i + 1} should have rate >= rank ${i}`);
    }
    assert.equal(ranked[0].isPrimary, true);
    assert.equal(ranked[4].isPrimary, false);
    assert.equal(ranked[3].isRouted, true);
    assert.equal(ranked[4].isRouted, false);
    ranked.forEach((r, i) => assert.equal(r.rank, i + 1));
  });
});
