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
