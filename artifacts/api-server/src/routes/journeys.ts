/**
 * P5b W1 Task 4 — Journey instance routes over implementation_trackers /
 * implementation_phases / implementation_tasks.
 *
 * Mounted at /journeys behind requireAuth only; role scoping is enforced
 * INSIDE each handler (the server is the enforcement boundary):
 *   - ADMIN/CSA see and manage all journeys.
 *   - Other internal roles (AGENT/UNDERWRITER) see journeys where they are the
 *     assigned specialist.
 *   - EMPLOYER sees only journeys whose deal they own (deal.orgId === actor.orgId,
 *     same check as the deal-card §8 scoping) and may only complete CLIENT tasks.
 */
import { Router, type IRouter, type Request } from "express";
import {
  db,
  implementationTrackersTable,
  implementationPhasesTable,
  implementationTasksTable,
  dealsTable,
  accountsTable,
  activityLogTable,
  PROSPECT_STAGES,
} from "@workspace/db";
import { eq, and, asc, inArray } from "drizzle-orm";
import { z } from "zod/v4";

const router: IRouter = Router();

/** Roles with unrestricted journey access. */
const VIEW_ALL_ROLES = new Set(["ADMIN", "CSA"]);
/** Internal roles that may update any task (acceptance: ADMIN completes any task). */
const INTERNAL_ROLES = new Set(["ADMIN", "CSA", "AGENT", "UNDERWRITER"]);

type Actor = { id: string; role: string; orgId: string | null };

function actorFrom(req: Request): Actor {
  const u = req.user!;
  return { id: u.id, role: u.role, orgId: u.orgId ?? null };
}

type TrackerRow = typeof implementationTrackersTable.$inferSelect;
type PhaseRow = typeof implementationPhasesTable.$inferSelect;
type TaskRow = typeof implementationTasksTable.$inferSelect;

/* ----------------------------- contract mappers ---------------------------
 * DB columns are looser (nullable text) than the contract enums; coerce and
 * default here so the API never emits null where the contract requires an
 * enum (architect's Task-2 note).
 * ------------------------------------------------------------------------ */

const TASK_STATUSES = new Set(["PENDING", "IN_PROGRESS", "COMPLETE"]);

function toIso(v: Date | string | null): string | null {
  if (!v) return null;
  return v instanceof Date ? v.toISOString() : String(v);
}

function mapJourney(t: TrackerRow) {
  return {
    id: t.id,
    dealId: t.dealId,
    policyId: t.policyId,
    type: t.type === "ONBOARDING" ? "ONBOARDING" : "IMPLEMENTATION",
    templateId: t.templateId,
    productType: t.productType,
    goLiveDate: t.goLiveDate,
    status: t.status === "COMPLETE" ? "COMPLETE" : "IN_PROGRESS",
    assignedSpecialist: t.assignedSpecialist,
    overallProgress: t.overallProgress ?? 0,
    createdAt: toIso(t.createdAt),
    completedAt: toIso(t.completedAt),
  };
}

function mapPhase(p: PhaseRow) {
  return {
    id: p.id,
    trackerId: p.trackerId,
    phaseNumber: p.phaseNumber,
    phaseName: p.phaseName,
    targetDate: p.targetDate,
    status: p.status && TASK_STATUSES.has(p.status) ? p.status : "PENDING",
  };
}

function mapTask(t: TaskRow) {
  return {
    id: t.id,
    trackerId: t.trackerId,
    phaseId: t.phaseId,
    taskName: t.taskName,
    taskType: t.taskType,
    ownerType: t.ownerType,
    status: t.status && TASK_STATUSES.has(t.status) ? t.status : "PENDING",
    isMilestone: t.isMilestone ?? false,
    dueDate: t.dueDate,
    completedAt: toIso(t.completedAt),
    sortOrder: t.sortOrder,
  };
}

/* ------------------------------ access checks ---------------------------- */

async function ownsDeal(dealId: string | null, actor: Actor): Promise<boolean> {
  if (!dealId || !actor.orgId) return false;
  const [deal] = await db
    .select({ orgId: dealsTable.orgId })
    .from(dealsTable)
    .where(eq(dealsTable.id, dealId))
    .limit(1);
  return !!deal?.orgId && deal.orgId === actor.orgId;
}

/** Can the actor view this journey? Fail closed for unknown roles. */
async function canViewJourney(tracker: TrackerRow, actor: Actor): Promise<boolean> {
  if (VIEW_ALL_ROLES.has(actor.role)) return true;
  if (tracker.assignedSpecialist === actor.id) return true;
  if (actor.role === "EMPLOYER") return ownsDeal(tracker.dealId, actor);
  return false;
}

/* ---------------------------- progress recompute -------------------------- */

type DbOrTx = Pick<typeof db, "select" | "update" | "insert">;

/**
 * v2.4 §6D — tracker complete flips the account to Active Client, automated.
 * Mirrors the bind-time advance in webhooks.ts: a single conditional UPDATE, so a repeat
 * call matches zero rows (idempotent, no duplicate activity row) and an account that is
 * already Active Client is never downgraded.
 */
async function advanceAccountToActiveClient(trackerId: string, dbc: DbOrTx): Promise<void> {
  const [tracker] = await dbc
    .select({ dealId: implementationTrackersTable.dealId })
    .from(implementationTrackersTable)
    .where(eq(implementationTrackersTable.id, trackerId))
    .limit(1);
  if (!tracker?.dealId) return;

  const [deal] = await dbc
    .select({ accountId: dealsTable.accountId })
    .from(dealsTable)
    .where(eq(dealsTable.id, tracker.dealId))
    .limit(1);
  if (!deal?.accountId) return;

  const [account] = await dbc
    .select({ clientStage: accountsTable.clientStage })
    .from(accountsTable)
    .where(eq(accountsTable.id, deal.accountId))
    .limit(1);
  const fromStage = account?.clientStage ?? "—";

  const advanced = await dbc
    .update(accountsTable)
    .set({ clientStage: "Active Client", updatedAt: new Date() })
    .where(
      and(
        eq(accountsTable.id, deal.accountId),
        inArray(accountsTable.clientStage, [...PROSPECT_STAGES, "New Client"]),
      ),
    )
    .returning({ id: accountsTable.id });

  if (advanced.length === 0) return; // already Active Client — no duplicate log

  await dbc.insert(activityLogTable).values({
    dealId: tracker.dealId,
    entityType: "account",
    entityId: deal.accountId,
    eventType: "stage_changed",
    description: `Stage changed from "${fromStage}" to "Active Client" (implementation tracker complete).`,
    metadata: {
      changes: [{ field: "clientStage", label: "Stage", from: fromStage, to: "Active Client" }],
      trigger: "tracker_complete",
      trackerId,
    },
    createdBy: null,
  });
}

/**
 * Recompute overall_progress + tracker status and roll up phase statuses from
 * the tracker's tasks. overall = round(100 * complete / total), 0 if no tasks.
 */
export async function recomputeProgress(trackerId: string, dbc: DbOrTx = db): Promise<void> {
  const tasks = await dbc
    .select()
    .from(implementationTasksTable)
    .where(eq(implementationTasksTable.trackerId, trackerId));

  const total = tasks.length;
  const complete = tasks.filter((t) => t.status === "COMPLETE").length;
  const overallProgress = total === 0 ? 0 : Math.round((100 * complete) / total);
  const allComplete = total > 0 && complete === total;

  await dbc
    .update(implementationTrackersTable)
    .set({
      overallProgress,
      status: allComplete ? "COMPLETE" : "IN_PROGRESS",
      completedAt: allComplete ? new Date() : null,
    })
    .where(eq(implementationTrackersTable.id, trackerId));

  if (allComplete) await advanceAccountToActiveClient(trackerId, dbc);

  const phases = await dbc
    .select()
    .from(implementationPhasesTable)
    .where(eq(implementationPhasesTable.trackerId, trackerId));

  for (const phase of phases) {
    const phaseTasks = tasks.filter((t) => t.phaseId === phase.id);
    let status: string;
    if (phaseTasks.length > 0 && phaseTasks.every((t) => t.status === "COMPLETE")) {
      status = "COMPLETE";
    } else if (phaseTasks.some((t) => t.status === "COMPLETE" || t.status === "IN_PROGRESS")) {
      status = "IN_PROGRESS";
    } else {
      status = "PENDING";
    }
    if (status !== phase.status || (status === "COMPLETE") !== !!phase.completedAt) {
      await dbc
        .update(implementationPhasesTable)
        .set({ status, completedAt: status === "COMPLETE" ? (phase.completedAt ?? new Date()) : null })
        .where(eq(implementationPhasesTable.id, phase.id));
    }
  }
}

/* --------------------------------- routes -------------------------------- */

const listQuerySchema = z.object({
  dealId: z.string().optional(),
  type: z.enum(["IMPLEMENTATION", "ONBOARDING"]).optional(),
});

router.get("/", async (req, res) => {
  const actor = actorFrom(req);
  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
  const { dealId, type } = parsed.data;

  const filters = [];
  if (dealId) filters.push(eq(implementationTrackersTable.dealId, dealId));
  if (type) filters.push(eq(implementationTrackersTable.type, type));

  let rows: TrackerRow[];
  if (VIEW_ALL_ROLES.has(actor.role)) {
    rows = await db
      .select()
      .from(implementationTrackersTable)
      .where(filters.length ? and(...filters) : undefined);
  } else if (actor.role === "EMPLOYER") {
    // EMPLOYER: only journeys whose deal they own (deal-card §8 scoping).
    if (!actor.orgId) return res.json([]);
    const joined = await db
      .select({ tracker: implementationTrackersTable })
      .from(implementationTrackersTable)
      .innerJoin(dealsTable, eq(implementationTrackersTable.dealId, dealsTable.id))
      .where(and(eq(dealsTable.orgId, actor.orgId), ...filters));
    rows = joined.map((r) => r.tracker);
  } else {
    // Other roles: only journeys where they are the assigned specialist.
    rows = await db
      .select()
      .from(implementationTrackersTable)
      .where(and(eq(implementationTrackersTable.assignedSpecialist, actor.id), ...filters));
  }

  return res.json(rows.map(mapJourney));
});

router.get("/:id", async (req, res) => {
  const actor = actorFrom(req);
  const [tracker] = await db
    .select()
    .from(implementationTrackersTable)
    .where(eq(implementationTrackersTable.id, req.params.id))
    .limit(1);
  if (!tracker) return res.status(404).json({ error: "Journey not found" });
  if (!(await canViewJourney(tracker, actor))) {
    return res.status(403).json({ error: "Insufficient permissions" });
  }

  const phases = await db
    .select()
    .from(implementationPhasesTable)
    .where(eq(implementationPhasesTable.trackerId, tracker.id))
    .orderBy(asc(implementationPhasesTable.phaseNumber));
  const tasks = await db
    .select()
    .from(implementationTasksTable)
    .where(eq(implementationTasksTable.trackerId, tracker.id))
    .orderBy(asc(implementationTasksTable.sortOrder));

  return res.json({
    ...mapJourney(tracker),
    phases: phases.map(mapPhase),
    tasks: tasks.map(mapTask),
  });
});

const updateTaskStatusSchema = z.object({
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETE"]),
});

router.patch("/:id/tasks/:taskId", async (req, res) => {
  const actor = actorFrom(req);
  const parsed = updateTaskStatusSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });

  const [tracker] = await db
    .select()
    .from(implementationTrackersTable)
    .where(eq(implementationTrackersTable.id, req.params.id))
    .limit(1);
  if (!tracker) return res.status(404).json({ error: "Journey not found" });

  const [task] = await db
    .select()
    .from(implementationTasksTable)
    .where(
      and(
        eq(implementationTasksTable.id, req.params.taskId),
        eq(implementationTasksTable.trackerId, tracker.id),
      ),
    )
    .limit(1);
  if (!task) return res.status(404).json({ error: "Task not found" });

  // Server-enforced ownership.
  let allowed = false;
  if (INTERNAL_ROLES.has(actor.role)) {
    // Internal roles: ADMIN/CSA anywhere; AGENT/UNDERWRITER only as the
    // journey's assigned specialist.
    allowed = VIEW_ALL_ROLES.has(actor.role) || tracker.assignedSpecialist === actor.id;
  } else if (actor.role === "EMPLOYER") {
    // EMPLOYER may only update CLIENT-owned tasks on a deal they own.
    allowed = task.ownerType === "CLIENT" && (await ownsDeal(tracker.dealId, actor));
  }
  if (!allowed) return res.status(403).json({ error: "Insufficient permissions" });

  const status = parsed.data.status;
  // Atomic: the task write and the progress/Active-Client recompute must commit or roll
  // back together. If they were separate and the process died between them on the LAST
  // task, the tracker would read 100% while the account stayed "New Client" forever, with
  // nothing to retry the conversion (v2.4 §6D).
  const updated = await db.transaction(async (tx) => {
    const [row] = await tx
      .update(implementationTasksTable)
      .set({
        status,
        completedAt: status === "COMPLETE" ? new Date() : null,
        completedBy: status === "COMPLETE" ? actor.id : null,
      })
      .where(eq(implementationTasksTable.id, task.id))
      .returning();
    await recomputeProgress(tracker.id, tx);
    return row;
  });

  return res.json(mapTask(updated!));
});

export default router;
