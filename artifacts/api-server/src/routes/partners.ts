import { Router, type IRouter } from "express";
import { db, partnersTable, insertPartnerSchema, dealsTable, policiesTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";

const router: IRouter = Router();

router.get("/", async (req, res) => {
  const type = req.query.type as string | undefined;
  let query = db.select().from(partnersTable).orderBy(desc(partnersTable.createdAt)).$dynamic();
  if (type) {
    query = query.where(eq(partnersTable.partnerType, type));
  }
  const rows = await query;
  res.json(rows);
});

router.get("/:id", async (req, res) => {
  const [row] = await db.select().from(partnersTable).where(eq(partnersTable.id, req.params.id));
  if (!row) return res.status(404).json({ error: "Not found" });
  return res.json(row);
});

router.post("/", async (req, res) => {
  const parsed = insertPartnerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
  const [row] = await db.insert(partnersTable).values(parsed.data).returning();
  return res.status(201).json(row);
});

router.patch("/:id", async (req, res) => {
  const parsed = insertPartnerSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
  const [row] = await db.update(partnersTable).set({ ...parsed.data, updatedAt: new Date() }).where(eq(partnersTable.id, req.params.id)).returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  return res.json(row);
});

router.delete("/:id", async (req, res) => {
  const [row] = await db.delete(partnersTable).where(eq(partnersTable.id, req.params.id)).returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  return res.json({ deleted: true });
});

export default router;
