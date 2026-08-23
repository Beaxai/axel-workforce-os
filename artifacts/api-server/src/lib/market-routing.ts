/**
 * market-routing.ts
 *
 * Core market routing service: appetite matching, rate calculation,
 * ranking, and provisional deal-markets persistence.
 *
 * Correctness invariants enforced here:
 *   - WC rating requires an exact state+classCode rule per rating unit. No
 *     fallback to a first/default rule. Missing coverage → RATE_CALCULATION_ERROR.
 *   - ratingUnits drives multi-location WC; single-location is a special case
 *     of one unit. Total premium = sum of all units.
 *   - Appetite constrained dimensions (eligibleStates, eligibleClassCodes,
 *     eligibleIndustries) must cover ALL submission values, not merely any one.
 *     A constrained dimension cannot match when the corresponding input is absent.
 *   - A matched appetite rule MUST have a configured primaryUnderwriterId that
 *     resolves to an active, effective underwriter in the same market.
 *     There is no first-underwriter fallback.
 *
 * This module does NOT send email or touch dispatch records.
 */

import { db } from "@workspace/db";
import {
  marketsTable,
  marketUnderwritersTable,
  marketAppetiteRulesTable,
  marketRateSetsTable,
  marketRateRulesTable,
  dealMarketsTable,
} from "@workspace/db";
import { and, eq } from "drizzle-orm";
import type {
  Market,
  MarketUnderwriter,
  MarketAppetiteRule,
  MarketRateSet,
  MarketRateRule,
  InsertDealMarket,
} from "@workspace/db";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** One applicant rating unit (one state + class code + payroll). */
export interface WcRatingUnit {
  state: string;       // 2-char uppercase US state code
  classCode: string;
  annualPayroll: number;
}

export interface RatingInput {
  productLane: "WC" | "PEO";
  vertical?: string | null;
  /** Effective date for appetite and rate-set selection. ISO YYYY-MM-DD. */
  effectiveDate: string;
  /**
   * Primary list of US state codes present in the submission.
   * Derived from ratingUnits for WC; provided directly for PEO / appetite.
   */
  states: string[];
  /**
   * Explicit per-unit breakdown for WC rating.
   * When provided, rating iterates each unit and sums premiums.
   * When absent for WC, the first state+first classCode+annualPayroll are used
   * as a single implicit unit (legacy single-location path).
   */
  ratingUnits?: WcRatingUnit[];
  classCodes?: string[];
  industries?: string[];
  /** Total annual payroll across all units (used for PEO and payroll-band appetite). */
  annualPayroll?: number;
  headcount?: number;
  /** WC experience modification factor. Applied to all units. */
  eMod?: number;
  /** Schedule rating modifier. Applied to all units. */
  scheduleRating?: number;
  /** Hash of the validated canonical carrier application used for this rating. */
  applicationSnapshotHash?: string;
}

export type ExclusionReason =
  | "MARKET_INACTIVE"
  | "MARKET_UNAPPOINTED"
  | "NO_ACTIVE_UNDERWRITER"
  | "NO_APPETITE_MATCH"
  | "REFERRAL_ONLY"
  | "CONDITIONAL_UNSATISFIED"
  | "PREMIUM_BAND_FAIL"
  | "RATE_CALCULATION_ERROR"
  | "NO_ACTIVE_RATE_SET";

export interface MarketExclusion {
  marketId: string;
  marketName: string;
  reason: ExclusionReason;
  detail?: string;
}

export interface WcRuleData {
  state: string;
  classCode: string;
  baseRate: number;
  scheduleRatingMin?: number;
  scheduleRatingMax?: number;
  eModMin?: number;
  eModMax?: number;
  minimumPremium?: number;
  stateMultiplier?: number;
}

export interface PeoRuleData {
  wcLoadFactor: number;
  wfsBasePepm: number;
  wfsHeadcountDiscount?: number;
  minimumAnnualWc?: number;
  adminFeePercent?: number;
}

export interface NormalizedRateResult {
  marketId: string;
  productLane: "WC" | "PEO";
  /** Comparable generated annual amount used for ranking. */
  comparableAnnualAmount: number;
  /** Pricing components for display. */
  pricingComponents: Record<string, number | string>;
  breakdown: Record<string, unknown>;
  rateSetId: string;
  rateSetVersion: number;
  calculatedAt: string;
  warnings: string[];
}

export interface RankedMarketResult {
  rank: number;
  isPrimary: boolean;
  isRouted: boolean;
  marketId: string;
  marketName: string;
  marketType: string;
  appetiteOutcome: "MATCHED" | "CONDITIONAL";
  matchedRuleId: string;
  assignedUnderwriterId: string;
  rateSetId: string;
  rateSetVersion: number;
  generatedRate: number;
  rateBreakdownSnapshot: Record<string, unknown>;
}

export interface RankingResult {
  productLane: "WC" | "PEO";
  ranked: RankedMarketResult[];
  exclusions: MarketExclusion[];
  simulatedAt: string;
}

// ---------------------------------------------------------------------------
// Input validation and normalization
// ---------------------------------------------------------------------------

function isValidDateStr(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function isValidState(s: unknown): s is string {
  return typeof s === "string" && s.length === 2;
}

export function normalizeRatingInput(raw: unknown): { ok: true; input: RatingInput } | { ok: false; errors: string[] } {
  const errors: string[] = [];

  if (!raw || typeof raw !== "object") {
    return { ok: false, errors: ["Input must be an object"] };
  }
  const r = raw as Record<string, unknown>;

  const productLane = r.productLane;
  if (productLane !== "WC" && productLane !== "PEO") {
    errors.push("productLane must be 'WC' or 'PEO'");
  }

  const effectiveDate = r.effectiveDate;
  if (!isValidDateStr(effectiveDate)) {
    errors.push("effectiveDate must be a YYYY-MM-DD string");
  }

  const states = r.states;
  if (!Array.isArray(states) || states.length === 0) {
    errors.push("states must be a non-empty array of US state codes");
  } else {
    const invalid = (states as unknown[]).filter((s) => !isValidState(s));
    if (invalid.length > 0) errors.push(`Invalid state codes: ${invalid.join(", ")}`);
  }

  if (
    r.eMod !== undefined &&
    (typeof r.eMod !== "number" || !Number.isFinite(r.eMod))
  ) {
    errors.push("eMod must be a finite number when provided");
  }
  if (
    r.scheduleRating !== undefined &&
    (typeof r.scheduleRating !== "number" ||
      !Number.isFinite(r.scheduleRating))
  ) {
    errors.push("scheduleRating must be a finite number when provided");
  }

  // Validate ratingUnits if provided
  let normalizedUnits: WcRatingUnit[] | undefined;
  if (r.ratingUnits !== undefined) {
    if (!Array.isArray(r.ratingUnits) || r.ratingUnits.length === 0) {
      errors.push("ratingUnits must be a non-empty array when provided");
    } else {
      const unitErrors: string[] = [];
      normalizedUnits = [];
      for (let i = 0; i < (r.ratingUnits as unknown[]).length; i++) {
        const u = (r.ratingUnits as unknown[])[i];
        if (!u || typeof u !== "object") {
          unitErrors.push(`ratingUnits[${i}] must be an object`);
          continue;
        }
        const uo = u as Record<string, unknown>;
        if (!isValidState(uo.state)) unitErrors.push(`ratingUnits[${i}].state must be a 2-char state code`);
        if (typeof uo.classCode !== "string" || !uo.classCode) unitErrors.push(`ratingUnits[${i}].classCode is required`);
        if (
          typeof uo.annualPayroll !== "number" ||
          !Number.isFinite(uo.annualPayroll) ||
          uo.annualPayroll < 0
        ) {
          unitErrors.push(
            `ratingUnits[${i}].annualPayroll must be a finite non-negative number`,
          );
        }
        if (unitErrors.length === 0 || unitErrors.every((e) => !e.includes(`[${i}]`))) {
          normalizedUnits.push({
            state: (uo.state as string).toUpperCase(),
            classCode: uo.classCode as string,
            annualPayroll: uo.annualPayroll as number,
          });
        }
      }
      errors.push(...unitErrors);
    }
  }

  if (errors.length > 0) return { ok: false, errors };

  const statesArr = (states as string[]).map((s) => s.toUpperCase());

  // Derive class codes from rating units when units are provided
  let classCodes: string[] | undefined;
  if (normalizedUnits && normalizedUnits.length > 0) {
    classCodes = [...new Set(normalizedUnits.map((u) => u.classCode))];
  } else if (Array.isArray(r.classCodes)) {
    classCodes = (r.classCodes as unknown[]).filter((x) => typeof x === "string") as string[];
  }

  // Derive total payroll from units when provided; else use explicit field
  let annualPayroll: number | undefined;
  if (normalizedUnits && normalizedUnits.length > 0) {
    annualPayroll = normalizedUnits.reduce((sum, u) => sum + u.annualPayroll, 0);
  } else if (typeof r.annualPayroll === "number" && r.annualPayroll >= 0) {
    annualPayroll = r.annualPayroll;
  }

  return {
    ok: true,
    input: {
      productLane: productLane as "WC" | "PEO",
      effectiveDate: effectiveDate as string,
      states: statesArr,
      ratingUnits: normalizedUnits,
      classCodes,
      industries: Array.isArray(r.industries)
        ? (r.industries as unknown[]).filter((x) => typeof x === "string") as string[]
        : undefined,
      annualPayroll,
      headcount:
        typeof r.headcount === "number" && Number.isInteger(r.headcount) && r.headcount > 0
          ? r.headcount
          : undefined,
      eMod: typeof r.eMod === "number" ? r.eMod : 1.0,
      scheduleRating: typeof r.scheduleRating === "number" ? r.scheduleRating : 1.0,
      vertical: typeof r.vertical === "string" ? r.vertical : null,
    },
  };
}

// ---------------------------------------------------------------------------
// Appetite evaluation
// ---------------------------------------------------------------------------

function isDateInRange(
  date: string,
  effectiveDate: string | null | undefined,
  expirationDate: string | null | undefined,
): boolean {
  if (effectiveDate && date < effectiveDate) return false;
  if (expirationDate && date >= expirationDate) return false;
  return true;
}

export interface AppetiteMatch {
  rule: MarketAppetiteRule;
  outcome: "MATCHED" | "CONDITIONAL";
  /** Higher = more specific */
  specificity: number;
}

type AppetiteExclusion = { excluded: true; reason: ExclusionReason; detail?: string };

/**
 * Evaluate all active appetite rules for a market against submission inputs.
 *
 * Coverage semantics for constrained dimensions:
 *   - null/empty = unconstrained = accepts any submission value → no filter
 *   - non-empty  = constrained  = ALL submission values must be covered by the rule
 *                                 AND the submission must provide at least one value
 *
 * This ensures a rule with eligibleStates: ["CA"] does NOT match a submission
 * that includes TX (partial coverage), and a rule with eligibleClassCodes: ["5183"]
 * does NOT match a submission that provided no class codes at all.
 */
export function evaluateAppetiteRules(
  rules: MarketAppetiteRule[],
  input: RatingInput,
): AppetiteMatch | AppetiteExclusion {
  const effectiveDate = input.effectiveDate;

  const activeRules = rules.filter((r) => {
    if (!r.isActive) return false;
    if (r.productLane !== input.productLane) return false;
    if (!isDateInRange(effectiveDate, r.effectiveDate, r.expirationDate)) return false;
    return true;
  });

  if (activeRules.length === 0) {
    return { excluded: true, reason: "NO_APPETITE_MATCH" };
  }

  const matching: AppetiteMatch[] = [];
  let anyReferralMatched = false;

  for (const rule of activeRules) {
    let specificity = 0;
    let skip = false;

    // ── Vertical/product ──────────────────────────────────────────────────
    if (rule.vertical != null) {
      if (input.vertical == null || rule.vertical !== input.vertical) {
        skip = true;
      } else {
        specificity += 4;
      }
    }
    if (skip) continue;

    // ── States: ALL submission states must be in eligibleStates ───────────
    if (rule.eligibleStates != null && rule.eligibleStates.length > 0) {
      // Input must provide at least one state (already enforced upstream).
      if (input.states.length === 0) { continue; }
      const ruleStates = rule.eligibleStates as string[];
      const allCovered = input.states.every((s) => ruleStates.includes(s));
      if (!allCovered) continue;
      specificity += 8;
    }
    // If rule.eligibleStates is null/empty: unconstrained, any states match.

    // ── Class codes: ALL submission class codes must be in eligibleClassCodes ─
    if (rule.eligibleClassCodes != null && rule.eligibleClassCodes.length > 0) {
      const submissionCodes = input.classCodes;
      // Constrained rule requires class codes from submission.
      if (!submissionCodes || submissionCodes.length === 0) continue;
      const ruleCodes = rule.eligibleClassCodes as string[];
      const allCovered = submissionCodes.every((c) => ruleCodes.includes(c));
      if (!allCovered) continue;
      specificity += 16;
    }

    // ── Industries: ALL submission industries must be in eligibleIndustries ──
    if (rule.eligibleIndustries != null && rule.eligibleIndustries.length > 0) {
      const submissionInds = input.industries;
      if (!submissionInds || submissionInds.length === 0) continue;
      const ruleInds = rule.eligibleIndustries as string[];
      const allCovered = submissionInds.every((i) => ruleInds.includes(i));
      if (!allCovered) continue;
      specificity += 2;
    }

    // ── Payroll band ──────────────────────────────────────────────────────
    if (rule.payrollMin != null && input.annualPayroll != null) {
      if (input.annualPayroll < parseFloat(rule.payrollMin)) continue;
    }
    if (rule.payrollMax != null && input.annualPayroll != null) {
      if (input.annualPayroll > parseFloat(rule.payrollMax)) continue;
    }

    // ── Headcount band ────────────────────────────────────────────────────
    if (rule.headcountMin != null && input.headcount != null) {
      if (input.headcount < rule.headcountMin) continue;
    }
    if (rule.headcountMax != null && input.headcount != null) {
      if (input.headcount > rule.headcountMax) continue;
    }

    // ── Route by outcome ──────────────────────────────────────────────────
    if (rule.appetiteOutcome === "REFERRAL") {
      anyReferralMatched = true;
      continue;
    }

    if (rule.appetiteOutcome === "CONDITIONAL") {
      if (!evaluateConditions(rule.conditions, input)) continue;
      matching.push({ rule, outcome: "CONDITIONAL", specificity });
    } else {
      // MATCHED
      matching.push({ rule, outcome: "MATCHED", specificity });
    }
  }

  if (matching.length === 0) {
    if (anyReferralMatched) return { excluded: true, reason: "REFERRAL_ONLY" };
    return { excluded: true, reason: "NO_APPETITE_MATCH" };
  }

  // Sort: most specific first; MATCHED before CONDITIONAL at equal specificity.
  matching.sort((a, b) => {
    if (b.specificity !== a.specificity) return b.specificity - a.specificity;
    return (a.outcome === "MATCHED" ? 0 : 1) - (b.outcome === "MATCHED" ? 0 : 1);
  });

  const best = matching[0];
  const topSpecificity = best.specificity;
  const topMatches = matching.filter((m) => m.specificity === topSpecificity);

  // Conflict: two equally-specific rules disagree on outcome or underwriter.
  if (topMatches.length > 1) {
    const outcomes = new Set(topMatches.map((m) => m.outcome));
    const uwIds = new Set(topMatches.map((m) => m.rule.primaryUnderwriterId ?? "__null__"));
    if (outcomes.size > 1 || uwIds.size > 1) {
      return {
        excluded: true,
        reason: "NO_APPETITE_MATCH",
        detail: "Conflicting appetite rules at equal specificity — resolve configuration",
      };
    }
  }

  return best;
}

/**
 * Evaluate machine-checkable conditions from a CONDITIONAL rule.
 * Format: [{ field: string, op: "gte"|"lte"|"gt"|"lt"|"eq", value: number }, ...]
 */
function evaluateConditions(conditions: unknown, input: RatingInput): boolean {
  if (!Array.isArray(conditions) || conditions.length === 0) return true;
  for (const cond of conditions as Record<string, unknown>[]) {
    const field = cond.field as string;
    const op = cond.op as string;
    const threshold = cond.value as number;
    const inputVal = (input as unknown as Record<string, unknown>)[field];
    if (typeof inputVal !== "number") return false;
    switch (op) {
      case "gte": if (!(inputVal >= threshold)) return false; break;
      case "lte": if (!(inputVal <= threshold)) return false; break;
      case "gt":  if (!(inputVal > threshold))  return false; break;
      case "lt":  if (!(inputVal < threshold))  return false; break;
      case "eq":  if (!(inputVal === threshold)) return false; break;
      default: return false;
    }
  }
  return true;
}

// ---------------------------------------------------------------------------
// Rate calculation
// ---------------------------------------------------------------------------

/**
 * Calculate WC premium for a single rating unit (state + classCode + payroll).
 * Returns null if no exact rule exists for this unit — caller must exclude.
 * No fallback to any other rule.
 */
function calculateWcUnit(
  rules: MarketRateRule[],
  unit: WcRatingUnit,
  eMod: number,
  scheduleRating: number,
):
  | { premium: number; ruleId: string; breakdown: Record<string, unknown> }
  | { error: string }
  | null {
  const wcRules = rules.filter((r) => r.ruleType === "WC" && r.isActive);

  // Require an exact state+classCode match. No fallback.
  const exactRule = wcRules.find((r) => {
    const d = r.ruleData as WcRuleData;
    return (
      (d.state ?? "").toUpperCase() === unit.state.toUpperCase() &&
      d.classCode === unit.classCode
    );
  });

  if (!exactRule) return null;

  const data = exactRule.ruleData as WcRuleData;
  const baseRate = Number(data.baseRate ?? 0);
  const stateMultiplier = Number(data.stateMultiplier ?? 1.0);
  const minimumPremium = Number(data.minimumPremium ?? 0);
  const eModMin = data.eModMin == null ? null : Number(data.eModMin);
  const eModMax = data.eModMax == null ? null : Number(data.eModMax);
  const scheduleRatingMin =
    data.scheduleRatingMin == null ? null : Number(data.scheduleRatingMin);
  const scheduleRatingMax =
    data.scheduleRatingMax == null ? null : Number(data.scheduleRatingMax);

  const configuredValues: Array<[string, number | null]> = [
    ["baseRate", baseRate],
    ["stateMultiplier", stateMultiplier],
    ["minimumPremium", minimumPremium],
    ["eModMin", eModMin],
    ["eModMax", eModMax],
    ["scheduleRatingMin", scheduleRatingMin],
    ["scheduleRatingMax", scheduleRatingMax],
  ];
  const invalidConfiguredValue = configuredValues.find(
    ([, value]) => value != null && !Number.isFinite(value),
  );
  if (invalidConfiguredValue) {
    return {
      error: `Invalid non-finite WC rule ${invalidConfiguredValue[0]} for ${unit.state}/${unit.classCode}`,
    };
  }

  if (eModMin != null && eMod < eModMin) {
    return {
      error: `eMod ${eMod} below rule minimum ${data.eModMin} for ${unit.state}/${unit.classCode}`,
    };
  }
  if (eModMax != null && eMod > eModMax) {
    return {
      error: `eMod ${eMod} above rule maximum ${data.eModMax} for ${unit.state}/${unit.classCode}`,
    };
  }
  if (
    scheduleRatingMin != null &&
    scheduleRating < scheduleRatingMin
  ) {
    return {
      error: `Schedule rating ${scheduleRating} below rule minimum ${data.scheduleRatingMin} for ${unit.state}/${unit.classCode}`,
    };
  }
  if (
    scheduleRatingMax != null &&
    scheduleRating > scheduleRatingMax
  ) {
    return {
      error: `Schedule rating ${scheduleRating} above rule maximum ${data.scheduleRatingMax} for ${unit.state}/${unit.classCode}`,
    };
  }

  const rawPremium = (unit.annualPayroll / 100) * baseRate * eMod * scheduleRating * stateMultiplier;
  const finalPremium = Math.max(rawPremium, minimumPremium);

  return {
    premium: Math.round(finalPremium * 100) / 100,
    ruleId: exactRule.id,
    breakdown: {
      state: unit.state,
      classCode: unit.classCode,
      annualPayroll: unit.annualPayroll,
      baseRate,
      eMod,
      scheduleRating,
      stateMultiplier,
      minimumPremium,
      rawPremium: Math.round(rawPremium * 100) / 100,
      finalPremium: Math.round(finalPremium * 100) / 100,
    },
  };
}

type WcUnitSuccess = Exclude<
  NonNullable<ReturnType<typeof calculateWcUnit>>,
  { error: string }
>;

/**
 * Calculate total WC premium across all rating units.
 *
 * Each unit must have an exact matching rule. If any unit lacks coverage,
 * the entire calculation fails with a descriptive error (no partial results).
 */
export function calculateWcRate(
  rules: MarketRateRule[],
  input: RatingInput,
): (NormalizedRateResult & { rateSetId: string; rateSetVersion: number }) | { error: string } {
  const eMod = input.eMod ?? 1.0;
  const scheduleRating = input.scheduleRating ?? 1.0;
  if (!Number.isFinite(eMod)) {
    return { error: "WC rating requires a finite eMod" };
  }
  if (!Number.isFinite(scheduleRating)) {
    return { error: "WC rating requires a finite scheduleRating" };
  }

  // Resolve rating units: explicit list or single implicit unit.
  let units: WcRatingUnit[];
  if (input.ratingUnits && input.ratingUnits.length > 0) {
    units = input.ratingUnits;
  } else {
    // Legacy single-location path: first state + first classCode + annualPayroll.
    // Still requires exact match — no fallback.
    const state = input.states[0];
    const classCode = input.classCodes?.[0];
    const annualPayroll = input.annualPayroll ?? 0;
    if (!state || !classCode) {
      return { error: "WC rating requires at least one state and one classCode, or explicit ratingUnits" };
    }
    units = [{ state, classCode, annualPayroll }];
  }

  const unitResults: WcUnitSuccess[] = [];
  const missingCoverage: string[] = [];
  const guardrailErrors: string[] = [];

  for (const unit of units) {
    const result = calculateWcUnit(rules, unit, eMod, scheduleRating);
    if (!result) {
      missingCoverage.push(`${unit.state}/${unit.classCode}`);
    } else if ("error" in result) {
      guardrailErrors.push(result.error);
    } else {
      unitResults.push(result);
    }
  }

  if (missingCoverage.length > 0) {
    return { error: `No WC rate rule for: ${missingCoverage.join(", ")}` };
  }
  if (guardrailErrors.length > 0) {
    return { error: `WC rule guardrail failed: ${guardrailErrors.join("; ")}` };
  }

  // All units rated; sum premiums.
  const totalPremium = unitResults.reduce((sum, r) => sum + (r?.premium ?? 0), 0);
  const roundedTotal = Math.round(totalPremium * 100) / 100;
  const unitBreakdowns = unitResults.map((r) => r?.breakdown ?? {});

  // Pick representative rule for the first unit (for rateSetId tracing).
  // rateSetId is stamped by caller from the MarketRateSet record.
  const firstResult = unitResults[0];

  return {
    marketId: units[0].state, // placeholder; caller sets from candidate
    productLane: "WC",
    comparableAnnualAmount: roundedTotal,
    pricingComponents: {
      totalPremium: String(roundedTotal),
      eMod: String(eMod),
      scheduleRating: String(scheduleRating),
      unitCount: String(units.length),
    },
    breakdown: {
      units: unitBreakdowns,
      totalPremium: roundedTotal,
      firstUnitRuleId: firstResult?.ruleId ?? null,
    },
    rateSetId: "", // stamped by caller
    rateSetVersion: 0, // stamped by caller
    calculatedAt: new Date().toISOString(),
    warnings: [],
  };
}

export function calculatePeoRate(
  rules: MarketRateRule[],
  input: RatingInput,
): (NormalizedRateResult & { rateSetId: string; rateSetVersion: number }) | { error: string } {
  const peoRules = rules.filter((r) => r.ruleType === "PEO" && r.isActive);
  if (peoRules.length === 0) return { error: "No active PEO rate rules found" };

  const rule = peoRules[0];
  const data = rule.ruleData as PeoRuleData;

  const payroll = input.annualPayroll ?? 0;
  const headcount = input.headcount ?? 0;
  const wcLoadFactor = Number(data.wcLoadFactor ?? 1.0);
  const wfsBasePepm = Number(data.wfsBasePepm ?? 0);
  const wfsHeadcountDiscount = Number(data.wfsHeadcountDiscount ?? 0);
  const minimumAnnualWc = Number(data.minimumAnnualWc ?? 0);
  const adminFeePercent = Number(data.adminFeePercent ?? 0);

  const wcAnnual = Math.max(payroll * wcLoadFactor, minimumAnnualWc);
  const pepmDiscount = headcount > 50 ? wfsHeadcountDiscount : 0;
  const effectivePepm = wfsBasePepm - pepmDiscount;
  const wfsAnnual = effectivePepm * headcount * 12;
  const adminFee = (wcAnnual + wfsAnnual) * (adminFeePercent / 100);
  const totalAnnual = wcAnnual + wfsAnnual + adminFee;

  return {
    marketId: "", // stamped by caller
    productLane: "PEO",
    comparableAnnualAmount: Math.round(totalAnnual * 100) / 100,
    pricingComponents: {
      wcAnnual: String(Math.round(wcAnnual * 100) / 100),
      wfsAnnual: String(Math.round(wfsAnnual * 100) / 100),
      effectivePepm: String(Math.round(effectivePepm * 100) / 100),
      adminFee: String(Math.round(adminFee * 100) / 100),
    },
    breakdown: {
      payroll,
      headcount,
      wcLoadFactor,
      wfsBasePepm,
      pepmDiscount,
      effectivePepm,
      minimumAnnualWc,
      adminFeePercent,
      wcAnnual: Math.round(wcAnnual * 100) / 100,
      wfsAnnual: Math.round(wfsAnnual * 100) / 100,
      adminFee: Math.round(adminFee * 100) / 100,
      totalAnnual: Math.round(totalAnnual * 100) / 100,
      ruleId: rule.id,
    },
    rateSetId: "",  // stamped by caller
    rateSetVersion: 0, // stamped by caller
    calculatedAt: new Date().toISOString(),
    warnings: [],
  };
}

// ---------------------------------------------------------------------------
// Core ranking algorithm (pure — no DB calls)
// ---------------------------------------------------------------------------

export interface MarketCandidate {
  market: Market;
  /** Resolved primary underwriter — already validated to be active+effective. */
  underwriter: MarketUnderwriter;
  appetiteMatch: AppetiteMatch;
  rateSet: MarketRateSet;
  rateRules: MarketRateRule[];
}

export interface RankingCandidateResult {
  ranked: RankedMarketResult[];
  exclusions: MarketExclusion[];
}

export function rankCandidates(
  candidates: MarketCandidate[],
  input: RatingInput,
): RankingCandidateResult {
  const exclusions: MarketExclusion[] = [];
  const rated: {
    candidate: MarketCandidate;
    result: NormalizedRateResult & { rateSetId: string; rateSetVersion: number };
    appetiteOutcome: "MATCHED" | "CONDITIONAL";
  }[] = [];

  for (const candidate of candidates) {
    const { market, appetiteMatch, rateSet, rateRules } = candidate;

    let rateResult: (NormalizedRateResult & { rateSetId: string; rateSetVersion: number }) | { error: string } | null = null;

    try {
      if (input.productLane === "WC") {
        rateResult = calculateWcRate(rateRules, input);
      } else {
        rateResult = calculatePeoRate(rateRules, input);
      }
    } catch (err) {
      exclusions.push({
        marketId: market.id,
        marketName: market.name,
        reason: "RATE_CALCULATION_ERROR",
        detail: String(err),
      });
      continue;
    }

    // Check for error result (no-fallback calculation failed).
    if (!rateResult) {
      exclusions.push({
        marketId: market.id,
        marketName: market.name,
        reason: "RATE_CALCULATION_ERROR",
        detail: "No rate result returned",
      });
      continue;
    }
    if ("error" in rateResult) {
      exclusions.push({
        marketId: market.id,
        marketName: market.name,
        reason: "RATE_CALCULATION_ERROR",
        detail: rateResult.error,
      });
      continue;
    }

    // Stamp rate-set identity from the resolved set record.
    rateResult.marketId = market.id;
    rateResult.rateSetId = rateSet.id;
    rateResult.rateSetVersion = rateSet.version;

    // Post-rating premium band filter from appetite rule.
    const rule = appetiteMatch.rule;
    if (rule.premiumMin != null) {
      if (rateResult.comparableAnnualAmount < parseFloat(rule.premiumMin)) {
        exclusions.push({
          marketId: market.id,
          marketName: market.name,
          reason: "PREMIUM_BAND_FAIL",
          detail: `Generated premium ${rateResult.comparableAnnualAmount} below minimum ${rule.premiumMin}`,
        });
        continue;
      }
    }
    if (rule.premiumMax != null) {
      if (rateResult.comparableAnnualAmount > parseFloat(rule.premiumMax)) {
        exclusions.push({
          marketId: market.id,
          marketName: market.name,
          reason: "PREMIUM_BAND_FAIL",
          detail: `Generated premium ${rateResult.comparableAnnualAmount} above maximum ${rule.premiumMax}`,
        });
        continue;
      }
    }

    rated.push({ candidate, result: rateResult, appetiteOutcome: appetiteMatch.outcome });
  }

  // Deterministic sort: rate ASC → MATCHED before CONDITIONAL → stable market ID.
  rated.sort((a, b) => {
    const rateDiff = a.result.comparableAnnualAmount - b.result.comparableAnnualAmount;
    if (Math.abs(rateDiff) > 0.001) return rateDiff;
    const outcomeA = a.appetiteOutcome === "MATCHED" ? 0 : 1;
    const outcomeB = b.appetiteOutcome === "MATCHED" ? 0 : 1;
    if (outcomeA !== outcomeB) return outcomeA - outcomeB;
    return a.candidate.market.id < b.candidate.market.id ? -1 : 1;
  });

  const ranked: RankedMarketResult[] = rated.map((r, idx) => {
    const rank = idx + 1;
    const isRouted = rank <= 4;
    const routingPackageSnapshot = input.applicationSnapshotHash
      ? {
          version: 1 as const,
          applicationHash: input.applicationSnapshotHash,
          ratingInput: {
            productLane: input.productLane,
            effectiveDate: input.effectiveDate,
            states: [...input.states],
            vertical: input.vertical ?? null,
            classCodes: input.classCodes ? [...input.classCodes] : [],
            ratingUnits: input.ratingUnits
              ? input.ratingUnits.map((unit) => ({ ...unit }))
              : [],
            annualPayroll: input.annualPayroll ?? null,
            headcount: input.headcount ?? null,
            eMod: input.eMod ?? 1,
            scheduleRating: input.scheduleRating ?? 1,
          },
        }
      : null;
    return {
      rank,
      isPrimary: rank === 1,
      isRouted,
      marketId: r.candidate.market.id,
      marketName: r.candidate.market.name,
      marketType: r.candidate.market.marketType,
      appetiteOutcome: r.appetiteOutcome,
      matchedRuleId: r.candidate.appetiteMatch.rule.id,
      assignedUnderwriterId: r.candidate.underwriter.id,
      rateSetId: r.result.rateSetId,
      rateSetVersion: r.result.rateSetVersion,
      generatedRate: r.result.comparableAnnualAmount,
      rateBreakdownSnapshot: {
        ...r.result.breakdown,
        routingPackageSnapshot,
      },
    };
  });

  return { ranked, exclusions };
}

// ---------------------------------------------------------------------------
// DB-backed market loading
// ---------------------------------------------------------------------------

async function loadEligibleMarkets(
  input: RatingInput,
): Promise<{ candidates: MarketCandidate[]; exclusions: MarketExclusion[] }> {
  const exclusions: MarketExclusion[] = [];
  const candidates: MarketCandidate[] = [];

  const markets = await db
    .select()
    .from(marketsTable)
    .where(
      and(
        eq(marketsTable.productLane, input.productLane),
        eq(marketsTable.isActive, true),
        eq(marketsTable.isAppointed, true),
      ),
    );

  for (const market of markets) {
    if (!isDateInRange(input.effectiveDate, market.effectiveDate, market.expirationDate)) {
      exclusions.push({ marketId: market.id, marketName: market.name, reason: "MARKET_INACTIVE", detail: "Market not in effect on requested date" });
      continue;
    }

    // Load ALL active underwriters for this market.
    const allUnderwriters = await db
      .select()
      .from(marketUnderwritersTable)
      .where(and(eq(marketUnderwritersTable.marketId, market.id), eq(marketUnderwritersTable.isActive, true)));

    // Filter to those in-range on the effective date.
    const validUnderwriters = allUnderwriters.filter((u) =>
      isDateInRange(input.effectiveDate, u.effectiveDate, u.expirationDate),
    );
    if (validUnderwriters.length === 0) {
      exclusions.push({ marketId: market.id, marketName: market.name, reason: "NO_ACTIVE_UNDERWRITER", detail: "No active underwriter in effect on requested date" });
      continue;
    }

    // Evaluate appetite — must find a matching rule.
    const appetiteRules = await db
      .select()
      .from(marketAppetiteRulesTable)
      .where(eq(marketAppetiteRulesTable.marketId, market.id));

    const appetiteResult = evaluateAppetiteRules(appetiteRules, input);
    if ("excluded" in appetiteResult) {
      exclusions.push({ marketId: market.id, marketName: market.name, reason: appetiteResult.reason, detail: appetiteResult.detail });
      continue;
    }

    // Resolve primary underwriter — MUST come from rule's configured primaryUnderwriterId.
    // No fallback to first underwriter.
    const primaryUwId = appetiteResult.rule.primaryUnderwriterId;
    if (!primaryUwId) {
      exclusions.push({
        marketId: market.id,
        marketName: market.name,
        reason: "NO_ACTIVE_UNDERWRITER",
        detail: `Appetite rule ${appetiteResult.rule.id} has no primaryUnderwriterId configured`,
      });
      continue;
    }
    const assignedUw = validUnderwriters.find((u) => u.id === primaryUwId);
    if (!assignedUw) {
      exclusions.push({
        marketId: market.id,
        marketName: market.name,
        reason: "NO_ACTIVE_UNDERWRITER",
        detail: `Primary underwriter ${primaryUwId} is not active/effective for this market on ${input.effectiveDate}`,
      });
      continue;
    }

    // Load the active rate set.
    const rateSets = await db
      .select()
      .from(marketRateSetsTable)
      .where(and(eq(marketRateSetsTable.marketId, market.id), eq(marketRateSetsTable.productLane, input.productLane), eq(marketRateSetsTable.status, "ACTIVE")));

    const validRateSets = rateSets.filter((rs) =>
      isDateInRange(input.effectiveDate, rs.effectiveDate, rs.expirationDate),
    );
    if (validRateSets.length === 0) {
      exclusions.push({ marketId: market.id, marketName: market.name, reason: "NO_ACTIVE_RATE_SET" });
      continue;
    }

    const rateSet = validRateSets.sort((a, b) => b.version - a.version)[0];

    const rateRules = await db
      .select()
      .from(marketRateRulesTable)
      .where(and(eq(marketRateRulesTable.rateSetId, rateSet.id), eq(marketRateRulesTable.isActive, true)));

    candidates.push({ market, underwriter: assignedUw, appetiteMatch: appetiteResult, rateSet, rateRules });
  }

  return { candidates, exclusions };
}

// ---------------------------------------------------------------------------
// Public API: simulate (no writes)
// ---------------------------------------------------------------------------

export async function simulateRanking(input: RatingInput): Promise<RankingResult> {
  const { candidates, exclusions: loadExclusions } = await loadEligibleMarkets(input);
  const { ranked, exclusions: rankExclusions } = rankCandidates(candidates, input);
  return {
    productLane: input.productLane,
    ranked,
    exclusions: [...loadExclusions, ...rankExclusions],
    simulatedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Public API: rank and persist (transactional)
// ---------------------------------------------------------------------------

export type RankAndPersistResult =
  | { ok: true; result: RankingResult; dealMarketIds: string[] }
  | { ok: false; error: string };

export async function rankAndPersistProvisional(
  dealId: string,
  input: RatingInput,
): Promise<RankAndPersistResult> {
  // Block re-ranking if any deal_market for this deal is not PROVISIONAL.
  const existingRows = await db
    .select({ rankingState: dealMarketsTable.rankingState })
    .from(dealMarketsTable)
    .where(eq(dealMarketsTable.dealId, dealId));

  const blocked = existingRows.some((r) =>
    (["QUEUED", "DISPATCHING", "LOCKED"] as string[]).includes(r.rankingState),
  );
  if (blocked) {
    return { ok: false, error: "Re-ranking is blocked: deal markets are QUEUED, DISPATCHING, or LOCKED" };
  }

  const { candidates, exclusions: loadExclusions } = await loadEligibleMarkets(input);
  const { ranked, exclusions: rankExclusions } = rankCandidates(candidates, input);
  const allExclusions = [...loadExclusions, ...rankExclusions];
  const insertedIds: string[] = [];

  await db.transaction(async (tx) => {
    // Replace only PROVISIONAL rows.
    await tx
      .delete(dealMarketsTable)
      .where(and(eq(dealMarketsTable.dealId, dealId), eq(dealMarketsTable.rankingState, "PROVISIONAL")));

    for (const r of ranked) {
      const values: InsertDealMarket = {
        dealId,
        marketId: r.marketId,
        marketType: r.marketType,
        matchedAppetiteRuleId: r.matchedRuleId,
        assignedUnderwriterId: r.assignedUnderwriterId,
        rateSetId: r.rateSetId,
        rateSetVersion: r.rateSetVersion,
        generatedRate: String(r.generatedRate),
        rateBreakdownSnapshot: r.rateBreakdownSnapshot,
        rank: r.rank,
        isPrimary: r.isPrimary,
        isRouted: r.isRouted,
        appetiteOutcome: r.appetiteOutcome,
        rankingState: "PROVISIONAL",
        sendStatus: "PENDING",
        sendAttemptCount: 0,
      };
      const [inserted] = await tx.insert(dealMarketsTable).values(values).returning({ id: dealMarketsTable.id });
      if (inserted) insertedIds.push(inserted.id);
    }
  });

  return {
    ok: true,
    result: { productLane: input.productLane, ranked, exclusions: allExclusions, simulatedAt: new Date().toISOString() },
    dealMarketIds: insertedIds,
  };
}

// ---------------------------------------------------------------------------
// Activation validation
// ---------------------------------------------------------------------------

export interface MarketActivationCheck {
  canActivate: boolean;
  reasons: string[];
}

export async function checkMarketActivation(marketId: string): Promise<MarketActivationCheck> {
  const reasons: string[] = [];

  const [market] = await db.select().from(marketsTable).where(eq(marketsTable.id, marketId));
  if (!market) return { canActivate: false, reasons: ["Market not found"] };

  if (!market.isAppointed) reasons.push("Market is not appointed/approved");
  if (!market.effectiveDate) reasons.push("Market effective date not set");

  // Active underwriters
  const underwriters = await db
    .select()
    .from(marketUnderwritersTable)
    .where(and(eq(marketUnderwritersTable.marketId, marketId), eq(marketUnderwritersTable.isActive, true)));
  if (underwriters.length === 0) {
    reasons.push("No active routing underwriter configured");
  }

  const uwById = new Map(underwriters.map((u) => [u.id, u]));

  // Active appetite rules: every rankable (MATCHED/CONDITIONAL) rule must have
  // a valid primary underwriter that is active in this market.
  const appetiteRules = await db
    .select()
    .from(marketAppetiteRulesTable)
    .where(and(eq(marketAppetiteRulesTable.marketId, marketId), eq(marketAppetiteRulesTable.isActive, true)));

  if (appetiteRules.length === 0) {
    reasons.push("No active appetite rules configured");
  } else {
    const rankableRules = appetiteRules.filter(
      (r) => r.appetiteOutcome === "MATCHED" || r.appetiteOutcome === "CONDITIONAL",
    );
    for (const rule of rankableRules) {
      if (!rule.primaryUnderwriterId) {
        reasons.push(`Appetite rule ${rule.id} (${rule.appetiteOutcome}) has no primaryUnderwriterId`);
      } else if (!uwById.has(rule.primaryUnderwriterId)) {
        reasons.push(`Appetite rule ${rule.id} primaryUnderwriterId ${rule.primaryUnderwriterId} is not an active underwriter in this market`);
      }
    }
  }

  // Active rate sets: each must have at least one valid typed rule.
  const rateSets = await db
    .select()
    .from(marketRateSetsTable)
    .where(and(eq(marketRateSetsTable.marketId, marketId), eq(marketRateSetsTable.status, "ACTIVE")));

  if (rateSets.length === 0) {
    reasons.push("No active rate set configured");
  } else {
    for (const rs of rateSets) {
      const ruleCount = await db
        .select({ id: marketRateRulesTable.id })
        .from(marketRateRulesTable)
        .where(and(eq(marketRateRulesTable.rateSetId, rs.id), eq(marketRateRulesTable.isActive, true)));
      if (ruleCount.length === 0) {
        reasons.push(`Active rate set ${rs.id} (v${rs.version}, ${rs.productLane}) has no active rate rules`);
      } else {
        // Check rule types match the rate set's product lane.
        // ruleCount was already fetched with just {id}; re-fetch with full columns.
        const rules = await db
          .select()
          .from(marketRateRulesTable)
          .where(and(eq(marketRateRulesTable.rateSetId, rs.id), eq(marketRateRulesTable.isActive, true)));
        const badLane = rules.filter((r) => r.ruleType !== rs.productLane);
        if (badLane.length > 0) {
          reasons.push(`Rate set ${rs.id} (${rs.productLane}) has ${badLane.length} rules with wrong ruleType`);
        }
      }
    }
  }

  return { canActivate: reasons.length === 0, reasons };
}
