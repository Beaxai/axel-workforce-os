import { Router, type IRouter } from "express";
import { db, accountsTable, insertAccountSchema, dealsTable, policiesTable, activityLogTable, insertActivityLogSchema } from "@workspace/db";
import { eq, desc, ilike, or, and } from "drizzle-orm";

const router: IRouter = Router();

router.get("/", async (req, res) => {
  const search = req.query.search as string | undefined;
  const status = req.query.status as string | undefined;

  let query = db.select().from(accountsTable).orderBy(desc(accountsTable.createdAt)).$dynamic();
  const conditions = [];
  if (search) {
    conditions.push(ilike(accountsTable.businessName, `%${search}%`));
  }
  if (status && status !== "All") {
    conditions.push(eq(accountsTable.accountStatus, status));
  }
  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }
  const rows = await query;
  res.json(rows);
});

router.get("/:id", async (req, res) => {
  const [row] = await db.select().from(accountsTable).where(eq(accountsTable.id, req.params.id));
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(row);
});

router.get("/:id/deals", async (req, res) => {
  const rows = await db.select().from(dealsTable).where(eq(dealsTable.accountId, req.params.id)).orderBy(desc(dealsTable.createdAt));
  res.json(rows);
});

router.get("/:id/policies", async (req, res) => {
  const dealRows = await db.select().from(dealsTable).where(eq(dealsTable.accountId, req.params.id));
  if (dealRows.length === 0) return res.json([]);
  const dealIds = dealRows.map(d => d.id);
  const allPolicies = [];
  for (const did of dealIds) {
    const p = await db.select().from(policiesTable).where(eq(policiesTable.dealId, did));
    allPolicies.push(...p);
  }
  res.json(allPolicies);
});

router.get("/:id/activity", async (req, res) => {
  const rows = await db.select().from(activityLogTable).where(eq(activityLogTable.entityId, req.params.id)).orderBy(desc(activityLogTable.createdAt));
  res.json(rows);
});

router.post("/:id/activity", async (req, res) => {
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

router.post("/", async (req, res) => {
  const parsed = insertAccountSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
  const [row] = await db.insert(accountsTable).values(parsed.data).returning();
  res.status(201).json(row);
});

router.patch("/:id", async (req, res) => {
  const parsed = insertAccountSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
  const [row] = await db.update(accountsTable).set({ ...parsed.data, updatedAt: new Date() }).where(eq(accountsTable.id, req.params.id)).returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(row);
});

router.delete("/:id", async (req, res) => {
  const [row] = await db.delete(accountsTable).where(eq(accountsTable.id, req.params.id)).returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json({ deleted: true });
});

export default router;
