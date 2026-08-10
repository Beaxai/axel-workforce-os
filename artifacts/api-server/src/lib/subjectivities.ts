/**
 * P5-WC §6A — Bind Subjectivities Checklist. The 10 items are system-owned product
 * logic (Curtis 2026-07-16); code addresses them via these stable keys.
 */
export const SUBJ_TEMPLATE_NAME = "WC Bind Subjectivities";

export const SUBJ_KEYS = {
  ACORD_130: "SUBJ_ACORD_130",
  SUPPLEMENTAL_APP: "SUBJ_SUPPLEMENTAL_APP",
  QUOTE_ACCEPTANCE: "SUBJ_QUOTE_ACCEPTANCE",
  TRIA_ELECTION: "SUBJ_TRIA_ELECTION",
  FRAUD_WARNINGS: "SUBJ_FRAUD_WARNINGS",
  STATE_NOTICES: "SUBJ_STATE_NOTICES",
  OFFICER_EXCLUSION: "SUBJ_OFFICER_EXCLUSION",
  WAIVER_FORMS: "SUBJ_WAIVER_FORMS",
  LOSS_HISTORY: "SUBJ_LOSS_HISTORY",
  BROKER_FEE: "SUBJ_BROKER_FEE",
  /** §7G — PEO deals only: full WC checklist PLUS the signed Client Service Agreement (CSA-PEO). */
  CSA_PEO: "SUBJ_CSA_PEO",
} as const;

export const PEO_SUBJ_TEMPLATE_NAME = "PEO Bind Subjectivities";

import {
  db,
  dealsTable,
  lossHistoryDocumentsTable,
  subjectivityTemplatesTable,
  subjectivityTemplateItemsTable,
  dealSubjectivitiesTable,
  type Deal,
} from "@workspace/db";
import { and, asc, desc, eq, isNotNull } from "drizzle-orm";

type DbOrTx = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

const STALENESS_WINDOW_DAYS = 60;

/** §6A item 9. Fail-closed: anything unknown counts as stale, never silently satisfied. */
export async function evaluateLossHistoryStaleness(
  deal: Deal,
  dbc: DbOrTx = db,
): Promise<{ stale: boolean; reason: string | null }> {
  if (!deal.coverageEffectiveDate) {
    return { stale: true, reason: "No desired effective date on the deal — cannot verify the 60-day valuation window." };
  }

  // Pick the newest run that actually HAS a valuation date. Postgres sorts NULLs first
  // under DESC, so an unvalued run would otherwise mask a perfectly good valued one.
  const [newest] = await dbc
    .select({ valuationDate: lossHistoryDocumentsTable.valuationDate, fileName: lossHistoryDocumentsTable.fileName })
    .from(lossHistoryDocumentsTable)
    .where(
      and(
        eq(lossHistoryDocumentsTable.dealId, deal.id),
        isNotNull(lossHistoryDocumentsTable.valuationDate),
      ),
    )
    .orderBy(desc(lossHistoryDocumentsTable.valuationDate))
    .limit(1);

  if (!newest) {
    // No VALUED run. Distinguish "nothing uploaded" from "uploaded but undated" so the
    // CSA knows whether to chase a document or just record its valuation date.
    const [anyRun] = await dbc
      .select({ fileName: lossHistoryDocumentsTable.fileName })
      .from(lossHistoryDocumentsTable)
      .where(eq(lossHistoryDocumentsTable.dealId, deal.id))
      .limit(1);
    if (!anyRun) return { stale: true, reason: "No loss run on file." };
    return { stale: true, reason: `Loss run "${anyRun.fileName}" has no valuation date recorded.` };
  }

  const cutoff = new Date(`${deal.coverageEffectiveDate}T00:00:00Z`);
  cutoff.setUTCDate(cutoff.getUTCDate() - STALENESS_WINDOW_DAYS);
  const valued = new Date(`${newest.valuationDate}T00:00:00Z`);

  if (valued < cutoff) {
    return {
      stale: true,
      reason: `Loss run valued ${newest.valuationDate}, older than ${STALENESS_WINDOW_DAYS} days before the effective date (${deal.coverageEffectiveDate}).`,
    };
  }
  return { stale: false, reason: null };
}

/**
 * §6A — stamp the bind subjectivities checklist onto a deal on entry to BIND_ORDER.
 * Idempotent: a deal that already has subjectivities is skipped.
 */
export async function generateSubjectivitiesForDeal(
  deal: Deal,
  dbc: DbOrTx = db,
): Promise<{ created: number; skipped: boolean; staleLossHistory: boolean }> {
  const existing = await dbc
    .select({ id: dealSubjectivitiesTable.id })
    .from(dealSubjectivitiesTable)
    .where(eq(dealSubjectivitiesTable.dealId, deal.id))
    .limit(1);
  if (existing.length > 0) return { created: 0, skipped: true, staleLossHistory: false };

  const [tpl] = await dbc
    .select()
    .from(subjectivityTemplatesTable)
    .where(
      and(
        eq(subjectivityTemplatesTable.isActive, true),
        eq(subjectivityTemplatesTable.productType, deal.productType ?? ""),
      ),
    )
    .limit(1);
  if (!tpl) return { created: 0, skipped: false, staleLossHistory: false };

  const items = await dbc
    .select()
    .from(subjectivityTemplateItemsTable)
    .where(eq(subjectivityTemplateItemsTable.templateId, tpl.id))
    .orderBy(asc(subjectivityTemplateItemsTable.sortOrder));

  const staleness = await evaluateLossHistoryStaleness(deal, dbc);

  let created = 0;
  for (const item of items) {
    const isLossItem = item.systemKey === SUBJ_KEYS.LOSS_HISTORY;
    await dbc.insert(dealSubjectivitiesTable).values({
      dealId: deal.id,
      templateId: tpl.id,
      name: item.name,
      sortOrder: item.sortOrder,
      systemKey: item.systemKey,
      status: "OPEN",
      isBlocking: item.isBlocking,
      autoFlagReason: isLossItem ? staleness.reason : null,
      notes: item.notes,
    });
    created++;
  }
  return { created, skipped: false, staleLossHistory: staleness.stale };
}

/**
 * Re-evaluate §6A item 9 for a deal whose data changed after the checklist was generated
 * (a loss run arrived, or the effective date was set). Updates ONLY the auto-flag reason —
 * never the status. Clearing the reason signals "no longer stale"; a human still marks it
 * SATISFIED after confirming the document.
 */
export async function recomputeLossHistorySubjectivity(
  dealId: string,
  dbc: DbOrTx = db,
): Promise<{ updated: boolean; stale: boolean; reason: string | null }> {
  const [deal] = await dbc.select().from(dealsTable).where(eq(dealsTable.id, dealId)).limit(1);
  if (!deal) return { updated: false, stale: false, reason: null };

  const [item] = await dbc
    .select({ id: dealSubjectivitiesTable.id })
    .from(dealSubjectivitiesTable)
    .where(
      and(
        eq(dealSubjectivitiesTable.dealId, dealId),
        eq(dealSubjectivitiesTable.systemKey, SUBJ_KEYS.LOSS_HISTORY),
      ),
    )
    .limit(1);
  if (!item) return { updated: false, stale: false, reason: null };

  const staleness = await evaluateLossHistoryStaleness(deal, dbc);

  await dbc
    .update(dealSubjectivitiesTable)
    .set({ autoFlagReason: staleness.reason, updatedAt: new Date() })
    .where(eq(dealSubjectivitiesTable.id, item.id));

  return { updated: true, stale: staleness.stale, reason: staleness.reason };
}
