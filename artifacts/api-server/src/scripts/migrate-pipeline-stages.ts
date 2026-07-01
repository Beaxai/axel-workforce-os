/* eslint-disable no-console */
/**
 * Migrate the legacy 8-stage pipeline onto the canonical 10-stage model and
 * backfill `deals.outcome`.
 *
 * IDEMPOTENT — only rows still holding a legacy stage key (or stage = 'LOST',
 * or a NULL outcome) are touched, so re-running the script changes 0 rows.
 *
 * Mapping (PROPOSED — pending Curtis sign-off):
 *   SUBMISSION_REVIEW -> NEEDS_ANALYSIS
 *   INDICATION        -> PROPOSAL_SENT
 *   UW_REVIEW         -> PROPOSAL_SENT
 *   APPROVED_QUOTED   -> NEGOTIATION
 *   BIND_ORDER        -> DOCUMENTATION
 *   BOUND             -> BOUND    (already canonical — no-op)
 *   CLIENT            -> CLIENT   (already canonical — no-op)
 *   NEW_LEAD          -> NEW_LEAD (already canonical — no-op)
 *   LOST              -> outcome = 'lost'; `closedAt` preserved; stage RECOVERED
 *                        from activity_log (the `metadata.from_stage` of the move
 *                        into LOST, itself mapped through the table above).
 *                        Fallback = NEEDS_ANALYSIS if unrecoverable. The stage is
 *                        never left as 'LOST'.
 *
 * Schema ships via drizzle-kit push + direct SQL (no migration-file flow), so this
 * lives as a runnable script rather than a migration.
 *
 * Run with:  pnpm --filter @workspace/api-server run migrate:pipeline-stages
 */
import "dotenv/config";
import { sql } from "drizzle-orm";
import { db, pool } from "@workspace/db";

// Canonical 10-stage set (mirrors @workspace/pipeline PIPELINE_STAGE_KEYS).
const CANONICAL_STAGES = [
  "NEW_LEAD",
  "QUALIFIED",
  "NEEDS_ANALYSIS",
  "PROPOSAL_SENT",
  "NEGOTIATION",
  "DECISION_PENDING",
  "COMMITTED",
  "DOCUMENTATION",
  "BOUND",
  "CLIENT",
] as const;
type Canonical = (typeof CANONICAL_STAGES)[number];

const LEGACY_MAP: Record<string, Canonical> = {
  SUBMISSION_REVIEW: "NEEDS_ANALYSIS",
  INDICATION: "PROPOSAL_SENT",
  UW_REVIEW: "PROPOSAL_SENT",
  APPROVED_QUOTED: "NEGOTIATION",
  BIND_ORDER: "DOCUMENTATION",
};

const isCanonical = (s: string | null | undefined): s is Canonical =>
  !!s && (CANONICAL_STAGES as readonly string[]).includes(s);

/** Map any raw stage value onto the canonical set (fallback NEEDS_ANALYSIS). */
function toCanonical(stage: string | null | undefined): Canonical {
  if (stage && LEGACY_MAP[stage]) return LEGACY_MAP[stage];
  if (isCanonical(stage)) return stage;
  return "NEEDS_ANALYSIS";
}

async function printDistribution(label: string) {
  const res = await db.execute(sql`
    SELECT stage, outcome, count(*)::int AS n
    FROM deals
    GROUP BY stage, outcome
    ORDER BY stage, outcome
  `);
  console.log(`\n=== ${label} ===`);
  console.table(res.rows);
}

async function main() {
  await printDistribution("BEFORE");

  // 1) LOST deals: recover pre-LOST stage from activity_log, set outcome='lost'.
  //    Per-deal because the recovered from_stage varies. closedAt is untouched.
  const lostRes = await db.execute(sql`SELECT id, stage FROM deals WHERE stage = 'LOST'`);
  const lostRows = lostRes.rows as Array<{ id: string; stage: string | null }>;
  let lostChanged = 0;
  for (const row of lostRows) {
    const recRes = await db.execute(sql`
      SELECT metadata->>'from_stage' AS from_stage
      FROM activity_log
      WHERE deal_id = ${row.id} AND metadata->>'to_stage' = 'LOST'
      ORDER BY created_at DESC
      LIMIT 1
    `);
    const recRows = recRes.rows as Array<{ from_stage: string | null }>;
    const fromStage = recRows[0]?.from_stage ?? null;
    const recovered: Canonical =
      fromStage && fromStage !== "LOST" ? toCanonical(fromStage) : "NEEDS_ANALYSIS";
    const upd = await db.execute(sql`
      UPDATE deals SET stage = ${recovered}, outcome = 'lost'
      WHERE id = ${row.id} AND stage = 'LOST'
    `);
    lostChanged += upd.rowCount ?? 0;
    console.log(
      `  LOST deal ${row.id}: recovered from_stage=${fromStage ?? "—"} -> ${recovered} (outcome=lost)`,
    );
  }

  // 2) Non-LOST legacy stages: bulk remap. WHERE clause only matches legacy keys,
  //    so a second run matches nothing (idempotent).
  const legacyUpd = await db.execute(sql`
    UPDATE deals SET stage = CASE stage
      WHEN 'SUBMISSION_REVIEW' THEN 'NEEDS_ANALYSIS'
      WHEN 'INDICATION'        THEN 'PROPOSAL_SENT'
      WHEN 'UW_REVIEW'         THEN 'PROPOSAL_SENT'
      WHEN 'APPROVED_QUOTED'   THEN 'NEGOTIATION'
      WHEN 'BIND_ORDER'        THEN 'DOCUMENTATION'
      ELSE stage END
    WHERE stage IN ('SUBMISSION_REVIEW','INDICATION','UW_REVIEW','APPROVED_QUOTED','BIND_ORDER')
  `);
  const legacyChanged = legacyUpd.rowCount ?? 0;

  // 3) Backfill any NULL outcome to 'open' (B1's default already covers rows added
  //    after the column existed; this catches any stragglers). Idempotent.
  const outFix = await db.execute(sql`UPDATE deals SET outcome = 'open' WHERE outcome IS NULL`);
  const outcomeFixed = outFix.rowCount ?? 0;

  console.log(
    `\nRows changed — LOST recovered: ${lostChanged}, legacy remapped: ${legacyChanged}, NULL outcome backfilled: ${outcomeFixed}`,
  );
  const totalChanged = lostChanged + legacyChanged + outcomeFixed;
  console.log(`Total rows changed this run: ${totalChanged}`);

  await printDistribution("AFTER");

  // Guard: assert every deal is on a canonical stage with a valid outcome.
  const badRes = await db.execute(sql`
    SELECT count(*)::int AS n FROM deals
    WHERE stage IS NULL
       OR stage NOT IN ('NEW_LEAD','QUALIFIED','NEEDS_ANALYSIS','PROPOSAL_SENT','NEGOTIATION','DECISION_PENDING','COMMITTED','DOCUMENTATION','BOUND','CLIENT')
       OR outcome IS NULL
       OR outcome NOT IN ('open','lost')
  `);
  const bad = (badRes.rows as Array<{ n: number }>)[0]?.n ?? 0;
  if (bad > 0) {
    console.error(`FAIL: ${bad} deal(s) have a non-canonical stage or invalid outcome.`);
    process.exitCode = 1;
  } else {
    console.log("OK: all deals on canonical stages; outcome in {open, lost}.");
  }
}

main()
  .catch((err) => {
    console.error("migrate-pipeline-stages failed:", err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
