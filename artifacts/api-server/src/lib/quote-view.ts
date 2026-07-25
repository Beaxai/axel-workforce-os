/**
 * §Indication client-visibility gate — read-time projection.
 *
 * While internal parties adjust indication parameters (`paramsPendingReview`),
 * external/client actors must keep seeing the last internally-agreed view
 * stored in `approvedSnapshot`. Apply this projection to EVERY quote read that
 * an external party can reach (current and future endpoints).
 */
import type { PartyRole } from "./auth";

const INTERNAL_ROLES = new Set<PartyRole>(["ADMIN", "CSA", "AGENT", "UNDERWRITER"]);

type QuoteLike = {
  paramsPendingReview?: boolean | null;
  approvedSnapshot?: unknown;
  workforceProfile?: unknown;
  eMod?: unknown;
  wcRatingBreakdown?: unknown;
  wcIndicationMin?: unknown;
  wcIndicationMax?: unknown;
  wcFinalPremium?: unknown;
  wcPremium?: unknown;
};

export function isInternalRole(role: string | undefined | null): boolean {
  return !!role && INTERNAL_ROLES.has(role as PartyRole);
}

/**
 * Project a quote row for the given actor role. Internal actors see live
 * values; external actors see the approved snapshot while a review is
 * pending. A legacy quote with no snapshot falls back to live values (nothing
 * was ever gated for it).
 */
export function projectQuoteForActor<T extends QuoteLike>(quote: T, role: string | undefined | null): T {
  if (isInternalRole(role)) return quote;
  if (!quote.paramsPendingReview) return quote;
  const snap = quote.approvedSnapshot as Partial<QuoteLike> | null | undefined;
  if (!snap || typeof snap !== "object") return quote;
  return {
    ...quote,
    workforceProfile: snap.workforceProfile ?? quote.workforceProfile,
    eMod: snap.eMod ?? quote.eMod,
    wcRatingBreakdown: snap.wcRatingBreakdown ?? quote.wcRatingBreakdown,
    wcIndicationMin: snap.wcIndicationMin ?? quote.wcIndicationMin,
    wcIndicationMax: snap.wcIndicationMax ?? quote.wcIndicationMax,
    wcFinalPremium: snap.wcFinalPremium ?? quote.wcFinalPremium,
    wcPremium: snap.wcPremium ?? quote.wcPremium,
    // Never leak the internal snapshot container itself to external parties.
    approvedSnapshot: null,
  };
}
