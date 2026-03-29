import { Router, type IRouter } from "express";
import { db, policiesTable, insertPolicySchema, commissionsTable, policyDocumentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/", async (_req, res) => {
  const rows = await db.select().from(policiesTable);
  res.json(rows);
});

router.get("/:id", async (req, res) => {
  const [row] = await db.select().from(policiesTable).where(eq(policiesTable.id, req.params.id));
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(row);
});

router.post("/", async (req, res) => {
  const parsed = insertPolicySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
  const [row] = await db.insert(policiesTable).values(parsed.data).returning();
  res.status(201).json(row);
});

router.patch("/:id", async (req, res) => {
  const [row] = await db.update(policiesTable).set(req.body).where(eq(policiesTable.id, req.params.id)).returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(row);
});

router.get("/:id/commissions", async (req, res) => {
  const rows = await db.select().from(commissionsTable).where(eq(commissionsTable.policyId, req.params.id));
  res.json(rows);
});

router.get("/:id/documents", async (req, res) => {
  const rows = await db.select().from(policyDocumentsTable).where(eq(policyDocumentsTable.policyId, req.params.id));
  res.json(rows);
});

export default router;
