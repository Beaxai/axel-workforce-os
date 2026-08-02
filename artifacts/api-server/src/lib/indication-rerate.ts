/**
 * Indication re-rate seam.
 *
 * OWNER REVIEW FLAG: parameter edits currently trigger an automatic re-rate
 * ("auto"). The owner may later prefer "manual" (save only) or "flag" (mark the
 * quote outdated until someone re-rates). All call sites go through
 * `reRateQuoteAfterParamsUpdate`, so changing INDICATION_RERATE_MODE is the
 * only switch needed.
 */
import { db, quotesTable, dealDocumentsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { calculateMultiLocationWC, type MultiLocationInput } from "../utils/ratingEngine";

export type IndicationRerateMode = "auto" | "manual" | "flag";
export const INDICATION_RERATE_MODE: IndicationRerateMode = "auto";

export type WorkforceProfile = {
  locations: Array<{
    state: string;
    zip?: string;
    classCodes: Array<{
      classCode: string;
      description?: string;
      annualPayroll: number;
      fullTimeEmployees?: number;
      partTimeEmployees?: number;
    }>;
  }>;
  eMod?: number;
  scheduleRating?: number;
  isPEO?: boolean;
};

export type RerateOutcome =
  | { mode: "manual" | "flag" }
  | { mode: "auto"; ok: true }
  | { mode: "auto"; ok: false; error: string };

/**
 * Re-rate a quote from its (just-updated) workforce profile and persist the
 * refreshed breakdown + indication range. Rating failures (e.g. CA location
 * missing a 5-digit ZIP) are returned — not thrown — so the parameter save
 * itself still succeeds and the UI can surface the rating problem.
 */
export async function reRateQuoteAfterParamsUpdate(
  quoteId: string,
  profile: WorkforceProfile,
): Promise<RerateOutcome> {
  if (INDICATION_RERATE_MODE !== "auto") return { mode: INDICATION_RERATE_MODE };

  const input: MultiLocationInput = {
    locations: profile.locations.map((l) => ({
      state: l.state,
      zip: l.zip || "",
      classCodes: l.classCodes.map((cc) => ({
        classCode: cc.classCode,
        description: cc.description || "",
        annualPayroll: Number(cc.annualPayroll) || 0,
        fullTimeEmployees: Number(cc.fullTimeEmployees) || 0,
        partTimeEmployees: Number(cc.partTimeEmployees) || 0,
      })),
    })),
    eMod: profile.eMod ?? 1.0,
    scheduleRating: profile.scheduleRating ?? 1.0,
    isPEO: profile.isPEO ?? false,
  };

  try {
    const breakdown = await calculateMultiLocationWC(input);
    const finalPremium = Number(breakdown.finalPremium) || 0;
    const low = Math.max(500, Math.round(finalPremium * 0.9));
    const high = Math.max(low, Math.round(finalPremium * 1.1));
    await db
      .update(quotesTable)
      .set({
        wcRatingBreakdown: breakdown,
        wcPremium: String(finalPremium),
        wcFinalPremium: String(finalPremium),
        wcIndicationMin: String(low),
        wcIndicationMax: String(high),
        ratedAt: new Date(),
      })
      .where(eq(quotesTable.id, quoteId));

    // Keep the Documents tab in sync: every deal with an indication must have
    // a rate_indication document row (name + metadata reflect the new range).
    const [quote] = await db.select().from(quotesTable).where(eq(quotesTable.id, quoteId));
    if (quote?.dealId) {
      const name = `Rate Indication — $${low.toLocaleString("en-US")} to $${high.toLocaleString("en-US")}`;
      const metadata = {
        premiumLow: low,
        premiumHigh: high,
        generatedBy: "system",
        downloadPath: `/api/submission/applications/${quote.dealId}/indication-summary.pdf`,
      };
      const [existing] = await db
        .select({ id: dealDocumentsTable.id })
        .from(dealDocumentsTable)
        .where(and(eq(dealDocumentsTable.dealId, quote.dealId), eq(dealDocumentsTable.documentType, "rate_indication")))
        .limit(1);
      if (existing) {
        await db.update(dealDocumentsTable).set({ name, metadata }).where(eq(dealDocumentsTable.id, existing.id));
      } else {
        await db.insert(dealDocumentsTable).values({
          dealId: quote.dealId,
          name,
          documentType: "rate_indication",
          metadata,
        });
      }
    }
    return { mode: "auto", ok: true };
  } catch (err) {
    return { mode: "auto", ok: false, error: err instanceof Error ? err.message : "Rating failed" };
  }
}
