import { Router, type IRouter } from "express";
import { db, quoteDraftsTable, insertQuoteDraftSchema } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";

/**
 * Quote-wizard draft persistence. All routes are scoped to the authenticated
 * user (`created_by`) — drafts are private to their creator, so every query
 * filters on both the draft id and the session user id (prevents IDOR).
 */
const router: IRouter = Router();

router.get("/", async (req, res) => {
  const rows = await db
    .select()
    .from(quoteDraftsTable)
    .where(eq(quoteDraftsTable.createdBy, req.user!.id))
    .orderBy(desc(quoteDraftsTable.updatedAt));
  res.json(rows);
});

router.get("/:id", async (req, res) => {
  const [row] = await db
    .select()
    .from(quoteDraftsTable)
    .where(and(eq(quoteDraftsTable.id, req.params.id), eq(quoteDraftsTable.createdBy, req.user!.id)));
  if (!row) return res.status(404).json({ error: "Not found" });
  return res.json(row);
});

router.post("/", async (req, res) => {
  const parsed = insertQuoteDraftSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });

  // Dedupe: one in-progress draft per business name per user. If a draft with
  // the same (case-insensitive) business name already exists for this user,
  // update it in place instead of creating a duplicate row. This guards
  // against autosave double-fires and re-starting a quote for the same
  // company, which previously produced duplicate "In-Progress Submissions".
  const businessName = parsed.data.businessName?.trim();
  if (businessName) {
    const [existing] = await db
      .select()
      .from(quoteDraftsTable)
      .where(
        and(
          eq(quoteDraftsTable.createdBy, req.user!.id),
          sql`lower(${quoteDraftsTable.businessName}) = lower(${businessName})`,
        ),
      )
      .orderBy(desc(quoteDraftsTable.updatedAt))
      .limit(1);
    if (existing) {
      const [row] = await db
        .update(quoteDraftsTable)
        .set({ ...parsed.data, updatedAt: sql`now()` })
        .where(eq(quoteDraftsTable.id, existing.id))
        .returning();
      return res.status(200).json(row);
    }
  }

  const [row] = await db
    .insert(quoteDraftsTable)
    .values({ ...parsed.data, createdBy: req.user!.id })
    .returning();
  return res.status(201).json(row);
});

router.patch("/:id", async (req, res) => {
  const parsed = insertQuoteDraftSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
  const [row] = await db
    .update(quoteDraftsTable)
    .set({ ...parsed.data, updatedAt: sql`now()` })
    .where(and(eq(quoteDraftsTable.id, req.params.id), eq(quoteDraftsTable.createdBy, req.user!.id)))
    .returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  return res.json(row);
});

router.delete("/:id", async (req, res) => {
  const [row] = await db
    .delete(quoteDraftsTable)
    .where(and(eq(quoteDraftsTable.id, req.params.id), eq(quoteDraftsTable.createdBy, req.user!.id)))
    .returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  return res.json({ success: true });
});

export default router;
