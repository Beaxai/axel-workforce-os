import { Router, type IRouter } from "express";
import { db, employeesTable, insertEmployeeSchema } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/", async (_req, res) => {
  const rows = await db.select().from(employeesTable);
  res.json(rows);
});

router.get("/:id", async (req, res) => {
  const [row] = await db.select().from(employeesTable).where(eq(employeesTable.id, req.params.id));
  if (!row) return res.status(404).json({ error: "Not found" });
  return res.json(row);
});

router.post("/", async (req, res) => {
  const parsed = insertEmployeeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
  const [row] = await db.insert(employeesTable).values(parsed.data).returning();
  return res.status(201).json(row);
});

router.patch("/:id", async (req, res) => {
  const parsed = insertEmployeeSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
  const [row] = await db.update(employeesTable).set(parsed.data).where(eq(employeesTable.id, req.params.id)).returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  return res.json(row);
});

router.delete("/:id", async (req, res) => {
  const [row] = await db.delete(employeesTable).where(eq(employeesTable.id, req.params.id)).returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  return res.json({ deleted: true });
});

export default router;
