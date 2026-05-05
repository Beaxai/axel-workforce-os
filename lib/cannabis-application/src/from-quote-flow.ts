/**
 * Adapter: convert the front-end `QuoteFlowState` (subset) into a canonical
 * `CannabisApplicationAnswers` payload. Lives in the shared lib so the
 * server can re-derive the same shape if needed (e.g. backfill).
 */
import type {
  CannabisApplicationAnswers,
  CanonicalKey,
} from "./canonical-schema";

type Yn = "yes" | "no" | "";

/** Subset of QuoteFlowState the adapter consumes. Keep loose to avoid coupling. */
export interface QuoteFlowSubset {
  businessName?: string;
  dba?: string;
  fein?: string;
  entityType?: string;
  yearsInBusiness?: string;
  website?: string;
  primaryStreetAddress?: string;
  primaryCity?: string;
  primaryState?: string;
  primaryZip?: string;
  streetAddress?: string;
  suite?: string;
  city?: string;
  addressState?: string;
  zip?: string;
  mailingAddressSame?: boolean;
  mailingStreet?: string;
  mailingSuite?: string;
  mailingCity?: string;
  mailingState?: string;
  mailingZip?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  locations?: Array<{
    streetAddress?: string;
    city?: string;
    state?: string;
    zip?: string;
    classCodes?: Array<{
      classCode?: string;
      description?: string;
      fullTimeEmployees?: number;
      partTimeEmployees?: number;
      annualPayroll?: number;
    }>;
  }>;
  owners?: Array<{
    firstName?: string;
    lastName?: string;
    ownershipPct?: number;
    duties?: string;
    included?: boolean;
  }>;
  yearsOfPriorCoverage?: string;
  experienceMod?: string;
  totalPremiumPaid?: string;
  totalClaimsPaid?: string;
  priorPolicies?: Array<{
    effectiveDate?: string;
    expirationDate?: string;
    carrier?: string;
    premium?: number;
    claimCount?: number;
    claimsAmount?: number;
  }>;
  generalQuestions?: Record<string, string>;
  generalQuestionsDetails?: Record<string, string>;
  hoursOfOperation?: string;
  cannabisOperations?: string[];
  consumedOnSite?: string;
  consumptionMethods?: string[];
  maxConcentration?: string;
  ftEmployees?: string;
  ptEmployees?: string;
  seasonalEmployees?: string;
  volunteers?: string;
  paymentMethods?: string[];
  paymentMethodsOther?: string;
  benefitsOffered?: string[];
  benefitsOfferedOther?: string;
  groupHealth?: string;
  groupHealthPct?: string;
  preHireChecks?: string[];
  preHireChecksOther?: string;
  returnToWork?: string;
  subcontractorsUsed?: string;
  subcontractorPct?: string;
  subcontractorTypes?: string;
  subcontractorCois?: string;
  dayLaborers?: string;
  avgTurnover?: string;
  safetyProgram?: string;
  safetyTraining?: string;
  safetyMeetings?: string;
  safetyMeetingFreq?: string;
  accidentInvestigations?: string;
  msdsProgram?: string;
  chemicalsUsed?: string;
  chemicalsNotApplicable?: boolean;
  respiratoryProgram?: string;
  buildingVentilated?: string;
  liftingExposures?: string;
  liftingControls?: string[];
  machineryGuarded?: string;
  lockoutTagout?: string;
  forkliftsUsed?: string;
  forkliftsCertified?: boolean;
  maxHeight?: string;
  maxDepth?: string;
  heightEquipment?: string[];
  fallProtection?: string[];
  covidMeasures?: string;
  ppeUsed?: string[];
  securitySystems?: string[];
  writtenSecurityPlan?: string;
  securityGuards?: string;
  securityGuardsArmed?: string;
  outsideSecurityCompany?: string;
  outsideSecurityCois?: boolean;
  outsideSecurityAdditionalInsured?: boolean;
  /**
   * Pay-period frequency (e.g. "weekly", "biweekly", "semimonthly", "monthly").
   * Collected by the UI but NOT present on any of the 3 PDFs (Axel Cannabis WC
   * Application 2026, ACORD 130, Trean Cannabis Supp). Persisted only for
   * audit / underwriter visibility — there is no canonical key and no PDF
   * mapping.
   */
  payrollFrequency?: string;
  extractionMethods?: string[];
  extractionMethodsOther?: string;
  extractionProcess?: string;
  thirdPartyMaintenance?: string;
  extractionSegregated?: string;
  emergencyReliefValves?: string;
  classC1D1Booth?: string;
  classC1D1BoothType?: string;
  extractionTraining?: string;
  emergencyPlan?: string;
  growAreaSqft?: string;
  flowMeters?: string;
  historicalPremiums?: Array<{
    label?: string;
    year?: string;
    payroll?: number;
    premium?: number;
    subCosts?: number;
  }>;
  drivingMileagePctLt50?: string;
  drivingMileagePct50to100?: string;
  drivingMileagePct100plus?: string;
  drivingMileageNa?: boolean;
  maxDeliveryMileage?: string;
  deliveryRetailPct?: string;
  deliveryWholesalePct?: string;
  deliveryDirectPct?: string;
  gpsEquipped?: string;
  allDrivers2565?: string;
  driversOver65?: string;
  totalDrivers?: string;
  deliveryHours?: string;
  overnightTravel?: string;
  overnightFrequency?: string;
  avgDistanceMin?: string;
  avgDistanceMax?: string;
  avgDistanceNa?: boolean;
  avgDeliveriesMin?: string;
  avgDeliveriesMax?: string;
  avgDeliveriesNa?: boolean;
  outOfStateTransport?: string;
  driversTraining?: string;
  cdlsRequired?: string;
  groupTransportation?: string;
  groupTransportEmployees?: string;
  vehiclesCompanyOwned?: string;
  vehiclesUnmarked?: boolean;
  vehicleMaintenance?: string;
  distractedDrivingPolicy?: string;
  bicycleDelivery?: string;
  bicycleDeliveryExplain?: string;
}

const ynNorm = (v?: string): Yn => {
  const s = (v || "").trim().toLowerCase();
  if (s === "yes" || s === "y" || s === "true") return "yes";
  if (s === "no" || s === "n" || s === "false") return "no";
  return "";
};
const ynNaNorm = (v?: string): "yes" | "no" | "na" | "" => {
  const s = (v || "").trim().toLowerCase();
  if (s === "yes" || s === "y") return "yes";
  if (s === "no" || s === "n") return "no";
  if (s === "na" || s === "n/a") return "na";
  return "";
};
const has = (arr: string[] | undefined, key: string): boolean =>
  Array.isArray(arr) && arr.map((s) => s.toLowerCase()).includes(key.toLowerCase());
const num = (n?: number | string): string =>
  n === undefined || n === null || n === "" ? "" : String(n);

const totalPayroll = (s: QuoteFlowSubset): number =>
  (s.locations || []).reduce(
    (sum, loc) =>
      sum + (loc.classCodes || []).reduce((a, cc) => a + (cc.annualPayroll || 0), 0),
    0,
  );
const totalEmpFt = (s: QuoteFlowSubset): number =>
  (s.locations || []).reduce(
    (sum, loc) =>
      sum + (loc.classCodes || []).reduce((a, cc) => a + (cc.fullTimeEmployees || 0), 0),
    0,
  );
const totalEmpPt = (s: QuoteFlowSubset): number =>
  (s.locations || []).reduce(
    (sum, loc) =>
      sum + (loc.classCodes || []).reduce((a, cc) => a + (cc.partTimeEmployees || 0), 0),
    0,
  );

const RTW_MAP: Record<string, "formal" | "informal" | "none" | ""> = {
  "formal/written": "formal",
  formal: "formal",
  "informal/verbal": "informal",
  informal: "informal",
  none: "none",
};
const SAFETY_PROGRAM_MAP = RTW_MAP;
const SAFETY_TRAINING_MAP: Record<string, "documented" | "verbal" | "none" | ""> = {
  "yes, documented": "documented",
  documented: "documented",
  "yes, verbal": "verbal",
  verbal: "verbal",
  none: "none",
};
const FREQ_MAP: Record<string, "weekly" | "monthly" | "quarterly" | "annually" | ""> = {
  weekly: "weekly", monthly: "monthly", quarterly: "quarterly", annually: "annually",
};
const LIFTING_MAP: Record<string, "lt25" | "25to40" | "gt40" | "na" | ""> = {
  "<25lbs": "lt25", "25-40lbs": "25to40", "40+lbs": "gt40", "n/a": "na", na: "na",
};
const DEPTH_MAP: Record<string, "0to3" | "4to7" | "8plus" | "na" | ""> = {
  "0-3 feet": "0to3", "4-7 feet": "4to7", "8 feet & below": "8plus", "n/a": "na", na: "na",
};
const HEIGHT_MAP: Record<string, "0to6" | "7to15" | "15plus" | "na" | ""> = {
  "0-6 feet": "0to6", "7-15 feet": "7to15", "15 feet and above": "15plus", "n/a": "na", na: "na",
};
const GUARDS_MAP: Record<string, "employees" | "outside" | "na" | ""> = {
  "insured's employees": "employees",
  insureds_employees: "employees",
  employees: "employees",
  "outside security firm personnel": "outside",
  outside: "outside",
  "n/a": "na", na: "na",
};
const VEH_MAINT_MAP: Record<string, "inhouse" | "outside" | "no" | ""> = {
  "in-house": "inhouse", inhouse: "inhouse", "outside vendor": "outside", outside: "outside", no: "no",
};

const lookup = <T extends string>(map: Record<string, T | "">, v?: string): T | "" => {
  const key = (v || "").trim().toLowerCase();
  return (map[key] || "") as T | "";
};

export function fromQuoteFlow(s: QuoteFlowSubset): CannabisApplicationAnswers {
  const gq = s.generalQuestions || {};
  const gqd = s.generalQuestionsDetails || {};
  const cannabisOps = (s.cannabisOperations || []).map((c) => c.toLowerCase());

  const answers: CannabisApplicationAnswers = {
    legalBusinessName: s.businessName || "",
    dba: s.dba || "",
    fein: s.fein || "",
    entityType: s.entityType || "",
    yearsInBusiness: s.yearsInBusiness || "",
    website: s.website || "",
    businessStreetAddress: s.streetAddress || s.primaryStreetAddress || "",
    businessSuite: s.suite || "",
    businessCity: s.city || s.primaryCity || "",
    businessState: s.addressState || s.primaryState || "",
    businessZip: s.zip || s.primaryZip || "",
    mailingStreetAddress:
      s.mailingAddressSame === false
        ? s.mailingStreet || ""
        : s.streetAddress || s.primaryStreetAddress || "",
    mailingSuite:
      s.mailingAddressSame === false ? s.mailingSuite || "" : s.suite || "",
    mailingCity:
      s.mailingAddressSame === false
        ? s.mailingCity || ""
        : s.city || s.primaryCity || "",
    mailingState:
      s.mailingAddressSame === false
        ? s.mailingState || ""
        : s.addressState || s.primaryState || "",
    mailingZip:
      s.mailingAddressSame === false ? s.mailingZip || "" : s.zip || s.primaryZip || "",
    primaryContactName: s.contactName || "",
    contactEmail: s.contactEmail || "",
    contactPhone: s.contactPhone || "",
    primaryClassOfBusiness:
      s.locations?.[0]?.classCodes?.[0]?.description || "",
    totalEmployeesFt: String(totalEmpFt(s) || ""),
    totalEmployeesPt: String(totalEmpPt(s) || ""),
    totalEmployeesAll: String((totalEmpFt(s) + totalEmpPt(s)) || ""),
    annualPayroll: String(totalPayroll(s) || ""),
    descriptionOfOperations: "",

    locations: (s.locations || []).map((l, i) => ({
      loc: String(i + 1),
      streetAddress: l.streetAddress || "",
      suite: "",
      city: l.city || "",
      state: l.state || "",
      zip: l.zip || "",
    })),
    classCodes: (s.locations || []).flatMap((l, i) =>
      (l.classCodes || []).map((cc) => ({
        loc: String(i + 1),
        classCode: cc.classCode || "",
        description: cc.description || "",
        fullTime: String(cc.fullTimeEmployees || ""),
        partTime: String(cc.partTimeEmployees || ""),
        annualPayroll: String(cc.annualPayroll || ""),
      })),
    ),
    ownersOfficers: (s.owners || []).map((o) => ({
      firstName: o.firstName || "",
      lastName: o.lastName || "",
      ownershipPct: String(o.ownershipPct || ""),
      duties: o.duties || "",
      included: o.included !== false,
    })),

    yearsOfPriorCoverage: s.yearsOfPriorCoverage || "",
    experienceModifier: s.experienceMod || "",
    totalPremiumPaid: s.totalPremiumPaid || "",
    totalClaimsPaid: s.totalClaimsPaid || "",
    lossRatio: "",
    priorPolicies: (s.priorPolicies || []).map((p) => ({
      effectiveDate: p.effectiveDate || "",
      expirationDate: p.expirationDate || "",
      carrier: p.carrier || "",
      premium: num(p.premium),
      claimCount: num(p.claimCount),
      claimsAmount: num(p.claimsAmount),
    })),

    q1_aircraftWatercraft: ynNorm(gq.q1),
    q2_hazardousMaterial: ynNorm(gq.q2),
    q3_undergroundOrAbove15ft: ynNorm(gq.q3),
    q4_workOnWater: ynNorm(gq.q4),
    q5_otherBusiness: ynNorm(gq.q5),
    q6_subcontractorsUsed: ynNorm(gq.q6),
    q6_subcontractorsPct: gqd.q6 || "",
    q7_workSubletWithoutCoi: ynNorm(gq.q7),
    q8_writtenSafetyProgram: ynNorm(gq.q8),
    q9_groupTransportation: ynNorm(gq.q9),
    q10_employeesUnder16OrOver60: ynNorm(gq.q10),
    q11_seasonalEmployees: ynNorm(gq.q11),
    q12_volunteerLabor: ynNorm(gq.q12),
    q12_volunteerDetails: gqd.q12 || "",
    q13_employeesWithHandicaps: ynNorm(gq.q13),
    q14_outOfStateTravel: ynNorm(gq.q14),
    q14_outOfStateDetails: gqd.q14 || "",
    q15_athleticTeamsSponsored: ynNorm(gq.q15),
    q16_physicalsRequired: ynNorm(gq.q16),
    q17_otherInsurance: ynNorm(gq.q17),
    q18_priorCoverageDeclined: ynNorm(gq.q18),
    q19_employeeHealthPlans: ynNorm(gq.q19),
    q20_workForOtherBusinesses: ynNorm(gq.q20),
    q21_leasedEmployees: ynNorm(gq.q21),
    q22_workFromHome: ynNorm(gq.q22),
    q22_workFromHomeCount: gqd.q22 || "",
    q23_taxLiensOrBankruptcy: ynNorm(gq.q23),
    q23_taxLiensDetails: gqd.q23 || "",
    q24_unpaidWcPremium: ynNorm(gq.q24),
    q24_unpaidWcDetails: gqd.q24 || "",

    hoursOfOperation: s.hoursOfOperation || "",
    operationsDispensary: cannabisOps.includes("dispensary"),
    operationsGrowing: cannabisOps.includes("growing"),
    operationsProcessing: cannabisOps.includes("processing"),
    operationsDelivery: cannabisOps.includes("delivery"),
    operationsExtraction: cannabisOps.includes("extraction"),
    consumedOnSite: ynNorm(s.consumedOnSite),
    consumptionMethods: ((s.consumptionMethods || []) as string[]).filter((c): c is "smoked" | "vaped" | "dabbed" | "edibles" =>
      ["smoked", "vaped", "dabbed", "edibles"].includes(c.toLowerCase()),
    ).map((c) => c.toLowerCase() as "smoked" | "vaped" | "dabbed" | "edibles"),
    empCountFt: s.ftEmployees || "",
    empCountPt: s.ptEmployees || "",
    empCountSeasonal: s.seasonalEmployees || "",
    empCountVolunteers: s.volunteers || "",
    maxConcentrationPerShift: s.maxConcentration || "",
    paidHourly: has(s.paymentMethods, "hourly"),
    paidCommission: has(s.paymentMethods, "commission"),
    paidSalary: has(s.paymentMethods, "salary"),
    paidOther:
      s.paymentMethodsOther ||
      (s.paymentMethods || []).find((m) => !["hourly", "commission", "salary", "other"].includes(m.toLowerCase())) ||
      "",
    benefitsPaidSick: has(s.benefitsOffered, "paid sick time") || has(s.benefitsOffered, "paid_sick_time"),
    benefitsPaidVacation: has(s.benefitsOffered, "paid vacation") || has(s.benefitsOffered, "paid_vacation"),
    benefits401k: has(s.benefitsOffered, "401k"),
    benefitsRetirement: has(s.benefitsOffered, "retirement"),
    benefitsOther: s.benefitsOfferedOther || "",
    groupHealthCoverage: ynNorm(s.groupHealth),
    groupHealthEmployerPct: s.groupHealthPct || "",
    preHireWrittenApp: has(s.preHireChecks, "written application") || has(s.preHireChecks, "written_application"),
    preHireMvr: has(s.preHireChecks, "pre-hire mvr") || has(s.preHireChecks, "pre-hire mvr checks") || has(s.preHireChecks, "pre_hire_mvr"),
    preHireRandomDrug: has(s.preHireChecks, "random drug testing") || has(s.preHireChecks, "random_drug"),
    preHirePhysicals: has(s.preHireChecks, "physicals"),
    preHireCriminal: has(s.preHireChecks, "criminal back") || has(s.preHireChecks, "criminal background"),
    preHireDrugTesting: has(s.preHireChecks, "pre-hire drug testing") || has(s.preHireChecks, "pre_hire_drug"),
    preHireReferences: has(s.preHireChecks, "reference checks"),
    preHireAnnualMvr: has(s.preHireChecks, "annual mvr") || has(s.preHireChecks, "annual mvr checks") || has(s.preHireChecks, "annual_mvr"),
    preHirePostAccident: has(s.preHireChecks, "post accident") || has(s.preHireChecks, "post_accident"),
    preHireOther: s.preHireChecksOther || "",
    returnToWork: lookup(RTW_MAP, s.returnToWork),
    subcontractorsUsed: ynNorm(s.subcontractorsUsed),
    subcontractorPayrollPct: s.subcontractorPct || "",
    subcontractorTypes: s.subcontractorTypes || "",
    subcontractorCoisObtained: ynNaNorm(s.subcontractorCois),
    avgEmployeeTurnoverPct: s.avgTurnover || "",
    dayLaborersOrLeasing: ynNorm(s.dayLaborers),

    safetyProgram: lookup(SAFETY_PROGRAM_MAP, s.safetyProgram),
    safetyTraining: lookup(SAFETY_TRAINING_MAP, s.safetyTraining),
    safetyMeetings: ynNorm(s.safetyMeetings),
    safetyMeetingFreq: lookup(FREQ_MAP, s.safetyMeetingFreq),
    accidentInvestigations: ynNorm(s.accidentInvestigations),
    msdsProgram: ynNorm(s.msdsProgram),
    chemicalsUsed: s.chemicalsUsed || "",
    chemicalsNotApplicable: !!s.chemicalsNotApplicable,
    respiratoryProgram: ynNorm(s.respiratoryProgram),
    buildingProperlyVentilated: ynNorm(s.buildingVentilated),
    liftingExposure: lookup(LIFTING_MAP, s.liftingExposures),
    liftingHandtrucks: has(s.liftingControls, "handtrucks"),
    liftingForklifts: has(s.liftingControls, "forklifts"),
    lifting2Person: has(s.liftingControls, "2-person lifts") || has(s.liftingControls, "2_person_lifts"),
    liftingOther: "",
    machineryGuarded: ynNaNorm(s.machineryGuarded),
    lockoutTagout: ynNaNorm(s.lockoutTagout),
    forkliftsUsed: ynNorm(s.forkliftsUsed),
    forkliftsCertified: !!s.forkliftsCertified,
    maxDepth: lookup(DEPTH_MAP, s.maxDepth),
    maxHeight: lookup(HEIGHT_MAP, s.maxHeight),
    heightScissorLift: has(s.heightEquipment, "scissor lift") || has(s.heightEquipment, "scissor_lift"),
    heightScaffolding: has(s.heightEquipment, "scaffolding"),
    heightBucketTruck: has(s.heightEquipment, "bucket truck") || has(s.heightEquipment, "bucket_truck"),
    heightLadder: has(s.heightEquipment, "ladder"),
    fallProtectionArrest: has(s.fallProtection, "fall arrest") || has(s.fallProtection, "fall_arrest"),
    fallProtectionPositioning: has(s.fallProtection, "positioning"),
    fallProtectionRetrieval: has(s.fallProtection, "retrieval"),
    fallProtectionSuspension: has(s.fallProtection, "suspension"),
    covidMeasures: s.covidMeasures || "",
    ppeGloves: has(s.ppeUsed, "gloves"),
    ppeBackBelts: has(s.ppeUsed, "back belts") || has(s.ppeUsed, "back_belts"),
    ppeEarPlugs: has(s.ppeUsed, "ear plugs") || has(s.ppeUsed, "ear_plugs"),
    ppeGoggles: has(s.ppeUsed, "goggles"),
    ppeMasks: has(s.ppeUsed, "masks"),
    ppeHardHats: has(s.ppeUsed, "hard hats") || has(s.ppeUsed, "hard_hats"),
    ppeSafetyGlasses: has(s.ppeUsed, "safety glasses") || has(s.ppeUsed, "safety_glasses"),
    ppeSteelToed: has(s.ppeUsed, "steel toed boots") || has(s.ppeUsed, "steel_toed_boots"),
    ppeRespirator: has(s.ppeUsed, "respirator"),
    ppeNonSlip: has(s.ppeUsed, "non-slip shoes") || has(s.ppeUsed, "non_slip_shoes"),
    ppeProtectiveClothing: has(s.ppeUsed, "protective clothing") || has(s.ppeUsed, "protective_clothing"),
    ppeOther: "",

    securityInteriorCamera: has(s.securitySystems, "interior camera(s)") || has(s.securitySystems, "interior_cameras"),
    securityExteriorCamera: has(s.securitySystems, "exterior camera(s)") || has(s.securitySystems, "exterior_cameras"),
    securityMetalDetector: has(s.securitySystems, "metal detector"),
    securityPanicButton: has(s.securitySystems, "panic button"),
    securityMetalDoors: has(s.securitySystems, "metal doors"),
    securityGatedDoors: has(s.securitySystems, "gated doors"),
    securityGatedWindows: has(s.securitySystems, "gated windows"),
    securityCentralBurglarAlarm:
      has(s.securitySystems, "central station burglar alarm") || has(s.securitySystems, "central_burglar_alarm"),
    securityCentralFireAlarm:
      has(s.securitySystems, "central station fire alarm") || has(s.securitySystems, "central_fire_alarm"),
    securityVestibuleMantrap: has(s.securitySystems, "security vestibule/mantrap"),
    securityDoorIntercom: has(s.securitySystems, "door intercom"),
    securityOther: "",
    writtenSecurityPlan: ynNorm(s.writtenSecurityPlan),
    securityGuards: lookup(GUARDS_MAP, s.securityGuards),
    securityGuardsArmed: ynNaNorm(s.securityGuardsArmed),
    outsideSecurityCompanyUsed: ynNorm(s.outsideSecurityCompany),
    outsideSecurityCoisObtained: !!s.outsideSecurityCois,
    outsideSecurityAdditionalInsured: !!s.outsideSecurityAdditionalInsured,

    extractionCO2: has(s.extractionMethods, "co2"),
    extractionButane: has(s.extractionMethods, "butane"),
    extractionIsopropyl: has(s.extractionMethods, "isopropyl"),
    extractionEthanol: has(s.extractionMethods, "ethanol"),
    extractionWater: has(s.extractionMethods, "water"),
    extractionOther: s.extractionMethodsOther || "",
    extractionProcessDescription: s.extractionProcess || "",
    extractionThirdPartyMaintenance: ynNaNorm(s.thirdPartyMaintenance),
    extractionSegregated: ynNaNorm(s.extractionSegregated),
    extractionEmergencyReliefValves: ynNaNorm(s.emergencyReliefValves),
    extractionC1D1Booth: ynNorm(s.classC1D1Booth),
    extractionBoothOtherType: s.classC1D1BoothType || "",
    extractionTrainingProvided: ynNaNorm(s.extractionTraining),
    extractionEmergencyPlan: ynNaNorm(s.emergencyPlan),
    growAreaSqft: s.growAreaSqft || "",
    flowMetersUsed: ynNorm(s.flowMeters),

    historicalPremiums: (s.historicalPremiums || []).map((h) => ({
      label: h.label || "",
      year: h.year || "",
      payroll: num(h.payroll),
      premium: num(h.premium),
      subCosts: num(h.subCosts),
    })),

    drivingDeliveryExposure: ynNorm(
      (s.drivingMileagePctLt50 || s.drivingMileagePct50to100 || s.drivingMileagePct100plus || s.drivingMileageNa) ? "yes" : ""
    ),
    drivingMileagePctLt50: s.drivingMileagePctLt50 || "",
    drivingMileagePct50to100: s.drivingMileagePct50to100 || "",
    drivingMileagePct100plus: s.drivingMileagePct100plus || "",
    drivingMileageNa: !!s.drivingMileageNa,
    maxDeliveryMileage: s.maxDeliveryMileage || "",
    deliveryRetailPct: s.deliveryRetailPct || "",
    deliveryWholesalePct: s.deliveryWholesalePct || "",
    deliveryDirectPct: s.deliveryDirectPct || "",
    vehiclesGpsEquipped: ynNorm(s.gpsEquipped),
    driversAge25to65: ynNorm(s.allDrivers2565),
    driversOver65Count: s.driversOver65 || "",
    totalDriverCount: s.totalDrivers || "",
    hoursOfDelivery: s.deliveryHours || "",
    bicycleDelivery: ynNorm(s.bicycleDelivery),
    bicycleDeliveryDetails: s.bicycleDeliveryExplain || "",
    groupTransportationProvided: ynNorm(s.groupTransportation),
    groupTransportationCount: s.groupTransportEmployees || "",
    vehiclesCompanyOwned: ynNorm(s.vehiclesCompanyOwned),
    vehiclesUnmarked: !!s.vehiclesUnmarked,
    vehicleMaintenance: lookup(VEH_MAINT_MAP, s.vehicleMaintenance),
    distractedDrivingPolicy: ynNaNorm(s.distractedDrivingPolicy),
    driversTraining: ynNaNorm(s.driversTraining),
    cdlsRequired: ynNaNorm(s.cdlsRequired),
    overnightTravel: ynNorm(s.overnightTravel),
    overnightTravelFrequency: s.overnightFrequency || "",
    avgDistancePerDayMin: s.avgDistanceMin || "",
    avgDistancePerDayMax: s.avgDistanceMax || "",
    avgDistanceNa: !!s.avgDistanceNa,
    avgDeliveriesPerDayMin: s.avgDeliveriesMin || "",
    avgDeliveriesPerDayMax: s.avgDeliveriesMax || "",
    avgDeliveriesNa: !!s.avgDeliveriesNa,
    outOfStateTransportStates: s.outOfStateTransport || "",

    signatoryName: s.contactName || "",
    signatoryDate: new Date().toISOString().slice(0, 10),
  };

  return answers;
}

export type { CanonicalKey };
