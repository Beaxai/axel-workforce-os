import { db, wcRatesTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";

export interface WCPremiumInput {
  state: string;
  classCode: string;
  annualPayroll: number;
  eMod: number;
  scheduleRating: number;
  isPEO: boolean;
}

export interface WFSPEPMInput {
  annualPayroll: number;
  headcount: number;
}

const VALID_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC"
];

export function validateWCInput(input: WCPremiumInput) {
  const errors: string[] = [];
  if (!input.annualPayroll || input.annualPayroll <= 0) errors.push("annualPayroll must be a positive number greater than 0");
  if (!input.eMod || input.eMod < 0.5 || input.eMod > 2.0) errors.push("eMod must be between 0.5 and 2.0");
  if (!input.scheduleRating || input.scheduleRating < 0.5 || input.scheduleRating > 2.0) errors.push("scheduleRating must be between 0.5 and 2.0");
  if (!input.state || !VALID_STATES.includes(input.state.toUpperCase())) errors.push("state must be a valid 2-letter US state code");
  if (!input.classCode || String(input.classCode).trim() === "") errors.push("classCode must be a non-empty string");
  return errors;
}

export function validateWFSInput(input: WFSPEPMInput) {
  const errors: string[] = [];
  if (!input.annualPayroll || input.annualPayroll <= 0) errors.push("annualPayroll must be a positive number greater than 0");
  if (!input.headcount || !Number.isInteger(input.headcount) || input.headcount <= 0) errors.push("headcount must be a positive integer greater than 0");
  return errors;
}

export interface MultiLocationInput {
  locations: Array<{
    state: string;
    classCodes: Array<{
      classCode: string;
      annualPayroll: number;
      fullTimeEmployees: number;
      partTimeEmployees: number;
      description?: string;
    }>;
  }>;
  eMod: number;
  scheduleRating: number;
  isPEO: boolean;
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

export async function calculateMultiLocationWC(input: MultiLocationInput): Promise<MultiLocationResult> {
  const { locations, eMod, scheduleRating, isPEO } = input;
  const resultLocations: MultiLocationResult["locations"] = [];
  let totalRaw = 0;

  for (const loc of locations) {
    const ccResults: MultiLocationResult["locations"][0]["classCodes"] = [];
    let locSubtotal = 0;

    for (const cc of loc.classCodes) {
      try {
        const [rateRow] = await db
          .select()
          .from(wcRatesTable)
          .where(and(eq(wcRatesTable.state, loc.state.toUpperCase()), eq(wcRatesTable.classCode, String(cc.classCode))))
          .orderBy(desc(wcRatesTable.effectiveDate))
          .limit(1);

        if (!rateRow) {
          ccResults.push({
            classCode: cc.classCode,
            description: cc.description,
            annualPayroll: cc.annualPayroll,
            baseRate: 0,
            premium: 0,
            error: `No rate found for ${loc.state} / ${cc.classCode}`,
          });
          continue;
        }

        const baseRate = parseFloat(rateRow.baseRate);
        const premium = (cc.annualPayroll / 100) * baseRate * eMod * scheduleRating;
        locSubtotal += premium;

        ccResults.push({
          classCode: cc.classCode,
          description: cc.description,
          annualPayroll: cc.annualPayroll,
          baseRate,
          premium: Math.round(premium * 100) / 100,
        });
      } catch {
        ccResults.push({
          classCode: cc.classCode,
          description: cc.description,
          annualPayroll: cc.annualPayroll,
          baseRate: 0,
          premium: 0,
          error: `Rate lookup failed for ${loc.state} / ${cc.classCode}`,
        });
      }
    }

    totalRaw += locSubtotal;
    resultLocations.push({
      state: loc.state,
      classCodes: ccResults,
      subtotal: Math.round(locSubtotal * 100) / 100,
    });
  }

  const minimumPremiumApplied = totalRaw < 500;
  const grossPremium = minimumPremiumApplied ? 500 : totalRaw;
  const peoDiscount = isPEO ? grossPremium * 0.10 : 0;
  const finalPremium = grossPremium - peoDiscount;

  return {
    locations: resultLocations,
    totalGrossPremium: Math.round(grossPremium * 100) / 100,
    minimumPremiumApplied,
    peoDiscountAmount: Math.round(peoDiscount * 100) / 100,
    finalPremium: Math.round(finalPremium * 100) / 100,
    eMod,
    scheduleRating,
    isPEO,
    calculatedAt: new Date().toISOString(),
  };
}

export async function calculateWCPremium(input: WCPremiumInput) {
  const { state, classCode, annualPayroll, eMod, scheduleRating, isPEO } = input;

  const [rateRow] = await db
    .select()
    .from(wcRatesTable)
    .where(and(eq(wcRatesTable.state, state.toUpperCase()), eq(wcRatesTable.classCode, String(classCode))))
    .orderBy(desc(wcRatesTable.effectiveDate))
    .limit(1);

  if (!rateRow) {
    throw new Error(`No rate found for state ${state}, class code ${classCode}`);
  }

  const baseRate = parseFloat(rateRow.baseRate);
  const payrollPer100 = annualPayroll / 100;
  const rawPremium = payrollPer100 * baseRate * eMod * scheduleRating;
  const minimumPremiumApplied = rawPremium < 500;
  const grossPremium = minimumPremiumApplied ? 500 : rawPremium;

  const peoDiscount = isPEO ? grossPremium * 0.10 : 0;
  const finalPremium = grossPremium - peoDiscount;

  return {
    inputs: { state, classCode: String(classCode), annualPayroll, eMod, scheduleRating, isPEO },
    rateData: {
      baseRate,
      effectiveDate: rateRow.effectiveDate,
      description: rateRow.description,
    },
    calculation: {
      payrollPer100,
      grossPremium: Math.round(grossPremium * 100) / 100,
      minimumPremiumApplied,
      peoDiscountApplied: isPEO,
      peoDiscountAmount: Math.round(peoDiscount * 100) / 100,
      finalPremium: Math.round(finalPremium * 100) / 100,
    },
    result: {
      wcPremium: Math.round(finalPremium * 100) / 100,
    },
    calculatedAt: new Date().toISOString(),
  };
}

export function calculateWFSPEPM(input: WFSPEPMInput) {
  const { annualPayroll, headcount } = input;
  const annualWFSFee = annualPayroll * 0.02;
  const monthlyWFSFee = annualWFSFee / 12;
  const pepm = monthlyWFSFee / headcount;

  return {
    inputs: { annualPayroll, headcount },
    calculation: {
      annualWFSFee: Math.round(annualWFSFee * 100) / 100,
      monthlyWFSFee: Math.round(monthlyWFSFee * 100) / 100,
      pepm: Math.round(pepm * 100) / 100,
    },
    result: {
      monthlyWFSFee: Math.round(monthlyWFSFee * 100) / 100,
      pepm: Math.round(pepm * 100) / 100,
    },
    calculatedAt: new Date().toISOString(),
  };
}
