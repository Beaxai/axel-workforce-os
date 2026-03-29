import { Router, type IRouter } from "express";
import { db, dealsTable, insertDealSchema, quotesTable, contactsTable, notesTable, tasksTable, activityLogTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/", async (_req, res) => {
  const rows = await db.select().from(dealsTable).orderBy(desc(dealsTable.createdAt));
  res.json(rows);
});

router.get("/:id", async (req, res) => {
  const [row] = await db.select().from(dealsTable).where(eq(dealsTable.id, req.params.id));
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(row);
});

router.post("/", async (req, res) => {
  const parsed = insertDealSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
  const [row] = await db.insert(dealsTable).values(parsed.data).returning();
  res.status(201).json(row);
});

router.patch("/:id", async (req, res) => {
  const parsed = insertDealSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
  const [row] = await db.update(dealsTable).set(parsed.data).where(eq(dealsTable.id, req.params.id)).returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(row);
});

router.delete("/:id", async (req, res) => {
  const [row] = await db.delete(dealsTable).where(eq(dealsTable.id, req.params.id)).returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json({ deleted: true });
});

router.get("/:id/quotes", async (req, res) => {
  const rows = await db.select().from(quotesTable).where(eq(quotesTable.dealId, req.params.id));
  res.json(rows);
});

router.get("/:id/contacts", async (req, res) => {
  const rows = await db.select().from(contactsTable).where(eq(contactsTable.dealId, req.params.id));
  res.json(rows);
});

router.get("/:id/notes", async (req, res) => {
  const rows = await db.select().from(notesTable).where(eq(notesTable.dealId, req.params.id)).orderBy(desc(notesTable.createdAt));
  res.json(rows);
});

router.get("/:id/tasks", async (req, res) => {
  const rows = await db.select().from(tasksTable).where(eq(tasksTable.dealId, req.params.id));
  res.json(rows);
});

router.get("/:id/activity", async (req, res) => {
  const rows = await db.select().from(activityLogTable).where(eq(activityLogTable.dealId, req.params.id)).orderBy(desc(activityLogTable.createdAt));
  res.json(rows);
});

export default router;
