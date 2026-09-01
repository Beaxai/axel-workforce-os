import { agenciesTable, db, type InsertAgency } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

type AgencyWriter = Pick<typeof db, "insert" | "select" | "update">;

export type AgencyMatchInput = Pick<
  InsertAgency,
  | "legalName"
  | "dba"
  | "status"
  | "mainPhone"
  | "website"
  | "address"
  | "agencyNpn"
> & {
  statesLicensed?: unknown;
  linesOfAuthority?: unknown;
};

function asDatabaseJson(value: unknown): InsertAgency["statesLicensed"] {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value)) as InsertAgency["statesLicensed"];
}

export function normalizeAgencyName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export async function createOrMatchAgency(
  writer: AgencyWriter,
  input: AgencyMatchInput,
) {
  const legalName = input.legalName.trim();
  const normalizedName = normalizeAgencyName(legalName);
  const statesLicensed = asDatabaseJson(input.statesLicensed);
  const linesOfAuthority = asDatabaseJson(input.linesOfAuthority);
  if (!normalizedName) {
    throw new Error("Agency legal name must contain at least one letter or number");
  }

  const normalizedLegalName = sql<string>`lower(regexp_replace(trim(${agenciesTable.legalName}), '[^a-zA-Z0-9]+', '', 'g'))`;
  const findMatch = async () => {
    const [match] = await writer
      .select()
      .from(agenciesTable)
      .where(eq(normalizedLegalName, normalizedName))
      .limit(1);
    return match;
  };

  let agency = await findMatch();
  if (!agency) {
    const [created] = await writer
      .insert(agenciesTable)
      .values({
        ...input,
        legalName,
        statesLicensed,
        linesOfAuthority,
      })
      .onConflictDoNothing()
      .returning();
    agency = created ?? (await findMatch());
  }
  if (!agency) {
    throw new Error(`Unable to create or match agency "${legalName}"`);
  }

  const status =
    agency.status === "pending" && input.status === "active"
      ? "active"
      : agency.status;
  const [updated] = await writer
    .update(agenciesTable)
    .set({
      dba: agency.dba ?? input.dba,
      status,
      mainPhone: agency.mainPhone ?? input.mainPhone,
      website: agency.website ?? input.website,
      address: agency.address ?? input.address,
      agencyNpn: agency.agencyNpn ?? input.agencyNpn,
      statesLicensed: agency.statesLicensed ?? statesLicensed,
      linesOfAuthority: agency.linesOfAuthority ?? linesOfAuthority,
      updatedAt: new Date(),
    })
    .where(eq(agenciesTable.id, agency.id))
    .returning();

  return updated ?? agency;
}