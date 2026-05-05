import { create } from "zustand";

export interface LocationClassCode {
  classCode: string;
  description: string;
  fullTimeEmployees: number;
  partTimeEmployees: number;
  annualPayroll: number;
}

export interface LocationBlock {
  id: string;
  streetAddress: string;
  city: string;
  state: string;
  zip: string;
  classCodes: LocationClassCode[];
}

export interface OwnerOfficer {
  firstName: string;
  lastName: string;
  ownershipPct: number;
  duties: string;
  included: boolean;
}

export interface PriorPolicy {
  effectiveDate: string;
  expirationDate: string;
  carrier: string;
  premium: number;
  claimCount: number;
  claimsAmount: number;
}

export interface HistoricalPremium {
  label: string;
  year: string;
  payroll: number;
  premium: number;
  subCosts: number;
}

export interface MultiLocationResult {
  locations: Array<{
    state: string;
    classCodes: Array<{
      classCode: string;
      description?: string;
      annualPayroll: number;
      baseRate: number;
      premium: number;
      error?: string;
    }>;
    subtotal: number;
    caTerritory?: number | null;
    caTerritoryMultiplier?: number;
    subtotalBeforeTerritory?: number;
  }>;
  totalGrossPremium: number;
  minimumPremiumApplied: boolean;
  peoDiscountAmount: number;
  finalPremium: number;
  eMod: number;
  scheduleRating: number;
  isPEO: boolean;
  calculatedAt: string;
}

export interface WorkforceProfilePayload {
  locations: Array<{
    state: string;
    zip: string;
    classCodes: Array<{
      classCode: string;
      annualPayroll: number;
      fullTimeEmployees: number;
      partTimeEmployees: number;
      description: string;
    }>;
  }>;
  eMod: number;
  scheduleRating: number;
  isPEO: boolean;
}

export interface QuoteFlowState {
  phase: 1 | 2;
  currentStep: number;
  vertical: string;
  coverageType: string;

  businessName: string;
  dba: string;
  fein: string;
  entityType: string;
  yearsInBusiness: string;
  businessState: string;
  primaryStreetAddress: string;
  primaryCity: string;
  primaryState: string;
  primaryZip: string;
  locationCount: string;
  statesOfOperation: string[];
  contactName: string;
  contactEmail: string;
  contactPhone: string;

  locations: LocationBlock[];

  hasExperienceMod: string;
  experienceMod: string;
  experienceModDate: string;

  indicationData: {
    premiumLow: number;
    premiumHigh: number;
    rateBreakdown: Array<{
      location: number;
      state: string;
      classCode: string;
      description: string;
      payroll: number;
      ratePer100: number;
      estPremium: number;
    }>;
    totalPayroll: number;
    totalEmployees: number;
    modifier: number;
    calculatedAt: string;
    wcRatingBreakdown: MultiLocationResult;
    workforceProfile: WorkforceProfilePayload;
  } | null;

  website: string;
  streetAddress: string;
  suite: string;
  city: string;
  addressState: string;
  zip: string;
  mailingAddressSame: boolean;
  mailingStreet: string;
  mailingSuite: string;
  mailingCity: string;
  mailingState: string;
  mailingZip: string;
  owners: OwnerOfficer[];

  yearsOfPriorCoverage: string;
  totalPremiumPaid: string;
  totalClaimsPaid: string;
  nonRenewed: string;
  lapseInCoverage: string;
  lapseDate: string;
  priorPolicies: PriorPolicy[];

  generalQuestions: Record<string, string>;
  generalQuestionsDetails: Record<string, string>;

  hoursOfOperation: string;
  payrollFrequency: string;
  cannabisOperations: string[];
  consumedOnSite: string;
  consumptionMethods: string[];
  maxConcentration: string;
  ftEmployees: string;
  ptEmployees: string;
  seasonalEmployees: string;
  volunteers: string;
  paymentMethods: string[];
  paymentMethodsOther: string;
  benefitsOffered: string[];
  benefitsOfferedOther: string;
  groupHealth: string;
  groupHealthPct: string;
  preHireChecks: string[];
  preHireChecksOther: string;
  returnToWork: string;
  subcontractorsUsed: string;
  subcontractorPct: string;
  subcontractorTypes: string;
  subcontractorCois: string;
  dayLaborers: string;
  avgTurnover: string;

  safetyProgram: string;
  safetyTraining: string;
  safetyMeetings: string;
  safetyMeetingFreq: string;
  accidentInvestigations: string;
  msdsProgram: string;
  chemicalsUsed: string;
  chemicalsNotApplicable: boolean;
  respiratoryProgram: string;
  buildingVentilated: string;
  liftingExposures: string;
  liftingControls: string[];
  machineryGuarded: string;
  lockoutTagout: string;
  forkliftsUsed: string;
  forkliftsCertified: boolean;
  maxHeight: string;
  maxDepth: string;
  heightEquipment: string[];
  fallProtection: string[];
  covidMeasures: string;
  ppeUsed: string[];
  securitySystems: string[];
  writtenSecurityPlan: string;
  securityGuards: string;
  securityGuardsArmed: string;
  outsideSecurityCompany: string;
  outsideSecurityCois: boolean;
  outsideSecurityAdditionalInsured: boolean;

  extractionMethods: string[];
  extractionMethodsOther: string;
  extractionProcess: string;
  thirdPartyMaintenance: string;
  extractionSegregated: string;
  emergencyReliefValves: string;
  classC1D1Booth: string;
  classC1D1BoothType: string;
  extractionTraining: string;
  emergencyPlan: string;
  growAreaSqft: string;
  flowMeters: string;
  historicalPremiums: HistoricalPremium[];

  drivingDeliveryExposureFlag: string;
  drivingMileagePctLt50: string;
  drivingMileagePct50to100: string;
  drivingMileagePct100plus: string;
  drivingMileageNa: boolean;
  maxDeliveryMileage: string;
  deliveryRetailPct: string;
  deliveryWholesalePct: string;
  deliveryDirectPct: string;
  gpsEquipped: string;
  allDrivers2565: string;
  driversOver65: string;
  totalDrivers: string;
  deliveryHours: string;
  overnightTravel: string;
  overnightFrequency: string;
  avgDistanceMin: string;
  avgDistanceMax: string;
  avgDistanceNa: boolean;
  avgDeliveriesMin: string;
  avgDeliveriesMax: string;
  avgDeliveriesNa: boolean;
  outOfStateTransport: string;
  driversTraining: string;
  cdlsRequired: string;
  groupTransportation: string;
  groupTransportEmployees: string;
  vehiclesCompanyOwned: string;
  vehiclesUnmarked: boolean;
  vehicleMaintenance: string;
  distractedDrivingPolicy: string;
  bicycleDelivery: string;
  bicycleDeliveryExplain: string;

  lossHistoryFiles: Array<{ id: string; name: string; size: number; yearsCovered: string; notes: string }>;
  submittedDealId: string | null;
}

interface QuoteFlowActions {
  init: (vertical: string, coverageType: string) => void;
  update: (fields: Partial<QuoteFlowState>) => void;
  setStep: (step: number) => void;
  setPhase: (phase: 1 | 2) => void;
  updatePrimaryAddress: (fields: Partial<{ primaryStreetAddress: string; primaryCity: string; primaryState: string; primaryZip: string }>) => void;
  setLocationCount: (count: number) => void;
  addLocation: () => void;
  removeLocation: (id: string) => void;
  updateLocation: (id: string, fields: Partial<LocationBlock>) => void;
  addClassCode: (locationId: string) => void;
  removeClassCode: (locationId: string, index: number) => void;
  updateClassCode: (locationId: string, index: number, fields: Partial<LocationClassCode>) => void;
  addOwner: () => void;
  removeOwner: (index: number) => void;
  updateOwner: (index: number, fields: Partial<OwnerOfficer>) => void;
  addPriorPolicy: () => void;
  removePriorPolicy: (index: number) => void;
  updatePriorPolicy: (index: number, fields: Partial<PriorPolicy>) => void;
  reset: () => void;
  getTotalPayroll: () => number;
  getTotalEmployees: () => number;
}

const generateId = () => Math.random().toString(36).substring(2, 9);

const emptyClassCode = (): LocationClassCode => ({
  classCode: "",
  description: "",
  fullTimeEmployees: 0,
  partTimeEmployees: 0,
  annualPayroll: 0,
});

const emptyLocation = (): LocationBlock => ({
  id: generateId(),
  streetAddress: "",
  city: "",
  state: "",
  zip: "",
  classCodes: [emptyClassCode()],
});

const initialState: Omit<QuoteFlowState, keyof QuoteFlowActions> = {
  phase: 1,
  currentStep: 1,
  vertical: "",
  coverageType: "",
  businessName: "",
  dba: "",
  fein: "",
  entityType: "",
  yearsInBusiness: "",
  businessState: "",
  primaryStreetAddress: "",
  primaryCity: "",
  primaryState: "",
  primaryZip: "",
  locationCount: "1",
  statesOfOperation: [],
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  locations: [emptyLocation()],
  hasExperienceMod: "",
  experienceMod: "1.00",
  experienceModDate: "",
  indicationData: null,
  website: "",
  streetAddress: "",
  suite: "",
  city: "",
  addressState: "",
  zip: "",
  mailingAddressSame: true,
  mailingStreet: "",
  mailingSuite: "",
  mailingCity: "",
  mailingState: "",
  mailingZip: "",
  owners: [],
  yearsOfPriorCoverage: "",
  totalPremiumPaid: "",
  totalClaimsPaid: "",
  nonRenewed: "",
  lapseInCoverage: "",
  lapseDate: "",
  priorPolicies: [],
  generalQuestions: {},
  generalQuestionsDetails: {},
  hoursOfOperation: "",
  payrollFrequency: "",
  cannabisOperations: [],
  consumedOnSite: "",
  consumptionMethods: [],
  maxConcentration: "",
  ftEmployees: "",
  ptEmployees: "",
  seasonalEmployees: "",
  volunteers: "",
  paymentMethods: [],
  paymentMethodsOther: "",
  benefitsOffered: [],
  benefitsOfferedOther: "",
  groupHealth: "",
  groupHealthPct: "",
  preHireChecks: [],
  preHireChecksOther: "",
  returnToWork: "",
  subcontractorsUsed: "",
  subcontractorPct: "",
  subcontractorTypes: "",
  subcontractorCois: "",
  dayLaborers: "",
  avgTurnover: "",
  safetyProgram: "",
  safetyTraining: "",
  safetyMeetings: "",
  safetyMeetingFreq: "",
  accidentInvestigations: "",
  msdsProgram: "",
  chemicalsUsed: "",
  chemicalsNotApplicable: false,
  respiratoryProgram: "",
  buildingVentilated: "",
  liftingExposures: "",
  liftingControls: [],
  machineryGuarded: "",
  lockoutTagout: "",
  forkliftsUsed: "",
  forkliftsCertified: false,
  maxHeight: "",
  maxDepth: "",
  heightEquipment: [],
  fallProtection: [],
  covidMeasures: "",
  ppeUsed: [],
  securitySystems: [],
  writtenSecurityPlan: "",
  securityGuards: "",
  securityGuardsArmed: "",
  outsideSecurityCompany: "",
  outsideSecurityCois: false,
  outsideSecurityAdditionalInsured: false,
  extractionMethods: [],
  extractionMethodsOther: "",
  extractionProcess: "",
  thirdPartyMaintenance: "",
  extractionSegregated: "",
  emergencyReliefValves: "",
  classC1D1Booth: "",
  classC1D1BoothType: "",
  extractionTraining: "",
  emergencyPlan: "",
  growAreaSqft: "",
  flowMeters: "",
  historicalPremiums: [
    { label: "5th Prior", year: "", payroll: 0, premium: 0, subCosts: 0 },
    { label: "4th Prior", year: "", payroll: 0, premium: 0, subCosts: 0 },
    { label: "3rd Prior", year: "", payroll: 0, premium: 0, subCosts: 0 },
    { label: "2nd Prior", year: "", payroll: 0, premium: 0, subCosts: 0 },
    { label: "Current Year", year: "", payroll: 0, premium: 0, subCosts: 0 },
    { label: "Projected Next 12 Months", year: "", payroll: 0, premium: 0, subCosts: 0 },
  ],
  drivingDeliveryExposureFlag: "",
  drivingMileagePctLt50: "",
  drivingMileagePct50to100: "",
  drivingMileagePct100plus: "",
  drivingMileageNa: false,
  maxDeliveryMileage: "",
  deliveryRetailPct: "",
  deliveryWholesalePct: "",
  deliveryDirectPct: "",
  gpsEquipped: "",
  allDrivers2565: "",
  driversOver65: "",
  totalDrivers: "",
  deliveryHours: "",
  overnightTravel: "",
  overnightFrequency: "",
  avgDistanceMin: "",
  avgDistanceMax: "",
  avgDistanceNa: false,
  avgDeliveriesMin: "",
  avgDeliveriesMax: "",
  avgDeliveriesNa: false,
  outOfStateTransport: "",
  driversTraining: "",
  cdlsRequired: "",
  groupTransportation: "",
  groupTransportEmployees: "",
  vehiclesCompanyOwned: "",
  vehiclesUnmarked: false,
  vehicleMaintenance: "",
  distractedDrivingPolicy: "",
  bicycleDelivery: "",
  bicycleDeliveryExplain: "",
  lossHistoryFiles: [],
  submittedDealId: null,
};

export const useQuoteFlowStore = create<QuoteFlowState & QuoteFlowActions>((set, get) => ({
  ...initialState,

  init: (vertical, coverageType) => {
    set({ ...initialState, vertical, coverageType, locations: [emptyLocation()] });
  },

  update: (fields) => set(fields),

  setStep: (step) => set({ currentStep: step }),

  setPhase: (phase) =>
    set((s) => {
      const updates: Partial<QuoteFlowState> = { phase };
      if (phase === 2) {
        if (!s.streetAddress && s.primaryStreetAddress) updates.streetAddress = s.primaryStreetAddress;
        if (!s.city && s.primaryCity) updates.city = s.primaryCity;
        if (!s.addressState && s.primaryState) updates.addressState = s.primaryState;
        if (!s.zip && s.primaryZip) updates.zip = s.primaryZip;
      }
      return updates;
    }),

  updatePrimaryAddress: (fields) =>
    set((s) => {
      const updates: Partial<QuoteFlowState> = { ...fields };
      const loc0 = s.locations[0];
      if (loc0) {
        const locUpdates: Partial<LocationBlock> = {};
        if (fields.primaryStreetAddress !== undefined) locUpdates.streetAddress = fields.primaryStreetAddress;
        if (fields.primaryCity !== undefined) locUpdates.city = fields.primaryCity;
        if (fields.primaryState !== undefined) locUpdates.state = fields.primaryState;
        if (fields.primaryZip !== undefined) locUpdates.zip = fields.primaryZip;
        updates.locations = s.locations.map((l, i) => i === 0 ? { ...l, ...locUpdates } : l);
      }
      return updates;
    }),

  setLocationCount: (count) =>
    set((s) => {
      const clamped = Math.max(1, Math.min(count, 20));
      const current = s.locations.length;
      let locs = [...s.locations];
      if (clamped > current) {
        for (let i = current; i < clamped; i++) locs.push(emptyLocation());
      } else if (clamped < current) {
        locs = locs.slice(0, clamped);
      }
      return { locationCount: String(clamped), locations: locs };
    }),

  addLocation: () =>
    set((s) => {
      const newLocs = [...s.locations, emptyLocation()];
      return { locations: newLocs, locationCount: String(newLocs.length) };
    }),

  removeLocation: (id) =>
    set((s) => {
      const newLocs = s.locations.filter((l) => l.id !== id);
      return { locations: newLocs, locationCount: String(newLocs.length) };
    }),

  updateLocation: (id, fields) =>
    set((s) => ({
      locations: s.locations.map((l) => (l.id === id ? { ...l, ...fields } : l)),
    })),

  addClassCode: (locationId) =>
    set((s) => ({
      locations: s.locations.map((l) =>
        l.id === locationId ? { ...l, classCodes: [...l.classCodes, emptyClassCode()] } : l,
      ),
    })),

  removeClassCode: (locationId, index) =>
    set((s) => ({
      locations: s.locations.map((l) =>
        l.id === locationId
          ? { ...l, classCodes: l.classCodes.filter((_, i) => i !== index) }
          : l,
      ),
    })),

  updateClassCode: (locationId, index, fields) =>
    set((s) => ({
      locations: s.locations.map((l) =>
        l.id === locationId
          ? {
              ...l,
              classCodes: l.classCodes.map((cc, i) =>
                i === index ? { ...cc, ...fields } : cc,
              ),
            }
          : l,
      ),
    })),

  addOwner: () =>
    set((s) => ({
      owners: [
        ...s.owners,
        { firstName: "", lastName: "", ownershipPct: 0, duties: "", included: true },
      ],
    })),

  removeOwner: (index) =>
    set((s) => ({ owners: s.owners.filter((_, i) => i !== index) })),

  updateOwner: (index, fields) =>
    set((s) => ({
      owners: s.owners.map((o, i) => (i === index ? { ...o, ...fields } : o)),
    })),

  addPriorPolicy: () =>
    set((s) => ({
      priorPolicies: [
        ...s.priorPolicies,
        { effectiveDate: "", expirationDate: "", carrier: "", premium: 0, claimCount: 0, claimsAmount: 0 },
      ],
    })),

  removePriorPolicy: (index) =>
    set((s) => ({ priorPolicies: s.priorPolicies.filter((_, i) => i !== index) })),

  updatePriorPolicy: (index, fields) =>
    set((s) => ({
      priorPolicies: s.priorPolicies.map((p, i) => (i === index ? { ...p, ...fields } : p)),
    })),

  reset: () => set({ ...initialState, locations: [emptyLocation()] }),

  getTotalPayroll: () => {
    const { locations } = get();
    return locations.reduce(
      (sum, loc) => sum + loc.classCodes.reduce((s, cc) => s + (cc.annualPayroll || 0), 0),
      0,
    );
  },

  getTotalEmployees: () => {
    const { locations } = get();
    return locations.reduce(
      (sum, loc) =>
        sum +
        loc.classCodes.reduce(
          (s, cc) => s + (cc.fullTimeEmployees || 0) + (cc.partTimeEmployees || 0),
          0,
        ),
      0,
    );
  },
}));
