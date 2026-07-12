/* eslint-disable no-console */
/**
 * Phase 4.1 — Revert deals from the 10 sales-funnel stages back to the 8
 * operational stages (State Document correction: the 10-stage funnel was an
 * oversight; Lost is a COLUMN again, not an outcome).
 *
 * Reverse mapping (10 -> 8):
 *   NEW_LEAD, QUALIFIED, NEEDS_ANALYSIS -> SUBMISSION_REVIEW
 *   PROPOSAL_SENT                       -> INDICATION or UW_REVIEW, recovered
 *                                          from activity_log metadata.from_stage
 *                                          where available; default INDICATION.
 *                                          (The forward map collapsed
 *                                          INDICATION + UW_REVIEW -> PROPOSAL_SENT.)
 *   NEGOTIATION, DECISION_PENDING       -> APPROVED_QUOTED
 *   COMMITTED, DOCUMENTATION            -> BIND_ORDER
 *   BOUND                               -> BOUND  (no-op)
 *   CLIENT                              -> CLIENT (no-op)
 *   outcome = 'lost'                    -> stage = 'LOST' (OVERRIDES the above;
 *                                          closedAt preserved; outcome column
 *                                          left in place — dropped in R3).
 *
 * IDEMPOTENT — the WHERE clauses only match rows still holding a sales-stage
 * key, or outcome='lost' rows not yet on stage='LOST', so a re-run changes 0
 * rows. Touches ONLY the deals table.
 *
 * Run with:  pnpm --filter @workspace/api-server run revert:pipeline-stages
 */
import "dotenv/config";
import { sql } from "drizzle-orm";
import { db, pool } from "@workspace/db";

const SALES_STAGES = [
  "NEW_LEAD",
  "QUALIFIED",
  "NEEDS_ANALYSIS",
  "PROPOSAL_SENT",
  "NEGOTIATION",
  "DECISION_PENDING",
  "COMMITTED",
  "DOCUMENTATION",
] as const;

async function stageCounts(label: string): Promise<void> {
  const res = await db.execute(
    sql`SELECT stage, outcome, count(*)::int AS n FROM deals GROUP BY stage, outcome ORDER BY stage, outcome`,
  );
  console.log(`\n${label}`);
  for (const row of res.rows as { stage: string; outcome: string; n: number }[]) {
    console.log(`  ${row.stage.padEnd(20)} outcome=${String(row.outcome).padEnd(6)} ${row.n}`);
  }
}

async function main(): Promise<void> {
  await stageCounts("BEFORE — deals by stage/outcome:");
  let changed = 0;

  // 1) PROPOSAL_SENT -> recover INDICATION / UW_REVIEW from the deal's most
  //    recent activity_log stage move whose from_stage was one of the two
  //    collapsed operational stages; default INDICATION.
  const proposalSent = await db.execute(sql`
    UPDATE deals d
    SET stage = COALESCE(
      (
        SELECT al.metadata->>'from_stage'
        FROM activity_log al
        WHERE al.deal_id = d.id
          AND al.metadata->>'from_stage' IN ('INDICATION', 'UW_REVIEW')
        ORDER BY al.created_at DESC
        LIMIT 1
      ),
      'INDICATION'
    )
    WHERE d.stage = 'PROPOSAL_SENT'
  `);
  changed += proposalSent.rowCount ?? 0;
  console.log(`\nPROPOSAL_SENT -> INDICATION/UW_REVIEW (recovered or default): ${proposalSent.rowCount ?? 0} rows`);

  // 2) Direct bucket mappings for the remaining sales stages.
  const buckets = await db.execute(sql`
    UPDATE deals
    SET stage = CASE
      WHEN stage IN ('NEW_LEAD', 'QUALIFIED', 'NEEDS_ANALYSIS') THEN 'SUBMISSION_REVIEW'
      WHEN stage IN ('NEGOTIATION', 'DECISION_PENDING') THEN 'APPROVED_QUOTED'
      WHEN stage IN ('COMMITTED', 'DOCUMENTATION') THEN 'BIND_ORDER'
    END
    WHERE stage IN ('NEW_LEAD', 'QUALIFIED', 'NEEDS_ANALYSIS', 'NEGOTIATION', 'DECISION_PENDING', 'COMMITTED', 'DOCUMENTATION')
  `);
  changed += buckets.rowCount ?? 0;
  console.log(`Bucket mappings (SUBMISSION_REVIEW / APPROVED_QUOTED / BIND_ORDER): ${buckets.rowCount ?? 0} rows`);

  // 3) Lost deals -> stage 'LOST' (overrides everything above; closedAt kept).
  const lost = await db.execute(sql`
    UPDATE deals
    SET stage = 'LOST'
    WHERE outcome = 'lost' AND stage IS DISTINCT FROM 'LOST'
  `);
  changed += lost.rowCount ?? 0;
  console.log(`outcome='lost' -> stage='LOST' (closedAt preserved): ${lost.rowCount ?? 0} rows`);

  await stageCounts("AFTER — deals by stage/outcome:");

  const leftovers = await db.execute(sql`
    SELECT count(*)::int AS n FROM deals
    WHERE stage IN (${sql.join(SALES_STAGES.map((s) => sql`${s}`), sql`, `)})
  `);
  const leftoverCount = (leftovers.rows[0] as { n: number }).n;
  console.log(`\nRemaining sales-stage rows: ${leftoverCount}`);
  console.log(`Total rows changed this run: ${changed}`);
  if (leftoverCount > 0) {
    process.exitCode = 1;
    console.error("ERROR: sales-stage values remain — investigate before proceeding.");
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => void pool.end());
