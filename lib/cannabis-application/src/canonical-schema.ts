/**
 * Canonical Cannabis Workforce Solutions WC Application schema.
 *
 * Single source of truth for the questions in
 *   Server/data/Axel - Cannabis WC Application 2026.pdf
 *
 * Mappings to ACORD 130 and Trean Cannabis Supp PDFs live in `mappings/*`.
 */
import { z } from "zod";

const yn = z.enum(["yes", "no", ""]).default("");
const yes_no_na = z.enum(["yes", "no", "na", ""]).default("");
const text = z.string().default("");
const num = z.string().default("");

export const locationRowSchema = z.object({
  loc: text,
  streetAddress: text,
  suite: text,
  city: text,
  state: text,
  zip: text,
});

export const classCodeRowSchema = z.object({
  loc: text,
  classCode: text,
  description: text,
  fullTime: num,
  partTime: num,
  annualPayroll: num,
});

export const ownerOfficerSchema = z.object({
  firstName: text,
  lastName: text,
  ownershipPct: num,
  duties: text,
  included: z.boolean().default(true),
});

export const priorPolicySchema = z.object({
  effectiveDate: text,
  expirationDate: text,
  carrier: text,
  premium: num,
  claimCount: num,
  claimsAmount: num,
});

export const historicalPremiumSchema = z.object({
  label: text,
  year: text,
  payroll: num,
  premium: num,
  subCosts: num,
});

export const cannabisApplicationAnswersSchema = z.object({
  // ── APPLICANT INFORMATION ─────────────────────────────────
  legalBusinessName: text,
  dba: text,
  fein: text,
  entityType: text, // Sole Prop / Corp / LLC / Trust / Partnership / S-Corp / JV / Other
  yearsInBusiness: text,
  website: text,
  businessStreetAddress: text,
  businessSuite: text,
  businessCity: text,
  businessState: text,
  businessZip: text,
  mailingStreetAddress: text,
  mailingSuite: text,
  mailingCity: text,
  mailingState: text,
  mailingZip: text,
  primaryContactName: text,
  contactEmail: text,
  contactPhone: text,
  primaryClassOfBusiness: text,
  totalEmployeesFt: num,
  totalEmployeesPt: num,
  totalEmployeesAll: num,
  annualPayroll: num,
  descriptionOfOperations: text,

  locations: z.array(locationRowSchema).default([]),
  classCodes: z.array(classCodeRowSchema).default([]),
  ownersOfficers: z.array(ownerOfficerSchema).default([]),

  // ── COVERAGE HISTORY ──────────────────────────────────────
  yearsOfPriorCoverage: text,
  experienceModifier: num,
  totalPremiumPaid: num,
  totalClaimsPaid: num,
  lossRatio: num,
  priorPolicies: z.array(priorPolicySchema).default([]),

  // ── GENERAL INFORMATION (24 ACORD-aligned questions) ──────
  q1_aircraftWatercraft: yn,
  q2_hazardousMaterial: yn,
  q3_undergroundOrAbove15ft: yn,
  q4_workOnWater: yn,
  q5_otherBusiness: yn,
  q6_subcontractorsUsed: yn,
  q6_subcontractorsPct: num,
  q7_workSubletWithoutCoi: yn,
  q8_writtenSafetyProgram: yn,
  q9_groupTransportation: yn,
  q10_employeesUnder16OrOver60: yn,
  q11_seasonalEmployees: yn,
  q12_volunteerLabor: yn,
  q12_volunteerDetails: text,
  q13_employeesWithHandicaps: yn,
  q14_outOfStateTravel: yn,
  q14_outOfStateDetails: text,
  q15_athleticTeamsSponsored: yn,
  q16_physicalsRequired: yn,
  q17_otherInsurance: yn,
  q18_priorCoverageDeclined: yn,
  q19_employeeHealthPlans: yn,
  q20_workForOtherBusinesses: yn,
  q21_leasedEmployees: yn,
  q22_workFromHome: yn,
  q22_workFromHomeCount: num,
  q23_taxLiensOrBankruptcy: yn,
  q23_taxLiensDetails: text,
  q24_unpaidWcPremium: yn,
  q24_unpaidWcDetails: text,

  // ── CARRIER SPECIFIC: CANNABIS — OPERATIONS ───────────────
  hoursOfOperation: text,
  operationsDispensary: z.boolean().default(false),
  operationsGrowing: z.boolean().default(false),
  operationsProcessing: z.boolean().default(false),
  operationsDelivery: z.boolean().default(false),
  operationsExtraction: z.boolean().default(false),
  consumedOnSite: yn,
  consumptionMethods: z.array(z.enum(["smoked", "vaped", "dabbed", "edibles"])).default([]),
  empCountFt: num,
  empCountPt: num,
  empCountSeasonal: num,
  empCountVolunteers: num,
  maxConcentrationPerShift: num,
  paidHourly: z.boolean().default(false),
  paidCommission: z.boolean().default(false),
  paidSalary: z.boolean().default(false),
  paidOther: text,
  benefitsPaidSick: z.boolean().default(false),
  benefitsPaidVacation: z.boolean().default(false),
  benefits401k: z.boolean().default(false),
  benefitsRetirement: z.boolean().default(false),
  benefitsOther: text,
  groupHealthCoverage: yn,
  groupHealthEmployerPct: num,
  preHireWrittenApp: z.boolean().default(false),
  preHireMvr: z.boolean().default(false),
  preHireRandomDrug: z.boolean().default(false),
  preHirePhysicals: z.boolean().default(false),
  preHireCriminal: z.boolean().default(false),
  preHireDrugTesting: z.boolean().default(false),
  preHireReferences: z.boolean().default(false),
  preHireAnnualMvr: z.boolean().default(false),
  preHirePostAccident: z.boolean().default(false),
  preHireOther: text,
  returnToWork: z.enum(["formal", "informal", "none", ""]).default(""),
  subcontractorsUsed: yn,
  subcontractorPayrollPct: num,
  subcontractorTypes: text,
  subcontractorCoisObtained: yes_no_na,
  avgEmployeeTurnoverPct: num,
  dayLaborersOrLeasing: yn,

  // ── CARRIER SPECIFIC: CANNABIS — SAFETY & PREMISES ────────
  safetyProgram: z.enum(["formal", "informal", "none", ""]).default(""),
  safetyTraining: z.enum(["documented", "verbal", "none", ""]).default(""),
  safetyMeetings: yn,
  safetyMeetingFreq: z.enum(["weekly", "monthly", "quarterly", "annually", ""]).default(""),
  accidentInvestigations: yn,
  msdsProgram: yn,
  chemicalsUsed: text,
  chemicalsNotApplicable: z.boolean().default(false),
  respiratoryProgram: yn,
  buildingProperlyVentilated: yn,
  liftingExposure: z.enum(["lt25", "25to40", "gt40", "na", ""]).default(""),
  liftingHandtrucks: z.boolean().default(false),
  liftingForklifts: z.boolean().default(false),
  lifting2Person: z.boolean().default(false),
  liftingOther: text,
  machineryGuarded: yes_no_na,
  lockoutTagout: yes_no_na,
  forkliftsUsed: yn,
  forkliftsCertified: z.boolean().default(false),
  maxDepth: z.enum(["0to3", "4to7", "8plus", "na", ""]).default(""),
  maxHeight: z.enum(["0to6", "7to15", "15plus", "na", ""]).default(""),
  heightScissorLift: z.boolean().default(false),
  heightScaffolding: z.boolean().default(false),
  heightBucketTruck: z.boolean().default(false),
  heightLadder: z.boolean().default(false),
  fallProtectionArrest: z.boolean().default(false),
  fallProtectionPositioning: z.boolean().default(false),
  fallProtectionRetrieval: z.boolean().default(false),
  fallProtectionSuspension: z.boolean().default(false),
  covidMeasures: text,
  ppeGloves: z.boolean().default(false),
  ppeBackBelts: z.boolean().default(false),
  ppeEarPlugs: z.boolean().default(false),
  ppeGoggles: z.boolean().default(false),
  ppeMasks: z.boolean().default(false),
  ppeHardHats: z.boolean().default(false),
  ppeSafetyGlasses: z.boolean().default(false),
  ppeSteelToed: z.boolean().default(false),
  ppeRespirator: z.boolean().default(false),
  ppeNonSlip: z.boolean().default(false),
  ppeProtectiveClothing: z.boolean().default(false),
  ppeOther: text,

  securityInteriorCamera: z.boolean().default(false),
  securityExteriorCamera: z.boolean().default(false),
  securityMetalDetector: z.boolean().default(false),
  securityPanicButton: z.boolean().default(false),
  securityMetalDoors: z.boolean().default(false),
  securityGatedDoors: z.boolean().default(false),
  securityGatedWindows: z.boolean().default(false),
  securityCentralBurglarAlarm: z.boolean().default(false),
  securityCentralFireAlarm: z.boolean().default(false),
  securityVestibuleMantrap: z.boolean().default(false),
  securityDoorIntercom: z.boolean().default(false),
  securityOther: text,
  writtenSecurityPlan: yn,
  securityGuards: z.enum(["employees", "outside", "na", ""]).default(""),
  securityGuardsArmed: yes_no_na,
  outsideSecurityCompanyUsed: yn,
  outsideSecurityCoisObtained: z.boolean().default(false),
  outsideSecurityAdditionalInsured: z.boolean().default(false),

  // ── EXTRACTION ────────────────────────────────────────────
  extractionCO2: z.boolean().default(false),
  extractionButane: z.boolean().default(false),
  extractionIsopropyl: z.boolean().default(false),
  extractionEthanol: z.boolean().default(false),
  extractionWater: z.boolean().default(false),
  extractionOther: text,
  extractionProcessDescription: text,
  extractionThirdPartyMaintenance: yes_no_na,
  extractionSegregated: yes_no_na,
  extractionEmergencyReliefValves: yes_no_na,
  extractionC1D1Booth: yn,
  extractionBoothOtherType: text,
  extractionTrainingProvided: yes_no_na,
  extractionEmergencyPlan: yes_no_na,
  growAreaSqft: num,
  flowMetersUsed: yn,

  // ── HISTORICAL PREMIUMS / PAYROLL / SUBCOST (6 rows) ──────
  historicalPremiums: z.array(historicalPremiumSchema).default([]),

  // ── AUTO EXPOSURE ─────────────────────────────────────────
  drivingDeliveryExposure: yn,
  drivingMileagePctLt50: num,
  drivingMileagePct50to100: num,
  drivingMileagePct100plus: num,
  drivingMileageNa: z.boolean().default(false),
  maxDeliveryMileage: num,
  deliveryRetailPct: num,
  deliveryWholesalePct: num,
  deliveryDirectPct: num,
  vehiclesGpsEquipped: yn,
  driversAge25to65: yn,
  driversOver65Count: num,
  totalDriverCount: num,
  hoursOfDelivery: text,
  bicycleDelivery: yn,
  bicycleDeliveryDetails: text,
  groupTransportationProvided: yn,
  groupTransportationCount: num,
  vehiclesCompanyOwned: yn,
  vehiclesUnmarked: z.boolean().default(false),
  vehicleMaintenance: z.enum(["inhouse", "outside", "no", ""]).default(""),
  distractedDrivingPolicy: yes_no_na,
  driversTraining: yes_no_na,
  cdlsRequired: yes_no_na,
  overnightTravel: yn,
  overnightTravelFrequency: text,
  avgDistancePerDayMin: num,
  avgDistancePerDayMax: num,
  avgDistanceNa: z.boolean().default(false),
  avgDeliveriesPerDayMin: num,
  avgDeliveriesPerDayMax: num,
  avgDeliveriesNa: z.boolean().default(false),
  outOfStateTransportStates: text,

  // ── AFFIRMATION ───────────────────────────────────────────
  signatoryName: text,
  signatoryDate: text,
});

/**
 * Final-submission contract used before an application can be routed to a
 * market. The canonical schema intentionally accepts partial drafts; this
 * stricter schema proves the persisted record can generate a useful carrier
 * package instead of three mostly blank PDFs.
 */
export const routableCannabisApplicationAnswersSchema =
  cannabisApplicationAnswersSchema.superRefine((answers, ctx) => {
    const requiredText: Array<[keyof typeof answers, string]> = [
      ["legalBusinessName", "Legal business name"],
      ["fein", "FEIN"],
      ["entityType", "Entity type"],
      ["businessStreetAddress", "Business street address"],
      ["businessCity", "Business city"],
      ["businessState", "Business state"],
      ["businessZip", "Business ZIP"],
      ["primaryContactName", "Primary contact name"],
      ["contactEmail", "Contact email"],
      ["contactPhone", "Contact phone"],
      ["primaryClassOfBusiness", "Primary class of business"],
      ["totalEmployeesAll", "Total employees"],
      ["annualPayroll", "Annual payroll"],
      ["signatoryName", "Signatory name"],
      ["signatoryDate", "Signatory date"],
    ];

    for (const [field, label] of requiredText) {
      const value = answers[field];
      if (typeof value !== "string" || value.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [field],
          message: `${label} is required for market routing`,
        });
      }
    }

    if (!/^[A-Z]{2}$/i.test(answers.businessState.trim())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["businessState"],
        message: "Business state must be a two-letter code",
      });
    }
    if (!/^\d{5}(?:-\d{4})?$/.test(answers.businessZip.trim())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["businessZip"],
        message: "Business ZIP must be a valid 5- or 9-digit ZIP",
      });
    }
    if (!answers.contactEmail.includes("@")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["contactEmail"],
        message: "Contact email must be valid",
      });
    }
    if (!(Number(answers.totalEmployeesAll) > 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["totalEmployeesAll"],
        message: "Total employees must be greater than zero",
      });
    }
    if (!(Number(answers.annualPayroll) > 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["annualPayroll"],
        message: "Annual payroll must be greater than zero",
      });
    }

    if (answers.locations.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["locations"],
        message: "At least one complete location is required for market routing",
      });
    }
    answers.locations.forEach((location, index) => {
      for (const field of ["loc", "streetAddress", "city", "state", "zip"] as const) {
        if (!location[field].trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["locations", index, field],
            message: `${field} is required for a routed location`,
          });
        }
      }
      if (location.state && !/^[A-Z]{2}$/i.test(location.state.trim())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["locations", index, "state"],
          message: "Location state must be a two-letter code",
        });
      }
      if (location.zip && !/^\d{5}(?:-\d{4})?$/.test(location.zip.trim())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["locations", index, "zip"],
          message: "Location ZIP must be valid",
        });
      }
    });

    if (answers.classCodes.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["classCodes"],
        message: "At least one class-code payroll row is required for market routing",
      });
    }
    answers.classCodes.forEach((row, index) => {
      if (!row.loc.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["classCodes", index, "loc"],
          message: "Class-code location is required",
        });
      }
      if (!row.classCode.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["classCodes", index, "classCode"],
          message: "Class code is required",
        });
      }
      if (!(Number(row.annualPayroll) > 0)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["classCodes", index, "annualPayroll"],
          message: "Class-code annual payroll must be greater than zero",
        });
      }
    });

    const generalQuestions = [
      "q1_aircraftWatercraft",
      "q2_hazardousMaterial",
      "q3_undergroundOrAbove15ft",
      "q4_workOnWater",
      "q5_otherBusiness",
      "q6_subcontractorsUsed",
      "q7_workSubletWithoutCoi",
      "q8_writtenSafetyProgram",
      "q9_groupTransportation",
      "q10_employeesUnder16OrOver60",
      "q11_seasonalEmployees",
      "q12_volunteerLabor",
      "q13_employeesWithHandicaps",
      "q14_outOfStateTravel",
      "q15_athleticTeamsSponsored",
      "q16_physicalsRequired",
      "q17_otherInsurance",
      "q18_priorCoverageDeclined",
      "q19_employeeHealthPlans",
      "q20_workForOtherBusinesses",
      "q21_leasedEmployees",
      "q22_workFromHome",
      "q23_taxLiensOrBankruptcy",
      "q24_unpaidWcPremium",
    ] as const;
    for (const field of generalQuestions) {
      if (answers[field] === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [field],
          message: "A yes/no answer is required for market routing",
        });
      }
    }
  });

export type CannabisApplicationAnswers = z.infer<typeof cannabisApplicationAnswersSchema>;
export type CanonicalKey = keyof CannabisApplicationAnswers;
