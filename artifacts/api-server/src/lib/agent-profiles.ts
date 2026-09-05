import {
  agentProfilesTable,
  db,
  nameReviewTable,
  type InsertAgentProfile,
} from "@workspace/db";

type AgentProfileWriter = {
  insert: typeof db.insert;
};

export function parseLegacyPartnerName(name: string): {
  firstName: string;
  lastName: string | null;
  needsReview: boolean;
} {
  const normalized = name.trim().replace(/\s+/g, " ");
  const parts = normalized ? normalized.split(" ") : [];
  if (parts.length === 2) {
    return { firstName: parts[0], lastName: parts[1], needsReview: false };
  }
  return { firstName: normalized, lastName: null, needsReview: true };
}

export async function upsertAgentProfile(
  writer: AgentProfileWriter,
  profile: InsertAgentProfile,
) {
  const [row] = await writer
    .insert(agentProfilesTable)
    .values(profile)
    .onConflictDoUpdate({
      target: agentProfilesTable.partnerId,
      set: {
        registrationId: profile.registrationId,
        userId: profile.userId,
        firstName: profile.firstName,
        lastName: profile.lastName,
        title: profile.title,
        phoneDirect: profile.phoneDirect,
        phoneMobile: profile.phoneMobile,
        individualNpn: profile.individualNpn,
        licenseNumbers: profile.licenseNumbers,
        updatedAt: new Date(),
      },
    })
    .returning();
  return row;
}

export async function queueNameReview(
  writer: AgentProfileWriter,
  partnerId: string,
  originalValue: string,
) {
  await writer
    .insert(nameReviewTable)
    .values({ partnerId, originalValue })
    .onConflictDoUpdate({
      target: nameReviewTable.partnerId,
      set: { originalValue },
    });
}