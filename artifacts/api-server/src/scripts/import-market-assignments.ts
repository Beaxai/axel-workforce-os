/**
 * Imports the checked-in normalized assignment-grid seed.
 *
 * Validation is completed before opening the transaction. The importer owns
 * only assignment metadata and rows marked with MARKET_ASSIGNMENT_IMPORT_SOURCE.
 */
import {
  db,
  marketsTable,
  marketVerticalRankTable,
  pool,
} from "@workspace/db";
import { and, eq, inArray } from "drizzle-orm";
import {
  MARKET_ASSIGNMENT_IMPORT_SOURCE,
  MARKET_ASSIGNMENT_SEED,
} from "../data/market-assignment-seed.js";
import {
  assignmentMarketMetadata,
  normalizeAssignmentGrid,
  obsoleteImportedSourceKeys,
} from "../lib/market-assignment.js";

type ImportCounts = {
  markets: { inserted: number; updated: number; unchanged: number };
  assignments: { inserted: number; updated: number; unchanged: number; removed: number };
};

function arraysEqual(a: readonly string[] | null, b: readonly string[] | null): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export async function importMarketAssignments(): Promise<ImportCounts> {
  // This is intentionally outside the transaction: malformed replacement
  // fixtures cannot cause partial writes.
  const normalized = normalizeAssignmentGrid(
    MARKET_ASSIGNMENT_SEED,
    MARKET_ASSIGNMENT_IMPORT_SOURCE,
  );

  return db.transaction(async (tx) => {
    const counts: ImportCounts = {
      markets: { inserted: 0, updated: 0, unchanged: 0 },
      assignments: { inserted: 0, updated: 0, unchanged: 0, removed: 0 },
    };
    const marketIds = new Map<string, string>();

    for (const market of normalized.markets) {
      const [byKey] = await tx
        .select()
        .from(marketsTable)
        .where(eq(marketsTable.assignmentImportKey, market.importKey))
        .limit(1);
      const [byIdentity] = byKey
        ? [undefined]
        : await tx
            .select()
            .from(marketsTable)
            .where(
              and(
                eq(marketsTable.name, market.name),
                eq(marketsTable.marketType, market.marketType),
              ),
            )
            .limit(1);
      const existing = byKey ?? byIdentity;

      const metadata = assignmentMarketMetadata(market);

      if (!existing) {
        const [inserted] = await tx
          .insert(marketsTable)
          .values({
            ...metadata,
            name: market.name,
            marketType: market.marketType,
            productLane: market.productLane,
          })
          .returning({ id: marketsTable.id });
        marketIds.set(market.importKey, inserted!.id);
        counts.markets.inserted++;
        continue;
      }
      if (
        existing.marketType !== market.marketType ||
        existing.productLane !== market.productLane
      ) {
        throw new Error(
          `Existing market '${market.name}' has incompatible structural type/lane`,
        );
      }

      marketIds.set(market.importKey, existing.id);
      const changed =
        existing.assignmentImportKey !== metadata.assignmentImportKey ||
        existing.isRated !== metadata.isRated ||
        !arraysEqual(existing.offeredProducts, metadata.offeredProducts) ||
        existing.stateWritingMode !== metadata.stateWritingMode ||
        !arraysEqual(existing.explicitStates, metadata.explicitStates) ||
        existing.ratingBasis !== metadata.ratingBasis ||
        existing.isPrimaryReference !== metadata.isPrimaryReference ||
        existing.submissionEmail !== metadata.submissionEmail ||
        existing.phone !== metadata.phone ||
        existing.sourceUnderwriterReference !== metadata.sourceUnderwriterReference ||
        existing.sourceOtherContactsReference !== metadata.sourceOtherContactsReference;
      if (changed) {
        await tx
          .update(marketsTable)
          .set({ ...metadata, updatedAt: new Date() })
          .where(eq(marketsTable.id, existing.id));
        counts.markets.updated++;
      } else {
        counts.markets.unchanged++;
      }
    }

    const existingAssignments = await tx
      .select()
      .from(marketVerticalRankTable);
    const existingBySourceKey = new Map(
      existingAssignments
        .filter((row) => row.sourceKey)
        .map((row) => [row.sourceKey!, row]),
    );
    const changedAssignmentIds: string[] = [];
    for (const assignment of normalized.assignments) {
      const existing = existingBySourceKey.get(assignment.sourceKey);
      if (
        existing &&
        (existing.importSource !== MARKET_ASSIGNMENT_IMPORT_SOURCE ||
          existing.marketId !== marketIds.get(assignment.marketImportKey) ||
          existing.verticalKey !== assignment.verticalKey ||
          existing.product !== assignment.product)
      ) {
        throw new Error(`Source key collision for '${assignment.sourceKey}'`);
      }
      if (existing && existing.rank !== assignment.rank) {
        changedAssignmentIds.push(existing.id);
      }
    }

    const obsoleteKeys = obsoleteImportedSourceKeys(
      existingAssignments,
      normalized.assignments,
      MARKET_ASSIGNMENT_IMPORT_SOURCE,
    );
    const obsoleteIds = existingAssignments
      .filter((row) => row.sourceKey && obsoleteKeys.includes(row.sourceKey))
      .map((row) => row.id);
    const replaceIds = [...changedAssignmentIds, ...obsoleteIds];
    // Remove changed workbook-owned rows before reinserting so preferred ranks
    // can be swapped between markets without transient unique violations.
    if (replaceIds.length) {
      await tx
        .delete(marketVerticalRankTable)
        .where(
          and(
            eq(marketVerticalRankTable.importSource, MARKET_ASSIGNMENT_IMPORT_SOURCE),
            inArray(marketVerticalRankTable.id, replaceIds),
          ),
        );
    }
    counts.assignments.removed = obsoleteIds.length;

    for (const assignment of normalized.assignments) {
      const marketId = marketIds.get(assignment.marketImportKey)!;
      const existing = existingBySourceKey.get(assignment.sourceKey);
      if (existing) {
        if (existing.rank === assignment.rank) {
          counts.assignments.unchanged++;
        } else {
          await tx.insert(marketVerticalRankTable).values({
            marketId,
            vertical: assignment.vertical,
            verticalKey: assignment.verticalKey,
            rank: assignment.rank,
            product: assignment.product,
            importSource: MARKET_ASSIGNMENT_IMPORT_SOURCE,
            sourceKey: assignment.sourceKey,
          });
          counts.assignments.updated++;
        }
        continue;
      }

      const manualCollision = existingAssignments.find(
        (row) =>
          row.marketId === marketId &&
          row.verticalKey === assignment.verticalKey &&
          row.product === assignment.product,
      );
      if (manualCollision) {
        throw new Error(
          `Workbook assignment collides with preserved manual assignment for '${assignment.marketImportKey}' / '${assignment.vertical}' / '${assignment.product}'`,
        );
      }
      await tx.insert(marketVerticalRankTable).values({
        marketId,
        vertical: assignment.vertical,
        verticalKey: assignment.verticalKey,
        rank: assignment.rank,
        product: assignment.product,
        importSource: MARKET_ASSIGNMENT_IMPORT_SOURCE,
        sourceKey: assignment.sourceKey,
      });
      counts.assignments.inserted++;
    }

    return counts;
  });
}

async function main(): Promise<void> {
  try {
    const counts = await importMarketAssignments();
    console.log(JSON.stringify(counts, null, 2));
  } finally {
    await pool.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}