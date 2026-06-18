import { Router, type IRouter } from "express";
import { db, quotesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  calculateWCPremium,
  calculateWFSPEPM,
  calculateMultiLocationWC,
  calculateASOPEPM,
  validateWCInput,
  validateWFSInput,
  validateASOInput,
  ASO_BASE_PEPM_RATE,
} from "../utils/ratingEngine";

const router: IRouter = Router();

router.post("/wc", async (req, res) => {
  const { state, classCode, annualPayroll, eMod = 1.0, scheduleRating = 1.0, isPEO = false, zip, dealId } = req.body;

  const input = { state, classCode: String(classCode), annualPayroll, eMod, scheduleRating, isPEO, zip };
  const errors = validateWCInput(input);
  if (errors.length > 0) return res.status(400).json({ success: false, error: errors.join("; ") });

  try {
    const breakdown = await calculateWCPremium(input);

    if (dealId) {
      const existing = await db.select().from(quotesTable).where(eq(quotesTable.dealId, dealId)).limit(1);
      if (existing.length > 0) {
        await db.update(quotesTable).set({
          state,
          classCode: String(classCode),
          annualPayroll: String(annualPayroll),
          eMod: String(eMod),
          scheduleRating: String(scheduleRating),
          isPeo: isPEO,
          wcPremium: String(breakdown.result.wcPremium),
          wcRatingBreakdown: breakdown,
          ratedAt: new Date(),
        }).where(eq(quotesTable.dealId, dealId));
      } else {
        await db.insert(quotesTable).values({
          dealId,
          state,
          classCode: String(classCode),
          annualPayroll: String(annualPayroll),
          eMod: String(eMod),
          scheduleRating: String(scheduleRating),
          isPeo: isPEO,
          wcPremium: String(breakdown.result.wcPremium),
          wcRatingBreakdown: breakdown,
          ratedAt: new Date(),
        });
      }
    }

    return res.json({ success: true, data: breakdown });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

router.post("/wc/multi", async (req, res) => {
  const { locations, eMod = 1.0, scheduleRating = 1.0, isPEO = false, dealId } = req.body;

  if (!locations || !Array.isArray(locations) || locations.length === 0) {
    return res.status(400).json({ success: false, error: "locations array is required" });
  }

  const errors: string[] = [];
  if (eMod < 0.5 || eMod > 2.0) errors.push("eMod must be between 0.5 and 2.0");
  if (scheduleRating < 0.5 || scheduleRating > 2.0) errors.push("scheduleRating must be between 0.5 and 2.0");
  for (let i = 0; i < locations.length; i++) {
    const loc = locations[i];
    if (!loc.state || typeof loc.state !== "string") errors.push(`locations[${i}].state is required`);
    if (!Array.isArray(loc.classCodes) || loc.classCodes.length === 0) errors.push(`locations[${i}].classCodes must be a non-empty array`);
    else {
      for (let j = 0; j < loc.classCodes.length; j++) {
        const cc = loc.classCodes[j];
        if (!cc.classCode) errors.push(`locations[${i}].classCodes[${j}].classCode is required`);
        if (!cc.annualPayroll || cc.annualPayroll <= 0) errors.push(`locations[${i}].classCodes[${j}].annualPayroll must be positive`);
      }
    }
  }
  if (errors.length > 0) return res.status(400).json({ success: false, error: errors.join("; ") });

  try {
    const breakdown = await calculateMultiLocationWC({ locations, eMod, scheduleRating, isPEO });

    if (dealId) {
      const existing = await db.select().from(quotesTable).where(eq(quotesTable.dealId, dealId)).limit(1);
      const payload = {
        wcPremium: String(breakdown.finalPremium),
        wcRatingBreakdown: breakdown,
        workforceProfile: { locations, eMod, scheduleRating, isPEO },
        ratedAt: new Date(),
      };
      if (existing.length > 0) {
        await db.update(quotesTable).set(payload).where(eq(quotesTable.dealId, dealId));
      } else {
        await db.insert(quotesTable).values({ dealId, ...payload });
      }
    }

    return res.json({ success: true, data: breakdown });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

router.post("/wfs", async (req, res) => {
  const { annualPayroll, headcount, dealId } = req.body;

  const input = { annualPayroll, headcount };
  const errors = validateWFSInput(input);
  if (errors.length > 0) return res.status(400).json({ success: false, error: errors.join("; ") });

  try {
    const breakdown = calculateWFSPEPM(input);

    if (dealId) {
      const existing = await db.select().from(quotesTable).where(eq(quotesTable.dealId, dealId)).limit(1);
      if (existing.length > 0) {
        await db.update(quotesTable).set({
          annualPayroll: String(annualPayroll),
          headcount,
          monthlyWfsFee: String(breakdown.result.monthlyWFSFee),
          pepm: String(breakdown.result.pepm),
          wfsRatingBreakdown: breakdown,
          ratedAt: new Date(),
        }).where(eq(quotesTable.dealId, dealId));
      } else {
        await db.insert(quotesTable).values({
          dealId,
          annualPayroll: String(annualPayroll),
          headcount,
          monthlyWfsFee: String(breakdown.result.monthlyWFSFee),
          pepm: String(breakdown.result.pepm),
          wfsRatingBreakdown: breakdown,
          ratedAt: new Date(),
        });
      }
    }

    return res.json({ success: true, data: breakdown });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

router.post("/aso", async (req, res) => {
  const {
    headcount,
    state,
    effectiveDate,
    totalPayroll,
    workforceProfile,
    wcReference,
    dealId,
  } = req.body as {
    headcount: number;
    state?: string;
    effectiveDate?: string;
    totalPayroll?: number;
    workforceProfile?: unknown;
    wcReference?: {
      classCodes?: unknown;
      currentCarrier?: string;
      policyExpiration?: string;
      emod?: number;
      currentAnnualPremium?: string;
    };
    dealId?: string;
  };

  const errors = validateASOInput({ headcount });
  if (errors.length > 0) return res.status(400).json({ success: false, error: errors.join("; ") });

  try {
    const breakdown = calculateASOPEPM({ headcount });

    const ratingBreakdown = {
      product_type: "ASO",
      aso_base_pepm_rate: ASO_BASE_PEPM_RATE,
      headcount,
      pepm: breakdown.result.pepm,
      monthly_aso_fee: breakdown.result.monthlyAsoFee,
      annual_aso_fee: breakdown.result.annualAsoFee,
      total_payroll: totalPayroll ?? null,
      effective_date: effectiveDate ?? null,
      state: state ?? null,
      wc_reference: {
        class_codes: wcReference?.classCodes ?? [],
        current_carrier: wcReference?.currentCarrier ?? null,
        policy_expiration: wcReference?.policyExpiration ?? null,
        emod: wcReference?.emod ?? null,
        current_annual_premium: wcReference?.currentAnnualPremium ?? null,
      },
    };

    if (dealId) {
      const existing = await db.select().from(quotesTable).where(eq(quotesTable.dealId, dealId)).limit(1);
      const payload = {
        state: state ?? null,
        headcount,
        annualPayroll: totalPayroll != null ? String(totalPayroll) : null,
        wcPremium: null,
        monthlyWfsFee: String(breakdown.result.monthlyAsoFee),
        pepm: String(breakdown.result.pepm),
        isPeo: false,
        ratingBreakdown,
        workforceProfile: workforceProfile ?? null,
        ratedAt: new Date(),
      };
      if (existing.length > 0) {
        await db.update(quotesTable).set(payload).where(eq(quotesTable.dealId, dealId));
      } else {
        await db.insert(quotesTable).values({ dealId, ...payload });
      }
    }

    return res.json({ success: true, data: { ...breakdown, ratingBreakdown } });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

export default router;
