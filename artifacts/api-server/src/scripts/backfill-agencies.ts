import {
  agentRegistrationsTable,
  db,
  partnersTable,
} from "@workspace/db";
import { and, eq, isNotNull, ne } from "drizzle-orm";
import { createOrMatchAgency } from "../lib/agencies";

async function backfillAgencies() {
  const registrations = await db.select().from(agentRegistrationsTable);
  for (const registration of registrations) {
    await db.transaction(async (tx) => {
      const registrationStatus = registration.status?.trim().toLowerCase();
      const agency = await createOrMatchAgency(tx, {
        legalName: registration.agencyName,
        dba: registration.agencyDba,
        status:
          registrationStatus === "approved" || registrationStatus === "active"
            ? "active"
            : "pending",
        mainPhone: registration.agencyPhone,
        website: registration.agencyWebsite,
        address: registration.agencyAddress,
        agencyNpn: registration.agencyNpn,
        statesLicensed: registration.statesLicensed,
        linesOfAuthority: registration.linesOfAuthority,
      });
      await tx
        .update(agentRegistrationsTable)
        .set({ agencyId: agency.id })
        .where(eq(agentRegistrationsTable.id, registration.id));
    });
  }

  const agentPartners = await db
    .select()
    .from(partnersTable)
    .where(
      and(
        eq(partnersTable.partnerType, "Agent"),
        isNotNull(partnersTable.agencyName),
        ne(partnersTable.agencyName, ""),
      ),
    );
  for (const partner of agentPartners) {
    if (!partner.agencyName?.trim()) continue;
    await db.transaction(async (tx) => {
      const agency = await createOrMatchAgency(tx, {
        legalName: partner.agencyName!,
        status: "active",
        mainPhone: partner.contactPhone,
      });
      await tx
        .update(partnersTable)
        .set({ agencyId: agency.id, updatedAt: new Date() })
        .where(eq(partnersTable.id, partner.id));
    });
  }
}

await backfillAgencies();