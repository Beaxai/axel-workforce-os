/**
 * Axel - Cannabis WC Application 2026 AcroForm mapping.
 *
 * Field names extracted from `Server/data/Axel - Cannabis WC Application 2026.pdf`
 * via pdf-lib. The form has 481 AcroForm fields, all auto-named generically by
 * Adobe InDesign (`Text Field 71`, `Check Box 35`, ...). The mapping was built
 * by:
 *   1) extracting every field's name + page + (x, y, w, h) via pdf-lib
 *   2) extracting the page text layer with bounding boxes via
 *      `pdftotext -bbox-layout` (Poppler)
 *   3) for each field, finding the nearest text label using a "same-line LEFT
 *      then ABOVE-30pt" search, with column propagation for table rows
 *
 * The labelled output (`/tmp/axel_labeled.json`) was inspected page-by-page,
 * then translated into the structured mapping below.
 *
 * Field-kind shapes:
 *   - text:      single text field
 *   - checkbox:  single boolean checkbox
 *   - yesno:     pair of checkboxes (one for "yes", one for "no")
 *   - yesnona:   triple checkbox set (yes/no/n/a) — `na` optional
 *
 * Anything not listed here is silently skipped during fill.
 */
import type { CanonicalKey } from "../canonical-schema";

export type AxelFieldKind = "text" | "checkbox" | "yesno" | "yesnona";

export interface AxelTextMapping {
  kind: "text";
  pdfField: string;
}

export interface AxelCheckboxMapping {
  kind: "checkbox";
  pdfField: string;
}

export interface AxelYesNoMapping {
  kind: "yesno";
  yes: string;
  no: string;
}

export interface AxelYesNoNaMapping {
  kind: "yesnona";
  yes: string;
  no: string;
  na?: string;
}

export type AxelFieldMapping =
  | AxelTextMapping
  | AxelCheckboxMapping
  | AxelYesNoMapping
  | AxelYesNoNaMapping;

const txt = (pdfField: string): AxelTextMapping => ({ kind: "text", pdfField });
const cb = (pdfField: string): AxelCheckboxMapping => ({ kind: "checkbox", pdfField });
const yn = (yes: string, no: string): AxelYesNoMapping => ({ kind: "yesno", yes, no });
const ynna = (yes: string, no: string, na?: string): AxelYesNoNaMapping => ({
  kind: "yesnona",
  yes,
  no,
  na,
});

/**
 * Mapping from canonical answer key → Axel PDF AcroForm field(s).
 *
 * Coverage notes:
 *   - General Questions Q1–Q22 are mapped (Q23/Q24 have no Yes/No checkboxes
 *     on this form — they are text-prompt-only on Axel, written into the
 *     descriptions block).
 *   - `payrollFrequency` is collected by the UI but does NOT exist on any of
 *     the 3 PDFs (Axel, ACORD 130, Trean Supp), so it has no mapping here and
 *     no canonical key.
 *   - `outsideSecurityCompanyUsed` is on Axel page 5 (Check Box 180).
 */
export const axelMapping: Partial<Record<CanonicalKey, AxelFieldMapping>> = {
  // ── PAGE 0: Applicant Information ──────────────────────────
  legalBusinessName: txt("Legal Business Name"),
  dba: txt("DBA"),
  fein: txt("FEIN"),
  entityType: txt("Entity Type"),
  yearsInBusiness: txt("Yrs in Business"),
  website: txt("Website"),
  businessStreetAddress: txt("Business Address"),
  businessSuite: txt("Suite"),
  businessCity: txt("City"),
  businessState: txt("State"),
  businessZip: txt("Zip Code"),
  mailingStreetAddress: txt("Text Field 66"),
  mailingSuite: txt("Text Field 65"),
  mailingCity: txt("Text Field 64"),
  mailingState: txt("Text Field 63"),
  mailingZip: txt("Text Field 62"),
  primaryContactName: txt("Contact Name"),
  contactEmail: txt("Email"),
  contactPhone: txt("Phone"),
  primaryClassOfBusiness: txt("Class of business"),
  totalEmployeesFt: txt("FT EE"),
  totalEmployeesPt: txt("PT EE"),
  totalEmployeesAll: txt("Total EE"),
  annualPayroll: txt("Annual Payroll"),
  descriptionOfOperations: txt("Text Field 99"),

  // ── PAGE 1: Coverage History scalars ───────────────────────
  yearsOfPriorCoverage: txt("Text Field 215"),
  experienceModifier: txt("Text Field 214"),
  totalPremiumPaid: txt("Text Field 213"),
  totalClaimsPaid: txt("Text Field 212"),
  lossRatio: txt("Text Field 211"),

  // ── PAGE 2: General Information Q1–Q22 (Yes/No pairs) ──────
  // Q1 Aircraft / watercraft (yes=25, no=11)
  q1_aircraftWatercraft: yn("Check Box 25", "Check Box 11"),
  q2_hazardousMaterial: yn("Check Box 26", "Check Box 12"),
  q3_undergroundOrAbove15ft: yn("Check Box 27", "Check Box 13"),
  q4_workOnWater: yn("Check Box 28", "Check Box 14"),
  q5_otherBusiness: yn("Check Box 29", "Check Box 15"),
  q6_subcontractorsUsed: yn("Check Box 30", "Check Box 16"),
  q7_workSubletWithoutCoi: yn("Check Box 31", "Check Box 17"),
  q8_writtenSafetyProgram: yn("Check Box 32", "Check Box 18"),
  q9_groupTransportation: yn("Check Box 33", "Check Box 19"),
  q10_employeesUnder16OrOver60: yn("Check Box 34", "Check Box 20"),
  q11_seasonalEmployees: yn("Check Box 35", "Check Box 21"),
  q12_volunteerLabor: yn("Check Box 36", "Check Box 22"),
  q13_employeesWithHandicaps: yn("Check Box 37", "Check Box 23"),
  q14_outOfStateTravel: yn("Check Box 38", "Check Box 24"),
  q15_athleticTeamsSponsored: yn("Check Box 47", "Check Box 39"),
  q16_physicalsRequired: yn("Check Box 48", "Check Box 40"),
  q17_otherInsurance: yn("Check Box 49", "Check Box 41"),
  q18_priorCoverageDeclined: yn("Check Box 50", "Check Box 42"),
  q19_employeeHealthPlans: yn("Check Box 51", "Check Box 43"),
  q20_workForOtherBusinesses: yn("Check Box 52", "Check Box 44"),
  q21_leasedEmployees: yn("Check Box 53", "Check Box 45"),
  q22_workFromHome: yn("Check Box 54", "Check Box 46"),
  // Q23/Q24 have no Yes/No checkboxes on this form (text-prompt only).
  // Their "details" go into descriptionOfOperations or remain answer-only.

  // ── PAGE 3: Cannabis Operations ────────────────────────────
  hoursOfOperation: txt("Text Field 246"),
  operationsDispensary: cb("Check Box 56"),
  operationsGrowing: cb("Check Box 59"),
  operationsProcessing: cb("Check Box 60"),
  operationsDelivery: cb("Check Box 61"),
  // Cannabis "consumed on-site": only a single Yes checkbox (262/57) is
  // present on the form; we set it when the answer is "yes".
  consumedOnSite: yn("Check Box 57", "Check Box 58"),
  empCountFt: txt("Text Field 297"),
  empCountPt: txt("Text Field 298"),
  empCountSeasonal: txt("Text Field 299"),
  maxConcentrationPerShift: txt("Text Field 248"),
  paidHourly: cb("Check Box 69"),
  paidCommission: cb("Check Box 71"),
  paidOther: txt("Text Field 252"),
  benefitsPaidSick: cb("Check Box 68"),
  benefitsPaidVacation: cb("Check Box 70"),
  benefits401k: cb("Check Box 72"),
  benefitsOther: txt("Text Field 249"),
  groupHealthCoverage: yn("Check Box 73", "Check Box 74"),
  groupHealthEmployerPct: txt("Text Field 300"),
  preHireWrittenApp: cb("Check Box 82"),
  preHireMvr: cb("Check Box 80"),
  preHireRandomDrug: cb("Check Box 77"),
  preHirePhysicals: cb("Check Box 76"),
  preHireDrugTesting: cb("Check Box 81"),
  preHireReferences: cb("Check Box 79"),
  preHireAnnualMvr: cb("Check Box 78"),
  preHireOther: txt("Text Field 250"),
  // returnToWork — formal=88, informal=89; "none" leaves both unchecked.
  // (handled by fillAxelCannabisApplication via the special enum block)

  subcontractorsUsed: yn("Check Box 87", "Check Box 86"),
  subcontractorPayrollPct: txt("Text Field 301"),
  subcontractorTypes: txt("Text Field 251"),
  subcontractorCoisObtained: ynna("Check Box 94", "Check Box 96"),
  avgEmployeeTurnoverPct: txt("Text Field 302"),
  dayLaborersOrLeasing: yn("Check Box 95", "Check Box 92"),

  // ── PAGE 4: Safety & Premises ──────────────────────────────
  safetyMeetings: yn("Check Box 105", "Check Box 99"),
  // safetyMeetingFreq — weekly=106, monthly=111, quarterly via Text Field 294
  // (annually has no widget on Axel)
  accidentInvestigations: yn("Check Box 107", "Check Box 101"),
  msdsProgram: yn("Check Box 108", "Check Box 102"),
  chemicalsUsed: txt("Text Field 255"),
  chemicalsNotApplicable: cb("Check Box 112"),
  respiratoryProgram: yn("Check Box 123", "Check Box 113"),
  buildingProperlyVentilated: yn("Check Box 124", "Check Box 114"),
  // liftingExposure — lt25=126, 25to40=140, gt40=142
  liftingHandtrucks: cb("Check Box 125"),
  liftingForklifts: cb("Check Box 139"),
  lifting2Person: cb("Check Box 141"),
  liftingOther: txt("Text Field 256"),
  machineryGuarded: ynna("Check Box 127", "Check Box 132"),
  lockoutTagout: ynna("Check Box 128", "Check Box 133"),
  forkliftsUsed: yn("Check Box 134", "Check Box 129"),
  // maxDepth — 0to3=Text 307, 4to7=Text 309, 8plus=Check Box 138
  // maxHeight — 0to6=Text 305, 7to15=Text 306, 15plus=Check Box 137
  heightScissorLift: cb("Check Box 144"),
  heightScaffolding: cb("Check Box 145"),
  heightBucketTruck: cb("Check Box 146"),

  // ── PAGE 5: Fall Protection / PPE / Security / Extraction ──
  fallProtectionArrest: cb("Check Box 147"),
  fallProtectionPositioning: cb("Check Box 149"),
  fallProtectionRetrieval: cb("Check Box 150"),
  covidMeasures: txt("Text Field 263"),
  // Other fall protection details
  // (Text Field 262 — fall protection "other"; no canonical slot, skip)

  ppeGloves: cb("Check Box 156"),
  ppeBackBelts: cb("Check Box 157"),
  ppeEarPlugs: cb("Check Box 160"),
  ppeGoggles: cb("Check Box 162"),
  ppeHardHats: cb("Check Box 155"),
  ppeSafetyGlasses: cb("Check Box 158"),
  ppeSteelToed: cb("Check Box 159"),
  ppeRespirator: cb("Check Box 161"),
  ppeProtectiveClothing: cb("Check Box 154"),
  ppeOther: txt("Text Field 261"),

  securityInteriorCamera: cb("Check Box 166"),
  securityExteriorCamera: cb("Check Box 167"),
  securityMetalDetector: cb("Check Box 169"),
  securityPanicButton: cb("Check Box 172"),
  securityCentralBurglarAlarm: cb("Check Box 170"),
  securityMetalDoors: cb("Check Box 173"),
  securityVestibuleMantrap: cb("Check Box 171"),
  securityGatedWindows: cb("Check Box 168"),
  securityOther: txt("Text Field 260"),
  writtenSecurityPlan: yn("Check Box 174", "Check Box 175"),
  // securityGuards — employees=182, outside=188 (handled via enum block)
  securityGuardsArmed: ynna("Check Box 183", "Check Box 187"),
  outsideSecurityCoisObtained: cb("Check Box 185"),

  extractionCO2: cb("Check Box 184"),
  extractionButane: cb("Check Box 186"),
  extractionIsopropyl: cb("Check Box 189"),
  extractionEthanol: cb("Check Box 179"),
  extractionOther: txt("Text Field 259"),
  extractionProcessDescription: txt("Text Field 258"),

  // ── PAGE 6: Extraction Q&A + Driving exposure ──────────────
  extractionThirdPartyMaintenance: ynna("Check Box 248", "Check Box 249"),
  extractionSegregated: ynna("Check Box 199", "Check Box 202"),
  extractionEmergencyReliefValves: ynna("Check Box 200", "Check Box 203"),
  extractionC1D1Booth: yn("Check Box 201", "Check Box 195"),
  extractionBoothOtherType: txt("Text Field 282"),
  extractionTrainingProvided: ynna("Check Box 204", "Check Box 206"),
  extractionEmergencyPlan: ynna("Check Box 205", "Check Box 207"),
  growAreaSqft: txt("Text Field 283"),
  flowMetersUsed: yn("Check Box 211", "Check Box 208"),
  drivingDeliveryExposure: yn("Check Box 213", "Check Box 210"),
  // drivingMileagePct — <50=212, 50-100=214, 100+=215
  maxDeliveryMileage: txt("Text Field 284"),
  // deliveryRetailPct/Wholesale — Retail=219, Wholesale=222 (single checkboxes)
  vehiclesGpsEquipped: yn("Check Box 221", "Check Box 218"),
  driversAge25to65: yn("Check Box 220", "Check Box 217"),
  driversOver65Count: txt("Text Field 286"),
  hoursOfDelivery: txt("Text Field 285"),

  // ── PAGE 7: Delivery details + signature ───────────────────
  bicycleDelivery: yn("Check Box 245", "Check Box 244"),
  bicycleDeliveryDetails: txt("Text Field 293"),
  groupTransportationProvided: yn("Check Box 240", "Check Box 233"),
  groupTransportationCount: txt("Text Field 303"),
  vehiclesCompanyOwned: yn("Check Box 227", "Check Box 234"),
  // vehicleMaintenance — inhouse=235, outside=228 (handled via enum block)
  distractedDrivingPolicy: ynna("Check Box 229", "Check Box 236"),
  driversTraining: ynna("Check Box 226", "Check Box 232"),
  cdlsRequired: ynna("Check Box 231", "Check Box 225"),
  overnightTravel: yn("Check Box 237", "Check Box 230"),
  overnightTravelFrequency: txt("Text Field 292"),
  avgDistancePerDayMin: txt("Text Field 288"),
  avgDistancePerDayMax: txt("Text Field 291"),
  avgDistanceNa: cb("Check Box 224"),
  avgDeliveriesPerDayMin: txt("Text Field 289"),
  avgDeliveriesPerDayMax: txt("Text Field 290"),
  avgDeliveriesNa: cb("Check Box 223"),
  outOfStateTransportStates: txt("Text Field 254"),
  signatoryDate: txt("Text Field 253"),
};

/**
 * Page 0 — Locations table (4 rows visible).
 * Columns: loc / streetAddress / suite / city / state / zip
 */
export const axelLocationRowFields: ReadonlyArray<{
  loc: string;
  street: string;
  suite: string;
  city: string;
  state: string;
  zip: string;
}> = [
  { loc: "Text Field 98", street: "Text Field 71", suite: "Text Field 87", city: "Text Field 75", state: "Text Field 94", zip: "Text Field 76" },
  { loc: "Text Field 97", street: "Text Field 70", suite: "Text Field 88", city: "Text Field 74", state: "Text Field 93", zip: "Text Field 79" },
  { loc: "Text Field 96", street: "Text Field 69", suite: "Text Field 89", city: "Text Field 73", state: "Text Field 92", zip: "Text Field 78" },
  { loc: "Text Field 95", street: "Text Field 68", suite: "Text Field 90", city: "Text Field 72", state: "Text Field 91", zip: "Text Field 77" },
];

/**
 * Page 0 — Owners / Officers table (4 rows visible).
 */
export const axelOwnerRowFields: ReadonlyArray<{
  firstName: string;
  lastName: string;
  ownership: string;
  duties: string;
  incExc: string;
}> = [
  { firstName: "Text Field 100", lastName: "Text Field 101", ownership: "Text Field 103", duties: "Text Field 102", incExc: "Text Field 104" },
  { firstName: "Text Field 105", lastName: "Text Field 106", ownership: "Text Field 108", duties: "Text Field 107", incExc: "Text Field 109" },
  { firstName: "Text Field 110", lastName: "Text Field 111", ownership: "Text Field 113", duties: "Text Field 112", incExc: "Text Field 114" },
  { firstName: "Text Field 115", lastName: "Text Field 116", ownership: "Text Field 118", duties: "Text Field 117", incExc: "Text Field 119" },
];

/**
 * Page 1 — Class Codes table (15 rows).
 * Columns: loc / classCode / description / fullTime / partTime / annualPayroll
 */
export const axelClassCodeRowFields: ReadonlyArray<{
  loc: string;
  classCode: string;
  description: string;
  fullTime: string;
  partTime: string;
  annualPayroll: string;
}> = [
  { loc: "Text Field 121", classCode: "Text Field 140", description: "Text Field 120", fullTime: "Text Field 122", partTime: "Text Field 132", annualPayroll: "Text Field 136" },
  { loc: "Text Field 124", classCode: "Text Field 141", description: "Text Field 123", fullTime: "Text Field 125", partTime: "Text Field 133", annualPayroll: "Text Field 137" },
  { loc: "Text Field 127", classCode: "Text Field 142", description: "Text Field 126", fullTime: "Text Field 128", partTime: "Text Field 134", annualPayroll: "Text Field 138" },
  { loc: "Text Field 130", classCode: "Text Field 143", description: "Text Field 129", fullTime: "Text Field 131", partTime: "Text Field 135", annualPayroll: "Text Field 139" },
  { loc: "Text Field 145", classCode: "Text Field 164", description: "Text Field 144", fullTime: "Text Field 146", partTime: "Text Field 156", annualPayroll: "Text Field 160" },
  { loc: "Text Field 148", classCode: "Text Field 165", description: "Text Field 147", fullTime: "Text Field 149", partTime: "Text Field 157", annualPayroll: "Text Field 161" },
  { loc: "Text Field 151", classCode: "Text Field 166", description: "Text Field 150", fullTime: "Text Field 152", partTime: "Text Field 158", annualPayroll: "Text Field 162" },
  { loc: "Text Field 154", classCode: "Text Field 167", description: "Text Field 153", fullTime: "Text Field 155", partTime: "Text Field 159", annualPayroll: "Text Field 163" },
  { loc: "Text Field 169", classCode: "Text Field 188", description: "Text Field 168", fullTime: "Text Field 170", partTime: "Text Field 180", annualPayroll: "Text Field 184" },
  { loc: "Text Field 172", classCode: "Text Field 189", description: "Text Field 171", fullTime: "Text Field 173", partTime: "Text Field 181", annualPayroll: "Text Field 185" },
  { loc: "Text Field 175", classCode: "Text Field 190", description: "Text Field 174", fullTime: "Text Field 176", partTime: "Text Field 182", annualPayroll: "Text Field 186" },
  { loc: "Text Field 178", classCode: "Text Field 191", description: "Text Field 177", fullTime: "Text Field 179", partTime: "Text Field 183", annualPayroll: "Text Field 187" },
  { loc: "Text Field 193", classCode: "Text Field 207", description: "Text Field 192", fullTime: "Text Field 194", partTime: "Text Field 201", annualPayroll: "Text Field 204" },
  { loc: "Text Field 196", classCode: "Text Field 208", description: "Text Field 195", fullTime: "Text Field 197", partTime: "Text Field 202", annualPayroll: "Text Field 205" },
  { loc: "Text Field 199", classCode: "Text Field 209", description: "Text Field 198", fullTime: "Text Field 200", partTime: "Text Field 203", annualPayroll: "Text Field 206" },
];

/** Page 1 — bottom-of-class-codes-table total annual payroll cell. */
export const axelClassCodesTotalPayrollField = "Text Field 210";

/**
 * Page 1 — Prior Policies table (5 rows).
 * Columns: effectiveDate / expirationDate / carrier / premium / claimCount /
 * claimsAmount
 */
export const axelPriorPolicyRowFields: ReadonlyArray<{
  effective: string;
  expiration: string;
  carrier: string;
  premium: string;
  claims: string;
  amount: string;
}> = [
  { effective: "Text Field 217", expiration: "Text Field 236", carrier: "Text Field 216", premium: "Text Field 218", claims: "Text Field 228", amount: "Text Field 232" },
  { effective: "Text Field 220", expiration: "Text Field 237", carrier: "Text Field 219", premium: "Text Field 221", claims: "Text Field 229", amount: "Text Field 233" },
  { effective: "Text Field 223", expiration: "Text Field 238", carrier: "Text Field 222", premium: "Text Field 224", claims: "Text Field 230", amount: "Text Field 234" },
  { effective: "Text Field 226", expiration: "Text Field 239", carrier: "Text Field 225", premium: "Text Field 227", claims: "Text Field 231", amount: "Text Field 235" },
  { effective: "Text Field 241", expiration: "Text Field 245", carrier: "Text Field 240", premium: "Text Field 242", claims: "Text Field 243", amount: "Text Field 244" },
];

/**
 * Page 6 — Historical Premiums table (6 rows × 3 cols).
 * Columns: payroll / premium / subCosts
 */
export const axelHistoricalPremiumRowFields: ReadonlyArray<{
  payroll: string;
  premium: string;
  subCosts: string;
}> = [
  { payroll: "Text Field 264", premium: "Text Field 275", subCosts: "Text Field 276" },
  { payroll: "Text Field 265", premium: "Text Field 274", subCosts: "Text Field 277" },
  { payroll: "Text Field 266", premium: "Text Field 273", subCosts: "Text Field 278" },
  { payroll: "Text Field 267", premium: "Text Field 272", subCosts: "Text Field 279" },
  { payroll: "Text Field 268", premium: "Text Field 271", subCosts: "Text Field 280" },
  { payroll: "Text Field 269", premium: "Text Field 270", subCosts: "Text Field 281" },
];

/**
 * Special enum mappings: canonical enum value → set of checkboxes.
 * Each entry is the value-to-checkbox map; unselected values get unchecked.
 */

/** Page 3 Return-To-Work / Light Duty: formal=88, informal=89 */
export const axelReturnToWorkCheckboxes: Record<string, string> = {
  formal: "Check Box 88",
  informal: "Check Box 89",
};

/** Page 4 Safety Program: formal=103, informal=109 */
export const axelSafetyProgramCheckboxes: Record<string, string> = {
  formal: "Check Box 103",
  informal: "Check Box 109",
};

/** Page 4 Safety Training: documented=104, verbal=110 */
export const axelSafetyTrainingCheckboxes: Record<string, string> = {
  documented: "Check Box 104",
  verbal: "Check Box 110",
};

/** Page 4 Safety Meeting Frequency: weekly/monthly are checkboxes; quarterly is a text field */
export const axelSafetyMeetingFreqCheckboxes: Record<string, string> = {
  weekly: "Check Box 106",
  monthly: "Check Box 111",
};
export const axelSafetyMeetingFreqQuarterlyText = "Text Field 294";

/** Page 4 Lifting Exposure: lt25=126, 25to40=140, gt40=142 */
export const axelLiftingExposureCheckboxes: Record<string, string> = {
  lt25: "Check Box 126",
  "25to40": "Check Box 140",
  gt40: "Check Box 142",
};

/** Page 4 Max Depth: 0to3=Text 307, 4to7=Text 309, 8plus=Check Box 138 (mixed types) */
export const axelMaxDepthMapping = {
  text: { "0to3": "Text Field 307", "4to7": "Text Field 309" } as Record<string, string>,
  checkbox: { "8plus": "Check Box 138" } as Record<string, string>,
};

/** Page 4 Max Height: 0to6=Text 305, 7to15=Text 306, 15plus=Check Box 137 (mixed types) */
export const axelMaxHeightMapping = {
  text: { "0to6": "Text Field 305", "7to15": "Text Field 306" } as Record<string, string>,
  checkbox: { "15plus": "Check Box 137" } as Record<string, string>,
};

/** Page 5 Security Guards: employees=182, outside=188 */
export const axelSecurityGuardsCheckboxes: Record<string, string> = {
  employees: "Check Box 182",
  outside: "Check Box 188",
};

/** Page 6 Driving Mileage Pct: lt50=212, 50to100=214, 100plus=215 */
export const axelDrivingMileagePctCheckboxes: Record<string, string> = {
  lt50: "Check Box 212",
  "50to100": "Check Box 214",
  "100plus": "Check Box 215",
};

/** Page 6 Delivery Type: retail=219, wholesale=222 */
export const axelDeliveryTypeCheckboxes: Record<string, string> = {
  retail: "Check Box 219",
  wholesale: "Check Box 222",
};

/** Page 7 Vehicle Maintenance: inhouse=235, outside=228 */
export const axelVehicleMaintenanceCheckboxes: Record<string, string> = {
  inhouse: "Check Box 235",
  outside: "Check Box 228",
};

/** Page 5 Outside Security Company Used (single Yes-style checkbox at 180). */
export const axelOutsideSecurityCompanyCheckbox = "Check Box 180";

/** Page 7 signature widget (filled with the signatory's typed name). */
export const axelSignatureField = "Signature Field 1";
