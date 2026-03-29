import { Router, type IRouter } from "express";
import { db, agentRegistrationsTable, insertAgentRegistrationSchema } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/", async (_req, res) => {
  const rows = await db.select().from(agentRegistrationsTable).orderBy(desc(agentRegistrationsTable.createdAt));
  res.json(rows);
});

router.get("/:id", async (req, res) => {
  const [row] = await db.select().from(agentRegistrationsTable).where(eq(agentRegistrationsTable.id, req.params.id));
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(row);
});

router.post("/", async (req, res) => {
  const parsed = insertAgentRegistrationSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
  const [row] = await db.insert(agentRegistrationsTable).values(parsed.data).returning();
  res.status(201).json(row);
});

router.patch("/:id", async (req, res) => {
  const parsed = insertAgentRegistrationSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
  const [row] = await db.update(agentRegistrationsTable).set(parsed.data).where(eq(agentRegistrationsTable.id, req.params.id)).returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(row);
});

export default router;
