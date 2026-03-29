import { Router, type IRouter } from "express";
import { db, usersTable, insertUserSchema } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/", async (_req, res) => {
  const rows = await db.select().from(usersTable);
  res.json(rows);
});

router.get("/:id", async (req, res) => {
  const [row] = await db.select().from(usersTable).where(eq(usersTable.id, req.params.id));
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(row);
});

router.post("/", async (req, res) => {
  const parsed = insertUserSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
  const [row] = await db.insert(usersTable).values(parsed.data).returning();
  res.status(201).json(row);
});

router.patch("/:id", async (req, res) => {
  const parsed = insertUserSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
  const [row] = await db.update(usersTable).set(parsed.data).where(eq(usersTable.id, req.params.id)).returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(row);
});

router.delete("/:id", async (req, res) => {
  const [row] = await db.delete(usersTable).where(eq(usersTable.id, req.params.id)).returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json({ deleted: true });
});

export default router;
