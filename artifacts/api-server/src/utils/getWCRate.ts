import { db, wcRatesTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";

export async function getWCRate(state: string, classCode: string): Promise<number | null> {
  const [rate] = await db
    .select({ baseRate: wcRatesTable.baseRate })
    .from(wcRatesTable)
    .where(and(eq(wcRatesTable.state, state), eq(wcRatesTable.classCode, classCode)))
    .orderBy(desc(wcRatesTable.effectiveDate))
    .limit(1);

  return rate ? parseFloat(rate.baseRate) : null;
}
