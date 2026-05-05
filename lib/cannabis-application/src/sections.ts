/**
 * UI metadata for the canonical Cannabis WC application schema.
 * Each entry describes a field's section, label, input type, and (where relevant)
 * the option list. Used to render summary tables on the pipeline submission card.
 */
import type { CanonicalKey } from "./canonical-schema";

export type FieldKind =
  | "text"
  | "number"
  | "longtext"
  | "yn"
  | "ynna"
  | "enum"
  | "checkbox"
  | "list";

export interface FieldSpec {
  key: CanonicalKey;
  label: string;
  kind: FieldKind;
  options?: readonly string[];
}

export interface Section {
  id: string;
  title: string;
  fields: FieldSpec[];
}

const ynOpts = ["yes", "no"] as const;
const ynNaOpts = ["yes", "no", "na"] as const;

export const sections: Section[] = [
  {
    id: "applicant",
    title: "Applicant Information",
    fields: [
      { key: "legalBusinessName", label: "Legal Business Name", kind: "text" },
      { key: "dba", label: "DBA", kind: "text" },
      { key: "fein", label: "FEIN", kind: "text" },
      { key: "entityType", label: "Entity Type", kind: "text" },
      { key: "yearsInBusiness", label: "Years in Business", kind: "number" },
      { key: "website", label: "Website", kind: "text" },
      { key: "businessStreetAddress", label: "Business Street", kind: "text" },
      { key: "businessSuite", label: "Suite", kind: "text" },
      { key: "businessCity", label: "City", kind: "text" },
      { key: "businessState", label: "State", kind: "text" },
      { key: "businessZip", label: "Zip", kind: "text" },
      { key: "primaryContactName", label: "Primary Contact", kind: "text" },
      { key: "contactEmail", label: "Email", kind: "text" },
      { key: "contactPhone", label: "Phone", kind: "text" },
      { key: "primaryClassOfBusiness", label: "Primary Class of Business", kind: "text" },
      { key: "totalEmployeesFt", label: "Full-time Employees", kind: "number" },
      { key: "totalEmployeesPt", label: "Part-time Employees", kind: "number" },
      { key: "annualPayroll", label: "Annual Payroll", kind: "number" },
      { key: "descriptionOfOperations", label: "Description of Operations", kind: "longtext" },
    ],
  },
  {
    id: "coverage_history",
    title: "Coverage History",
    fields: [
      { key: "yearsOfPriorCoverage", label: "Years of Prior Coverage", kind: "number" },
      { key: "experienceModifier", label: "Experience Modifier", kind: "number" },
      { key: "totalPremiumPaid", label: "Total Premium Paid", kind: "number" },
      { key: "totalClaimsPaid", label: "Total Claims Paid", kind: "number" },
      { key: "lossRatio", label: "Loss Ratio", kind: "number" },
    ],
  },
  {
    id: "general",
    title: "General Information",
    fields: [
      { key: "q1_aircraftWatercraft", label: "1. Aircraft / watercraft?", kind: "yn", options: ynOpts },
      { key: "q2_hazardousMaterial", label: "2. Hazardous material?", kind: "yn", options: ynOpts },
      { key: "q3_undergroundOrAbove15ft", label: "3. Underground / above 15 ft?", kind: "yn", options: ynOpts },
      { key: "q4_workOnWater", label: "4. Barges / vessels / docks?", kind: "yn", options: ynOpts },
      { key: "q5_otherBusiness", label: "5. Other business?", kind: "yn", options: ynOpts },
      { key: "q6_subcontractorsUsed", label: "6. Subcontractors used?", kind: "yn", options: ynOpts },
      { key: "q6_subcontractorsPct", label: "6a. % of work subcontracted", kind: "number" },
      { key: "q7_workSubletWithoutCoi", label: "7. Work sublet without COI?", kind: "yn", options: ynOpts },
      { key: "q8_writtenSafetyProgram", label: "8. Written safety program?", kind: "yn", options: ynOpts },
      { key: "q9_groupTransportation", label: "9. Group transportation?", kind: "yn", options: ynOpts },
      { key: "q10_employeesUnder16OrOver60", label: "10. Employees under 16 or over 60?", kind: "yn", options: ynOpts },
      { key: "q11_seasonalEmployees", label: "11. Seasonal employees?", kind: "yn", options: ynOpts },
      { key: "q12_volunteerLabor", label: "12. Volunteer / donated labor?", kind: "yn", options: ynOpts },
      { key: "q13_employeesWithHandicaps", label: "13. Employees with handicaps?", kind: "yn", options: ynOpts },
      { key: "q14_outOfStateTravel", label: "14. Out-of-state travel?", kind: "yn", options: ynOpts },
      { key: "q15_athleticTeamsSponsored", label: "15. Athletic teams sponsored?", kind: "yn", options: ynOpts },
      { key: "q16_physicalsRequired", label: "16. Physicals required after offer?", kind: "yn", options: ynOpts },
      { key: "q17_otherInsurance", label: "17. Other insurance with this insurer?", kind: "yn", options: ynOpts },
      { key: "q18_priorCoverageDeclined", label: "18. Prior coverage declined / non-renewed?", kind: "yn", options: ynOpts },
      { key: "q19_employeeHealthPlans", label: "19. Employee health plans?", kind: "yn", options: ynOpts },
      { key: "q20_workForOtherBusinesses", label: "20. Work for other businesses?", kind: "yn", options: ynOpts },
      { key: "q21_leasedEmployees", label: "21. Lease employees to / from others?", kind: "yn", options: ynOpts },
      { key: "q22_workFromHome", label: "22. Predominantly work from home?", kind: "yn", options: ynOpts },
      { key: "q22_workFromHomeCount", label: "22a. # of employees", kind: "number" },
      { key: "q23_taxLiensOrBankruptcy", label: "23. Tax liens / bankruptcy?", kind: "yn", options: ynOpts },
      { key: "q24_unpaidWcPremium", label: "24. Unpaid WC premium?", kind: "yn", options: ynOpts },
    ],
  },
  {
    id: "operations",
    title: "Cannabis Operations",
    fields: [
      { key: "hoursOfOperation", label: "Hours of Operation", kind: "text" },
      { key: "operationsDispensary", label: "Dispensary", kind: "checkbox" },
      { key: "operationsGrowing", label: "Growing", kind: "checkbox" },
      { key: "operationsProcessing", label: "Processing", kind: "checkbox" },
      { key: "operationsDelivery", label: "Delivery", kind: "checkbox" },
      { key: "operationsExtraction", label: "Extraction", kind: "checkbox" },
      { key: "consumedOnSite", label: "Cannabis consumed on-site?", kind: "yn", options: ynOpts },
      { key: "empCountFt", label: "Employees — Full-time", kind: "number" },
      { key: "empCountPt", label: "Employees — Part-time", kind: "number" },
      { key: "empCountSeasonal", label: "Employees — Seasonal", kind: "number" },
      { key: "empCountVolunteers", label: "Employees — Volunteers", kind: "number" },
      { key: "maxConcentrationPerShift", label: "Max employees per shift", kind: "number" },
      { key: "groupHealthCoverage", label: "Group health coverage?", kind: "yn", options: ynOpts },
      { key: "groupHealthEmployerPct", label: "% paid by employer", kind: "number" },
      { key: "returnToWork", label: "Return-to-Work / Light Duty", kind: "enum", options: ["formal", "informal", "none"] },
      { key: "subcontractorsUsed", label: "Subcontractors used?", kind: "yn", options: ynOpts },
      { key: "subcontractorPayrollPct", label: "Subcontractor payroll %", kind: "number" },
      { key: "subcontractorTypes", label: "Subcontractor types", kind: "text" },
      { key: "subcontractorCoisObtained", label: "COIs obtained for subs?", kind: "ynna", options: ynNaOpts },
      { key: "avgEmployeeTurnoverPct", label: "Avg annual turnover %", kind: "number" },
      { key: "dayLaborersOrLeasing", label: "Day laborers / employee leasing?", kind: "yn", options: ynOpts },
    ],
  },
  {
    id: "safety",
    title: "Safety & Premises",
    fields: [
      { key: "safetyProgram", label: "Safety program", kind: "enum", options: ["formal", "informal", "none"] },
      { key: "safetyTraining", label: "Safety training", kind: "enum", options: ["documented", "verbal", "none"] },
      { key: "safetyMeetings", label: "Safety meetings?", kind: "yn", options: ynOpts },
      { key: "safetyMeetingFreq", label: "Frequency", kind: "enum", options: ["weekly", "monthly", "quarterly", "annually"] },
      { key: "accidentInvestigations", label: "Accident investigations?", kind: "yn", options: ynOpts },
      { key: "msdsProgram", label: "MSDS program?", kind: "yn", options: ynOpts },
      { key: "chemicalsUsed", label: "Chemicals used", kind: "text" },
      { key: "respiratoryProgram", label: "Respiratory program?", kind: "yn", options: ynOpts },
      { key: "buildingProperlyVentilated", label: "Building properly ventilated?", kind: "yn", options: ynOpts },
      { key: "liftingExposure", label: "Lifting exposure", kind: "enum", options: ["lt25", "25to40", "gt40", "na"] },
      { key: "machineryGuarded", label: "Machinery guarded?", kind: "ynna", options: ynNaOpts },
      { key: "lockoutTagout", label: "Lockout / tagout?", kind: "ynna", options: ynNaOpts },
      { key: "forkliftsUsed", label: "Forklifts used?", kind: "yn", options: ynOpts },
      { key: "forkliftsCertified", label: "Operators certified annually?", kind: "checkbox" },
      { key: "maxDepth", label: "Max depth", kind: "enum", options: ["0to3", "4to7", "8plus", "na"] },
      { key: "maxHeight", label: "Max height", kind: "enum", options: ["0to6", "7to15", "15plus", "na"] },
      { key: "writtenSecurityPlan", label: "Written security plan?", kind: "yn", options: ynOpts },
      { key: "securityGuards", label: "Security guards", kind: "enum", options: ["employees", "outside", "na"] },
      { key: "securityGuardsArmed", label: "Security guards armed?", kind: "ynna", options: ynNaOpts },
    ],
  },
  {
    id: "extraction",
    title: "Extraction",
    fields: [
      { key: "extractionCO2", label: "CO2", kind: "checkbox" },
      { key: "extractionButane", label: "Butane", kind: "checkbox" },
      { key: "extractionIsopropyl", label: "Isopropyl", kind: "checkbox" },
      { key: "extractionEthanol", label: "Ethanol", kind: "checkbox" },
      { key: "extractionWater", label: "Water", kind: "checkbox" },
      { key: "extractionOther", label: "Other method", kind: "text" },
      { key: "extractionProcessDescription", label: "Extraction process description", kind: "longtext" },
      { key: "extractionThirdPartyMaintenance", label: "3rd-party maintenance on CO2 / methods?", kind: "ynna", options: ynNaOpts },
      { key: "extractionSegregated", label: "Extraction segregated (explosion-proof wiring)?", kind: "ynna", options: ynNaOpts },
      { key: "extractionEmergencyReliefValves", label: "Emergency relief valves?", kind: "ynna", options: ynNaOpts },
      { key: "extractionC1D1Booth", label: "Class C1D1 booth used?", kind: "yn", options: ynOpts },
      { key: "extractionBoothOtherType", label: "If not, type of booth", kind: "text" },
      { key: "extractionTrainingProvided", label: "Extraction training provided?", kind: "ynna", options: ynNaOpts },
      { key: "extractionEmergencyPlan", label: "Emergency plan in place?", kind: "ynna", options: ynNaOpts },
      { key: "growAreaSqft", label: "Square footage of grow area", kind: "number" },
      { key: "flowMetersUsed", label: "Flow meters / water timers used?", kind: "yn", options: ynOpts },
    ],
  },
  {
    id: "auto",
    title: "Auto Exposure",
    fields: [
      { key: "drivingDeliveryExposure", label: "Driving / delivery exposure?", kind: "yn", options: ynOpts },
      { key: "drivingMileagePctLt50", label: "% Mileage <50", kind: "number" },
      { key: "drivingMileagePct50to100", label: "% Mileage 50-100", kind: "number" },
      { key: "drivingMileagePct100plus", label: "% Mileage 100+", kind: "number" },
      { key: "maxDeliveryMileage", label: "Max delivery mileage", kind: "number" },
      { key: "deliveryRetailPct", label: "% Retail delivery", kind: "number" },
      { key: "deliveryWholesalePct", label: "% Wholesale delivery", kind: "number" },
      { key: "deliveryDirectPct", label: "% Direct-to-customer", kind: "number" },
      { key: "vehiclesGpsEquipped", label: "All vehicles GPS-equipped?", kind: "yn", options: ynOpts },
      { key: "driversAge25to65", label: "All drivers age 25-65?", kind: "yn", options: ynOpts },
      { key: "driversOver65Count", label: "# Drivers over 65", kind: "number" },
      { key: "totalDriverCount", label: "Total # of drivers", kind: "number" },
      { key: "hoursOfDelivery", label: "Hours of delivery", kind: "text" },
      { key: "bicycleDelivery", label: "Bicycle / scooter / motorcycle delivery?", kind: "yn", options: ynOpts },
      { key: "groupTransportationProvided", label: "Group transportation?", kind: "yn", options: ynOpts },
      { key: "groupTransportationCount", label: "# of employees", kind: "number" },
      { key: "vehiclesCompanyOwned", label: "Vehicles company-owned?", kind: "yn", options: ynOpts },
      { key: "vehiclesUnmarked", label: "Owned vehicles unmarked", kind: "checkbox" },
      { key: "vehicleMaintenance", label: "Vehicle maintenance", kind: "enum", options: ["inhouse", "outside", "no"] },
      { key: "distractedDrivingPolicy", label: "Distracted driving policy?", kind: "ynna", options: ynNaOpts },
      { key: "driversTraining", label: "Drivers training?", kind: "ynna", options: ynNaOpts },
      { key: "cdlsRequired", label: "CDLs required?", kind: "ynna", options: ynNaOpts },
      { key: "overnightTravel", label: "Overnight travel?", kind: "yn", options: ynOpts },
      { key: "overnightTravelFrequency", label: "Frequency", kind: "text" },
      { key: "outOfStateTransportStates", label: "Out-of-state transport states", kind: "text" },
    ],
  },
];
