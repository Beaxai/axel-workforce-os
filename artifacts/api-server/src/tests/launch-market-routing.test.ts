import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  resolveLaunchCandidates,
  type LaunchCandidate,
} from "../lib/launch-market-routing.js";
import type { RatingInput } from "../lib/market-routing.js";

const input: RatingInput = {
  productLane: "PEO",
  vertical: "Construction",
  effectiveDate: "2026-09-09",
  states: ["CA"],
  classCodes: ["5183"],
  industries: ["Construction"],
  annualPayroll: 1_000_000,
  headcount: 20,
};

function candidate(
  id: string,
  rank: "1" | "2" | "3" | "E",
  overrides: {
    product?: "PEO" | "ASO";
    active?: boolean;
    appointed?: boolean;
    email?: string | null;
    states?: string[];
  } = {},
): LaunchCandidate {
  const product = overrides.product ?? "PEO";
  return {
    assignment: {
      id: `assignment-${id}`,
      marketId: id,
      vertical: "Construction",
      verticalKey: "CONSTRUCTION",
      rank,
      product,
      importSource: "test",
      sourceKey: `test:${id}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    market: {
      id,
      name: id,
      marketType: "PEO_PROGRAM",
      productLane: "PEO",
      partnerId: null,
      orgId: null,
      isActive: overrides.active ?? true,
      isAppointed: overrides.appointed ?? true,
      effectiveDate: null,
      expirationDate: null,
      notes: null,
      assignmentImportKey: id,
      isRated: false,
      offeredProducts: [product],
      stateWritingMode: overrides.states ? "EXPLICIT" : "ALL_STATES",
      explicitStates: overrides.states ?? null,
      ratingBasis: "Eligibility-only",
      isPrimaryReference: null,
      submissionEmail: overrides.email === undefined ? `${id}@example.com` : overrides.email,
      phone: null,
      sourceUnderwriterReference: null,
      sourceOtherContactsReference: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    appetiteRules: [],
    rateRules: [],
    rateSets: [],
    underwriters: [],
  };
}

describe("launch market routing", () => {
  it("dispatches only eligible rank 1/2/3 and snapshots E as available", () => {
    const result = resolveLaunchCandidates([
      candidate("cornerstone", "1"),
      candidate("decision", "2"),
      candidate("peoplease", "3"),
      candidate("vensure", "E"),
      candidate("inactive", "1", { active: false }),
      candidate("unappointed", "2", { appointed: false }),
      candidate("no-email", "3", { email: null }),
      candidate("wrong-state", "E", { states: ["FL"] }),
    ], "PEO", input);

    assert.deepEqual(
      result.eligible.filter((market) => market.isRouted).map((market) => market.verticalRank),
      ["1", "2", "3"],
    );
    assert.equal(result.eligible.find((market) => market.marketId === "vensure")?.isActive, false);
    assert.deepEqual(
      new Set(result.exclusions.map((row) => row.reason)),
      new Set(["MARKET_INACTIVE", "MARKET_UNAPPOINTED", "NO_SUBMISSION_EMAIL", "STATE_INELIGIBLE"]),
    );
  });

  it("keeps Cannabis Vensure E-only with no automatic send", () => {
    const result = resolveLaunchCandidates([candidate("vensure", "E")], "PEO", {
      ...input,
      vertical: "Cannabis",
    });
    assert.equal(result.eligible.length, 1);
    assert.equal(result.eligible[0].verticalRank, "E");
    assert.equal(result.eligible[0].isRouted, false);
  });

  it("routes ASO wholesale only when the assignment grid has an ASO row", () => {
    const noAsoGrid = resolveLaunchCandidates([candidate("peo-only", "1")], "ASO", input);
    assert.equal(noAsoGrid.eligible.length, 0);

    const explicitAsoGrid = resolveLaunchCandidates(
      [candidate("aso-partner", "1", { product: "ASO" })],
      "ASO",
      input,
    );
    assert.equal(explicitAsoGrid.eligible.length, 1);
    assert.equal(explicitAsoGrid.eligible[0].isRouted, true);
  });

  it("does not treat an inactive or expired parent rate set as state coverage", () => {
    const row = candidate("rate-table-market", "1", { states: undefined });
    row.market.stateWritingMode = "RATE_TABLE";
    row.rateSets = [{
      id: "expired-set",
      marketId: row.market.id,
      productLane: "PEO",
      sourceType: "IMPORT",
      version: 1,
      status: "ACTIVE",
      effectiveDate: "2027-01-01",
      expirationDate: null,
      sourceRef: null,
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }];
    row.rateRules = [{
      id: "rule",
      rateSetId: "expired-set",
      marketId: row.market.id,
      ruleType: "PEO",
      ruleData: { state: "CA" },
      displayOrder: 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }];
    const result = resolveLaunchCandidates([row], "PEO", input);
    assert.equal(result.eligible.length, 0);
    assert.equal(result.exclusions[0]?.reason, "STATE_INELIGIBLE");
  });

  it("never derives Primary from launch rank 1", () => {
    const result = resolveLaunchCandidates([candidate("rank-one", "1")], "PEO", input);
    assert.equal(result.eligible[0].verticalRank, "1");
    assert.equal(result.eligible[0].engagementSource, "AUTO_PREFERRED");
    assert.ok(!("isPrimary" in result.eligible[0]));
  });
});