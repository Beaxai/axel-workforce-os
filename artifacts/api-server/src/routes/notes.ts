import { Router, type IRouter } from "express";
import { db, notesTable, insertNoteSchema } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/", async (_req, res) => {
  const rows = await db.select().from(notesTable).orderBy(desc(notesTable.createdAt));
  res.json(rows);
});

router.post("/", async (req, res) => {
  const parsed = insertNoteSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
  const [row] = await db.insert(notesTable).values(parsed.data).returning();
  res.status(201).json(row);
});

router.patch("/:id", async (req, res) => {
  const [row] = await db.update(notesTable).set(req.body).where(eq(notesTable.id, req.params.id)).returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(row);
});

router.delete("/:id", async (req, res) => {
  const [row] = await db.delete(notesTable).where(eq(notesTable.id, req.params.id)).returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json({ deleted: true });
});

export default router;
