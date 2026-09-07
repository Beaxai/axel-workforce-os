import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MARKET_ASSIGNMENT_IMPORT_SOURCE,
  MARKET_ASSIGNMENT_SEED,
} from "../data/market-assignment-seed.js";
import {
  type AssignmentGridRow,
  assignmentMarketMetadata,
  normalizeAssignmentGrid,
  obsoleteImportedSourceKeys,
} from "../lib/market-assignment.js";

const baseRow: AssignmentGridRow = {
  marketImportKey: "test-peo",
  marketName: "Test PEO",
  marketType: "PEO/ASO Provider",
  product: "PEO",
  ranks: {},
  statesWritten: "FL, GA",
  ratingBasis: "Eligibility-only",
  isPrimaryReference: "No",
};

describe("market assignment grid normalization", () => {
  it("collapses Axel products into one market and creates no Axel ranks", () => {
    const result = normalizeAssignmentGrid(
      MARKET_ASSIGNMENT_SEED,
      MARKET_ASSIGNMENT_IMPORT_SOURCE,
    );
    const axel = result.markets.filter((market) => market.name === "Axel");
    assert.equal(axel.length, 1);
    assert.deepEqual(axel[0]!.offeredProducts, ["PEO", "ASO"]);
    assert.deepEqual(
      result.assignments.filter((assignment) => assignment.marketImportKey === "axel"),
      [],
    );
    assert.equal(axel[0]!.isPrimaryReference, "Yes (PEO/ASO)");
  });

  it("keeps Cannabis intentionally Vensure E-only with no preferred ranks", () => {
    const result = normalizeAssignmentGrid(
      MARKET_ASSIGNMENT_SEED,
      MARKET_ASSIGNMENT_IMPORT_SOURCE,
    );
    assert.deepEqual(
      result.assignments
        .filter((assignment) => assignment.vertical === "Cannabis")
        .map(({ marketImportKey, rank }) => ({ marketImportKey, rank })),
      [{ marketImportKey: "vensure", rank: "E" }],
    );
  });

  it("matches the approved Construction lineup exactly", () => {
    const result = normalizeAssignmentGrid(
      MARKET_ASSIGNMENT_SEED,
      MARKET_ASSIGNMENT_IMPORT_SOURCE,
    );
    assert.deepEqual(
      result.assignments
        .filter((assignment) => assignment.vertical === "Construction")
        .map(({ marketImportKey, rank }) => ({ marketImportKey, rank }))
        .sort((a, b) => a.rank.localeCompare(b.rank) || a.marketImportKey.localeCompare(b.marketImportKey)),
      [
        { marketImportKey: "cornerstone-peo", rank: "1" },
        { marketImportKey: "decision-hr", rank: "2" },
        { marketImportKey: "peoplease", rank: "3" },
        { marketImportKey: "employers-personnel", rank: "E" },
        { marketImportKey: "southeast-personnel", rank: "E" },
        { marketImportKey: "vensure", rank: "E" },
        { marketImportKey: "wbs-workforce-business-services", rank: "E" },
      ],
    );
  });

  it("accepts the same preferred rank in different verticals and multiple E rows", () => {
    const result = normalizeAssignmentGrid(
      [
        { ...baseRow, marketImportKey: "one", marketName: "One", ranks: { Construction: "1", Healthcare: "1" } },
        { ...baseRow, marketImportKey: "two", marketName: "Two", ranks: { Construction: "E" } },
        { ...baseRow, marketImportKey: "three", marketName: "Three", ranks: { Construction: "E" } },
      ],
      "test-source",
    );
    assert.equal(result.assignments.length, 4);
  });

  it("rejects duplicate preferred ranks only within one vertical", () => {
    assert.throws(
      () =>
        normalizeAssignmentGrid(
          [
            { ...baseRow, marketImportKey: "one", marketName: "One", ranks: { Construction: "1" } },
            { ...baseRow, marketImportKey: "two", marketName: "Two", ranks: { Construction: "1" } },
          ],
          "test-source",
        ),
      /Duplicate preferred rank '1' in vertical 'Construction'/,
    );
  });

  it("canonicalizes vertical whitespace/case before preferred-rank uniqueness", () => {
    assert.throws(
      () =>
        normalizeAssignmentGrid(
          [
            { ...baseRow, marketImportKey: "one", marketName: "One", ranks: { Construction: "1" } },
            { ...baseRow, marketImportKey: "two", marketName: "Two", ranks: { "  cOnStRuCtIoN  ": "1" } },
          ],
          "test-source",
        ),
      /Duplicate preferred rank '1' in vertical 'Construction'/,
    );

    const result = normalizeAssignmentGrid(
      [{ ...baseRow, ranks: { "  cOnStRuCtIoN  ": "E" } }],
      "test-source",
    );
    assert.equal(result.assignments[0]!.vertical, "Construction");
    assert.equal(result.assignments[0]!.verticalKey, "CONSTRUCTION");
  });

  it("uses explicit import identity despite display-name variations", () => {
    const result = normalizeAssignmentGrid(
      [
        { ...baseRow, marketImportKey: "stable-market", marketName: "Display Name", product: "PEO" },
        { ...baseRow, marketImportKey: "stable-market", marketName: "Renamed Display", product: "ASO" },
      ],
      "test-source",
    );
    assert.equal(result.markets.length, 1);
    assert.equal(result.markets[0]!.importKey, "stable-market");
    assert.deepEqual(result.markets[0]!.offeredProducts, ["PEO", "ASO"]);
  });

  it("rejects conflicting metadata for one explicit import key", () => {
    assert.throws(
      () =>
        normalizeAssignmentGrid(
          [
            baseRow,
            { ...baseRow, marketName: "Other display", product: "ASO", statesWritten: "ALL STATES" },
          ],
          "test-source",
        ),
      /Conflicting metadata for market import key 'test-peo'/,
    );
  });

  it("produces an update patch that cannot overwrite an existing market name", () => {
    const market = normalizeAssignmentGrid([baseRow], "test-source").markets[0]!;
    const patch = assignmentMarketMetadata({ ...market, name: "Workbook Rename" });
    assert.equal(Object.hasOwn(patch, "name"), false);
    assert.equal(patch.assignmentImportKey, "test-peo");
  });

  it("rejects invalid ranks, products, verticals, and duplicate assignments", () => {
    assert.throws(
      () => normalizeAssignmentGrid([{ ...baseRow, ranks: { Construction: "4" } }], "test"),
      /Invalid rank/,
    );
    assert.throws(
      () => normalizeAssignmentGrid([{ ...baseRow, product: "HRA" }], "test"),
      /Unknown Product/,
    );
    assert.throws(
      () => normalizeAssignmentGrid([{ ...baseRow, ranks: { Unknown: "E" } }], "test"),
      /Unknown vertical/,
    );
    assert.throws(
      () =>
        normalizeAssignmentGrid(
          [
            { ...baseRow, ranks: { Construction: "E" } },
            { ...baseRow, ranks: { Construction: "E" } },
          ],
          "test",
        ),
      /Duplicate assignment/,
    );
  });

  it("normalizes explicit states deterministically", () => {
    const result = normalizeAssignmentGrid(
      [{ ...baseRow, statesWritten: "ga, FL, GA" }],
      "test",
    );
    assert.equal(result.markets[0]!.stateWritingMode, "EXPLICIT");
    assert.deepEqual(result.markets[0]!.explicitStates, ["FL", "GA"]);
  });

  it("treats blank rank cells as no row", () => {
    const result = normalizeAssignmentGrid(
      [{ ...baseRow, ranks: { Construction: "", Cannabis: null } }],
      "test",
    );
    assert.deepEqual(result.assignments, []);
  });

  it("removes only obsolete rows owned by the same import source", () => {
    const existing = [
      { importSource: "grid", sourceKey: "grid:keep" },
      { importSource: "grid", sourceKey: "grid:remove" },
      { importSource: "other-grid", sourceKey: "other:keep" },
      { importSource: null, sourceKey: null },
    ];
    assert.deepEqual(
      obsoleteImportedSourceKeys(existing, [{ sourceKey: "grid:keep" }], "grid"),
      ["grid:remove"],
    );
  });

  it("is deterministic and plans no removals for an identical reimport", () => {
    const first = normalizeAssignmentGrid(
      MARKET_ASSIGNMENT_SEED,
      MARKET_ASSIGNMENT_IMPORT_SOURCE,
    );
    const second = normalizeAssignmentGrid(
      MARKET_ASSIGNMENT_SEED,
      MARKET_ASSIGNMENT_IMPORT_SOURCE,
    );
    assert.deepEqual(second, first);
    assert.deepEqual(
      obsoleteImportedSourceKeys(
        first.assignments.map((row) => ({
          importSource: MARKET_ASSIGNMENT_IMPORT_SOURCE,
          sourceKey: row.sourceKey,
        })),
        second.assignments,
        MARKET_ASSIGNMENT_IMPORT_SOURCE,
      ),
      [],
    );
  });
});