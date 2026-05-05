/**
 * Trean Cannabis Supplemental application AcroForm mapping.
 *
 * Field names extracted from `Server/data/Trean - Cannabis Supp.pdf` via
 * pdf-lib. The form uses fully-qualified XFA-style paths (e.g.
 * `CSA[0].Pages[0].SEC_2[0].Content[0].Question[4].#subform[0].RadioButtonList[0]`).
 * Mapping is by visual correlation with the PDF text layer.
 */
import type { CanonicalKey } from "../canonical-schema";

export type TreanFieldKind = "text" | "radio" | "checkbox";

/** Radio: value to write into a `PDFRadioGroup`. The export value matches an option label. */
export interface TreanRadioMapping {
  pdfField: string;
  kind: "radio";
  /** Map canonical value → option label that the PDF radio group exposes. */
  options: Record<string, string>;
}

/** Checkbox: pure boolean (true/false) on a PDFCheckBox. */
export interface TreanCheckboxMapping {
  pdfField: string;
  kind: "checkbox";
}

/** Text field. */
export interface TreanTextMapping {
  pdfField: string;
  kind: "text";
}

export type TreanFieldMapping =
  | TreanRadioMapping
  | TreanCheckboxMapping
  | TreanTextMapping;

const SEC1 = "CSA[0].Pages[0].SEC_1[0].Content[0]";
const SEC2 = "CSA[0].Pages[0].SEC_2[0].Content[0]";
const SEC3 = "CSA[0].Pages[0].SEC_3[0].Content[0]";

const yn = (pdfField: string): TreanRadioMapping => ({
  pdfField,
  kind: "radio",
  options: { yes: "1", no: "2" },
});
const ynna = (pdfField: string): TreanRadioMapping => ({
  pdfField,
  kind: "radio",
  options: { yes: "1", no: "2", na: "3" },
});

export const treanMapping: Partial<Record<CanonicalKey, TreanFieldMapping>> = {
  // ── SEC 1: Applicant Information ────────────────────────────
  legalBusinessName: { pdfField: `${SEC1}.TextField1[0]`, kind: "text" },
  website: { pdfField: `${SEC1}.Row[1].TextField1[1]`, kind: "text" },
  hoursOfOperation: { pdfField: `${SEC1}.#subform[2].TextField1[1]`, kind: "text" },
  descriptionOfOperations: { pdfField: `${SEC1}.#subform[3].TextField1[2]`, kind: "text" },

  // ── SEC 2: Operations ───────────────────────────────────────
  operationsDispensary: { pdfField: `${SEC2}.Added[0].#subform[0].#field[0]`, kind: "checkbox" },
  operationsGrowing: { pdfField: `${SEC2}.Added[0].#subform[0].#field[1]`, kind: "checkbox" },
  operationsProcessing: { pdfField: `${SEC2}.Added[0].#subform[0].#field[2]`, kind: "checkbox" },
  operationsDelivery: { pdfField: `${SEC2}.Added[0].#subform[0].#field[3]`, kind: "checkbox" },
  operationsExtraction: { pdfField: `${SEC2}.Added[0].#subform[0].#field[4]`, kind: "checkbox" },

  consumedOnSite: yn(`${SEC2}.Question[0].#subform[2].#subform[3].RadioButtonList[0]`),
  // Question[0].TextField1[0] = "if yes, smoked/vaped/..." — free text, not in canonical (consumptionMethods is array)

  empCountFt: { pdfField: `${SEC2}.Question[1].#subform[1].#subform[2].TextField1[0]`, kind: "text" },
  empCountPt: { pdfField: `${SEC2}.Question[1].#subform[1].#subform[3].TextField1[1]`, kind: "text" },
  empCountSeasonal: { pdfField: `${SEC2}.Question[1].#subform[1].#subform[4].TextField1[2]`, kind: "text" },
  empCountVolunteers: { pdfField: `${SEC2}.Question[1].#subform[1].#subform[5].TextField1[3]`, kind: "text" },

  maxConcentrationPerShift: { pdfField: `${SEC2}.Added[1].Set[0].#subform[0].TextField1[0]`, kind: "text" },

  drivingMileagePctLt50: { pdfField: `${SEC2}.Question[2].#subform[1].TextField1[0]`, kind: "text" },
  drivingMileagePct50to100: { pdfField: `${SEC2}.Question[2].#subform[1].TextField1[1]`, kind: "text" },
  drivingMileagePct100plus: { pdfField: `${SEC2}.Question[2].#subform[1].TextField1[2]`, kind: "text" },
  drivingMileageNa: { pdfField: `${SEC2}.Question[2].#subform[1].#subform[2].#field[3]`, kind: "checkbox" },

  maxDeliveryMileage: { pdfField: `${SEC2}.Added[2].Set[0].#subform[0].TextField1[0]`, kind: "text" },

  deliveryRetailPct: { pdfField: `${SEC2}.Question[3].#subform[1].TextField1[0]`, kind: "text" },
  deliveryWholesalePct: { pdfField: `${SEC2}.Question[3].#subform[1].TextField1[1]`, kind: "text" },
  deliveryDirectPct: { pdfField: `${SEC2}.Question[3].#subform[1].TextField1[2]`, kind: "text" },

  groupTransportationProvided: yn(`${SEC2}.Question[4].#subform[0].RadioButtonList[0]`),
  groupTransportationCount: { pdfField: `${SEC2}.Question[4].#subform[0].TextField1[0]`, kind: "text" },

  vehiclesCompanyOwned: yn(`${SEC2}.COmpanyOwned[0].#subform[0].RadioButtonList[0]`),
  vehiclesUnmarked: { pdfField: `${SEC2}.COmpanyOwned[0].#subform[0].#field[0]`, kind: "checkbox" },

  vehiclesGpsEquipped: yn(`${SEC2}.GPS[0].#subform[0].RadioButtonList[0]`),

  // Question[5]: vehicle maintenance — In-House / Outside Vendor / No (3 checkboxes)
  // We model `vehicleMaintenance` as enum, expand below in fillTreanSupp special-cases.

  distractedDrivingPolicy: ynna(`${SEC2}.Question[6].#subform[0].RadioButtonList[0]`),
  driversTraining: ynna(`${SEC2}.Question[7].#subform[0].RadioButtonList[0]`),
  cdlsRequired: ynna(`${SEC2}.Question[8].#subform[0].RadioButtonList[0]`),

  overnightTravel: yn(`${SEC2}.Question[9].#subform[1].RadioButtonList[0]`),
  overnightTravelFrequency: { pdfField: `${SEC2}.Question[9].#subform[2].TextField1[0]`, kind: "text" },

  driversAge25to65: yn(`${SEC2}.Question[10].#subform[0].RadioButtonList[0]`),
  driversOver65Count: { pdfField: `${SEC2}.Question[10].TextField1[0]`, kind: "text" },
  totalDriverCount: { pdfField: `${SEC2}.Question[10].TextField1[1]`, kind: "text" },

  avgDistancePerDayMin: { pdfField: `${SEC2}.Added[3].#subform[1].TextField1[0]`, kind: "text" },
  avgDistancePerDayMax: { pdfField: `${SEC2}.Added[3].#subform[1].TextField1[1]`, kind: "text" },
  avgDistanceNa: { pdfField: `${SEC2}.Added[3].#field[2]`, kind: "checkbox" },

  avgDeliveriesPerDayMin: { pdfField: `${SEC2}.Added[4].#subform[1].TextField1[0]`, kind: "text" },
  avgDeliveriesPerDayMax: { pdfField: `${SEC2}.Added[4].#subform[1].TextField1[1]`, kind: "text" },
  avgDeliveriesNa: { pdfField: `${SEC2}.Added[4].#field[2]`, kind: "checkbox" },

  hoursOfDelivery: { pdfField: `${SEC2}.Added[5].Set[0].#subform[0].TextField1[0]`, kind: "text" },

  bicycleDelivery: yn(`${SEC2}.DeliveryMode[0].#subform[1].RadioButtonList[0]`),
  bicycleDeliveryDetails: { pdfField: `${SEC2}.DeliveryMode[0].#subform[2].TextField1[0]`, kind: "text" },

  outOfStateTransportStates: { pdfField: `${SEC2}.Added[6].Set[0].#subform[0].TextField1[0]`, kind: "text" },

  paidHourly: { pdfField: `${SEC2}.Question[11].Set[0].#subform[0].#field[0]`, kind: "checkbox" },
  paidSalary: { pdfField: `${SEC2}.Question[11].Set[0].#subform[0].#field[1]`, kind: "checkbox" },
  paidCommission: { pdfField: `${SEC2}.Question[11].Set[0].#subform[0].#field[2]`, kind: "checkbox" },
  // Question[11].#field[3] = "Other" checkbox; .TextField1[0] = other text.
  paidOther: { pdfField: `${SEC2}.Question[11].Set[0].#subform[0].TextField1[0]`, kind: "text" },

  benefitsPaidSick: { pdfField: `${SEC2}.Question[12].Set[0].#subform[0].#field[0]`, kind: "checkbox" },
  benefitsPaidVacation: { pdfField: `${SEC2}.Question[12].Set[0].#subform[0].#field[1]`, kind: "checkbox" },
  benefits401k: { pdfField: `${SEC2}.Question[12].Set[0].#subform[0].#field[2]`, kind: "checkbox" },
  benefitsRetirement: { pdfField: `${SEC2}.Question[12].Set[0].#subform[0].#field[3]`, kind: "checkbox" },
  benefitsOther: { pdfField: `${SEC2}.Question[12].Set[0].#subform[1].TextField1[0]`, kind: "text" },

  groupHealthCoverage: yn(`${SEC2}.Question[13].#subform[0].RadioButtonList[0]`),
  groupHealthEmployerPct: { pdfField: `${SEC2}.Question[13].#subform[0].TextField1[0]`, kind: "text" },

  preHireWrittenApp: { pdfField: `${SEC2}.Question[14].Set[0].#subform[0].#field[0]`, kind: "checkbox" },
  preHireReferences: { pdfField: `${SEC2}.Question[14].Set[0].#subform[0].#field[1]`, kind: "checkbox" },
  preHirePhysicals: { pdfField: `${SEC2}.Question[14].Set[0].#subform[0].#field[2]`, kind: "checkbox" },
  preHireDrugTesting: { pdfField: `${SEC2}.Question[14].Set[0].#subform[0].#field[3]`, kind: "checkbox" },
  preHireRandomDrug: { pdfField: `${SEC2}.Question[14].Set[0].#subform[0].#field[4]`, kind: "checkbox" },
  preHireMvr: { pdfField: `${SEC2}.Question[14].Set[0].#subform[0].#field[5]`, kind: "checkbox" },
  preHireAnnualMvr: { pdfField: `${SEC2}.Question[14].Set[0].#subform[0].#field[6]`, kind: "checkbox" },
  preHirePostAccident: { pdfField: `${SEC2}.Question[14].Set[0].#subform[0].#field[7]`, kind: "checkbox" },
  preHireCriminal: { pdfField: `${SEC2}.Question[14].Set[0].#subform[1].#field[8]`, kind: "checkbox" },
  // #field[9] = Other checkbox
  preHireOther: { pdfField: `${SEC2}.Question[14].Set[0].#subform[1].TextField1[0]`, kind: "text" },

  // returnToWork — enum with 3 options (formal/informal/none) maps to RadioButtonList[1|2|3]
  returnToWork: {
    pdfField: `${SEC2}.Question[15].#subform[0].RadioButtonList[0]`,
    kind: "radio",
    options: { formal: "1", informal: "2", none: "3" },
  },

  avgEmployeeTurnoverPct: { pdfField: `${SEC2}.Question[16].TextField1[0]`, kind: "text" },

  subcontractorsUsed: yn(`${SEC2}.Question[17].#subform[0].RadioButtonList[0]`),
  subcontractorPayrollPct: { pdfField: `${SEC2}.Question[17].#subform[0].TextField1[0]`, kind: "text" },

  subcontractorTypes: { pdfField: `${SEC2}.Added[7].Set[0].#subform[0].TextField1[0]`, kind: "text" },

  subcontractorCoisObtained: ynna(`${SEC2}.Question[18].#subform[0].RadioButtonList[0]`),

  dayLaborersOrLeasing: yn(`${SEC2}.Question[19].#subform[0].RadioButtonList[0]`),

  // ── SEC 3: Safety ───────────────────────────────────────────
  safetyProgram: {
    pdfField: `${SEC3}.Question[0].#subform[0].RadioButtonList[0]`,
    kind: "radio",
    options: { formal: "1", informal: "2", none: "3" },
  },
  safetyTraining: {
    // RadioButtonList only has options [1|3] (Yes/None); the Documented vs Verbal
    // checkboxes are #field[0] and #field[1]. We treat the "documented" / "verbal"
    // canonical value as both setting the radio to 1 (Yes) and the appropriate sub-checkbox.
    pdfField: `${SEC3}.Question[1].#subform[0].RadioButtonList[0]`,
    kind: "radio",
    options: { documented: "1", verbal: "1", none: "3" },
  },
  safetyMeetings: yn(`${SEC3}.Question[2].#subform[0].RadioButtonList[0]`),
  safetyMeetingFreq: {
    pdfField: `${SEC3}.Question[2].#subform[1].RadioButtonList[1]`,
    kind: "radio",
    options: { weekly: "1", monthly: "2", quarterly: "3", annually: "4" },
  },
  accidentInvestigations: yn(`${SEC3}.Added[0].#subform[0].RadioButtonList[0]`),

  liftingExposure: {
    pdfField: `${SEC3}.LiftingExp[0].#subform[0].RadioButtonList[0]`,
    kind: "radio",
    options: { lt25: "1", "25to40": "2", gt40: "3", na: "4" },
  },
  liftingHandtrucks: { pdfField: `${SEC3}.Question[3].Set[0].#subform[0].#field[0]`, kind: "checkbox" },
  liftingForklifts: { pdfField: `${SEC3}.Question[3].Set[0].#subform[0].#field[1]`, kind: "checkbox" },
  lifting2Person: { pdfField: `${SEC3}.Question[3].Set[0].#subform[0].#field[2]`, kind: "checkbox" },
  // #field[3] = N/A checkbox; #field[4] = Other checkbox
  liftingOther: { pdfField: `${SEC3}.Question[3].Set[0].#subform[1].TextField1[0]`, kind: "text" },

  machineryGuarded: ynna(`${SEC3}.Question[4].#subform[0].RadioButtonList[0]`),
  lockoutTagout: ynna(`${SEC3}.Question[5].#subform[0].RadioButtonList[0]`),

  forkliftsUsed: yn(`${SEC3}.Question[6].#subform[0].RadioButtonList[0]`),
  forkliftsCertified: { pdfField: `${SEC3}.Question[6].#subform[0].#field[0]`, kind: "checkbox" },

  maxDepth: {
    pdfField: `${SEC3}.Question[7].#subform[0].RadioButtonList[0]`,
    kind: "radio",
    options: { "0to3": "1", "4to7": "2", "8plus": "3", na: "4" },
  },

  heightScissorLift: { pdfField: `${SEC3}.Question[9].Set[0].#subform[0].#field[0]`, kind: "checkbox" },
  heightScaffolding: { pdfField: `${SEC3}.Question[9].Set[0].#subform[0].#field[1]`, kind: "checkbox" },
  heightBucketTruck: { pdfField: `${SEC3}.Question[9].Set[0].#subform[0].#field[2]`, kind: "checkbox" },
  heightLadder: { pdfField: `${SEC3}.Question[9].Set[0].#subform[0].#field[3]`, kind: "checkbox" },

  fallProtectionArrest: { pdfField: `${SEC3}.Question[10].Set[0].#subform[0].#field[0]`, kind: "checkbox" },
  fallProtectionPositioning: { pdfField: `${SEC3}.Question[10].Set[0].#subform[0].#field[1]`, kind: "checkbox" },
  fallProtectionRetrieval: { pdfField: `${SEC3}.Question[10].Set[0].#subform[0].#field[2]`, kind: "checkbox" },
  fallProtectionSuspension: { pdfField: `${SEC3}.Question[10].Set[0].#subform[0].#field[3]`, kind: "checkbox" },

  ppeGloves: { pdfField: `${SEC3}.Question[12].Set[0].#subform[0].#field[0]`, kind: "checkbox" },
  ppeBackBelts: { pdfField: `${SEC3}.Question[12].Set[0].#subform[0].#field[1]`, kind: "checkbox" },
  ppeEarPlugs: { pdfField: `${SEC3}.Question[12].Set[0].#subform[0].#field[2]`, kind: "checkbox" },
  ppeGoggles: { pdfField: `${SEC3}.Question[12].Set[0].#subform[0].#field[3]`, kind: "checkbox" },
  ppeMasks: { pdfField: `${SEC3}.Question[12].Set[0].#subform[1].#field[4]`, kind: "checkbox" },
  ppeHardHats: { pdfField: `${SEC3}.Question[12].Set[0].#subform[1].#field[5]`, kind: "checkbox" },
  ppeSafetyGlasses: { pdfField: `${SEC3}.Question[12].Set[0].#subform[1].#field[6]`, kind: "checkbox" },
  ppeSteelToed: { pdfField: `${SEC3}.Question[12].Set[0].#subform[1].#field[7]`, kind: "checkbox" },
  ppeRespirator: { pdfField: `${SEC3}.Question[12].Set[0].#subform[2].#field[8]`, kind: "checkbox" },
  ppeNonSlip: { pdfField: `${SEC3}.Question[12].Set[0].#subform[2].#field[9]`, kind: "checkbox" },
  ppeProtectiveClothing: { pdfField: `${SEC3}.Question[12].Set[0].#subform[2].#field[10]`, kind: "checkbox" },
  // #field[11] = Other checkbox
  ppeOther: { pdfField: `${SEC3}.Question[12].Set[0].#subform[3].TextField1[0]`, kind: "text" },

  // SECURITY systems (12 checkboxes + other text)
  securityInteriorCamera: { pdfField: `${SEC3}.SECURITY[0].Question[0].Set[0].#subform[0].#field[0]`, kind: "checkbox" },
  securityExteriorCamera: { pdfField: `${SEC3}.SECURITY[0].Question[0].Set[0].#subform[0].#field[1]`, kind: "checkbox" },
  securityMetalDetector: { pdfField: `${SEC3}.SECURITY[0].Question[0].Set[0].#subform[0].#field[2]`, kind: "checkbox" },
  securityPanicButton: { pdfField: `${SEC3}.SECURITY[0].Question[0].Set[0].#subform[0].#field[3]`, kind: "checkbox" },
  securityMetalDoors: { pdfField: `${SEC3}.SECURITY[0].Question[0].Set[0].#subform[0].#field[4]`, kind: "checkbox" },
  securityGatedDoors: { pdfField: `${SEC3}.SECURITY[0].Question[0].Set[0].#subform[0].#field[5]`, kind: "checkbox" },
  securityCentralFireAlarm: { pdfField: `${SEC3}.SECURITY[0].Question[0].Set[0].#subform[0].#field[6]`, kind: "checkbox" },
  securityDoorIntercom: { pdfField: `${SEC3}.SECURITY[0].Question[0].Set[0].#subform[0].#field[7]`, kind: "checkbox" },
  securityGatedWindows: { pdfField: `${SEC3}.SECURITY[0].Question[0].Set[0].#subform[0].#field[8]`, kind: "checkbox" },
  securityVestibuleMantrap: { pdfField: `${SEC3}.SECURITY[0].Question[0].Set[0].#subform[0].#field[9]`, kind: "checkbox" },
  securityCentralBurglarAlarm: { pdfField: `${SEC3}.SECURITY[0].Question[0].Set[0].#subform[0].#field[10]`, kind: "checkbox" },
  // #field[11] = Other checkbox
  securityOther: { pdfField: `${SEC3}.SECURITY[0].Question[0].Set[0].#subform[1].TextField1[0]`, kind: "text" },

  writtenSecurityPlan: yn(`${SEC3}.SECURITY[0].Added[0].#subform[0].RadioButtonList[0]`),
  securityGuards: {
    pdfField: `${SEC3}.SECURITY[0].Question[1].#subform[0].RadioButtonList[0]`,
    kind: "radio",
    options: { employees: "1", outside: "2", na: "3" },
  },
  securityGuardsArmed: ynna(`${SEC3}.SECURITY[0].Question[2].#subform[0].RadioButtonList[0]`),
  outsideSecurityCoisObtained: { pdfField: `${SEC3}.SECURITY[0].Question[3].#subform[0].#field[0]`, kind: "checkbox" },
  outsideSecurityAdditionalInsured: { pdfField: `${SEC3}.SECURITY[0].Question[3].#subform[1].#field[1]`, kind: "checkbox" },

  // ── CHEMICALS / Extraction ──────────────────────────────────
  msdsProgram: yn(`${SEC3}.CHEMICALS[0].MSDS[0].#subform[0].RadioButtonList[0]`),
  chemicalsUsed: { pdfField: `${SEC3}.CHEMICALS[0].ChemcialUsed[0].Set[0].#subform[0].TextField1[0]`, kind: "text" },
  chemicalsNotApplicable: { pdfField: `${SEC3}.CHEMICALS[0].ChemcialUsed[0].Set[0].#subform[0].#field[1]`, kind: "checkbox" },
  respiratoryProgram: yn(`${SEC3}.CHEMICALS[0].Question[0].#subform[0].RadioButtonList[0]`),
  buildingProperlyVentilated: yn(`${SEC3}.CHEMICALS[0].Question[1].#subform[0].RadioButtonList[0]`),

  extractionCO2: { pdfField: `${SEC3}.CHEMICALS[0].Question[2].Set[0].#subform[0].#field[0]`, kind: "checkbox" },
  extractionButane: { pdfField: `${SEC3}.CHEMICALS[0].Question[2].Set[0].#subform[0].#field[1]`, kind: "checkbox" },
  extractionIsopropyl: { pdfField: `${SEC3}.CHEMICALS[0].Question[2].Set[0].#subform[0].#field[2]`, kind: "checkbox" },
  extractionEthanol: { pdfField: `${SEC3}.CHEMICALS[0].Question[2].Set[0].#subform[0].#field[3]`, kind: "checkbox" },
  extractionWater: { pdfField: `${SEC3}.CHEMICALS[0].Question[2].Set[0].#subform[1].#field[4]`, kind: "checkbox" },
  // #field[5] = Other checkbox
  extractionOther: { pdfField: `${SEC3}.CHEMICALS[0].Question[2].Set[0].#subform[1].TextField1[0]`, kind: "text" },

  extractionProcessDescription: { pdfField: `${SEC3}.CHEMICALS[0].Added[0].Set[0].#subform[0].TextField1[0]`, kind: "text" },
  extractionThirdPartyMaintenance: ynna(`${SEC3}.CHEMICALS[0].Added[1].#subform[0].RadioButtonList[0]`),
  extractionSegregated: ynna(`${SEC3}.CHEMICALS[0].Added[2].#subform[0].RadioButtonList[0]`),
  extractionEmergencyReliefValves: ynna(`${SEC3}.CHEMICALS[0].Added[3].#subform[0].RadioButtonList[0]`),
  extractionC1D1Booth: yn(`${SEC3}.CHEMICALS[0].Added[4].#subform[0].RadioButtonList[0]`),
  extractionBoothOtherType: { pdfField: `${SEC3}.CHEMICALS[0].Added[4].TextField1[0]`, kind: "text" },
  extractionTrainingProvided: ynna(`${SEC3}.CHEMICALS[0].Question[3].#subform[0].RadioButtonList[0]`),
  extractionEmergencyPlan: ynna(`${SEC3}.CHEMICALS[0].Added[5].#subform[0].RadioButtonList[0]`),

  // ── Signature ──────────────────────────────────────────────
  signatoryName: { pdfField: `CSA[0].Pages[0].SIGNATURE[0].#subform[2].TextField1[0]`, kind: "text" },
  signatoryDate: { pdfField: "Sign Date", kind: "text" },
};

/**
 * Vehicle maintenance has 3 separate checkboxes (In-House, Outside Vendor, No)
 * rather than a radio. Resolve canonical enum value to the right checkbox.
 */
export const treanVehicleMaintenanceCheckboxes: Record<string, string> = {
  inhouse: `${SEC2}.Question[5].#subform[0].#field[0]`,
  outside: `${SEC2}.Question[5].#subform[0].#field[1]`,
  no: `${SEC2}.Question[5].#subform[0].#field[2]`,
};

/**
 * Safety training has both a Yes/No radio and Documented/Verbal sub-checkboxes.
 */
export const treanSafetyTrainingCheckboxes = {
  documented: `${SEC3}.Question[1].#subform[0].#field[0]`,
  verbal: `${SEC3}.Question[1].#subform[0].#field[1]`,
};

/**
 * Historical premium table — 6 rows × 3 columns (Payroll, Premium, Sub Costs).
 * Rows: 5th Prior, 4th Prior, 3rd Prior, 2nd Prior, Current Year, Projected Next 12.
 * Columns indexed by `#field[N].M` where N=column, M=row.
 */
export const treanHistoricalTableField = (col: 0 | 1 | 2, row: 0 | 1 | 2 | 3 | 4 | 5): string =>
  `${SEC3}.Question[13].Table1[0].Row1[1].#field[${col}].${row}`;

/** Signature confirmation checkbox. */
export const treanSignatureConfirmCheckbox = `CSA[0].Pages[0].SIGNATURE[0].#subform[0].#subform[1].#field[0]`;
