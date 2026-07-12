import { Router, type IRouter } from "express";
import {
  db,
  journeyTemplatesTable,
  journeyTemplatePhasesTable,
  journeyTemplateTasksTable,
  insertJourneyTemplateSchema,
  insertJourneyTemplatePhaseSchema,
  insertJourneyTemplateTaskSchema,
} from "@workspace/db";
import { and, asc, eq } from "drizzle-orm";

/* ---------------------------------------------------------------------------
 * P5b W1 Task 3 — Journey template admin CRUD.
 * Three routers (templates / phases / tasks) so index.ts can mount each path
 * prefix behind requireRoles("ADMIN") without gating unrelated routes.
 * ------------------------------------------------------------------------- */

export const journeyTemplatesRouter: IRouter = Router();
export const journeyTemplatePhasesRouter: IRouter = Router();
export const journeyTemplateTasksRouter: IRouter = Router();

/* ------------------------------- templates ------------------------------ */

journeyTemplatesRouter.get("/", async (req, res) => {
  const conditions = [];
  if (typeof req.query.type === "string") {
    conditions.push(eq(journeyTemplatesTable.type, req.query.type));
  }
  if (typeof req.query.productType === "string") {
    conditions.push(eq(journeyTemplatesTable.productType, req.query.productType));
  }
  if (typeof req.query.isActive === "string") {
    conditions.push(eq(journeyTemplatesTable.isActive, req.query.isActive === "true"));
  }
  const rows = await db
    .select()
    .from(journeyTemplatesTable)
    .where(conditions.length ? and(...conditions) : undefined);
  res.json(rows);
});

journeyTemplatesRouter.post("/", async (req, res) => {
  const parsed = insertJourneyTemplateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
  const [row] = await db.insert(journeyTemplatesTable).values(parsed.data).returning();
  return res.status(201).json(row);
});

journeyTemplatesRouter.get("/:id", async (req, res) => {
  const [template] = await db
    .select()
    .from(journeyTemplatesTable)
    .where(eq(journeyTemplatesTable.id, req.params.id));
  if (!template) return res.status(404).json({ error: "Template not found" });

  const phases = await db
    .select()
    .from(journeyTemplatePhasesTable)
    .where(eq(journeyTemplatePhasesTable.templateId, req.params.id))
    .orderBy(asc(journeyTemplatePhasesTable.sortOrder));
  const tasks = await db
    .select()
    .from(journeyTemplateTasksTable)
    .where(eq(journeyTemplateTasksTable.templateId, req.params.id))
    .orderBy(asc(journeyTemplateTasksTable.sortOrder));

  return res.json({ ...template, phases, tasks });
});

journeyTemplatesRouter.patch("/:id", async (req, res) => {
  const parsed = insertJourneyTemplateSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
  const [row] = await db
    .update(journeyTemplatesTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(journeyTemplatesTable.id, req.params.id))
    .returning();
  if (!row) return res.status(404).json({ error: "Template not found" });
  return res.json(row);
});

journeyTemplatesRouter.delete("/:id", async (req, res) => {
  const [row] = await db
    .delete(journeyTemplatesTable)
    .where(eq(journeyTemplatesTable.id, req.params.id))
    .returning();
  if (!row) return res.status(404).json({ error: "Template not found" });
  return res.status(204).end();
});

/* ------------------------- phases (under template) ----------------------- */

journeyTemplatesRouter.post("/:id/phases", async (req, res) => {
  const [template] = await db
    .select({ id: journeyTemplatesTable.id })
    .from(journeyTemplatesTable)
    .where(eq(journeyTemplatesTable.id, req.params.id));
  if (!template) return res.status(404).json({ error: "Template not found" });

  const parsed = insertJourneyTemplatePhaseSchema.safeParse({
    ...req.body,
    templateId: req.params.id,
  });
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
  const [row] = await db.insert(journeyTemplatePhasesTable).values(parsed.data).returning();
  return res.status(201).json(row);
});

/* -------------------------- tasks (under template) ----------------------- */

journeyTemplatesRouter.post("/:id/tasks", async (req, res) => {
  const [template] = await db
    .select({ id: journeyTemplatesTable.id })
    .from(journeyTemplatesTable)
    .where(eq(journeyTemplatesTable.id, req.params.id));
  if (!template) return res.status(404).json({ error: "Template not found" });

  const parsed = insertJourneyTemplateTaskSchema.safeParse({
    ...req.body,
    templateId: req.params.id,
  });
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });

  const [phase] = await db
    .select({ id: journeyTemplatePhasesTable.id })
    .from(journeyTemplatePhasesTable)
    .where(
      and(
        eq(journeyTemplatePhasesTable.id, parsed.data.phaseId),
        eq(journeyTemplatePhasesTable.templateId, req.params.id),
      ),
    );
  if (!phase) return res.status(404).json({ error: "Phase not found on this template" });

  const [row] = await db.insert(journeyTemplateTasksTable).values(parsed.data).returning();
  return res.status(201).json(row);
});

/* ------------------------- standalone phase routes ----------------------- */

journeyTemplatePhasesRouter.patch("/:phaseId", async (req, res) => {
  const parsed = insertJourneyTemplatePhaseSchema
    .omit({ templateId: true })
    .partial()
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
  const [row] = await db
    .update(journeyTemplatePhasesTable)
    .set(parsed.data)
    .where(eq(journeyTemplatePhasesTable.id, req.params.phaseId))
    .returning();
  if (!row) return res.status(404).json({ error: "Phase not found" });
  return res.json(row);
});

journeyTemplatePhasesRouter.delete("/:phaseId", async (req, res) => {
  const [row] = await db
    .delete(journeyTemplatePhasesTable)
    .where(eq(journeyTemplatePhasesTable.id, req.params.phaseId))
    .returning();
  if (!row) return res.status(404).json({ error: "Phase not found" });
  return res.status(204).end();
});

/* -------------------------- standalone task routes ------------------------ */

journeyTemplateTasksRouter.patch("/:taskId", async (req, res) => {
  const parsed = insertJourneyTemplateTaskSchema
    .omit({ templateId: true })
    .partial()
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });

  const [existing] = await db
    .select({ templateId: journeyTemplateTasksTable.templateId })
    .from(journeyTemplateTasksTable)
    .where(eq(journeyTemplateTasksTable.id, req.params.taskId));
  if (!existing) return res.status(404).json({ error: "Task not found" });

  // Integrity guard: a task may only move to a phase on its own template.
  if (parsed.data.phaseId !== undefined) {
    const [phase] = await db
      .select({ id: journeyTemplatePhasesTable.id })
      .from(journeyTemplatePhasesTable)
      .where(
        and(
          eq(journeyTemplatePhasesTable.id, parsed.data.phaseId),
          eq(journeyTemplatePhasesTable.templateId, existing.templateId),
        ),
      );
    if (!phase) return res.status(400).json({ error: "Phase does not belong to this task's template" });
  }

  const [row] = await db
    .update(journeyTemplateTasksTable)
    .set(parsed.data)
    .where(eq(journeyTemplateTasksTable.id, req.params.taskId))
    .returning();
  if (!row) return res.status(404).json({ error: "Task not found" });
  return res.json(row);
});

journeyTemplateTasksRouter.delete("/:taskId", async (req, res) => {
  const [row] = await db
    .delete(journeyTemplateTasksTable)
    .where(eq(journeyTemplateTasksTable.id, req.params.taskId))
    .returning();
  if (!row) return res.status(404).json({ error: "Task not found" });
  return res.status(204).end();
});
