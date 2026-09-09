import {
  db,
  dealMarketsTable,
  marketAppetiteRulesTable,
  marketRateRulesTable,
  marketRateSetsTable,
  marketsTable,
  marketUnderwritersTable,
  marketVerticalRankTable,
} from "@workspace/db";
import { and, eq, inArray } from "drizzle-orm";
import { evaluateAppetiteRules, type RatingInput } from "./market-routing.js";

export type LaunchProduct = "PEO" | "ASO";

export type LaunchExclusionReason =
  | "MARKET_INACTIVE"
  | "MARKET_UNAPPOINTED"
  | "PRODUCT_INCOMPATIBLE"
  | "NO_SUBMISSION_EMAIL"
  | "STATE_INELIGIBLE"
  | "NO_APPETITE_MATCH"
  | "NO_ACTIVE_UNDERWRITER";

export interface LaunchCandidate {
  assignment: typeof marketVerticalRankTable.$inferSelect;
  market: typeof marketsTable.$inferSelect;
  appetiteRules: Array<typeof marketAppetiteRulesTable.$inferSelect>;
  rateRules: Array<typeof marketRateRulesTable.$inferSelect>;
  rateSets: Array<typeof marketRateSetsTable.$inferSelect>;
  underwriters: Array<typeof marketUnderwritersTable.$inferSelect>;
}

export interface LaunchResolvedMarket {
  marketId: string;
  marketType: string;
  verticalRank: "1" | "2" | "3" | "E" | null;
  assignmentProduct: LaunchProduct;
  engagementSource: "AUTO_PREFERRED" | "MANUAL_OVERFLOW" | "AXEL_KEEP";
  isActive: boolean;
  isRouted: boolean;
  assignedUnderwriterId: string | null;
  matchedAppetiteRuleId: string | null;
  submissionEmail: string | null;
}

const VERTICALS = new Map([
  ["ambulance & emergency transport", "AMBULANCE_EMERGENCY_TRANSPORT"],
  ["cannabis", "CANNABIS"],
  ["construction", "CONSTRUCTION"],
  ["garbage & waste management", "GARBAGE_WASTE_MANAGEMENT"],
  ["healthcare", "HEALTHCARE"],
  ["high experience mod", "HIGH_EXPERIENCE_MOD"],
  ["hospitality", "HOSPITALITY"],
  ["manufacturing", "MANUFACTURING"],
  ["staffing", "STAFFING"],
  ["transportation", "TRANSPORTATION"],
  ["all other industries", "ALL_OTHER_INDUSTRIES"],
]);

export function canonicalLaunchVerticalKey(vertical: string | null | undefined): string {
  return VERTICALS.get((vertical ?? "").trim().toLowerCase()) ?? "ALL_OTHER_INDUSTRIES";
}

function dateEligible(
  date: string,
  effectiveDate: string | null,
  expirationDate: string | null,
): boolean {
  return (!effectiveDate || date >= effectiveDate) && (!expirationDate || date < expirationDate);
}

function marketWritesStates(candidate: LaunchCandidate, states: string[], effectiveDate: string): boolean {
  if (candidate.market.stateWritingMode === "ALL_STATES") return true;
  if (candidate.market.stateWritingMode === "EXPLICIT") {
    const allowed = new Set((candidate.market.explicitStates ?? []).map((state) => state.toUpperCase()));
    return states.every((state) => allowed.has(state.toUpperCase()));
  }
  if (candidate.market.stateWritingMode === "RATE_TABLE") {
    const validRateSetIds = new Set(
      candidate.rateSets
        .filter((set) => set.productLane === "PEO" && set.status === "ACTIVE" && dateEligible(effectiveDate, set.effectiveDate, set.expirationDate))
        .map((set) => set.id),
    );
    const covered = new Set(
      candidate.rateRules
        .filter((rule) => rule.isActive && validRateSetIds.has(rule.rateSetId))
        .map((rule) => String((rule.ruleData as { state?: unknown })?.state ?? "").toUpperCase())
        .filter(Boolean),
    );
    return states.every((state) => covered.has(state.toUpperCase()));
  }
  return false;
}

/** Pure launch gate used by integration tests and the DB resolver. */
export function resolveLaunchCandidates(
  candidates: LaunchCandidate[],
  product: LaunchProduct,
  input: RatingInput,
): { eligible: LaunchResolvedMarket[]; exclusions: Array<{ marketId: string; reason: LaunchExclusionReason }> } {
  const eligible: LaunchResolvedMarket[] = [];
  const exclusions: Array<{ marketId: string; reason: LaunchExclusionReason }> = [];

  for (const candidate of candidates) {
    const { market, assignment } = candidate;
    const exclude = (reason: LaunchExclusionReason) => exclusions.push({ marketId: market.id, reason });
    if (!market.isActive) { exclude("MARKET_INACTIVE"); continue; }
    if (!market.isAppointed) { exclude("MARKET_UNAPPOINTED"); continue; }
    if (!dateEligible(input.effectiveDate, market.effectiveDate, market.expirationDate)) {
      exclude("MARKET_INACTIVE"); continue;
    }
    if (assignment.product !== product || !(market.offeredProducts ?? []).includes(product)) {
      exclude("PRODUCT_INCOMPATIBLE"); continue;
    }
    if (!market.submissionEmail?.trim()) { exclude("NO_SUBMISSION_EMAIL"); continue; }
    if (!marketWritesStates(candidate, input.states, input.effectiveDate)) { exclude("STATE_INELIGIBLE"); continue; }

    let matchedRuleId: string | null = null;
    let assignedUnderwriterId: string | null = null;
    if (product === "PEO" && candidate.appetiteRules.length > 0) {
      const match = evaluateAppetiteRules(candidate.appetiteRules, { ...input, productLane: "PEO" });
      if ("excluded" in match) { exclude("NO_APPETITE_MATCH"); continue; }
      matchedRuleId = match.rule.id;
      assignedUnderwriterId = match.rule.primaryUnderwriterId;
      const underwriter = candidate.underwriters.find((row) => row.id === assignedUnderwriterId);
      if (
        !underwriter ||
        !underwriter.isActive ||
        !dateEligible(input.effectiveDate, underwriter.effectiveDate, underwriter.expirationDate)
      ) {
        exclude("NO_ACTIVE_UNDERWRITER"); continue;
      }
    }

    const rank = assignment.rank as "1" | "2" | "3" | "E";
    eligible.push({
      marketId: market.id,
      marketType: market.marketType,
      verticalRank: rank,
      assignmentProduct: product,
      engagementSource: rank === "E" ? "MANUAL_OVERFLOW" : "AUTO_PREFERRED",
      isActive: rank !== "E",
      isRouted: rank !== "E",
      assignedUnderwriterId,
      matchedAppetiteRuleId: matchedRuleId,
      submissionEmail: market.submissionEmail,
    });
  }
  return { eligible, exclusions };
}

export async function snapshotLaunchMarkets(
  dealId: string,
  product: LaunchProduct,
  vertical: string,
  input: RatingInput,
): Promise<{ activeCount: number; availableCount: number; exclusions: Array<{ marketId: string; reason: LaunchExclusionReason }> }> {
  const verticalKey = canonicalLaunchVerticalKey(vertical);
  const assignments = await db
    .select({ assignment: marketVerticalRankTable, market: marketsTable })
    .from(marketVerticalRankTable)
    .innerJoin(marketsTable, eq(marketVerticalRankTable.marketId, marketsTable.id))
    .where(and(eq(marketVerticalRankTable.verticalKey, verticalKey), eq(marketVerticalRankTable.product, product)));
  const axelRows = await db
    .select()
    .from(marketsTable)
    .where(eq(marketsTable.assignmentImportKey, "axel"));
  const marketIds = assignments.map((row) => row.market.id);
  const [rules, rateRules, rateSets, underwriters] = await Promise.all([
    marketIds.length ? db.select().from(marketAppetiteRulesTable).where(inArray(marketAppetiteRulesTable.marketId, marketIds)) : [],
    marketIds.length ? db.select().from(marketRateRulesTable).where(inArray(marketRateRulesTable.marketId, marketIds)) : [],
    marketIds.length ? db.select().from(marketRateSetsTable).where(inArray(marketRateSetsTable.marketId, marketIds)) : [],
    marketIds.length ? db.select().from(marketUnderwritersTable).where(inArray(marketUnderwritersTable.marketId, marketIds)) : [],
  ]);
  const candidates = assignments.map(({ assignment, market }) => ({
    assignment,
    market,
    appetiteRules: rules.filter((row) => row.marketId === market.id),
    rateRules: rateRules.filter((row) => row.marketId === market.id),
    rateSets: rateSets.filter((row) => row.marketId === market.id),
    underwriters: underwriters.filter((row) => row.marketId === market.id),
  }));
  const resolved = resolveLaunchCandidates(candidates, product, input);
  const routingPackageSnapshot = {
    routingPackageSnapshot: {
      version: 1,
      applicationHash: input.applicationSnapshotHash,
      ratingInput: input,
    },
  };

  await db.transaction(async (tx) => {
    for (const market of resolved.eligible) {
      await tx.insert(dealMarketsTable).values({
        dealId,
        marketId: market.marketId,
        marketType: market.marketType,
        verticalSnapshot: vertical,
        assignmentProduct: product,
        verticalRank: market.verticalRank,
        engagementSource: market.engagementSource,
        isActive: market.isActive,
        marketStatus: market.isActive ? "ACTIVE" : "AVAILABLE",
        submissionEmailSnapshot: market.submissionEmail,
        assignedUnderwriterId: market.assignedUnderwriterId,
        matchedAppetiteRuleId: market.matchedAppetiteRuleId,
        generatedRate: null,
        rateBreakdownSnapshot: routingPackageSnapshot,
        rank: market.verticalRank && market.verticalRank !== "E" ? Number(market.verticalRank) : null,
        isPrimary: false,
        isRouted: market.isRouted,
      }).onConflictDoNothing();
    }
    const axel = axelRows.find(
      (row) =>
        row.isActive &&
        row.isAppointed &&
        (row.offeredProducts ?? []).includes(product) &&
        dateEligible(input.effectiveDate, row.effectiveDate, row.expirationDate),
    );
    if (axel) {
      await tx.insert(dealMarketsTable).values({
        dealId,
        marketId: axel.id,
        marketType: axel.marketType,
        verticalSnapshot: vertical,
        assignmentProduct: product,
        verticalRank: null,
        engagementSource: "AXEL_KEEP",
        isActive: false,
        marketStatus: "AVAILABLE",
        submissionEmailSnapshot: null,
        generatedRate: null,
        rank: null,
        isPrimary: false,
        isRouted: false,
        rateBreakdownSnapshot: routingPackageSnapshot,
      }).onConflictDoNothing();
    }
  });
  return {
    activeCount: resolved.eligible.filter((row) => row.isActive).length,
    availableCount: resolved.eligible.filter((row) => !row.isActive).length,
    exclusions: resolved.exclusions,
  };
}