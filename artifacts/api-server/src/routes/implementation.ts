import { Router, type IRouter } from "express";
import { db, implementationTrackersTable, implementationPhasesTable, implementationTasksTable, insertImplementationTrackerSchema } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/", async (_req, res) => {
  const rows = await db.select().from(implementationTrackersTable);
  res.json(rows);
});

router.get("/:id", async (req, res) => {
  const [tracker] = await db.select().from(implementationTrackersTable).where(eq(implementationTrackersTable.id, req.params.id));
  if (!tracker) return res.status(404).json({ error: "Not found" });

  const phases = await db.select().from(implementationPhasesTable).where(eq(implementationPhasesTable.trackerId, req.params.id));
  const tasks = await db.select().from(implementationTasksTable).where(eq(implementationTasksTable.trackerId, req.params.id));

  return res.json({ ...tracker, phases, tasks });
});

router.post("/", async (req, res) => {
  const parsed = insertImplementationTrackerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
  const [row] = await db.insert(implementationTrackersTable).values(parsed.data).returning();
  return res.status(201).json(row);
});

router.patch("/:id", async (req, res) => {
  const parsed = insertImplementationTrackerSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
  const [row] = await db.update(implementationTrackersTable).set(parsed.data).where(eq(implementationTrackersTable.id, req.params.id)).returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  return res.json(row);
});

export default router;
