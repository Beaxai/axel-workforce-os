/**
 * ACORD 130 (2013/01) AcroForm mapping for the canonical Cannabis WC application.
 *
 * Field names were extracted directly from `Server/data/Acord 130-Axel.pdf`
 * via pdf-lib. The form has 319 fields, most of which are unlabeled
 * `Textfield<n>` placeholders with no semantic name. We map the
 * high-confidence semantic fields and the 24 numbered Yes/No questions; the
 * remaining unlabeled placeholders will need to be discovered visually in a
 * follow-up pass and added here.
 */
import type { CanonicalKey } from "../canonical-schema";

export type Transform =
  | "string"
  | "uppercase"
  | "yes_no"
  | "yes_no_uppercase"
  | "boolean_x"
  | "currency"
  | "percent_string";

export interface AcordFieldMapping {
  pdfField: string;
  transform?: Transform;
}

/**
 * Mapping from canonical answer key → ACORD 130 AcroForm field name.
 * Only fields with a known semantic field name (or numbered Y/N pattern) are
 * included. Anything not listed here is silently skipped during fill.
 */
export const acord130Mapping: Partial<Record<CanonicalKey, AcordFieldMapping>> = {
  // ── Header / applicant info ─────────────────────────────────
  legalBusinessName: { pdfField: "APPLICANT_NAME" },
  contactPhone: { pdfField: "OFFICE_PHONE" },
  // Mailing address composite block
  mailingStreetAddress: { pdfField: "MAILING_ADDRESS_including_ZIP__4_or_Canadian_Posta" },
  yearsInBusiness: { pdfField: "YRS_IN_BUS" },
  website: { pdfField: "ADDRESS_WEBSITE" },
  contactEmail: { pdfField: "EMAIL_ADDRESS" },
  fein: { pdfField: "FEDERAL_EMPLOYER_ID_NUMBER" },
  // Effective dates aren't in canonical schema yet (rating engine derives)

  // ── Contact information block ──────────────────────────────
  primaryContactName: { pdfField: "NAME" },

  // ── Signature ──────────────────────────────────────────────
  signatoryName: { pdfField: "APPLICANTS_SIGNATURE_Must_be_Officer_Owner_or_Part" },
  signatoryDate: { pdfField: "DATE" },

  // ── 24 General Information Questions (YN ... YN22, then named) ─
  q1_aircraftWatercraft: { pdfField: "YN", transform: "yes_no_uppercase" },
  q2_hazardousMaterial: { pdfField: "YN0", transform: "yes_no_uppercase" },
  q3_undergroundOrAbove15ft: { pdfField: "YN1", transform: "yes_no_uppercase" },
  q4_workOnWater: { pdfField: "YN2", transform: "yes_no_uppercase" },
  q5_otherBusiness: { pdfField: "YN3", transform: "yes_no_uppercase" },
  q6_subcontractorsUsed: { pdfField: "YN4", transform: "yes_no_uppercase" },
  q7_workSubletWithoutCoi: { pdfField: "YN5", transform: "yes_no_uppercase" },
  q8_writtenSafetyProgram: { pdfField: "YN6", transform: "yes_no_uppercase" },
  q9_groupTransportation: { pdfField: "YN7", transform: "yes_no_uppercase" },
  q10_employeesUnder16OrOver60: { pdfField: "YN8", transform: "yes_no_uppercase" },
  q11_seasonalEmployees: { pdfField: "YN9", transform: "yes_no_uppercase" },
  q12_volunteerLabor: { pdfField: "YN10", transform: "yes_no_uppercase" },
  q13_employeesWithHandicaps: { pdfField: "YN11", transform: "yes_no_uppercase" },
  q14_outOfStateTravel: { pdfField: "YN12", transform: "yes_no_uppercase" },
  q15_athleticTeamsSponsored: { pdfField: "YN13", transform: "yes_no_uppercase" },
  q16_physicalsRequired: { pdfField: "YN14", transform: "yes_no_uppercase" },
  q17_otherInsurance: { pdfField: "YN15", transform: "yes_no_uppercase" },
  q18_priorCoverageDeclined: { pdfField: "YN16", transform: "yes_no_uppercase" },
  q19_employeeHealthPlans: { pdfField: "YN17", transform: "yes_no_uppercase" },
  q20_workForOtherBusinesses: { pdfField: "YN18", transform: "yes_no_uppercase" },
  q21_leasedEmployees: { pdfField: "YN19", transform: "yes_no_uppercase" },
  q22_workFromHome: { pdfField: "YN20", transform: "yes_no_uppercase" },
  q22_workFromHomeCount: { pdfField: "22_DO_ANY_EMPLOYEES_PREDOMINANTLY_WORK_AT_HOME_If" },
  q23_taxLiensOrBankruptcy: { pdfField: "YN21", transform: "yes_no_uppercase" },
  q24_unpaidWcPremium: { pdfField: "YN22", transform: "yes_no_uppercase" },
};

/**
 * Repeated location rows on page 1 (LOC / HIGHEST_FLOOR / STREET_CITY...).
 * Up to 4 rows: base + 0/1/2 suffixes.
 */
export const acord130LocationRowFields = [
  { loc: "LOC", floor: "HIGHEST_FLOOR", address: "STREET_CITY_COUNTY_STATE_ZIP_CODE" },
  { loc: "LOC0", floor: "HIGHEST_FLOOR0", address: "STREET_CITY_COUNTY_STATE_ZIP_CODE0" },
  { loc: "LOC1", floor: "HIGHEST_FLOOR1", address: "STREET_CITY_COUNTY_STATE_ZIP_CODE1" },
] as const;

/**
 * Owner / officer rows (PARTNERS, OFFICERS, RELATIVES table).
 * Base + 0/1/2 suffixes — up to 4 owners.
 */
export const acord130OwnerRowFields = [
  { state: "STATE", loc: "LOC2", name: "NAME2", dob: "DATE_OF_BIRTH", title: "TITLE_RELATIONSHIP", ownership: "OWNER_SHIP", duties: "DUTIES", incExc: "INCEXC", classCode: "CLASS_CODE", payroll: "REMUNERATIONPAYROLL" },
  { state: "STATE0", loc: "LOC3", name: "NAME3", dob: "DATE_OF_BIRTH0", title: "TITLE_RELATIONSHIP0", ownership: "OWNER_SHIP0", duties: "DUTIES0", incExc: "INCEXC0", classCode: "CLASS_CODE0", payroll: "REMUNERATIONPAYROLL0" },
  { state: "STATE1", loc: "LOC4", name: "NAME4", dob: "DATE_OF_BIRTH1", title: "TITLE_RELATIONSHIP1", ownership: "OWNER_SHIP1", duties: "DUTIES1", incExc: "INCEXC1", classCode: "CLASS_CODE1", payroll: "REMUNERATIONPAYROLL1" },
  { state: "STATE2", loc: "LOC5", name: "NAME5", dob: "DATE_OF_BIRTH2", title: "TITLE_RELATIONSHIP2", ownership: "OWNER_SHIP2", duties: "DUTIES2", incExc: "INCEXC2", classCode: "CLASS_CODE2", payroll: "REMUNERATIONPAYROLL2" },
] as const;
