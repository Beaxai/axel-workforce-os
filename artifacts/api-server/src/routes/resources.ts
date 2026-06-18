import { Router, type IRouter } from "express";
import { db, resourcesTable, insertResourceSchema } from "@workspace/db";
import { eq, desc, ilike, or } from "drizzle-orm";

const router: IRouter = Router();

router.get("/", async (req, res) => {
  const q = req.query.q as string | undefined;
  let query = db.select().from(resourcesTable).orderBy(desc(resourcesTable.createdAt)).$dynamic();
  if (q) {
    query = query.where(or(ilike(resourcesTable.title, `%${q}%`), ilike(resourcesTable.category, `%${q}%`)));
  }
  const rows = await query;
  res.json(rows);
});

router.post("/", async (req, res) => {
  const parsed = insertResourceSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
  const [row] = await db.insert(resourcesTable).values(parsed.data).returning();
  return res.status(201).json(row);
});

router.delete("/:id", async (req, res) => {
  const [row] = await db.delete(resourcesTable).where(eq(resourcesTable.id, req.params.id)).returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  return res.json({ deleted: true });
});

export default router;
