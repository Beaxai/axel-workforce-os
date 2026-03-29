import { Router, type IRouter } from "express";
import { db, workforceSummariesTable, verticalWorkforceRollupsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/summaries", async (_req, res) => {
  const rows = await db.select().from(workforceSummariesTable);
  res.json(rows);
});

router.get("/summaries/:orgId", async (req, res) => {
  const [row] = await db.select().from(workforceSummariesTable).where(eq(workforceSummariesTable.orgId, req.params.orgId));
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(row);
});

router.get("/verticals", async (_req, res) => {
  const rows = await db.select().from(verticalWorkforceRollupsTable);
  res.json(rows);
});

export default router;
