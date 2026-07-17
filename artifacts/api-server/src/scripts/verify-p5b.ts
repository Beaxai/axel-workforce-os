/**
 * P5b verification harness — proves the journey engine executed as intended.
 *
 * Exercises the REAL Bound instantiation + progress-recompute code paths against
 * the live DB, asserting every intended behavior, then ROLLS THE WHOLE THING BACK
 * so not a single permanent row is written (safe on any environment — it never
 * mutates real deals, templates, or trackers).
 *
 * Run:  pnpm --filter @workspace/api-server exec tsx src/scripts/verify-p5b.ts
 * Exit: 0 = all checks passed, 1 = at least one failed.
 */
import {
  db,
  dealsTable,
  journeyTemplatesTable,
  journeyTemplatePhasesTable,
  journeyTemplateTasksTable,
  implementationTrackersTable,
  implementationPhasesTable,
  implementationTasksTable,
  type Deal,
} from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { instantiateJourneysForDeal } from "../lib/journey-instantiate";
import { recomputeProgress } from "../routes/journeys";

/** Same date math the instantiator uses — so expected dates match exactly. */
function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
const day = (v: unknown) => String(v).slice(0, 10);

type Result = { name: string; pass: boolean; detail?: string };
const results: Result[] = [];
function check(name: string, pass: boolean, detail = "") {
  results.push({ name, pass, detail });
}

/** Sentinel thrown to force the verification transaction to roll back. */
class Rollback extends Error {}

async function main() {
  const today = new Date().toISOString().slice(0, 10);

  try {
    await db.transaction(async (tx) => {
      // ---- pick a real deal that has NO tracker yet (read-only) --------------
      const trackerDealIds = new Set(
        (await tx.select({ dealId: implementationTrackersTable.dealId }).from(implementationTrackersTable)).map(
          (r) => r.dealId,
        ),
      );
      const someDeals = await tx
        .select({ id: dealsTable.id, productType: dealsTable.productType })
        .from(dealsTable)
        .limit(50);
      const picked = someDeals.find((d) => !trackerDealIds.has(d.id)) ?? someDeals[0];
      if (!picked) {
        check("precondition: a deal exists to bind", false, "no rows in `deals` — create/bind one first");
        throw new Rollback();
      }
      check("precondition: a deal exists to bind", true, `deal ${picked.id}`);
      const deal = { id: picked.id, productType: picked.productType } as Deal;

      // ---- build a throwaway ACTIVE template (EXACT product match for the deal) -
      const [tpl] = await tx
        .insert(journeyTemplatesTable)
        .values({
          name: "__verify__ playbook",
          type: "IMPLEMENTATION",
          productType: picked.productType ?? "ANY",
          isActive: true,
        })
        .returning();
      const [p1] = await tx
        .insert(journeyTemplatePhasesTable)
        .values({ templateId: tpl!.id, name: "Phase One", sortOrder: 1, targetOffsetDays: 7 })
        .returning();
      const [p2] = await tx
        .insert(journeyTemplatePhasesTable)
        .values({ templateId: tpl!.id, name: "Phase Two", sortOrder: 2, targetOffsetDays: 14 })
        .returning();
      await tx.insert(journeyTemplateTasksTable).values([
        { templateId: tpl!.id, phaseId: p1!.id, name: "vt-internal-a", ownerType: "INTERNAL_SPECIALIST", isMilestone: false, offsetDays: 3, sortOrder: 1 },
        { templateId: tpl!.id, phaseId: p1!.id, name: "vt-client-b", ownerType: "CLIENT", isMilestone: false, offsetDays: 5, sortOrder: 2 },
        { templateId: tpl!.id, phaseId: p2!.id, name: "vt-milestone-c", ownerType: "INTERNAL_SPECIALIST", isMilestone: true, offsetDays: 10, sortOrder: 3, systemKey: "VT_TEST_KEY" },
      ]);

      // A2 setup: a competing ANY template — the amended rule must pick exactly ONE.
      const [tplAny] = await tx
        .insert(journeyTemplatesTable)
        .values({ name: "__verify__ ANY playbook", type: "IMPLEMENTATION", productType: "ANY", isActive: true })
        .returning();
      const [pAny] = await tx
        .insert(journeyTemplatePhasesTable)
        .values({ templateId: tplAny!.id, name: "Any Phase", sortOrder: 1, targetOffsetDays: 1 })
        .returning();
      await tx.insert(journeyTemplateTasksTable).values({
        templateId: tplAny!.id, phaseId: pAny!.id, name: "vt-any-task",
        ownerType: "INTERNAL_SPECIALIST", isMilestone: false, offsetDays: 1, sortOrder: 1,
      });

      // ========================================================================
      // A. Bound instantiation creates a journey from the active template
      // ========================================================================
      const r1 = await instantiateJourneysForDeal(deal, tx);
      check("A. exactly ONE tracker created (v2.4 amended rule)", r1.created.length === 1, JSON.stringify(r1));
      check(
        "A. the PRODUCT-MATCHED template won, not ANY",
        r1.created[0] === tpl!.id,
        `created=${r1.created[0]} expected=${tpl!.id}`,
      );
      check("A. instantiate → 1 journey created", r1.created.length === 1 && r1.created[0] === tpl!.id, JSON.stringify(r1));
      check("A. noTemplate flag is false", r1.noTemplate === false);

      const [tracker] = await tx
        .select()
        .from(implementationTrackersTable)
        .where(and(eq(implementationTrackersTable.dealId, deal.id), eq(implementationTrackersTable.templateId, tpl!.id)));

      // ========================================================================
      // B. Tracker + phases + tasks copied with correct fields and dates
      // ========================================================================
      check("B. tracker type = IMPLEMENTATION", tracker?.type === "IMPLEMENTATION");
      check(
        "B. tracker productType copied from template",
        tracker?.productType === tpl!.productType,
        `${tracker?.productType} vs ${tpl!.productType}`,
      );
      check("B. tracker goLiveDate = today", day(tracker?.goLiveDate) === today, `${day(tracker?.goLiveDate)} vs ${today}`);
      check("B. tracker status = IN_PROGRESS", tracker?.status === "IN_PROGRESS");
      check("B. tracker overallProgress = 0", (tracker?.overallProgress ?? -1) === 0);

      const iphases = await tx
        .select()
        .from(implementationPhasesTable)
        .where(eq(implementationPhasesTable.trackerId, tracker!.id));
      check("B. 2 phases copied", iphases.length === 2);
      const ip1 = iphases.find((p) => p.phaseNumber === 1);
      const ip2 = iphases.find((p) => p.phaseNumber === 2);
      check("B. phase targetDate = go-live + offset", day(ip1?.targetDate) === addDays(today, 7) && day(ip2?.targetDate) === addDays(today, 14),
        `${day(ip1?.targetDate)}/${day(ip2?.targetDate)}`);

      const itasks = await tx
        .select()
        .from(implementationTasksTable)
        .where(eq(implementationTasksTable.trackerId, tracker!.id));
      const byName = new Map(itasks.map((t) => [t.taskName, t]));
      check("B. 3 tasks copied", itasks.length === 3);
      check("B. task dueDate = anchor + offset", day(byName.get("vt-internal-a")?.dueDate) === addDays(today, 3) && day(byName.get("vt-milestone-c")?.dueDate) === addDays(today, 10));
      check("B. ownerType preserved (CLIENT vs INTERNAL)", byName.get("vt-client-b")?.ownerType === "CLIENT" && byName.get("vt-internal-a")?.ownerType === "INTERNAL_SPECIALIST");
      check("B. isMilestone preserved", byName.get("vt-milestone-c")?.isMilestone === true && byName.get("vt-internal-a")?.isMilestone === false);
      check("B. all tasks start PENDING", itasks.every((t) => t.status === "PENDING"));
      check("B. phase mapping correct (task → its phase)", byName.get("vt-internal-a")?.phaseId === ip1?.id && byName.get("vt-milestone-c")?.phaseId === ip2?.id);
      check(
        "B. systemKey copied onto the live task",
        byName.get("vt-milestone-c")?.systemKey === "VT_TEST_KEY",
        `got=${byName.get("vt-milestone-c")?.systemKey}`,
      );

      // ========================================================================
      // C. Idempotent — re-binding does not duplicate
      // ========================================================================
      const r2 = await instantiateJourneysForDeal(deal, tx);
      check("C. re-instantiate → skipped, not created", r2.created.length === 0 && r2.skipped.length === 1);
      const fromThisTemplate = (
        await tx
          .select({ id: implementationTrackersTable.id })
          .from(implementationTrackersTable)
          .where(and(eq(implementationTrackersTable.dealId, deal.id), eq(implementationTrackersTable.templateId, tpl!.id)))
      ).length;
      check("C. exactly one tracker from this template (no duplicate)", fromThisTemplate === 1, `count=${fromThisTemplate}`);

      // ========================================================================
      // D. Progress recompute rolls up tasks → phases → tracker
      // ========================================================================
      await tx.update(implementationTasksTable).set({ status: "COMPLETE" }).where(eq(implementationTasksTable.trackerId, tracker!.id));
      await recomputeProgress(tracker!.id, tx);
      let [t2] = await tx.select().from(implementationTrackersTable).where(eq(implementationTrackersTable.id, tracker!.id));
      check("D. all complete → progress 100", (t2?.overallProgress ?? -1) === 100);
      check("D. all complete → tracker COMPLETE + completedAt set", t2?.status === "COMPLETE" && !!t2?.completedAt);
      const phasesAllDone = await tx.select().from(implementationPhasesTable).where(eq(implementationPhasesTable.trackerId, tracker!.id));
      check("D. all complete → every phase COMPLETE", phasesAllDone.every((p) => p.status === "COMPLETE"));

      // partial: reopen one task, recompute
      await tx.update(implementationTasksTable).set({ status: "PENDING" }).where(and(eq(implementationTasksTable.trackerId, tracker!.id), eq(implementationTasksTable.taskName, "vt-client-b")));
      await recomputeProgress(tracker!.id, tx);
      [t2] = await tx.select().from(implementationTrackersTable).where(eq(implementationTrackersTable.id, tracker!.id));
      check("D. partial → progress 67 (2 of 3)", (t2?.overallProgress ?? -1) === 67, `${t2?.overallProgress}`);
      check("D. partial → tracker back to IN_PROGRESS, completedAt cleared", t2?.status === "IN_PROGRESS" && !t2?.completedAt);
      const phasesPartial = await tx.select().from(implementationPhasesTable).where(eq(implementationPhasesTable.trackerId, tracker!.id));
      check("D. partial → phase 1 IN_PROGRESS, phase 2 COMPLETE",
        phasesPartial.find((p) => p.phaseNumber === 1)?.status === "IN_PROGRESS" && phasesPartial.find((p) => p.phaseNumber === 2)?.status === "COMPLETE");

      // ========================================================================
      // E. No matching active template → nothing instantiated + noTemplate flag
      // ========================================================================
      const otherActive = (
        await tx.select({ id: journeyTemplatesTable.id }).from(journeyTemplatesTable).where(eq(journeyTemplatesTable.isActive, true))
      ).filter((t) => t.id !== tpl!.id && t.id !== tplAny!.id);
      if (otherActive.length > 0) {
        check("E. no-template case (SKIPPED — other active templates exist)", true, `${otherActive.length} other active template(s) in DB`);
      } else {
        await tx.update(journeyTemplatesTable).set({ isActive: false }).where(eq(journeyTemplatesTable.id, tpl!.id));
        await tx.update(journeyTemplatesTable).set({ isActive: false }).where(eq(journeyTemplatesTable.id, tplAny!.id));
        const r3 = await instantiateJourneysForDeal({ id: deal.id, productType: "ZZ_NO_MATCH" } as Deal, tx);
        check("E. no active template → noTemplate=true, nothing created", r3.noTemplate === true && r3.created.length === 0);
      }

      // roll everything back — this verification writes nothing permanent
      throw new Rollback();
    });
  } catch (e) {
    if (!(e instanceof Rollback)) {
      check("harness ran without throwing", false, (e as Error)?.message ?? String(e));
    }
  }

  // ---- report -------------------------------------------------------------
  const pass = results.filter((r) => r.pass).length;
  const fail = results.length - pass;
  console.log("\n──────────── P5b verification ────────────");
  for (const r of results) {
    console.log(`${r.pass ? "  PASS" : "✗ FAIL"}  ${r.name}${r.detail ? `  — ${r.detail}` : ""}`);
  }
  console.log("──────────────────────────────────────────");
  console.log(`${fail === 0 ? "ALL PASS" : "FAILURES"}: ${pass}/${results.length} checks passed.`);
  console.log("(DB rolled back — no permanent rows written.)\n");
  process.exit(fail === 0 ? 0 : 1);
}

void main();