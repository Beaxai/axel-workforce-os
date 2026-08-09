/**
 * WC-3b verification harness — §6E deposit monitor (State Doc lines 232–234).
 *
 * Runs inside ONE transaction and ROLLS BACK — zero permanent rows on any
 * environment. Extended task by task (same protocol as verify-scope.ts).
 *
 * Run:  pnpm --filter @workspace/api-server exec tsx src/scripts/verify-deposit.ts
 * Exit: 0 = all checks passed, 1 = at least one failed.
 */
import { db, dealsTable, accountsTable, activityLogTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  addDaysIso,
  startDepositMonitor,
  sweepDepositDay21Tasks,
  resolveDeposit,
  DEPOSIT_WINDOW_DAYS,
  DEPOSIT_CSA_TASK_DAY,
} from "../lib/deposit-monitor";
import { tasksTable } from "@workspace/db";

type Result = { name: string; pass: boolean; detail?: string };
const results: Result[] = [];
function check(name: string, pass: boolean, detail = "") {
  results.push({ name, pass, detail });
}

/** Sentinel thrown to force the verification transaction to roll back. */
class Rollback extends Error {}

async function main() {
  const stamp = Date.now();

  try {
    await db.transaction(async (tx) => {
      const [account] = await tx
        .insert(accountsTable)
        .values({ businessName: `WC3B Deposit Co ${stamp}` })
        .returning({ id: accountsTable.id });

      const boundAt = new Date();
      const [deal] = await tx
        .insert(dealsTable)
        .values({
          referenceCode: `WC3B-${stamp}`,
          businessName: "Deposit monitor test deal",
          accountId: account!.id,
          stage: "BOUND",
          productType: "WC",
          boundAt,
        })
        .returning();

      // ---- Task 1: monitor starts on bind ------------------------------------
      const first = await startDepositMonitor(deal!, tx);
      const expectedDue = addDaysIso(boundAt, DEPOSIT_WINDOW_DAYS);
      check(
        "start: monitor starts with due date = bind date + 30 (§6E)",
        first.started === true && first.dueDate === expectedDue,
        `got ${first.dueDate}, expected ${expectedDue}`,
      );

      const [afterStart] = await tx.select().from(dealsTable).where(eq(dealsTable.id, deal!.id));
      check(
        "start: deal row shows MONITORING + due date persisted",
        afterStart!.depositStatus === "MONITORING" && afterStart!.depositDueDate === expectedDue,
        `status=${afterStart!.depositStatus} due=${afterStart!.depositDueDate}`,
      );

      const [logRow] = await tx
        .select()
        .from(activityLogTable)
        .where(eq(activityLogTable.dealId, deal!.id));
      check(
        "start: activity feed records the monitor start",
        !!logRow && logRow.eventType === "DEPOSIT_MONITOR",
        `eventType=${logRow?.eventType}`,
      );

      const second = await startDepositMonitor(afterStart!, tx);
      check("start: re-entering BOUND is a no-op (idempotent)", second.started === false);

      // A resolved deposit must never be reset by a stage re-entry.
      await tx.update(dealsTable).set({ depositStatus: "CONFIRMED" }).where(eq(dealsTable.id, deal!.id));
      const [confirmed] = await tx.select().from(dealsTable).where(eq(dealsTable.id, deal!.id));
      const third = await startDepositMonitor(confirmed!, tx);
      const [afterThird] = await tx.select().from(dealsTable).where(eq(dealsTable.id, deal!.id));
      check(
        "start: a CONFIRMED deposit is never reset to MONITORING",
        third.started === false && afterThird!.depositStatus === "CONFIRMED",
        `status=${afterThird!.depositStatus}`,
      );

      // ---- Task 2: day-21 CSA task sweep --------------------------------------
      // Deal 2 bound 22 days ago → the sweep must create exactly one task.
      const bound22 = new Date();
      bound22.setUTCDate(bound22.getUTCDate() - (DEPOSIT_CSA_TASK_DAY + 1));
      const [deal2] = await tx
        .insert(dealsTable)
        .values({
          referenceCode: `WC3B2-${stamp}`,
          businessName: "Deposit day-21 test deal",
          accountId: account!.id,
          stage: "BOUND",
          productType: "WC",
          boundAt: bound22,
        })
        .returning();
      await startDepositMonitor(deal2!, tx);

      const sweep1 = await sweepDepositDay21Tasks(new Date(), tx);
      check(
        "day-21: sweep creates the CSA task for a deal bound 22 days ago",
        sweep1.created.includes(deal2!.id),
        `created=${JSON.stringify(sweep1.created)}`,
      );
      const tasks2 = await tx.select().from(tasksTable).where(eq(tasksTable.dealId, deal2!.id));
      check(
        "day-21: task lands in the existing tasks table, OPEN + HIGH",
        tasks2.length === 1 && tasks2[0]!.status === "OPEN" && tasks2[0]!.priority === "HIGH",
        `count=${tasks2.length} status=${tasks2[0]?.status} priority=${tasks2[0]?.priority}`,
      );
      const sweep2 = await sweepDepositDay21Tasks(new Date(), tx);
      const tasksAfter = await tx.select().from(tasksTable).where(eq(tasksTable.dealId, deal2!.id));
      check(
        "day-21: sweep is idempotent — exactly one task ever",
        !sweep2.created.includes(deal2!.id) && tasksAfter.length === 1,
        `second sweep created=${JSON.stringify(sweep2.created)} tasks=${tasksAfter.length}`,
      );
      // Deal 1 was bound today — the sweep must NOT create a task for it.
      const tasks1 = await tx.select().from(tasksTable).where(eq(tasksTable.dealId, deal!.id));
      check("day-21: no task for a deal bound < 21 days ago", tasks1.length === 0, `count=${tasks1.length}`);

      // ---- Task 3: resolve actions --------------------------------------------
      const cancel = await resolveDeposit(deal2!.id, "cancel_notice", "Test CSA", tx);
      const [afterCancel] = await tx.select().from(dealsTable).where(eq(dealsTable.id, deal2!.id));
      check(
        "resolve: cancel notice flags AT_RISK",
        cancel.ok && afterCancel!.depositStatus === "AT_RISK",
        `status=${afterCancel!.depositStatus}`,
      );
      const lateConfirm = await resolveDeposit(deal2!.id, "confirm", "Test CSA", tx);
      const [afterLate] = await tx.select().from(dealsTable).where(eq(dealsTable.id, deal2!.id));
      check(
        "resolve: late payment can clear AT_RISK → CONFIRMED",
        lateConfirm.ok && afterLate!.depositStatus === "CONFIRMED",
        `status=${afterLate!.depositStatus}`,
      );
      const cancelAfterConfirm = await resolveDeposit(deal2!.id, "cancel_notice", "Test CSA", tx);
      check(
        "resolve: cancel notice rejected once CONFIRMED",
        !cancelAfterConfirm.ok,
        JSON.stringify(cancelAfterConfirm),
      );
      const noMonitor = await resolveDeposit(account!.id /* not a deal */, "confirm", "Test CSA", tx);
      check("resolve: rejects a deal without an active monitor", !noMonitor.ok);

      // ---- Non-gating invariant ------------------------------------------------
      // Nothing in the module wrote to stage or any journey/tracker table.
      const [dealStage] = await tx.select({ stage: dealsTable.stage }).from(dealsTable).where(eq(dealsTable.id, deal2!.id));
      check("non-gating: deposit actions never change the deal stage", dealStage!.stage === "BOUND", `stage=${dealStage!.stage}`);

      throw new Rollback();
    });
  } catch (e) {
    if (!(e instanceof Rollback)) throw e;
  }

  let failed = 0;
  for (const r of results) {
    const mark = r.pass ? "PASS" : "FAIL";
    if (!r.pass) failed++;
    console.log(`[${mark}] ${r.name}${r.detail ? ` — ${r.detail}` : ""}`);
  }
  console.log(`\n${results.length - failed}/${results.length} checks passed (all rows rolled back)`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
