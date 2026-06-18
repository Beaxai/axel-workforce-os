import { Router, type IRouter, type RequestHandler } from "express";
import { db, accountsTable, insertAccountSchema, dealsTable, policiesTable, activityLogTable, insertActivityLogSchema, PROSPECT_STAGES, CLIENT_TAB_STAGES } from "@workspace/db";
import { eq, desc, ilike, or, and, inArray } from "drizzle-orm";

const router: IRouter = Router();

/** Account ids an AGENT may see: those linked to a deal they own or produce. */
async function agentAccountIds(userId: string): Promise<string[]> {
  const rows = await db
    .selectDistinct({ accountId: dealsTable.accountId })
    .from(dealsTable)
    .where(or(eq(dealsTable.ownerId, userId), eq(dealsTable.producingAgentId, userId)));
  return rows.map((r) => r.accountId).filter((id): id is string => Boolean(id));
}

/** UNDERWRITER has read-only access to accounts; block all mutations. */
const blockReadOnly: RequestHandler = (req, res, next) => {
  if (req.user?.role === "UNDERWRITER") {
    return res.status(403).json({ error: "Read-only role" });
  }
  next();
};

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

  if (req.user?.role === "AGENT") {
    const ids = await agentAccountIds(req.user.id);
    if (ids.length === 0) return res.json([]);
    conditions.push(inArray(accountsTable.id, ids));
  }

  let query = db.select().from(accountsTable).orderBy(desc(accountsTable.createdAt)).$dynamic();
  if (conditions.length > 0) query = query.where(and(...conditions));
  res.json(await query);
});

router.get("/:id", async (req, res) => {
  const [row] = await db.select().from(accountsTable).where(eq(accountsTable.id, req.params.id));
  if (!row) return res.status(404).json({ error: "Not found" });
  if (req.user?.role === "AGENT") {
    const ids = await agentAccountIds(req.user.id);
    if (!ids.includes(row.id)) return res.status(403).json({ error: "Insufficient permissions" });
  }
  res.json(row);
});

/** An AGENT may only read an account's subresources when they own/produce a linked deal. */
async function agentMayAccess(req: { user?: { id: string; role: string } }, accountId: string | string[]): Promise<boolean> {
  if (req.user?.role !== "AGENT") return true;
  const ids = await agentAccountIds(req.user.id);
  return ids.includes(String(accountId));
}

router.get("/:id/deals", async (req, res) => {
  if (!(await agentMayAccess(req, req.params.id))) return res.status(403).json({ error: "Insufficient permissions" });
  const rows = await db.select().from(dealsTable).where(eq(dealsTable.accountId, req.params.id)).orderBy(desc(dealsTable.createdAt));
  res.json(rows);
});

router.get("/:id/policies", async (req, res) => {
  if (!(await agentMayAccess(req, req.params.id))) return res.status(403).json({ error: "Insufficient permissions" });
  const dealRows = await db.select().from(dealsTable).where(eq(dealsTable.accountId, req.params.id));
  if (dealRows.length === 0) return res.json([]);
  const dealIds = dealRows.map((d) => d.id);
  const allPolicies = await db.select().from(policiesTable).where(inArray(policiesTable.dealId, dealIds));
  res.json(allPolicies);
});

router.get("/:id/activity", async (req, res) => {
  if (!(await agentMayAccess(req, req.params.id))) return res.status(403).json({ error: "Insufficient permissions" });
  const rows = await db.select().from(activityLogTable).where(eq(activityLogTable.entityId, req.params.id)).orderBy(desc(activityLogTable.createdAt));
  res.json(rows);
});

router.post("/:id/activity", blockReadOnly, async (req, res) => {
  const parsed = insertActivityLogSchema.safeParse({
    entityType: "account",
    entityId: req.params.id,
    eventType: req.body.eventType || "NOTE",
    description: req.body.description,
  });
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
  const [row] = await db.insert(activityLogTable).values(parsed.data).returning();
  res.status(201).json(row);
});

router.post("/", blockReadOnly, async (req, res) => {
  const parsed = insertAccountSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
  const [row] = await db.insert(accountsTable).values(parsed.data).returning();
  res.status(201).json(row);
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

router.patch("/:id", blockReadOnly, async (req, res) => {
  const parsed = insertAccountSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });

  if (!(await agentMayAccess(req, req.params.id))) return res.status(403).json({ error: "Insufficient permissions" });

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

  res.json(row);
});

router.delete("/:id", blockReadOnly, async (req, res) => {
  if (!(await agentMayAccess(req, req.params.id))) return res.status(403).json({ error: "Insufficient permissions" });
  const [row] = await db.delete(accountsTable).where(eq(accountsTable.id, req.params.id)).returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json({ deleted: true });
});

export default router;
