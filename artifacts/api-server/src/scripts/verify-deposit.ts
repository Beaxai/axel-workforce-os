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
import { addDaysIso, startDepositMonitor, DEPOSIT_WINDOW_DAYS } from "../lib/deposit-monitor";

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
