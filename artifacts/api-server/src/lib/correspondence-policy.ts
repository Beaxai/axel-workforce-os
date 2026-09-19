import {
  db,
  dealsTable,
  orgMembersTable,
  organizationsTable,
  trustedAxelOrganizationsTable,
  usersTable,
} from "@workspace/db";
import { and, eq } from "drizzle-orm";
import type { AuthUser } from "./auth";

const STAFF_ROLES = new Set(["ADMIN", "CSA"]);

export type TrustedCorrespondenceActor = AuthUser & { orgId: string };
type CorrespondencePolicyQuery = Pick<typeof db, "select">;

/**
 * A market-correspondence actor is deliberately stricter than ordinary
 * application authorization.  In particular, an external organization can
 * have a user whose membership says ADMIN/CSA and still never pass this check.
 * Ambiguous or inactive current memberships fail closed.
 */
export async function getTrustedCorrespondenceActor(
  user: AuthUser | undefined,
  query: CorrespondencePolicyQuery = db,
): Promise<TrustedCorrespondenceActor | null> {
  if (!user || !user.orgId || !STAFF_ROLES.has(user.role)) return null;

  const memberships = await query
    .select({
      role: orgMembersTable.role,
      orgId: orgMembersTable.orgId,
      userStatus: usersTable.status,
      orgStatus: organizationsTable.status,
      trustedOrgId: trustedAxelOrganizationsTable.orgId,
    })
    .from(orgMembersTable)
    .innerJoin(usersTable, eq(usersTable.id, orgMembersTable.userId))
    .innerJoin(organizationsTable, eq(organizationsTable.id, orgMembersTable.orgId))
    .leftJoin(
      trustedAxelOrganizationsTable,
      eq(trustedAxelOrganizationsTable.orgId, orgMembersTable.orgId),
    )
    .where(
      and(
        eq(orgMembersTable.userId, user.id),
        eq(orgMembersTable.isPrimaryOrg, true),
      ),
    );

  // A current organization must be explicit and unambiguous. We intentionally
  // do not choose a "first" membership as the legacy resolver does.
  if (memberships.length !== 1) return null;
  const membership = memberships[0];
  if (
    membership.trustedOrgId !== user.orgId ||
    membership.orgId !== user.orgId ||
    membership.role.toUpperCase() !== user.role ||
    membership.userStatus?.toLowerCase() !== "active" ||
    membership.orgStatus?.toUpperCase() !== "ACTIVE"
  ) {
    return null;
  }
  return user as TrustedCorrespondenceActor;
}

/** The deal itself must be in the trusted actor's current organization. */
export async function trustedActorMayAccessDeal(
  user: AuthUser | undefined,
  dealId: string,
  query: CorrespondencePolicyQuery = db,
): Promise<{ actor: TrustedCorrespondenceActor; deal: typeof dealsTable.$inferSelect } | null> {
  const actor = await getTrustedCorrespondenceActor(user, query);
  if (!actor) return null;
  const [deal] = await query.select().from(dealsTable).where(eq(dealsTable.id, dealId)).limit(1);
  if (!deal || !deal.orgId || deal.orgId !== actor.orgId) return null;
  return { actor, deal };
}

export async function isTrustedCorrespondenceStaff(user: AuthUser | undefined): Promise<boolean> {
  return Boolean(await getTrustedCorrespondenceActor(user));
}