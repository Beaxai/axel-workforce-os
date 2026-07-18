/**
 * One-off backfill: instantiate the journey for already-Bound deals that never got one
 * (their pre-P5b hollow tracker was removed in WC-0.1). Takes explicit deal ids so it can
 * never sweep more deals than intended. Idempotent — re-running skips existing trackers.
 *
 * Run: pnpm --filter @workspace/api-server exec tsx src/scripts/backfill-journey.ts <dealId> [dealId...]
 */
import { db, dealsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { instantiateJourneysForDeal } from "../lib/journey-instantiate";

async function main() {
  const ids = process.argv.slice(2);
  if (ids.length === 0) {
    console.error("Usage: backfill-journey.ts <dealId> [dealId...]");
    process.exit(1);
  }

  for (const id of ids) {
    const [deal] = await db.select().from(dealsTable).where(eq(dealsTable.id, id));
    if (!deal) {
      console.log(`${id}: NOT FOUND — skipped`);
      continue;
    }
    if (deal.stage !== "BOUND") {
      console.log(`${id}: stage is ${deal.stage}, not BOUND — skipped`);
      continue;
    }
    const r = await db.transaction((tx) => instantiateJourneysForDeal(deal, tx));
    console.log(`${id}: created=${JSON.stringify(r.created)} skipped=${JSON.stringify(r.skipped)} noTemplate=${r.noTemplate}`);
  }
  process.exit(0);
}

void main();
