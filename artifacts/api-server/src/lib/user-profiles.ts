import { and, eq, ne, or, sql } from "drizzle-orm";
import {
  db,
  usersTable,
  userProfilesTable,
  orgMembersTable,
  organizationsTable,
  dealsTable,
  tasksTable,
  agentRegistrationsTable,
} from "@workspace/db";
import { getAuthUserById, type AuthUser, type PartyRole } from "./auth";

/** Roles considered Axel internal staff for record-level visibility. */
export const INTERNAL_ROLES: PartyRole[] = ["ADMIN", "UNDERWRITER", "CSA"];

export function isInternalRole(role: PartyRole | null | undefined): boolean {
  return !!role && INTERNAL_ROLES.includes(role);
}

/** Resolve the primary party role for any user id (mirrors auth.resolveRole). */
export async function getTargetRole(userId: string): Promise<PartyRole | null> {
  const rows = await db
    .select({ role: orgMembersTable.role, isPrimaryOrg: orgMembersTable.isPrimaryOrg })
    .from(orgMembersTable)
    .where(eq(orgMembersTable.userId, userId));
  if (rows.length === 0) return null;
  const primary = rows.find((r) => r.isPrimaryOrg) ?? rows[0];
  const role = (primary.role || "").toUpperCase() as PartyRole;
  return INTERNAL_ROLES.includes(role) || ["AGENT", "EMPLOYER", "CARRIER", "PEO", "VENDOR"].includes(role)
    ? role
    : null;
}

/** True when viewer and target both appear on the same deal as one of
 * owner / producing agent / referral partner. */
export async function sharesDeal(viewerId: string, targetId: string): Promise<boolean> {
  const viewerOnAny = or(
    eq(dealsTable.ownerId, viewerId),
    eq(dealsTable.producingAgentId, viewerId),
    eq(dealsTable.referralPartnerId, viewerId),
  );
  const targetOnAny = or(
    eq(dealsTable.ownerId, targetId),
    eq(dealsTable.producingAgentId, targetId),
    eq(dealsTable.referralPartnerId, targetId),
  );
  const [row] = await db
    .select({ id: dealsTable.id })
    .from(dealsTable)
    .where(and(viewerOnAny, targetOnAny))
    .limit(1);
  return !!row;
}

/** True when `staffId` is owner/agent/referral on any deal belonging to `orgId`
 * (the employer's org) — i.e. internal staff assigned to that employer. */
export async function staffAssignedToOrg(staffId: string, orgId: string | null): Promise<boolean> {
  if (!orgId) return false;
  const [row] = await db
    .select({ id: dealsTable.id })
    .from(dealsTable)
    .where(
      and(
        eq(dealsTable.orgId, orgId),
        or(
          eq(dealsTable.ownerId, staffId),
          eq(dealsTable.producingAgentId, staffId),
          eq(dealsTable.referralPartnerId, staffId),
        ),
      ),
    )
    .limit(1);
  return !!row;
}

/**
 * Record-level profile visibility. Layered on top of route role gates.
 * - Self: always.
 * - Internal staff (ADMIN/UNDERWRITER/CSA): all profiles.
 * - AGENT: internal staff + users sharing a deal.
 * - EMPLOYER: only internal staff assigned to the employer's deals.
 * - CARRIER/PEO/VENDOR: internal staff + users sharing a deal.
 */
export async function canViewProfile(viewer: AuthUser, targetId: string): Promise<boolean> {
  if (viewer.id === targetId) return true;
  if (isInternalRole(viewer.role)) return true;
  const targetRole = await getTargetRole(targetId);
  const targetIsInternal = isInternalRole(targetRole);

  if (viewer.role === "EMPLOYER") {
    if (!targetIsInternal) return false;
    return staffAssignedToOrg(targetId, viewer.orgId);
  }
  // AGENT, CARRIER, PEO, VENDOR
  if (targetIsInternal) return true;
  return sharesDeal(viewer.id, targetId);
}

export interface BookSummary {
  dealCount: number;
  totalPremium: number;
  boundCount: number;
  boundPremium: number;
}

/**
 * AGENT book of business — computed live (no caching).
 * Link path: deals.producing_agent_id = userId (the producing agent owns the book).
 * Premium summed: deals.estimated_premium. "Bound" subset uses bind_status = 'bound'.
 */
export async function computeBookSummary(userId: string): Promise<BookSummary> {
  const [row] = await db
    .select({
      dealCount: sql<number>`count(*)::int`,
      totalPremium: sql<number>`coalesce(sum(${dealsTable.estimatedPremium}), 0)::float`,
      boundCount: sql<number>`count(*) filter (where ${dealsTable.bindStatus} = 'bound')::int`,
      boundPremium: sql<number>`coalesce(sum(${dealsTable.estimatedPremium}) filter (where ${dealsTable.bindStatus} = 'bound'), 0)::float`,
    })
    .from(dealsTable)
    .where(eq(dealsTable.producingAgentId, userId));
  return {
    dealCount: row?.dealCount ?? 0,
    totalPremium: row?.totalPremium ?? 0,
    boundCount: row?.boundCount ?? 0,
    boundPremium: row?.boundPremium ?? 0,
  };
}

type RoleMeta = Record<string, unknown>;

function asMeta(v: unknown): RoleMeta {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as RoleMeta) : {};
}

/** Build the role-specific section of a profile payload. */
async function buildRoleSection(
  userId: string,
  role: PartyRole | null,
  meta: RoleMeta,
  orgName: string | null,
): Promise<{ kind: string; data: RoleMeta }> {
  switch (role) {
    case "AGENT": {
      // Prefer a linked agent_registration; fall back to role_metadata.
      const [reg] = await db
        .select()
        .from(agentRegistrationsTable)
        .where(eq(agentRegistrationsTable.userId, userId))
        .limit(1);
      const data: RoleMeta = reg
        ? {
            agencyName: reg.agencyName,
            licenseNumbers: reg.licenseNumbers,
            statesLicensed: reg.statesLicensed,
            linesOfAuthority: reg.linesOfAuthority,
            eoCarrier: reg.eoCarrier,
            eoExpiration: reg.eoExpirationDate,
          }
        : {
            agencyName: meta.agencyName ?? null,
            licenseNumbers: meta.licenseNumbers ?? [],
            statesLicensed: meta.statesLicensed ?? [],
            linesOfAuthority: meta.linesOfAuthority ?? [],
            eoCarrier: meta.eoCarrier ?? null,
            eoExpiration: meta.eoExpiration ?? null,
          };
      data.bookSummary = await computeBookSummary(userId);
      return { kind: "AGENT", data };
    }
    case "UNDERWRITER":
      return {
        kind: "UNDERWRITER",
        data: {
          carrier: meta.carrier ?? null,
          lines: meta.lines ?? [],
          states: meta.states ?? [],
          verticals: meta.verticals ?? [],
        },
      };
    case "CSA":
    case "ADMIN":
      return {
        kind: role,
        data: { department: meta.department ?? null, territory: meta.territory ?? null },
      };
    case "CARRIER":
    case "PEO":
    case "VENDOR":
      return {
        kind: role,
        data: { company: meta.company ?? orgName ?? null, programs: meta.programs ?? [] },
      };
    case "EMPLOYER":
      return { kind: "EMPLOYER", data: { linkedAccount: orgName ?? null } };
    default:
      return { kind: "UNKNOWN", data: {} };
  }
}

export interface ProfilePayload {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  phone: string | null;
  mobile: string | null;
  status: string | null;
  role: PartyRole | null;
  orgId: string | null;
  orgName: string | null;
  title: string | null;
  timezone: string | null;
  dateJoined: string | null;
  lastLoginAt: string | null;
  roleSection: { kind: string; data: RoleMeta };
  // Internal-only fields (omitted for non-internal viewers).
  bio?: string | null;
  internalNotes?: string | null;
  openTasks?: { id: string; taskName: string; dueDate: string | null; priority: string | null }[];
  activeDeals?: { id: string; referenceCode: string; businessName: string | null; stage: string | null }[];
}

/**
 * Compose a full profile payload. `includeInternal` controls whether
 * internal-only fields (bio, internal notes, open tasks, active deals) are
 * attached — callers pass the viewer's internal status so stripping happens
 * server-side, not in the client.
 */
export async function assembleProfile(
  targetId: string,
  includeInternal: boolean,
): Promise<ProfilePayload | null> {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, targetId));
  if (!user) return null;
  const authUser = await getAuthUserById(targetId);
  const role = (authUser?.role ?? (await getTargetRole(targetId))) as PartyRole | null;
  const orgId = authUser?.orgId ?? null;
  let orgName = authUser?.orgName ?? null;
  if (!orgName && orgId) {
    const [org] = await db
      .select({ name: organizationsTable.name })
      .from(organizationsTable)
      .where(eq(organizationsTable.id, orgId));
    orgName = org?.name ?? null;
  }
  const [profile] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.userId, targetId));
  const meta = asMeta(profile?.roleMetadata);
  const roleSection = await buildRoleSection(targetId, role, meta, orgName);

  const payload: ProfilePayload = {
    id: user.id,
    email: user.email,
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
    avatarUrl: user.avatarUrl ?? null,
    phone: user.phone ?? null,
    mobile: user.mobile ?? null,
    status: user.status ?? null,
    role,
    orgId,
    orgName,
    title: profile?.title ?? null,
    timezone: profile?.timezone ?? null,
    dateJoined: profile?.dateJoined ? new Date(profile.dateJoined).toISOString() : null,
    lastLoginAt: profile?.lastLoginAt ? new Date(profile.lastLoginAt).toISOString() : null,
    roleSection,
  };

  if (includeInternal) {
    payload.bio = profile?.bio ?? null;
    payload.internalNotes = profile?.internalNotes ?? null;
    const openTasks = await db
      .select({
        id: tasksTable.id,
        taskName: tasksTable.taskName,
        dueDate: tasksTable.dueDate,
        priority: tasksTable.priority,
      })
      .from(tasksTable)
      .where(and(eq(tasksTable.assignedTo, targetId), eq(tasksTable.status, "OPEN")))
      .limit(50);
    payload.openTasks = openTasks;
    const activeDeals = await db
      .select({
        id: dealsTable.id,
        referenceCode: dealsTable.referenceCode,
        businessName: dealsTable.businessName,
        stage: dealsTable.stage,
      })
      .from(dealsTable)
      .where(
        and(
          or(eq(dealsTable.ownerId, targetId), eq(dealsTable.producingAgentId, targetId)),
          ne(dealsTable.outcome, "lost"),
        ),
      )
      .limit(50);
    payload.activeDeals = activeDeals;
  }

  return payload;
}
