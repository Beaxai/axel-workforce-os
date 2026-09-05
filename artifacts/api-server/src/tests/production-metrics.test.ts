import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  calculateProductionMetrics,
  type ProductionDeal,
  type ProductionQuote,
} from "../lib/production-metrics.js";

function deal(
  values: Partial<ProductionDeal> & Pick<ProductionDeal, "productType">,
): ProductionDeal {
  return {
    wcPremium: null,
    wfsPepmAnnual: null,
    wfsPepmMonthly: null,
    annualPayroll: null,
    ...values,
  };
}

describe("production metrics", () => {
  it("splits WC, PEO, and combined ASO buckets with annualized fees", () => {
    const result = calculateProductionMetrics([
      { deal: deal({ productType: "WC", wcPremium: "40000" }) },
      {
        deal: deal({
          productType: "PEO",
          wcPremium: "60000",
          wfsPepmMonthly: "5000",
        }),
      },
      {
        deal: deal({
          productType: "ASO_CAPTIVE",
          wfsPepmAnnual: "45000",
        }),
      },
    ]);

    assert.deepEqual(result, {
      wcDeals: 1,
      wcPremium: 40000,
      peoDeals: 1,
      peoPremium: 120000,
      asoDeals: 1,
      asoFees: 45000,
    });
  });

  it("uses stored-before-derived precedence and never estimated premium", () => {
    const quote: ProductionQuote = {
      wcPremium: "25000",
      wcFinalPremium: "30000",
      peoAnnualTotal: "18000",
      monthlyWfsFee: "2000",
    };
    const result = calculateProductionMetrics([
      {
        deal: deal({
          productType: "PEO",
          wcPremium: "10000",
          wfsPepmAnnual: "12000",
          wfsPepmMonthly: "5000",
          annualPayroll: "9000000",
        }),
        latestQuote: quote,
      },
      {
        deal: deal({
          productType: "ASO",
          annualPayroll: "100000",
        }),
        latestQuote: {
          wcPremium: null,
          wcFinalPremium: "5000",
          peoAnnualTotal: null,
          monthlyWfsFee: null,
        },
      },
      { deal: deal({ productType: "NOT_A_BUCKET" }) },
    ]);

    assert.deepEqual(result, {
      wcDeals: 0,
      wcPremium: 0,
      peoDeals: 1,
      peoPremium: 22000,
      asoDeals: 1,
      asoFees: 7000,
    });
  });
});