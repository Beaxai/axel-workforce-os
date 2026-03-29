import { Router, type IRouter } from "express";
import { db, quotesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  calculateWCPremium,
  calculateWFSPEPM,
  validateWCInput,
  validateWFSInput,
} from "../utils/ratingEngine";

const router: IRouter = Router();

router.post("/wc", async (req, res) => {
  const { state, classCode, annualPayroll, eMod = 1.0, scheduleRating = 1.0, isPEO = false, dealId } = req.body;

  const input = { state, classCode: String(classCode), annualPayroll, eMod, scheduleRating, isPEO };
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

    res.json({ success: true, data: breakdown });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
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

    res.json({ success: true, data: breakdown });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;
