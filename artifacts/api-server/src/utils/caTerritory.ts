import { db, caTerritorialRatesTable } from "@workspace/db";

/**
 * Raised when a California risk cannot be assigned a territorial rating factor.
 * California premium MUST reflect the correct territory multiplier, so a
 * missing/invalid/out-of-schedule ZIP is a hard error — never a silent 1.00.
 */
export class TerritoryRatingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TerritoryRatingError";
  }
}

export interface CATerritoryResult {
  multiplier: number;
  territory: number | null;
  zipPrefix: number | null;
}

/**
 * Resolve the CA territorial rating factor from the ca_territorial_rates table.
 *
 * - Non-CA states are neutral: multiplier 1.00, territory null (no ZIP needed).
 * - CA REQUIRES a valid 5-digit ZIP whose 3-digit prefix falls inside the
 *   territorial schedule. A missing, malformed, or out-of-range ZIP throws a
 *   TerritoryRatingError rather than silently defaulting to 1.00.
 */
export async function resolveTerritory(
  state: string,
  zip: string | null | undefined,
): Promise<CATerritoryResult> {
  if (String(state ?? "").toUpperCase() !== "CA") {
    return { multiplier: 1.0, territory: null, zipPrefix: null };
  }

  const digits = String(zip ?? "").replace(/\D/g, "");
  if (digits.length < 5) {
    throw new TerritoryRatingError(
      `California quotes require a valid 5-digit business ZIP code to determine the territorial rating factor (received: "${zip ?? ""}").`,
    );
  }

  const prefix = parseInt(digits.substring(0, 3), 10);
  const rows = await db.select().from(caTerritorialRatesTable);
  const entry = rows.find((t) => prefix >= t.zipPrefixMin && prefix <= t.zipPrefixMax);

  if (!entry) {
    throw new TerritoryRatingError(
      `Business ZIP "${zip}" (prefix ${prefix}) is outside the California territorial rating schedule and cannot be rated.`,
    );
  }

  return {
    multiplier: parseFloat(entry.multiplier),
    territory: entry.territory,
    zipPrefix: prefix,
  };
}
