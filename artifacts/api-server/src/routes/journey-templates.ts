import { Router, type IRouter } from "express";
import {
  db,
  journeyTemplatesTable,
  journeyTemplatePhasesTable,
  journeyTemplateTasksTable,
  insertJourneyTemplateSchema,
  insertJourneyTemplatePhaseSchema,
  insertJourneyTemplateTaskSchema,
  implementationTrackersTable,
} from "@workspace/db";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod/v4";

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

const TEMPLATE_REFERENCED_MSG =
  "This template is referenced by one or more live journeys and cannot be deleted. Deactivate it instead to stop new journeys from using it.";

const SYSTEM_LOCKED_MSG =
  "This is a system-defined tracker from the WC/PEO spec. You can add your own tasks to it, but its built-in phases and tasks cannot be deleted or renamed.";

function isFkViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    ("code" in err && (err as { code?: string }).code === "23503" ||
      ("cause" in err && isFkViolation((err as { cause?: unknown }).cause)))
  );
}

journeyTemplatesRouter.delete("/:id", async (req, res) => {
  // Friendly guard: live journeys reference templates via
  // implementation_trackers.template_id — surface a clear 409 instead of a
  // raw FK-violation 500. Guard + delete run in ONE transaction, and a FK
  // violation from a concurrent bind between check and delete is still
  // mapped to the same 409.
  try {
    const deleted = await db.transaction(async (tx) => {
      const [sysTpl] = await tx
        .select({ isSystem: journeyTemplatesTable.isSystem })
        .from(journeyTemplatesTable)
        .where(eq(journeyTemplatesTable.id, req.params.id))
        .limit(1);
      if (sysTpl?.isSystem) return "system" as const;

      const [liveJourney] = await tx
        .select({ id: implementationTrackersTable.id })
        .from(implementationTrackersTable)
        .where(eq(implementationTrackersTable.templateId, req.params.id))
        .limit(1);
      if (liveJourney) return "referenced" as const;

      const [row] = await tx
        .delete(journeyTemplatesTable)
        .where(eq(journeyTemplatesTable.id, req.params.id))
        .returning();
      return row ? ("deleted" as const) : ("missing" as const);
    });

    if (deleted === "system") {
      return res.status(409).json({ error: SYSTEM_LOCKED_MSG });
    }
    if (deleted === "referenced") {
      return res.status(409).json({ error: TEMPLATE_REFERENCED_MSG });
    }
    if (deleted === "missing") {
      return res.status(404).json({ error: "Template not found" });
    }
    return res.status(204).end();
  } catch (err) {
    if (isFkViolation(err)) {
      return res.status(409).json({ error: TEMPLATE_REFERENCED_MSG });
    }
    throw err;
  }
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

/* ------------------------------- reorder --------------------------------- */

const reorderPhasesSchema = z.object({
  orderedPhaseIds: z.array(z.string().uuid()).min(1),
});

journeyTemplatesRouter.post("/:id/phases/reorder", async (req, res) => {
  const parsed = reorderPhasesSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });

  const [template] = await db
    .select({ id: journeyTemplatesTable.id })
    .from(journeyTemplatesTable)
    .where(eq(journeyTemplatesTable.id, req.params.id));
  if (!template) return res.status(404).json({ error: "Template not found" });

  const { orderedPhaseIds } = parsed.data;

  const result = await db.transaction(async (tx) => {
    const existing = await tx
      .select({ id: journeyTemplatePhasesTable.id })
      .from(journeyTemplatePhasesTable)
      .where(eq(journeyTemplatePhasesTable.templateId, req.params.id));

    const existingIds = new Set(existing.map((p) => p.id));
    const providedIds = new Set(orderedPhaseIds);
    if (
      existingIds.size !== providedIds.size ||
      orderedPhaseIds.length !== providedIds.size ||
      [...existingIds].some((id) => !providedIds.has(id))
    ) {
      return null;
    }

    for (let i = 0; i < orderedPhaseIds.length; i++) {
      await tx
        .update(journeyTemplatePhasesTable)
        .set({ sortOrder: i + 1 })
        .where(eq(journeyTemplatePhasesTable.id, orderedPhaseIds[i]));
    }

    return tx
      .select()
      .from(journeyTemplatePhasesTable)
      .where(eq(journeyTemplatePhasesTable.templateId, req.params.id))
      .orderBy(asc(journeyTemplatePhasesTable.sortOrder));
  });

  if (result === null) {
    return res.status(400).json({
      error: "orderedPhaseIds must contain exactly the ids of this template's phases, each once.",
    });
  }
  return res.json(result);
});

const reorderTasksSchema = z.object({
  phaseId: z.string().uuid(),
  orderedTaskIds: z.array(z.string().uuid()).min(1),
});

journeyTemplatesRouter.post("/:id/tasks/reorder", async (req, res) => {
  const parsed = reorderTasksSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });

  const { phaseId, orderedTaskIds } = parsed.data;

  const [phase] = await db
    .select({ id: journeyTemplatePhasesTable.id })
    .from(journeyTemplatePhasesTable)
    .where(
      and(
        eq(journeyTemplatePhasesTable.id, phaseId),
        eq(journeyTemplatePhasesTable.templateId, req.params.id),
      ),
    );
  if (!phase) return res.status(404).json({ error: "Phase not found on this template" });

  const result = await db.transaction(async (tx) => {
    const existing = await tx
      .select({ id: journeyTemplateTasksTable.id })
      .from(journeyTemplateTasksTable)
      .where(eq(journeyTemplateTasksTable.phaseId, phaseId));

    const existingIds = new Set(existing.map((t) => t.id));
    const providedIds = new Set(orderedTaskIds);
    if (
      existingIds.size !== providedIds.size ||
      orderedTaskIds.length !== providedIds.size ||
      [...existingIds].some((id) => !providedIds.has(id))
    ) {
      return null;
    }

    for (let i = 0; i < orderedTaskIds.length; i++) {
      await tx
        .update(journeyTemplateTasksTable)
        .set({ sortOrder: i + 1 })
        .where(eq(journeyTemplateTasksTable.id, orderedTaskIds[i]));
    }

    return tx
      .select()
      .from(journeyTemplateTasksTable)
      .where(eq(journeyTemplateTasksTable.phaseId, phaseId))
      .orderBy(asc(journeyTemplateTasksTable.sortOrder));
  });

  if (result === null) {
    return res.status(400).json({
      error: "orderedTaskIds must contain exactly the ids of this phase's tasks, each once.",
    });
  }
  return res.json(result);
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
  const [existing] = await db
    .select({ systemKey: journeyTemplatePhasesTable.systemKey })
    .from(journeyTemplatePhasesTable)
    .where(eq(journeyTemplatePhasesTable.id, req.params.phaseId));
  if (!existing) return res.status(404).json({ error: "Phase not found" });
  if (existing.systemKey) return res.status(409).json({ error: SYSTEM_LOCKED_MSG });

  await db.delete(journeyTemplatePhasesTable).where(eq(journeyTemplatePhasesTable.id, req.params.phaseId));
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
  const [existing] = await db
    .select({ systemKey: journeyTemplateTasksTable.systemKey })
    .from(journeyTemplateTasksTable)
    .where(eq(journeyTemplateTasksTable.id, req.params.taskId));
  if (!existing) return res.status(404).json({ error: "Task not found" });
  if (existing.systemKey) return res.status(409).json({ error: SYSTEM_LOCKED_MSG });

  await db.delete(journeyTemplateTasksTable).where(eq(journeyTemplateTasksTable.id, req.params.taskId));
  return res.status(204).end();
});
