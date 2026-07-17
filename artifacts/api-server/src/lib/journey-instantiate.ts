/**
 * P5b W1 Task 5 — Bound instantiation: copy active journey templates into
 * concrete journey instances (implementation_trackers/phases/tasks) for a deal.
 *
 * Called from the deals router's Bound trigger INSIDE the FOR UPDATE
 * transaction, so instantiation commits (or rolls back) atomically with the
 * stage move and stays serialized against concurrent transitions.
 */
import type { db } from "@workspace/db";
import {
  journeyTemplatesTable,
  journeyTemplatePhasesTable,
  journeyTemplateTasksTable,
  implementationTrackersTable,
  implementationPhasesTable,
  implementationTasksTable,
  type Deal,
} from "@workspace/db";
import { eq, and, or, asc } from "drizzle-orm";

type Db = typeof db;
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
export type DbOrTx = Db | Tx;

export interface InstantiateResult {
  /** Template ids a journey was created from. At most one (v2.4 §8). */
  created: string[];
  /** Template ids skipped because a matching tracker already exists (idempotent). */
  skipped: string[];
  /** True when no active template matched the deal's product at all. */
  noTemplate: boolean;
  /** Candidates that lost the match (config ambiguity) — logged, never created. */
  ambiguous?: string[];
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function instantiateJourneysForDeal(deal: Deal, dbc: DbOrTx): Promise<InstantiateResult> {
  const today = new Date().toISOString().slice(0, 10);

  // 1. Active IMPLEMENTATION templates that could match this deal.
  const candidates = await dbc
    .select()
    .from(journeyTemplatesTable)
    .where(
      and(
        eq(journeyTemplatesTable.isActive, true),
        eq(journeyTemplatesTable.type, "IMPLEMENTATION"),
        or(
          eq(journeyTemplatesTable.productType, deal.productType ?? ""),
          eq(journeyTemplatesTable.productType, "ANY"),
        ),
      ),
    );

  if (candidates.length === 0) {
    return { created: [], skipped: [], noTemplate: true };
  }

  // 2. Curtis v2.4 §8: exactly ONE tracker — the one matching the deal's product.
  // Exact product beats ANY; then highest version; then earliest created.
  const exact = candidates.filter((t) => t.productType === deal.productType);
  const pool = exact.length > 0 ? exact : candidates;
  const ranked = [...pool].sort((a, b) => {
    if (b.version !== a.version) return b.version - a.version;
    return (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0);
  });
  const chosen = ranked[0]!;
  const ambiguous = ranked.slice(1).map((t) => t.id);
  const templates = [chosen];

  const created: string[] = [];
  const skipped: string[] = [];

  for (const template of templates) {
    // 2a. Idempotency: skip if a tracker already exists for this
    // (deal, journey type, product type) combination.
    const existing = await dbc
      .select({ id: implementationTrackersTable.id })
      .from(implementationTrackersTable)
      .where(
        and(
          eq(implementationTrackersTable.dealId, deal.id),
          eq(implementationTrackersTable.type, template.type),
          eq(implementationTrackersTable.productType, template.productType),
        ),
      )
      .limit(1);
    if (existing.length > 0) {
      skipped.push(template.id);
      continue;
    }

    // 2b. Create the tracker.
    const [tracker] = await dbc
      .insert(implementationTrackersTable)
      .values({
        dealId: deal.id,
        type: template.type,
        templateId: template.id,
        productType: template.productType,
        goLiveDate: today,
        status: "IN_PROGRESS",
        overallProgress: 0,
      })
      .returning();

    // 2c. Copy phases; map template phase id → new instance phase id.
    const templatePhases = await dbc
      .select()
      .from(journeyTemplatePhasesTable)
      .where(eq(journeyTemplatePhasesTable.templateId, template.id))
      .orderBy(asc(journeyTemplatePhasesTable.sortOrder));

    const phaseIdMap = new Map<string, string>();
    for (const tp of templatePhases) {
      const [phase] = await dbc
        .insert(implementationPhasesTable)
        .values({
          trackerId: tracker!.id,
          phaseNumber: tp.sortOrder,
          phaseName: tp.name,
          targetDate: addDays(today, tp.targetOffsetDays),
          status: "PENDING",
        })
        .returning();
      phaseIdMap.set(tp.id, phase!.id);
    }

    // 2d. Copy tasks.
    const templateTasks = await dbc
      .select()
      .from(journeyTemplateTasksTable)
      .where(eq(journeyTemplateTasksTable.templateId, template.id))
      .orderBy(asc(journeyTemplateTasksTable.sortOrder));

    for (const tt of templateTasks) {
      await dbc.insert(implementationTasksTable).values({
        trackerId: tracker!.id,
        phaseId: phaseIdMap.get(tt.phaseId) ?? null,
        taskName: tt.name,
        taskType: tt.taskType,
        ownerType: tt.ownerType,
        dueDate: addDays(today, tt.offsetDays),
        status: "PENDING",
        isMilestone: tt.isMilestone,
        sortOrder: tt.sortOrder,
        systemKey: tt.systemKey,
      });
    }

    created.push(template.id);
  }

  return { created, skipped, noTemplate: false, ambiguous };
}
