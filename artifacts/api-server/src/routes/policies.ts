import { Router, type IRouter, type Request, type Response } from "express";
import { db, policiesTable, insertPolicySchema, commissionsTable, policyDocumentsTable, type Policy } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import { canSeeDeal, resolveActor, visibleDealIds } from "../lib/scope";

const router: IRouter = Router();

// SEC-1: a policy is visible iff its parent deal is visible to the actor;
// out-of-scope ids (and their sub-resources) 404 exactly like missing ones.

/** Load the policy and enforce scope; sends the 404 itself when blocked. */
async function loadPolicyInScope(req: Request, res: Response, id: string): Promise<Policy | null> {
  const [row] = await db.select().from(policiesTable).where(eq(policiesTable.id, id));
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return null;
  }
  const actor = await resolveActor(req);
  if (!(await canSeeDeal(actor, row.dealId))) {
    res.status(404).json({ error: "Not found" });
    return null;
  }
  return row;
}

router.get("/", async (req, res) => {
  const actor = await resolveActor(req);
  const dealIds = await visibleDealIds(actor);
  const rows =
    dealIds === null
      ? await db.select().from(policiesTable)
      : dealIds.length === 0
        ? []
        : await db.select().from(policiesTable).where(inArray(policiesTable.dealId, dealIds));
  res.json(rows);
});

router.get("/:id", async (req, res) => {
  const row = await loadPolicyInScope(req, res, req.params.id);
  if (!row) return;
  return res.json(row);
});

router.post("/", async (req, res) => {
  const parsed = insertPolicySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
  const [row] = await db.insert(policiesTable).values(parsed.data).returning();
  return res.status(201).json(row);
});

router.patch("/:id", async (req, res) => {
  const parsed = insertPolicySchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
  const existing = await loadPolicyInScope(req, res, req.params.id);
  if (!existing) return;
  const [row] = await db.update(policiesTable).set(parsed.data).where(eq(policiesTable.id, req.params.id)).returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  return res.json(row);
});

router.get("/:id/commissions", async (req, res) => {
  const policy = await loadPolicyInScope(req, res, req.params.id);
  if (!policy) return;
  const rows = await db.select().from(commissionsTable).where(eq(commissionsTable.policyId, policy.id));
  res.json(rows);
});

router.get("/:id/documents", async (req, res) => {
  const policy = await loadPolicyInScope(req, res, req.params.id);
  if (!policy) return;
  const rows = await db.select().from(policyDocumentsTable).where(eq(policyDocumentsTable.policyId, policy.id));
  res.json(rows);
});

export default router;
