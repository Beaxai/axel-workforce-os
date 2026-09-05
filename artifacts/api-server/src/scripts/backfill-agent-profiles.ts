import {
  agentProfilesTable,
  db,
  nameReviewTable,
  partnersTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  parseLegacyPartnerName,
  queueNameReview,
} from "../lib/agent-profiles";

async function backfillAgentProfiles() {
  const agents = await db
    .select()
    .from(partnersTable)
    .where(eq(partnersTable.partnerType, "Agent"));

  for (const partner of agents) {
    const parsedName = parseLegacyPartnerName(partner.name);
    const licenseNumbers = partner.licenseStates?.length
      ? { statesLicensed: partner.licenseStates }
      : null;

    await db.transaction(async (tx) => {
      await tx
        .insert(agentProfilesTable)
        .values({
          partnerId: partner.id,
          firstName: parsedName.firstName,
          lastName: parsedName.lastName,
          phoneDirect: partner.contactPhone,
          individualNpn: partner.npn,
          licenseNumbers,
        })
        .onConflictDoNothing();

      if (parsedName.needsReview) {
        await queueNameReview(tx, partner.id, partner.name);
      } else {
        await tx
          .delete(nameReviewTable)
          .where(eq(nameReviewTable.partnerId, partner.id));
      }
    });
  }
}

await backfillAgentProfiles();