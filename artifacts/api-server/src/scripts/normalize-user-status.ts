/**
 * Normalize the legacy mixed-case / multi-valued `users.status` column to the
 * Phase 4B canonical lowercase set: `active | invited | deactivated`.
 *
 * Mapping (idempotent — safe to re-run):
 *   ACTIVE / Active / active            -> active
 *   PENDING_APPROVAL / pending_approval -> invited
 *   DEACTIVATED / inactive / disabled   -> deactivated
 *   NULL                                -> active   (matches the new column default)
 *
 * This is the reproducible backfill referenced by Phase 4B acceptance #7. Schema
 * ships via drizzle-kit push + direct SQL (no migration-file flow), so this lives
 * as a runnable script rather than a migration.
 *
 * Run with:  pnpm --filter @workspace/api-server run normalize:user-status
 */
import "dotenv/config";
import { sql } from "drizzle-orm";
import { db, pool } from "@workspace/db";

async function main() {
  const result = await db.execute(sql`
    UPDATE users
    SET status = CASE
      WHEN status IS NULL THEN 'active'
      WHEN lower(status) IN ('active') THEN 'active'
      WHEN lower(status) IN ('pending_approval', 'pending', 'invited') THEN 'invited'
      WHEN lower(status) IN ('deactivated', 'inactive', 'disabled') THEN 'deactivated'
      ELSE 'active'
    END
    WHERE status IS NULL OR status <> lower(status)
       OR lower(status) IN ('pending_approval', 'pending', 'inactive', 'disabled')
  `);
  const after = await db.execute(sql`SELECT status, count(*)::int AS n FROM users GROUP BY status ORDER BY status`);
  // eslint-disable-next-line no-console
  console.log("Status normalization complete. Rows touched:", (result as { rowCount?: number }).rowCount ?? "n/a");
  // eslint-disable-next-line no-console
  console.table(after.rows ?? after);
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error("normalize-user-status failed:", err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
