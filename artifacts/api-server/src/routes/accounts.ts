import { Router, type IRouter, type RequestHandler, type Request, type Response } from "express";
import { db, accountsTable, insertAccountSchema, dealsTable, policiesTable, activityLogTable, insertActivityLogSchema, PROSPECT_STAGES, CLIENT_TAB_STAGES } from "@workspace/db";
import { eq, desc, ilike, and, inArray, isNull } from "drizzle-orm";
import { canSeeAccount, resolveActor, visibleAccountCondition, visibleDealCondition } from "../lib/scope";

const router: IRouter = Router();

/** UNDERWRITER has read-only access to accounts; block all mutations. */
const blockReadOnly: RequestHandler = (req, res, next) => {
  if (req.user?.role === "UNDERWRITER") {
    return res.status(403).json({ error: "Read-only role" });
  }
  return next();
};

/** Account create/delete is reserved for ADMIN and CSA. AGENTs get accounts via lead conversion. */
const ACCOUNT_MANAGER_ROLES = ["ADMIN", "CSA"];
const requireAccountManager: RequestHandler = (req, res, next) => {
  if (!req.user || !ACCOUNT_MANAGER_ROLES.includes(req.user.role)) {
    return res.status(403).json({ error: "Insufficient permissions" });
  }
  return next();
};

/** Restrict a deal query on an account to the actor's visible deals (SEC-1). */
async function dealScopeForAccount(req: Request, accountId: string) {
  const base = and(eq(dealsTable.accountId, accountId), isNull(dealsTable.archivedAt));
  const actor = await resolveActor(req);
  const scope = await visibleDealCondition(actor);
  return scope ? and(base, scope) : base;
}

router.get("/", async (req, res) => {
  const search = req.query.search as string | undefined;
  const stage = req.query.stage as string | undefined; // single client_stage
  const tab = req.query.tab as string | undefined; // "prospects" | "clients"

  const conditions = [];
  if (search) conditions.push(ilike(accountsTable.businessName, `%${search}%`));
  if (stage && stage !== "All") {
    conditions.push(eq(accountsTable.clientStage, stage));
  } else if (tab === "prospects") {
    conditions.push(inArray(accountsTable.clientStage, [...PROSPECT_STAGES]));
  } else if (tab === "clients") {
    conditions.push(inArray(accountsTable.clientStage, [...CLIENT_TAB_STAGES]));
  }

  // SEC-1: an account is visible iff the actor can see ≥1 of its deals.
  const actor = await resolveActor(req);
  const scope = await visibleAccountCondition(actor);
  if (scope) conditions.push(scope);

  let query = db.select().from(accountsTable).orderBy(desc(accountsTable.createdAt)).$dynamic();
  if (conditions.length > 0) query = query.where(and(...conditions));
  return res.json(await query);
});

router.get("/:id", async (req, res) => {
  const [row] = await db.select().from(accountsTable).where(eq(accountsTable.id, req.params.id));
  if (!row) return res.status(404).json({ error: "Not found" });
  // SEC-1: out-of-scope accounts 404 like missing ones (no existence leak).
  const actor = await resolveActor(req);
  if (!(await canSeeAccount(actor, row.id))) return res.status(404).json({ error: "Not found" });
  return res.json(row);
});

/** SEC-1: sub-resource gate — the actor must be able to see the account. */
async function accountInScope(req: Request, accountId: string): Promise<boolean> {
  const actor = await resolveActor(req);
  return canSeeAccount(actor, accountId);
}

router.get("/:id/deals", async (req, res) => {
  if (!(await accountInScope(req, req.params.id))) return res.status(404).json({ error: "Not found" });
  const rows = await db.select().from(dealsTable).where(await dealScopeForAccount(req, req.params.id)).orderBy(desc(dealsTable.createdAt));
  return res.json(rows);
});

router.get("/:id/policies", async (req, res) => {
  if (!(await accountInScope(req, req.params.id))) return res.status(404).json({ error: "Not found" });
  const dealRows = await db.select().from(dealsTable).where(await dealScopeForAccount(req, req.params.id));
  if (dealRows.length === 0) return res.json([]);
  const dealIds = dealRows.map((d) => d.id);
  const allPolicies = await db.select().from(policiesTable).where(inArray(policiesTable.dealId, dealIds));
  return res.json(allPolicies);
});

router.get("/:id/activity", async (req, res) => {
  if (!(await accountInScope(req, req.params.id))) return res.status(404).json({ error: "Not found" });
  const rows = await db.select().from(activityLogTable).where(eq(activityLogTable.entityId, req.params.id)).orderBy(desc(activityLogTable.createdAt));
  return res.json(rows);
});

router.post("/:id/activity", blockReadOnly, async (req, res) => {
  if (!(await accountInScope(req, String(req.params.id)))) return res.status(404).json({ error: "Not found" });
  const parsed = insertActivityLogSchema.safeParse({
    entityType: "account",
    entityId: req.params.id,
    eventType: req.body.eventType || "NOTE",
    description: req.body.description,
  });
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
  const [row] = await db.insert(activityLogTable).values(parsed.data).returning();
  return res.status(201).json(row);
});

router.post("/", requireAccountManager, async (req, res) => {
  const parsed = insertAccountSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
  const [row] = await db.insert(accountsTable).values(parsed.data).returning();
  return res.status(201).json(row);
});

// Fields whose changes we surface on the account activity feed.
const TRACKED_FIELDS: Record<string, string> = {
  annualPayroll: "Annual payroll",
  headcount: "Headcount",
  emod: "Experience mod",
  clientStage: "Stage",
  businessName: "Business name",
  legalName: "Legal name",
  vertical: "Vertical",
  productType: "Product type",
  state: "State",
};

router.patch("/:id", blockReadOnly, async (req: Request<{ id: string }>, res: Response) => {
  const parsed = insertAccountSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });

  if (!(await accountInScope(req, req.params.id))) return res.status(404).json({ error: "Not found" });

  const [existing] = await db.select().from(accountsTable).where(eq(accountsTable.id, req.params.id));
  if (!existing) return res.status(404).json({ error: "Not found" });

  const [row] = await db.update(accountsTable).set({ ...parsed.data, updatedAt: new Date() }).where(eq(accountsTable.id, req.params.id)).returning();
  if (!row) return res.status(404).json({ error: "Not found" });

  // Record meaningful field changes on the account's activity feed.
  const changes: Array<{ field: string; label: string; from: unknown; to: unknown }> = [];
  for (const [field, label] of Object.entries(TRACKED_FIELDS)) {
    if (!(field in parsed.data)) continue;
    const before = (existing as Record<string, unknown>)[field] ?? null;
    const after = (row as Record<string, unknown>)[field] ?? null;
    if (String(before) !== String(after)) changes.push({ field, label, from: before, to: after });
  }
  if (changes.length > 0) {
    const stageChange = changes.find((c) => c.field === "clientStage");
    await db.insert(activityLogTable).values({
      entityType: "account",
      entityId: row.id,
      eventType: stageChange ? "stage_changed" : "account_updated",
      description: stageChange
        ? `Stage changed from "${stageChange.from ?? "—"}" to "${stageChange.to ?? "—"}".`
        : `Account updated: ${changes.map((c) => c.label).join(", ")}.`,
      metadata: { changes },
      createdBy: req.user?.id ?? null,
    });
  }

  return res.json(row);
});

router.delete("/:id", requireAccountManager, async (req: Request<{ id: string }>, res: Response) => {
  const [row] = await db.delete(accountsTable).where(eq(accountsTable.id, req.params.id)).returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  return res.json({ deleted: true });
});

export default router;
