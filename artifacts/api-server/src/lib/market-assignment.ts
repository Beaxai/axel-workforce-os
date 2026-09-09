export const ASSIGNMENT_PRODUCTS = ["PEO", "ASO", "WC", "PEO+WC"] as const;
export const ASSIGNMENT_RANKS = ["1", "2", "3", "E"] as const;
export const ASSIGNMENT_VERTICALS = [
  "Ambulance & Emergency Transport",
  "Cannabis",
  "Construction",
  "Garbage & Waste Management",
  "Healthcare",
  "High Experience Mod",
  "Hospitality",
  "Manufacturing",
  "Staffing",
  "Transportation",
  "All Other Industries",
] as const;

export const ASSIGNMENT_VERTICAL_KEYS = [
  "AMBULANCE_EMERGENCY_TRANSPORT",
  "CANNABIS",
  "CONSTRUCTION",
  "GARBAGE_WASTE_MANAGEMENT",
  "HEALTHCARE",
  "HIGH_EXPERIENCE_MOD",
  "HOSPITALITY",
  "MANUFACTURING",
  "STAFFING",
  "TRANSPORTATION",
  "ALL_OTHER_INDUSTRIES",
] as const;

export type AssignmentProduct = (typeof ASSIGNMENT_PRODUCTS)[number];
export type AssignmentRank = (typeof ASSIGNMENT_RANKS)[number];
export type AssignmentVertical = (typeof ASSIGNMENT_VERTICALS)[number];
export type AssignmentVerticalKey = (typeof ASSIGNMENT_VERTICAL_KEYS)[number];

export type AssignmentGridRow = {
  marketImportKey: string;
  marketName: string;
  marketType: string;
  product: string;
  ranks: Readonly<Record<string, string | null | undefined>>;
  statesWritten: string;
  ratingBasis: string;
  isPrimaryReference?: string | null;
  submissionEmail?: string | null;
  phone?: string | null;
  underwriterReference?: string | null;
  otherContactsReference?: string | null;
};

export type NormalizedAssignmentMarket = {
  importKey: string;
  name: string;
  marketType: "WC_CARRIER" | "PEO_PROGRAM";
  productLane: "WC" | "PEO";
  isRated: boolean;
  offeredProducts: AssignmentProduct[];
  stateWritingMode: "RATE_TABLE" | "ALL_STATES" | "EXPLICIT";
  explicitStates: string[] | null;
  ratingBasis: string;
  isPrimaryReference: string | null;
  submissionEmail: string | null;
  phone: string | null;
  sourceUnderwriterReference: string | null;
  sourceOtherContactsReference: string | null;
};

export type NormalizedVerticalAssignment = {
  sourceKey: string;
  marketImportKey: string;
  vertical: AssignmentVertical;
  verticalKey: AssignmentVerticalKey;
  rank: AssignmentRank;
  product: AssignmentProduct;
};

export type NormalizedAssignmentGrid = {
  markets: NormalizedAssignmentMarket[];
  assignments: NormalizedVerticalAssignment[];
};

function clean(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function sameMetadata(a: AssignmentGridRow, b: AssignmentGridRow): boolean {
  const keys: (keyof AssignmentGridRow)[] = [
    "marketType",
    "statesWritten",
    "ratingBasis",
    "isPrimaryReference",
    "submissionEmail",
    "phone",
    "underwriterReference",
    "otherContactsReference",
  ];
  return keys.every((key) => clean(a[key] as string | null | undefined) === clean(b[key] as string | null | undefined));
}

const VERTICAL_BY_NORMALIZED_LABEL = new Map<string, {
  vertical: AssignmentVertical;
  verticalKey: AssignmentVerticalKey;
}>(
  ASSIGNMENT_VERTICALS.map((vertical, index) => [
    vertical.toLocaleLowerCase("en-US"),
    { vertical, verticalKey: ASSIGNMENT_VERTICAL_KEYS[index]! },
  ]),
);

function canonicalVertical(value: string): {
  vertical: AssignmentVertical;
  verticalKey: AssignmentVerticalKey;
} | null {
  return VERTICAL_BY_NORMALIZED_LABEL.get(value.trim().toLocaleLowerCase("en-US")) ?? null;
}

export function assignmentMarketMetadata(market: NormalizedAssignmentMarket) {
  return {
    assignmentImportKey: market.importKey,
    isRated: market.isRated,
    offeredProducts: market.offeredProducts,
    stateWritingMode: market.stateWritingMode,
    explicitStates: market.explicitStates,
    ratingBasis: market.ratingBasis,
    isPrimaryReference: market.isPrimaryReference,
    submissionEmail: market.submissionEmail,
    phone: market.phone,
    sourceUnderwriterReference: market.sourceUnderwriterReference,
    sourceOtherContactsReference: market.sourceOtherContactsReference,
  };
}

export function normalizeAssignmentGrid(
  rows: readonly AssignmentGridRow[],
  importSource: string,
): NormalizedAssignmentGrid {
  if (!clean(importSource)) throw new Error("Import source must be nonempty");

  const grouped = new Map<string, AssignmentGridRow[]>();
  for (const row of rows) {
    const importKey = clean(row.marketImportKey);
    if (!importKey || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(importKey)) {
      throw new Error(`Invalid explicit market import key '${row.marketImportKey}'`);
    }
    const name = clean(row.marketName);
    if (!name) throw new Error("Market Name must be nonempty");
    grouped.set(importKey, [...(grouped.get(importKey) ?? []), row]);
  }

  const markets: NormalizedAssignmentMarket[] = [];
  const assignments: NormalizedVerticalAssignment[] = [];
  const marketIdentities = new Set<string>();
  const assignmentKeys = new Set<string>();
  const preferredRanks = new Set<string>();

  for (const [importKey, marketRows] of grouped) {
    const first = marketRows[0]!;
    const name = clean(first.marketName)!;
    if (marketRows.some((row) => !sameMetadata(first, row))) {
      throw new Error(`Conflicting metadata for market import key '${importKey}'`);
    }

    const marketType =
      clean(first.marketType) === "WC Carrier"
        ? "WC_CARRIER"
        : clean(first.marketType) === "PEO/ASO Provider"
          ? "PEO_PROGRAM"
          : null;
    if (!marketType) throw new Error(`Unknown Market Type '${first.marketType}' for '${name}'`);

    const offeredProducts = [...new Set(marketRows.map((row) => clean(row.product)))];
    if (offeredProducts.some((product) => !ASSIGNMENT_PRODUCTS.includes(product as AssignmentProduct))) {
      throw new Error(`Unknown Product for '${name}': ${offeredProducts.join(", ")}`);
    }

    const ratingBasis = clean(first.ratingBasis);
    if (ratingBasis !== "Rated (self-priced)" && ratingBasis !== "Eligibility-only") {
      throw new Error(`Unknown Rating Basis '${first.ratingBasis}' for '${name}'`);
    }

    const statesWritten = clean(first.statesWritten);
    let stateWritingMode: NormalizedAssignmentMarket["stateWritingMode"];
    let explicitStates: string[] | null = null;
    if (statesWritten?.toUpperCase() === "ALL STATES") {
      stateWritingMode = "ALL_STATES";
    } else if (statesWritten?.toLowerCase() === "per bic rate table") {
      stateWritingMode = "RATE_TABLE";
    } else {
      explicitStates = (statesWritten ?? "").split(",").map((state) => state.trim().toUpperCase()).filter(Boolean);
      if (!explicitStates.length || explicitStates.some((state) => !/^[A-Z]{2}$/.test(state))) {
        throw new Error(`Invalid States Written '${first.statesWritten}' for '${name}'`);
      }
      explicitStates = [...new Set(explicitStates)].sort();
      stateWritingMode = "EXPLICIT";
    }

    const identity = `${name.toLocaleLowerCase("en-US")}:${marketType}`;
    if (marketIdentities.has(identity)) {
      throw new Error(`Market '${name}' is assigned more than one explicit import key`);
    }
    marketIdentities.add(identity);
    markets.push({
      importKey,
      name,
      marketType,
      productLane: marketType === "WC_CARRIER" ? "WC" : "PEO",
      isRated: ratingBasis === "Rated (self-priced)",
      offeredProducts: offeredProducts as AssignmentProduct[],
      stateWritingMode,
      explicitStates,
      ratingBasis,
      isPrimaryReference: clean(first.isPrimaryReference),
      submissionEmail: clean(first.submissionEmail),
      phone: clean(first.phone),
      sourceUnderwriterReference: clean(first.underwriterReference),
      sourceOtherContactsReference: clean(first.otherContactsReference),
    });

    for (const row of marketRows) {
      const product = clean(row.product) as AssignmentProduct;
      for (const [rawVertical, rawRank] of Object.entries(row.ranks)) {
        const canonical = canonicalVertical(rawVertical);
        if (!canonical) {
          throw new Error(`Unknown vertical '${rawVertical}' for '${name}'`);
        }
        const { vertical, verticalKey } = canonical;
        const rank = clean(rawRank);
        if (!rank) continue;
        if (!ASSIGNMENT_RANKS.includes(rank as AssignmentRank)) {
          throw new Error(`Invalid rank '${rawRank}' for '${name}' / '${vertical}'`);
        }
        const assignmentKey = `${importKey}:${verticalKey}:${product}`;
        if (assignmentKeys.has(assignmentKey)) {
          throw new Error(`Duplicate assignment '${name}' / '${vertical}' / '${product}'`);
        }
        assignmentKeys.add(assignmentKey);
        if (rank !== "E") {
          const preferredKey = `${verticalKey}:${product}:${rank}`;
          if (preferredRanks.has(preferredKey)) {
            throw new Error(`Duplicate preferred rank '${rank}' in vertical '${vertical}'`);
          }
          preferredRanks.add(preferredKey);
        }
        assignments.push({
          sourceKey: `${importSource}:${assignmentKey}`,
          marketImportKey: importKey,
          vertical,
          verticalKey,
          rank: rank as AssignmentRank,
          product,
        });
      }
    }
  }

  return {
    markets: markets.sort((a, b) => a.importKey.localeCompare(b.importKey)),
    assignments: assignments.sort((a, b) => a.sourceKey.localeCompare(b.sourceKey)),
  };
}

export function obsoleteImportedSourceKeys(
  existing: readonly { importSource: string | null; sourceKey: string | null }[],
  desired: readonly { sourceKey: string }[],
  importSource: string,
): string[] {
  const desiredKeys = new Set(desired.map((row) => row.sourceKey));
  return existing
    .filter((row) => row.importSource === importSource && row.sourceKey && !desiredKeys.has(row.sourceKey))
    .map((row) => row.sourceKey!)
    .sort();
}