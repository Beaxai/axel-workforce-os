import {
  db,
  dealsTable,
  quotesTable,
  type Deal,
  type Quote,
} from "@workspace/db";
import { desc, inArray, isNull, and, sql } from "drizzle-orm";

export interface ProductionMetrics {
  wcDeals: number;
  wcPremium: number;
  peoDeals: number;
  peoPremium: number;
  asoDeals: number;
  asoFees: number;
}

export type ProductionDeal = Pick<
  Deal,
  | "productType"
  | "wcPremium"
  | "wfsPepmAnnual"
  | "wfsPepmMonthly"
  | "annualPayroll"
>;

export type ProductionQuote = Pick<
  Quote,
  | "wcPremium"
  | "wcFinalPremium"
  | "peoAnnualTotal"
  | "monthlyWfsFee"
>;

export const EMPTY_PRODUCTION_METRICS: ProductionMetrics = {
  wcDeals: 0,
  wcPremium: 0,
  peoDeals: 0,
  peoPremium: 0,
  asoDeals: 0,
  asoFees: 0,
};

function money(value: string | number | null | undefined): number | null {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function calculateDealProduction(
  deal: ProductionDeal,
  latestQuote?: ProductionQuote | null,
): ProductionMetrics {
  const metrics = { ...EMPTY_PRODUCTION_METRICS };
  const wcComponent =
    money(deal.wcPremium) ??
    money(latestQuote?.wcPremium) ??
    money(latestQuote?.wcFinalPremium) ??
    0;
  const dealMonthlyFee = money(deal.wfsPepmMonthly);
  const quoteMonthlyFee = money(latestQuote?.monthlyWfsFee);
  const annualFee =
    money(deal.wfsPepmAnnual) ??
    (dealMonthlyFee == null ? null : dealMonthlyFee * 12) ??
    money(latestQuote?.peoAnnualTotal) ??
    (quoteMonthlyFee == null ? null : quoteMonthlyFee * 12) ??
    ((money(deal.annualPayroll) ?? 0) * 0.02);

  if (deal.productType === "WC") {
    metrics.wcDeals = 1;
    metrics.wcPremium = wcComponent;
  } else if (deal.productType === "PEO") {
    metrics.peoDeals = 1;
    metrics.peoPremium = wcComponent + annualFee;
  } else if (
    deal.productType === "ASO" ||
    deal.productType === "ASO_CAPTIVE"
  ) {
    metrics.asoDeals = 1;
    metrics.asoFees = wcComponent + annualFee;
  }
  return metrics;
}

export function addProductionMetrics(
  left: ProductionMetrics,
  right: ProductionMetrics,
): ProductionMetrics {
  return {
    wcDeals: left.wcDeals + right.wcDeals,
    wcPremium: left.wcPremium + right.wcPremium,
    peoDeals: left.peoDeals + right.peoDeals,
    peoPremium: left.peoPremium + right.peoPremium,
    asoDeals: left.asoDeals + right.asoDeals,
    asoFees: left.asoFees + right.asoFees,
  };
}

export function calculateProductionMetrics(
  rows: { deal: ProductionDeal; latestQuote?: ProductionQuote | null }[],
): ProductionMetrics {
  return rows.reduce(
    (total, row) =>
      addProductionMetrics(
        total,
        calculateDealProduction(row.deal, row.latestQuote),
      ),
    { ...EMPTY_PRODUCTION_METRICS },
  );
}

export async function getProductionMetricsByAgentIds(
  agentUserIds: string[],
): Promise<Map<string, ProductionMetrics>> {
  const uniqueIds = [...new Set(agentUserIds)];
  const result = new Map(
    uniqueIds.map((id) => [id, { ...EMPTY_PRODUCTION_METRICS }]),
  );
  if (uniqueIds.length === 0) return result;

  const deals = await db
    .select()
    .from(dealsTable)
    .where(
      and(
        inArray(dealsTable.producingAgentId, uniqueIds),
        isNull(dealsTable.archivedAt),
      ),
    );
  if (deals.length === 0) return result;

  const quotes = await db
    .select()
    .from(quotesTable)
    .where(inArray(quotesTable.dealId, deals.map((deal) => deal.id)))
    .orderBy(sql`${quotesTable.createdAt} desc nulls last`, desc(quotesTable.id));
  const latestQuoteByDeal = new Map<string, ProductionQuote>();
  for (const quote of quotes) {
    if (quote.dealId && !latestQuoteByDeal.has(quote.dealId)) {
      latestQuoteByDeal.set(quote.dealId, quote);
    }
  }

  for (const deal of deals) {
    if (!deal.producingAgentId) continue;
    const current =
      result.get(deal.producingAgentId) ?? { ...EMPTY_PRODUCTION_METRICS };
    result.set(
      deal.producingAgentId,
      addProductionMetrics(
        current,
        calculateDealProduction(deal, latestQuoteByDeal.get(deal.id)),
      ),
    );
  }
  return result;
}