import { Router, type IRouter, type Request, type Response } from "express";
import { db, usersTable, insertUserSchema } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireRoles } from "../middleware/require-auth";

const router: IRouter = Router();

// Creating, updating, and deleting users is ADMIN-only. The GET listing is
// readable by all internal staff (gated at the mount) for assignee directories.
const requireAdmin = requireRoles("ADMIN");

router.get("/", async (_req, res) => {
  const rows = await db.select().from(usersTable);
  res.json(rows);
});

router.get("/:id", async (req, res) => {
  const [row] = await db.select().from(usersTable).where(eq(usersTable.id, req.params.id));
  if (!row) return res.status(404).json({ error: "Not found" });
  return res.json(row);
});

router.post("/", requireAdmin, async (req, res) => {
  const parsed = insertUserSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
  const [row] = await db.insert(usersTable).values(parsed.data).returning();
  return res.status(201).json(row);
});

router.patch("/:id", requireAdmin, async (req: Request<{ id: string }>, res: Response) => {
  const parsed = insertUserSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
  const [row] = await db.update(usersTable).set(parsed.data).where(eq(usersTable.id, req.params.id)).returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  return res.json(row);
});

router.delete("/:id", requireAdmin, async (req: Request<{ id: string }>, res: Response) => {
  const [row] = await db.delete(usersTable).where(eq(usersTable.id, req.params.id)).returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  return res.json({ deleted: true });
});

export default router;
