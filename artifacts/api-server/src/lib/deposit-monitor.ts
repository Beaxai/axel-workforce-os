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
import { db, dealsTable, activityLogTable, type Deal } from "@workspace/db";
import { eq } from "drizzle-orm";

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
