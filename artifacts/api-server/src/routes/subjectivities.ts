import { Router, type IRouter } from "express";
import { db, dealSubjectivitiesTable, SUBJECTIVITY_STATUSES } from "@workspace/db";
import { asc, eq } from "drizzle-orm";
import { z } from "zod/v4";
import { recomputeLossHistorySubjectivity } from "../lib/subjectivities";

/** Mounted under /deals — §6A checklist for one deal. */
export const dealSubjectivitiesRouter: IRouter = Router();
/** Mounted under /subjectivities — operations on a single item. */
export const subjectivitiesRouter: IRouter = Router();

dealSubjectivitiesRouter.get("/:dealId/subjectivities", async (req, res) => {
  const rows = await db
    .select()
    .from(dealSubjectivitiesTable)
    .where(eq(dealSubjectivitiesTable.dealId, req.params.dealId))
    .orderBy(asc(dealSubjectivitiesTable.sortOrder));
  return res.json(rows);
});

dealSubjectivitiesRouter.post("/:dealId/subjectivities/recompute", async (req, res) => {
  const result = await recomputeLossHistorySubjectivity(req.params.dealId, db);
  return res.json(result);
});

const updateSchema = z.object({
  status: z.enum(SUBJECTIVITY_STATUSES),
  notes: z.string().nullable().optional(),
});

subjectivitiesRouter.patch("/:id", async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });

  const satisfied = parsed.data.status === "SATISFIED";
  const [row] = await db
    .update(dealSubjectivitiesTable)
    .set({
      status: parsed.data.status,
      notes: parsed.data.notes ?? undefined,
      satisfiedAt: satisfied ? new Date() : null,
      satisfiedBy: satisfied ? (req.user?.id ?? null) : null,
      updatedAt: new Date(),
    })
    .where(eq(dealSubjectivitiesTable.id, req.params.id))
    .returning();
  if (!row) return res.status(404).json({ error: "Subjectivity not found" });
  return res.json(row);
});
