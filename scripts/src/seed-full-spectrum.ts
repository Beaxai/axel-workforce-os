/**
 * Seed the "Full Spectrum Cannabis Co" demo deal.
 *
 * Posts a complete cannabisApplicationAnswers payload to
 * POST /api/submission/submit-for-approval, which:
 *   - inserts a deals row (vertical=Cannabis, stage=SUBMISSION_REVIEW)
 *   - inserts a submission_answers row with the canonical answers
 *   - inserts deal_documents rows (incl. axel_cannabis_application,
 *     acord_130, trean_cannabis_supp pointing at the PDF stream routes)
 *
 * Idempotent: if a deal with the same business_name already exists,
 * it deletes that deal (cascading to submission_answers/deal_documents)
 * before re-seeding.
 *
 * Run: pnpm --filter @workspace/scripts run seed-full-spectrum
 */
import { Client } from "pg";

const BUSINESS_NAME = "Full Spectrum Cannabis Co";
const API_BASE =
  process.env.API_BASE_URL || "http://localhost:80/api";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

async function deleteExisting(): Promise<number> {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const res = await client.query(
      `DELETE FROM deals WHERE business_name = $1 RETURNING id`,
      [BUSINESS_NAME],
    );
    return res.rowCount ?? 0;
  } finally {
    await client.end();
  }
}

const cannabisApplicationAnswers = {
  legalBusinessName: BUSINESS_NAME,
  dba: "Full Spectrum",
  fein: "87-4421059",
  entityType: "LLC",
  yearsInBusiness: "6",
  website: "https://fullspectrumcannabis.example",
  businessStreetAddress: "1420 Industrial Way",
  businessSuite: "Suite 200",
  businessCity: "Denver",
  businessState: "CO",
  businessZip: "80216",
  mailingStreetAddress: "1420 Industrial Way",
  mailingSuite: "Suite 200",
  mailingCity: "Denver",
  mailingState: "CO",
  mailingZip: "80216",
  primaryContactName: "Jordan Mercer",
  contactEmail: "jordan@fullspectrumcannabis.example",
  contactPhone: "(303) 555-0142",
  primaryClassOfBusiness:
    "Vertically-integrated cannabis: cultivation, extraction, processing, dispensary, and last-mile delivery",
  totalEmployeesFt: "42",
  totalEmployeesPt: "8",
  totalEmployeesAll: "50",
  annualPayroll: "2850000",
  descriptionOfOperations:
    "Vertically-integrated adult-use and medical cannabis operator with two indoor cultivation facilities, a CO2 + ethanol extraction lab, a packaging/processing kitchen, three retail dispensaries, and a licensed delivery fleet covering the Denver metro area.",

  locations: [
    {
      loc: "1",
      streetAddress: "1420 Industrial Way",
      suite: "Suite 200",
      city: "Denver",
      state: "CO",
      zip: "80216",
    },
    {
      loc: "2",
      streetAddress: "885 Cultivation Blvd",
      suite: "",
      city: "Aurora",
      state: "CO",
      zip: "80011",
    },
    {
      loc: "3",
      streetAddress: "210 Larimer Square",
      suite: "Unit B",
      city: "Denver",
      state: "CO",
      zip: "80202",
    },
  ],
  classCodes: [
    {
      loc: "1",
      classCode: "2174",
      description: "Cannabis Manufacturing — Extraction & Processing",
      fullTime: "18",
      partTime: "2",
      annualPayroll: "1180000",
    },
    {
      loc: "2",
      classCode: "0079",
      description: "Cannabis Cultivation — Indoor Grow",
      fullTime: "14",
      partTime: "3",
      annualPayroll: "920000",
    },
    {
      loc: "3",
      classCode: "8017",
      description: "Cannabis Retail Dispensary",
      fullTime: "10",
      partTime: "3",
      annualPayroll: "550000",
    },
    {
      loc: "1",
      classCode: "7380",
      description: "Cannabis Delivery Drivers",
      fullTime: "0",
      partTime: "0",
      annualPayroll: "200000",
    },
  ],
  ownersOfficers: [
    {
      firstName: "Jordan",
      lastName: "Mercer",
      ownershipPct: "55",
      duties: "CEO / Operations",
      included: true,
    },
    {
      firstName: "Priya",
      lastName: "Shah",
      ownershipPct: "30",
      duties: "Chief Cultivation Officer",
      included: true,
    },
    {
      firstName: "Marcus",
      lastName: "Reyes",
      ownershipPct: "15",
      duties: "CFO",
      included: false,
    },
  ],

  yearsOfPriorCoverage: "5",
  experienceModifier: "0.92",
  totalPremiumPaid: "418000",
  totalClaimsPaid: "62500",
  lossRatio: "15",
  priorPolicies: [
    {
      effectiveDate: "2025-04-01",
      expirationDate: "2026-04-01",
      carrier: "Trean Underwriting Managers",
      premium: "94500",
      claimCount: "1",
      claimsAmount: "8200",
    },
    {
      effectiveDate: "2024-04-01",
      expirationDate: "2025-04-01",
      carrier: "Trean Underwriting Managers",
      premium: "88000",
      claimCount: "2",
      claimsAmount: "21300",
    },
    {
      effectiveDate: "2023-04-01",
      expirationDate: "2024-04-01",
      carrier: "Pinnacol Assurance",
      premium: "82000",
      claimCount: "0",
      claimsAmount: "0",
    },
  ],

  q1_aircraftWatercraft: "no",
  q2_hazardousMaterial: "yes",
  q3_undergroundOrAbove15ft: "no",
  q4_workOnWater: "no",
  q5_otherBusiness: "no",
  q6_subcontractorsUsed: "yes",
  q6_subcontractorsPct: "8",
  q7_workSubletWithoutCoi: "no",
  q8_writtenSafetyProgram: "yes",
  q9_groupTransportation: "no",
  q10_employeesUnder16OrOver60: "no",
  q11_seasonalEmployees: "yes",
  q12_volunteerLabor: "no",
  q12_volunteerDetails: "",
  q13_employeesWithHandicaps: "no",
  q14_outOfStateTravel: "no",
  q14_outOfStateDetails: "",
  q15_athleticTeamsSponsored: "no",
  q16_physicalsRequired: "no",
  q17_otherInsurance: "yes",
  q18_priorCoverageDeclined: "no",
  q19_employeeHealthPlans: "yes",
  q20_workForOtherBusinesses: "no",
  q21_leasedEmployees: "no",
  q22_workFromHome: "yes",
  q22_workFromHomeCount: "4",
  q23_taxLiensOrBankruptcy: "no",
  q23_taxLiensDetails: "",
  q24_unpaidWcPremium: "no",
  q24_unpaidWcDetails: "",

  hoursOfOperation: "Cultivation 24/7; Dispensary 8am–10pm; Extraction lab 6am–6pm",
  operationsDispensary: true,
  operationsGrowing: true,
  operationsProcessing: true,
  operationsDelivery: true,
  operationsExtraction: true,
  consumedOnSite: "no",
  consumptionMethods: [],
  empCountFt: "42",
  empCountPt: "8",
  empCountSeasonal: "6",
  empCountVolunteers: "0",
  maxConcentrationPerShift: "12",
  paidHourly: true,
  paidCommission: false,
  paidSalary: true,
  paidOther: "",
  benefitsPaidSick: true,
  benefitsPaidVacation: true,
  benefits401k: true,
  benefitsRetirement: false,
  benefitsOther: "",
  groupHealthCoverage: "yes",
  groupHealthEmployerPct: "70",
  preHireWrittenApp: true,
  preHireMvr: true,
  preHireRandomDrug: false,
  preHirePhysicals: false,
  preHireCriminal: true,
  preHireDrugTesting: true,
  preHireReferences: true,
  preHireAnnualMvr: true,
  preHirePostAccident: true,
  preHireOther: "",
  returnToWork: "formal",
  subcontractorsUsed: "yes",
  subcontractorPayrollPct: "8",
  subcontractorTypes: "HVAC, electrical, security installers",
  subcontractorCoisObtained: "yes",
  avgEmployeeTurnoverPct: "18",
  dayLaborersOrLeasing: "no",

  safetyProgram: "formal",
  safetyTraining: "documented",
  safetyMeetings: "yes",
  safetyMeetingFreq: "monthly",
  accidentInvestigations: "yes",
  msdsProgram: "yes",
  chemicalsUsed: "Ethanol, CO2, isopropyl alcohol, food-grade nutrients, IPM-approved pesticides",
  chemicalsNotApplicable: false,
  respiratoryProgram: "yes",
  buildingProperlyVentilated: "yes",
  liftingExposure: "25to40",
  liftingHandtrucks: true,
  liftingForklifts: true,
  lifting2Person: true,
  liftingOther: "",
  machineryGuarded: "yes",
  lockoutTagout: "yes",
  forkliftsUsed: "yes",
  forkliftsCertified: true,
  maxDepth: "na",
  maxHeight: "7to15",
  heightScissorLift: true,
  heightScaffolding: false,
  heightBucketTruck: false,
  heightLadder: true,
  fallProtectionArrest: true,
  fallProtectionPositioning: false,
  fallProtectionRetrieval: false,
  fallProtectionSuspension: false,
  covidMeasures:
    "Hand-sanitizer stations at every entrance, optional masks, paid sick leave for symptomatic staff.",
  ppeGloves: true,
  ppeBackBelts: false,
  ppeEarPlugs: true,
  ppeGoggles: true,
  ppeMasks: true,
  ppeHardHats: false,
  ppeSafetyGlasses: true,
  ppeSteelToed: true,
  ppeRespirator: true,
  ppeNonSlip: true,
  ppeProtectiveClothing: true,
  ppeOther: "",

  securityInteriorCamera: true,
  securityExteriorCamera: true,
  securityMetalDetector: false,
  securityPanicButton: true,
  securityMetalDoors: true,
  securityGatedDoors: true,
  securityGatedWindows: true,
  securityCentralBurglarAlarm: true,
  securityCentralFireAlarm: true,
  securityVestibuleMantrap: true,
  securityDoorIntercom: true,
  securityOther: "",
  writtenSecurityPlan: "yes",
  securityGuards: "outside",
  securityGuardsArmed: "yes",
  outsideSecurityCompanyUsed: "yes",
  outsideSecurityCoisObtained: true,
  outsideSecurityAdditionalInsured: true,

  extractionCO2: true,
  extractionButane: false,
  extractionIsopropyl: false,
  extractionEthanol: true,
  extractionWater: false,
  extractionOther: "",
  extractionProcessDescription:
    "Closed-loop CO2 extraction in C1D1 booth with secondary ethanol winterization. Solvents recovered and recycled; finished oil distilled and tested in-house QA lab.",
  extractionThirdPartyMaintenance: "yes",
  extractionSegregated: "yes",
  extractionEmergencyReliefValves: "yes",
  extractionC1D1Booth: "yes",
  extractionBoothOtherType: "",
  extractionTrainingProvided: "yes",
  extractionEmergencyPlan: "yes",
  growAreaSqft: "28000",
  flowMetersUsed: "yes",

  historicalPremiums: [
    { label: "2025", year: "2025", payroll: "2640000", premium: "94500", subCosts: "78000" },
    { label: "2024", year: "2024", payroll: "2210000", premium: "88000", subCosts: "65000" },
    { label: "2023", year: "2023", payroll: "1850000", premium: "82000", subCosts: "44000" },
  ],

  drivingDeliveryExposure: "yes",
  drivingMileagePctLt50: "100",
  drivingMileagePct50to100: "",
  drivingMileagePct100plus: "",
  drivingMileageNa: false,
  maxDeliveryMileage: "35",
  deliveryRetailPct: "20",
  deliveryWholesalePct: "10",
  deliveryDirectPct: "70",
  vehiclesGpsEquipped: "yes",
  driversAge25to65: "yes",
  driversOver65Count: "0",
  totalDriverCount: "6",
  hoursOfDelivery: "10am–9pm, 7 days",
  bicycleDelivery: "no",
  bicycleDeliveryDetails: "",
  groupTransportationProvided: "no",
  groupTransportationCount: "",
  vehiclesCompanyOwned: "yes",
  vehiclesUnmarked: true,
  vehicleMaintenance: "outside",
  distractedDrivingPolicy: "yes",
  driversTraining: "yes",
  cdlsRequired: "no",
  overnightTravel: "no",
  overnightTravelFrequency: "",
  avgDistancePerDayMin: "60",
  avgDistancePerDayMax: "140",
  avgDistanceNa: false,
  avgDeliveriesPerDayMin: "12",
  avgDeliveriesPerDayMax: "28",
  avgDeliveriesNa: false,
  outOfStateTransportStates: "",

  signatoryName: "Jordan Mercer",
  signatoryDate: new Date().toISOString().slice(0, 10),
};

const totalPayroll = cannabisApplicationAnswers.classCodes.reduce(
  (sum, cc) => sum + Number(cc.annualPayroll || 0),
  0,
);
const totalEmployees = cannabisApplicationAnswers.classCodes.reduce(
  (sum, cc) => sum + Number(cc.fullTime || 0) + Number(cc.partTime || 0),
  0,
);

const payload = {
  businessName: BUSINESS_NAME,
  vertical: "Cannabis",
  coverageType: "Workers' Compensation",
  businessState: "CO",
  totalPayroll,
  totalEmployees,
  experienceMod: 0.92,
  premiumLow: 84200,
  premiumHigh: 102800,
  statesOfOperation: ["CO"],
  fein: "87-4421059",
  entityType: "LLC",
  contactName: "Jordan Mercer",
  contactEmail: "jordan@fullspectrumcannabis.example",
  contactPhone: "(303) 555-0142",
  lossHistoryCount: 3,
  cannabisApplicationAnswers,
};

(async () => {
  const deleted = await deleteExisting();
  if (deleted > 0) {
    console.log(`Deleted ${deleted} existing "${BUSINESS_NAME}" deal(s).`);
  }

  const url = `${API_BASE}/submission/submit-for-approval`;
  console.log(`POST ${url}`);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  if (!res.ok) {
    console.error(`HTTP ${res.status}:\n${text}`);
    process.exit(1);
  }

  let body: { dealId?: string; documentCount?: number; cannabisApplicationPersisted?: boolean };
  try {
    body = JSON.parse(text);
  } catch {
    console.log(text);
    return;
  }

  console.log(`Seeded "${BUSINESS_NAME}"`);
  console.log(`  dealId: ${body.dealId}`);
  console.log(`  documentCount: ${body.documentCount}`);
  console.log(`  cannabisApplicationPersisted: ${body.cannabisApplicationPersisted}`);
  console.log("");
  console.log("Open the deal in the pipeline → the WC Application card should now show:");
  console.log("  • Axel Cannabis WC Application 2026");
  console.log("  • ACORD 130 — Workers' Compensation Application");
  console.log("  • Trean Cannabis Supplemental Application");
})();
