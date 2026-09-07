import type { AssignmentGridRow } from "../lib/market-assignment.js";

export const MARKET_ASSIGNMENT_IMPORT_SOURCE = "axel-market-assignment-grid-v5";

export const MARKET_ASSIGNMENT_COLUMNS = {
  marketName: "Market Name",
  marketType: "Market Type",
  product: "Product",
  statesWritten: "States Written",
  ratingBasis: "Rating Basis",
  isPrimaryReference: "Is Primary?",
  submissionEmail: "Submission Email",
  phone: "Phone",
  underwriterReference: "Underwriter",
  otherContactsReference: "Other Contacts",
} as const;

export const MARKET_ASSIGNMENT_VERTICAL_COLUMNS = {
  "Ambulance & Emergency Transport": "Ambulance & Emergency Transport",
  Cannabis: "Cannabis",
  Construction: "Construction",
  "Garbage & Waste Management": "Garbage & Waste Management",
  Healthcare: "Healthcare",
  "High Experience Mod": "High Experience Mod",
  Hospitality: "Hospitality",
  Manufacturing: "Manufacturing",
  Staffing: "Staffing",
  Transportation: "Transportation",
  "All Other Industries": "All Other Industries",
} as const;

const standardRanks = {
  "Ambulance & Emergency Transport": "E",
  Construction: "E",
  "Garbage & Waste Management": "E",
  Healthcare: "E",
  "High Experience Mod": "E",
  Hospitality: "E",
  Manufacturing: "E",
  Staffing: "E",
  Transportation: "E",
  "All Other Industries": "E",
} as const;

function ranked(rank: "1" | "2" | "3") {
  return Object.fromEntries(Object.keys(standardRanks).map((vertical) => [vertical, rank]));
}

/**
 * Typed transcription of the supplied starting workbook, with the approved
 * Cannabis and Construction corrections. Replace this fixture when the final
 * grid arrives; normalization and persistence do not need to change.
 */
export const MARKET_ASSIGNMENT_SEED: readonly AssignmentGridRow[] = [
  {
    marketImportKey: "benchmark-bic",
    marketName: "Benchmark (BIC)",
    marketType: "WC Carrier",
    product: "WC",
    ranks: {},
    statesWritten: "Per BIC rate table",
    ratingBasis: "Rated (self-priced)",
    isPrimaryReference: "Yes (WC)",
    submissionEmail: "cprince@axelins.com",
  },
  {
    marketImportKey: "axel",
    marketName: "Axel",
    marketType: "PEO/ASO Provider",
    product: "PEO",
    ranks: {},
    statesWritten: "ALL STATES",
    ratingBasis: "Rated (self-priced)",
    isPrimaryReference: "Yes (PEO/ASO)",
    submissionEmail: "submissions@axelins.com",
  },
  {
    marketImportKey: "axel",
    marketName: "Axel",
    marketType: "PEO/ASO Provider",
    product: "ASO",
    ranks: {},
    statesWritten: "ALL STATES",
    ratingBasis: "Rated (self-priced)",
    isPrimaryReference: "Yes (PEO/ASO)",
    submissionEmail: "submissions@axelins.com",
  },
  {
    marketImportKey: "cornerstone-peo",
    marketName: "Cornerstone PEO",
    marketType: "PEO/ASO Provider",
    product: "PEO",
    ranks: ranked("1"),
    statesWritten: "ALL STATES",
    ratingBasis: "Eligibility-only",
    isPrimaryReference: "No",
    submissionEmail: "submissions@axelins.com",
  },
  {
    marketImportKey: "decision-hr",
    marketName: "Decision HR",
    marketType: "PEO/ASO Provider",
    product: "PEO",
    ranks: ranked("2"),
    statesWritten: "ALL STATES",
    ratingBasis: "Eligibility-only",
    isPrimaryReference: "No",
    submissionEmail: "submissions@axelins.com",
  },
  {
    marketImportKey: "employers-personnel",
    marketName: "Employers Personnel",
    marketType: "PEO/ASO Provider",
    product: "PEO",
    ranks: standardRanks,
    statesWritten: "ALL STATES",
    ratingBasis: "Eligibility-only",
    isPrimaryReference: "No",
    submissionEmail: "submissions@axelins.com",
  },
  {
    marketImportKey: "peoplease",
    marketName: "Peoplease",
    marketType: "PEO/ASO Provider",
    product: "PEO",
    ranks: ranked("3"),
    statesWritten: "ALL STATES",
    ratingBasis: "Eligibility-only",
    isPrimaryReference: "No",
    submissionEmail: "submissions@axelins.com",
  },
  {
    marketImportKey: "southeast-personnel",
    marketName: "SouthEast Personnel",
    marketType: "PEO/ASO Provider",
    product: "PEO",
    ranks: standardRanks,
    statesWritten: "ALL STATES",
    ratingBasis: "Eligibility-only",
    isPrimaryReference: "No",
    submissionEmail: "submissions@axelins.com",
  },
  {
    marketImportKey: "vensure",
    marketName: "Vensure",
    marketType: "PEO/ASO Provider",
    product: "PEO",
    ranks: { ...standardRanks, Cannabis: "E" },
    statesWritten: "ALL STATES",
    ratingBasis: "Eligibility-only",
    isPrimaryReference: "No",
    submissionEmail: "submissions@axelins.com",
  },
  {
    marketImportKey: "wbs-workforce-business-services",
    marketName: "WBS (Workforce Business Services)",
    marketType: "PEO/ASO Provider",
    product: "PEO",
    ranks: {
      "Ambulance & Emergency Transport": "E",
      Construction: "E",
      "Garbage & Waste Management": "E",
    },
    statesWritten: "CA, GA, FL",
    ratingBasis: "Eligibility-only",
    isPrimaryReference: "No",
    submissionEmail: "submissions@axelins.com",
  },
];