/**
 * SEC-1 — multi-tenant data scoping (single source of truth).
 *
 * Role gating (`requireRoles`) says WHO may call an endpoint; this module says
 * WHICH ROWS come back. Both are required on every read path.
 *
 * The visibility matrix (SEC-1 plan, confirmed rules):
 *   ADMIN / CSA / UNDERWRITER  → all deals
 *   EMPLOYER                   → deals where deal.org_id ∈ actor's orgs
 *   AGENT (org_members AGENT)  → deals where producing_agent_id = actor
 *   AGENT (org_members BROKER) → deals produced by any agent in the broker's org(s)
 *   CARRIER / PEO / VENDOR / anything else → none (fail closed)
 *
 * Fail-closed invariant: any ambiguity (no org, unknown role, empty producer
 * set) yields a condition that matches NOTHING — a scoping bug must under-show,
 * never over-show. `null` is returned ONLY for internal see-all actors.
 */
import { accountsTable, db, contactsTable, dealsTable, orgMembersTable } from "@workspace/db";
import { and, eq, inArray, or, sql, type SQL } from "drizzle-orm";
import type { Request } from "express";

export type Actor = { id: string; role: string; orgIds: string[] };

/** db or a transaction handle — every helper accepts either so harnesses can run inside a rollback. */
export type Dbc = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

const INTERNAL = new Set(["ADMIN", "CSA", "UNDERWRITER"]);
export const isInternal = (a: Actor): boolean => INTERNAL.has(a.role);

/** Build the actor from the session user + ALL of their org memberships. */
export async function resolveActor(req: Request, dbc: Dbc = db): Promise<Actor> {
  const u = req.user!;
  const memberships = await dbc
    .select({ orgId: orgMembersTable.orgId })
    .from(orgMembersTable)
    .where(eq(orgMembersTable.userId, u.id));
  return {
    id: u.id,
    role: u.role,
    orgIds: memberships.map((m) => m.orgId).filter((x): x is string => !!x),
  };
}

/** True when the actor holds a BROKER org-membership (agency principal) in any org. */
async function isBroker(actor: Actor, dbc: Dbc): Promise<boolean> {
  if (actor.orgIds.length === 0) return false;
  const [row] = await dbc
    .select({ id: orgMembersTable.id })
    .from(orgMembersTable)
    .where(and(eq(orgMembersTable.userId, actor.id), eq(orgMembersTable.role, "BROKER")))
    .limit(1);
  return !!row;
}

/** Every AGENT/BROKER user id inside the actor's orgs — the broker's producer set. */
export async function agentIdsForBroker(actor: Actor, dbc: Dbc = db): Promise<string[]> {
  if (actor.orgIds.length === 0) return [];
  const rows = await dbc
    .select({ userId: orgMembersTable.userId })
    .from(orgMembersTable)
    .where(
      and(inArray(orgMembersTable.orgId, actor.orgIds), inArray(orgMembersTable.role, ["AGENT", "BROKER"])),
    );
  return rows.map((r) => r.userId).filter((x): x is string => !!x);
}

/**
 * The WHERE fragment restricting `deals` to what this actor may see.
 * `null` = unrestricted (internal actors ONLY). Everyone else gets a condition,
 * and the no-grounds case is `sql\`false\`` so the query returns zero rows.
 */
export async function visibleDealCondition(actor: Actor, dbc: Dbc = db): Promise<SQL | null> {
  if (isInternal(actor)) return null;

  const clauses: SQL[] = [];

  if (actor.role === "EMPLOYER" && actor.orgIds.length > 0) {
    clauses.push(inArray(dealsTable.orgId, actor.orgIds));
  }

  if (actor.role === "AGENT") {
    if (await isBroker(actor, dbc)) {
      const producerIds = await agentIdsForBroker(actor, dbc);
      if (producerIds.length > 0) clauses.push(inArray(dealsTable.producingAgentId, producerIds));
    } else {
      clauses.push(eq(dealsTable.producingAgentId, actor.id));
    }
  }

  // CARRIER / PEO / VENDOR / unknown roles, or no grounds above → fail closed.
  if (clauses.length === 0) return sql`false`;
  return clauses.length === 1 ? clauses[0]! : or(...clauses)!;
}

/**
 * The visible deal-id set (for scoping child tables: quotes, documents, …).
 * `null` = all (internal). Task 4 consumers filter `inArray(table.dealId, ids)`.
 */
export async function visibleDealIds(actor: Actor, dbc: Dbc = db): Promise<string[] | null> {
  const cond = await visibleDealCondition(actor, dbc);
  if (cond === null) return null;
  const rows = await dbc.select({ id: dealsTable.id }).from(dealsTable).where(cond);
  return rows.map((r) => r.id);
}

/**
 * The WHERE fragment restricting `accounts` (SEC-1 Task 5): an account is
 * visible iff the actor can see at least one of its deals. `null` = internal
 * see-all; no visible deals → `sql\`false\``.
 */
export async function visibleAccountCondition(actor: Actor, dbc: Dbc = db): Promise<SQL | null> {
  const dealCond = await visibleDealCondition(actor, dbc);
  if (dealCond === null) return null;
  const rows = await dbc
    .selectDistinct({ accountId: dealsTable.accountId })
    .from(dealsTable)
    .where(dealCond);
  const ids = rows.map((r) => r.accountId).filter((x): x is string => !!x);
  if (ids.length === 0) return sql`false`;
  return inArray(accountsTable.id, ids);
}

/** True when the actor may see this one account (≥1 visible deal on it). */
export async function canSeeAccount(actor: Actor, accountId: string, dbc: Dbc = db): Promise<boolean> {
  const cond = await visibleAccountCondition(actor, dbc);
  if (cond === null) return true;
  const [row] = await dbc
    .select({ id: accountsTable.id })
    .from(accountsTable)
    .where(and(eq(accountsTable.id, accountId), cond))
    .limit(1);
  return !!row;
}

/**
 * True when the actor may see this one deal (SEC-1 Task 4 parent-deal guard).
 * A null/undefined dealId is fail-closed for non-internal actors: a child row
 * not tied to any deal has no ownership grounds, so externals never see it.
 */
export async function canSeeDeal(
  actor: Actor,
  dealId: string | null | undefined,
  dbc: Dbc = db,
): Promise<boolean> {
  if (isInternal(actor)) return true;
  if (!dealId) return false;
  const cond = await visibleDealCondition(actor, dbc);
  if (cond === null) return true;
  const [row] = await dbc
    .select({ id: dealsTable.id })
    .from(dealsTable)
    .where(and(eq(dealsTable.id, dealId), cond))
    .limit(1);
  return !!row;
}

/**
 * The WHERE fragment restricting `contacts` (SEC-1 Task 3): a contact is
 * visible when its org is one of the actor's orgs, OR it hangs off a visible
 * deal. `null` = internal see-all; no grounds → `sql\`false\``.
 */
export async function visibleContactCondition(actor: Actor, dbc: Dbc = db): Promise<SQL | null> {
  if (isInternal(actor)) return null;

  const clauses: SQL[] = [];
  if (actor.orgIds.length > 0) {
    clauses.push(inArray(contactsTable.orgId, actor.orgIds));
  }
  const dealIds = await visibleDealIds(actor, dbc);
  if (dealIds && dealIds.length > 0) {
    clauses.push(inArray(contactsTable.dealId, dealIds));
  }

  if (clauses.length === 0) return sql`false`;
  return clauses.length === 1 ? clauses[0]! : or(...clauses)!;
}
