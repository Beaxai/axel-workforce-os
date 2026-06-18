import { db, accountsTable, type Account } from "@workspace/db";
import { and, eq, isNull, sql } from "drizzle-orm";

export interface AccountUpsertInput {
  businessName?: string | null;
  fein?: string | null;
  state?: string | null;
  vertical?: string | null;
  entityType?: string | null;
  legalName?: string | null;
  dba?: string | null;
  naics?: string | null;
  productType?: string | null;
  annualPayroll?: string | number | null;
  headcount?: number | null;
  emod?: string | number | null;
  classCodes?: unknown;
  locations?: unknown;
  primaryContact?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
}

function clean(value?: string | null): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toNumericString(value?: string | number | null): string | null {
  if (value == null) return null;
  const str = String(value).trim();
  return str.length > 0 ? str : null;
}

/**
 * Find an existing account or create a new one.
 *
 * Dedupe precedence: a non-empty FEIN is the strong key; otherwise we fall back
 * to a case-insensitive business-name + state match. When an existing account is
 * found we enrich any currently-null columns with newly supplied values (we never
 * overwrite data a human may have curated). client_stage is left untouched on
 * existing accounts and defaults to "Prospect" on new ones.
 */
export async function findOrCreateAccount(
  input: AccountUpsertInput,
): Promise<{ account: Account; created: boolean }> {
  const businessName = clean(input.businessName) ?? "Unnamed Business";
  const fein = clean(input.fein);
  const state = clean(input.state);

  let existing: Account | undefined;
  if (fein) {
    [existing] = await db.select().from(accountsTable).where(eq(accountsTable.fein, fein)).limit(1);
  } else {
    [existing] = await db
      .select()
      .from(accountsTable)
      .where(
        and(
          sql`lower(${accountsTable.businessName}) = lower(${businessName})`,
          state ? eq(accountsTable.state, state) : isNull(accountsTable.state),
        ),
      )
      .limit(1);
  }

  const candidate = {
    businessName,
    fein,
    state,
    vertical: clean(input.vertical),
    entityType: clean(input.entityType),
    legalName: clean(input.legalName),
    dba: clean(input.dba),
    naics: clean(input.naics),
    productType: clean(input.productType),
    annualPayroll: toNumericString(input.annualPayroll),
    headcount: input.headcount ?? null,
    emod: toNumericString(input.emod),
    classCodes: input.classCodes ?? null,
    locations: input.locations ?? null,
    primaryContact: clean(input.primaryContact),
    contactEmail: clean(input.contactEmail),
    contactPhone: clean(input.contactPhone),
  };

  if (existing) {
    // Enrich only columns that are currently empty on the existing account.
    const patch: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(candidate)) {
      if (value == null) continue;
      if (key === "businessName") continue; // never rename an existing account
      if ((existing as Record<string, unknown>)[key] == null) patch[key] = value;
    }
    if (Object.keys(patch).length > 0) {
      patch.updatedAt = new Date();
      const [updated] = await db
        .update(accountsTable)
        .set(patch)
        .where(eq(accountsTable.id, existing.id))
        .returning();
      return { account: updated, created: false };
    }
    return { account: existing, created: false };
  }

  const [created] = await db
    .insert(accountsTable)
    .values({ ...candidate, clientStage: "Prospect" })
    .returning();
  return { account: created, created: true };
}
