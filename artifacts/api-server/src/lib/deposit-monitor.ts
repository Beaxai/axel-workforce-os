/**
 * WC-3b — §6E deposit monitor (State Doc v2.4, lines 232–234).
 *
 * "Client pays the carrier deposit directly; Axel has no payment signal —
 *  silence means paid; the only firm signal is a carrier cancel-for-nonpay
 *  notice (~30 days). Therefore deposit NEVER gates Active Client conversion."
 * "30-day timer from bind date; CSA task at day 21 to request carrier
 *  confirmation; a cancel-for-nonpay notice flags the deal at-risk with an alert"
 *
 * PARALLEL + NON-GATING is the invariant: nothing in this module may block or
 * be consulted by the Active Client conversion (journeys/recomputeProgress).
 */
import { db, dealsTable, activityLogTable, tasksTable, type Deal } from "@workspace/db";
import { and, eq, isNull, lte } from "drizzle-orm";

type Dbc = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/** §6E: deposit due within 30 days of binding. */
export const DEPOSIT_WINDOW_DAYS = 30;
/** §6E: CSA confirmation-request task fires at day 21. */
export const DEPOSIT_CSA_TASK_DAY = 21;

export const DEPOSIT_STATUSES = ["MONITORING", "CONFIRMED", "AT_RISK"] as const;
export type DepositStatus = (typeof DEPOSIT_STATUSES)[number];

/** YYYY-MM-DD, `days` after `from` (UTC — same date math as the journey engine). */
export function addDaysIso(from: Date, days: number): string {
  const d = new Date(from);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Start the §6E monitor on entry to BOUND. Idempotent: a deal that already has
 * any deposit status (monitoring or resolved) is left untouched, so re-entering
 * the stage can't reset a confirmed/at-risk deposit.
 */
export async function startDepositMonitor(
  deal: Deal,
  dbc: Dbc = db,
): Promise<{ started: boolean; dueDate?: string }> {
  if (deal.depositStatus) return { started: false };
  const bindDate = deal.boundAt ?? new Date();
  const dueDate = addDaysIso(bindDate, DEPOSIT_WINDOW_DAYS);
  await dbc
    .update(dealsTable)
    .set({ depositStatus: "MONITORING", depositDueDate: dueDate })
    .where(eq(dealsTable.id, deal.id));
  await dbc.insert(activityLogTable).values({
    dealId: deal.id,
    entityType: "deal",
    entityId: deal.id,
    eventType: "DEPOSIT_MONITOR",
    description: `Deposit monitor started — carrier deposit due by ${dueDate}. Client pays the carrier directly; non-blocking (§6E).`,
    metadata: { dueDate, windowDays: DEPOSIT_WINDOW_DAYS },
  });
  return { started: true, dueDate };
}

/**
 * Task 2 — §6E day-21 CSA task sweep. For every deal still MONITORING whose
 * bind date is ≥ 21 days ago and which has not yet had its day-21 task
 * stamped, create a CSA task ("request carrier confirmation") in the existing
 * tasks table (it appears in the deal's task drawer — no new screens) and
 * stamp `depositDay21TaskAt` so the task fires exactly once per deal.
 * Runs from a background sweeper; also safe to call manually.
 */
export async function sweepDepositDay21Tasks(
  now: Date = new Date(),
  dbc: Dbc = db,
): Promise<{ created: string[] }> {
  const threshold = new Date(now);
  threshold.setUTCDate(threshold.getUTCDate() - DEPOSIT_CSA_TASK_DAY);

  const due = await dbc
    .select()
    .from(dealsTable)
    .where(
      and(
        eq(dealsTable.depositStatus, "MONITORING"),
        isNull(dealsTable.depositDay21TaskAt),
        lte(dealsTable.boundAt, threshold),
      ),
    );

  const created: string[] = [];
  for (const deal of due) {
    // Per-deal atomic unit: stamp + task + audit log commit (or fail) together,
    // so a task-insert failure can't permanently suppress the reminder. Uses a
    // nested transaction (savepoint) when called inside an outer tx.
    await dbc.transaction(async (unit) => {
      // Guarded stamp — requires the deal to STILL be MONITORING and unstamped,
      // so a concurrent sweep or a just-confirmed deposit skips task creation.
      const stamped = await unit
        .update(dealsTable)
        .set({ depositDay21TaskAt: now })
        .where(
          and(
            eq(dealsTable.id, deal.id),
            isNull(dealsTable.depositDay21TaskAt),
            eq(dealsTable.depositStatus, "MONITORING"),
          ),
        )
        .returning({ id: dealsTable.id });
      if (stamped.length === 0) return;

      await unit.insert(tasksTable).values({
        dealId: deal.id,
        taskName: `Confirm carrier deposit received — ${deal.businessName} (due ${deal.depositDueDate ?? "in 9 days"})`,
        category: "DEPOSIT",
        priority: "HIGH",
        dueDate: deal.depositDueDate ?? null,
        status: "OPEN",
      });
      await unit.insert(activityLogTable).values({
        dealId: deal.id,
        entityType: "deal",
        entityId: deal.id,
        eventType: "DEPOSIT_MONITOR",
        description: `Day-21 CSA task created — request deposit confirmation from the carrier (§6E).`,
        metadata: { day: DEPOSIT_CSA_TASK_DAY, dueDate: deal.depositDueDate },
      });
      created.push(deal.id);
    });
  }
  return { created };
}

/**
 * Task 3 — resolve the monitor from the deal card.
 * `confirm`: CSA marks the deposit confirmed (allowed from MONITORING or
 * AT_RISK — a late payment can clear an at-risk flag).
 * `cancel_notice`: CSA records a carrier cancel-for-nonpay notice → AT_RISK.
 * NON-GATING invariant: neither transition touches stage, trackers, or the
 * Active Client conversion.
 */
export async function resolveDeposit(
  dealId: string,
  action: "confirm" | "cancel_notice",
  actorName: string,
  dbc: Dbc = db,
): Promise<{ ok: true; status: DepositStatus } | { ok: false; error: string }> {
  // Row lock (nested tx / savepoint safe) serializes concurrent resolves, so
  // the status transition + audit log commit atomically and last-write races
  // can't produce contradictory success responses.
  return dbc.transaction(async (unit) => {
    const [deal] = await unit
      .select()
      .from(dealsTable)
      .where(eq(dealsTable.id, dealId))
      .for("update")
      .limit(1);
    if (!deal) return { ok: false as const, error: "Deal not found." };
    if (!deal.depositStatus) return { ok: false as const, error: "No deposit monitor is active on this deal." };

    if (action === "confirm") {
      if (deal.depositStatus === "CONFIRMED") return { ok: true as const, status: "CONFIRMED" as const };
      await unit.update(dealsTable).set({ depositStatus: "CONFIRMED" }).where(eq(dealsTable.id, dealId));
      await unit.insert(activityLogTable).values({
        dealId,
        entityType: "deal",
        entityId: dealId,
        eventType: "DEPOSIT_MONITOR",
        description: `Carrier deposit confirmed by ${actorName}.`,
        metadata: { from: deal.depositStatus, to: "CONFIRMED" },
      });
      return { ok: true as const, status: "CONFIRMED" as const };
    }

    // cancel_notice
    if (deal.depositStatus === "CONFIRMED") {
      return { ok: false as const, error: "Deposit is already confirmed — a cancellation notice cannot be recorded." };
    }
    if (deal.depositStatus === "AT_RISK") return { ok: true as const, status: "AT_RISK" as const };
    await unit.update(dealsTable).set({ depositStatus: "AT_RISK" }).where(eq(dealsTable.id, dealId));
    await unit.insert(activityLogTable).values({
      dealId,
      entityType: "deal",
      entityId: dealId,
      eventType: "DEPOSIT_MONITOR",
      description: `Cancel-for-nonpay notice recorded by ${actorName} — deal flagged AT RISK (§6E; never gates onboarding).`,
      metadata: { from: deal.depositStatus, to: "AT_RISK" },
    });
    return { ok: true as const, status: "AT_RISK" as const };
  });
}
