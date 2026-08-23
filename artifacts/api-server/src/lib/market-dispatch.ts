/**
 * market-dispatch.ts
 *
 * Durable dispatch queue for multi-market routing.
 *
 * Responsibilities:
 *   - queueMarketDispatch: idempotently freeze PROVISIONAL deal_markets rows
 *     into a QUEUED batch + ordered items; never calls email inside a DB tx.
 *   - processQueuedMarketDispatches: worker sweep that sends in rank order,
 *     retries transient failures (≤3 total attempts), continues past exhausted
 *     or permanent failures, treats DELIVERY_UNKNOWN as terminal, locks the
 *     ranked set after the first provider-accepted send, creates ADMIN/CSA
 *     alert activities.
 *
 * Concurrency safety:
 *   - A single batch row per deal (enforced by service logic + SELECT FOR UPDATE).
 *   - Item rows have unique (batch_id, deal_market_id).
 *   - Attempt rows have unique (item_id, attempt_number).
 *   - Worker picks up QUEUED/PROCESSING batches; takes no action if none exist.
 */

import { db } from "@workspace/db";
import {
  dealMarketsTable,
  dispatchBatchesTable,
  dispatchItemsTable,
  dispatchAttemptsTable,
  activityLogTable,
  marketsTable,
  marketUnderwritersTable,
  submissionAnswersTable,
  dealDocumentsTable,
  dealsTable,
} from "@workspace/db";
import { routableCannabisApplicationAnswersSchema } from "@workspace/cannabis-application";
import {
  and,
  eq,
  inArray,
  asc,
  desc,
  isNull,
  lt,
  or,
  sql as drizzleSql,
} from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { sendDealEmail } from "../services/emailService";
import {
  fillAcord130,
  fillAxelCannabisApplication,
  fillTreanSupp,
} from "../services/applicationPdfService";
import { logger } from "./logger";

const MAX_ATTEMPTS = 3;
const WORKER_CLAIM_TTL_MS = 10 * 60 * 1000;

// ---------------------------------------------------------------------------
// queueMarketDispatch
// ---------------------------------------------------------------------------

/**
 * Idempotently create (or resume) a dispatch batch for a deal.
 *
 * 1. Selects all deal_markets where isRouted=true for this deal.
 * 2. Within a transaction, freezes them to QUEUED and creates one batch +
 *    ordered dispatch_items.
 * 3. Never calls email inside the transaction.
 * 4. Returns the batch ID.
 *
 * Concurrent calls for the same deal are safe: the FOR UPDATE row lock on the
 * existing batch (or the unique constraint on batch creation) serializes them.
 */
export async function queueMarketDispatch(
  dealId: string,
  actorId?: string,
): Promise<{ batchId: string; itemCount: number } | { alreadyQueued: true; batchId: string }> {
  const result = await db.transaction(async (tx) => {
    // The deal row is the stable per-deal mutex even when no batch exists yet.
    const [deal] = await tx
      .select({ id: dealsTable.id })
      .from(dealsTable)
      .where(eq(dealsTable.id, dealId))
      .for("update");
    if (!deal) throw new Error(`Deal ${dealId} not found`);

    const [existing] = await tx
      .select()
      .from(dispatchBatchesTable)
      .where(
        and(
          eq(dispatchBatchesTable.dealId, dealId),
          inArray(dispatchBatchesTable.status, ["QUEUED", "PROCESSING", "FAILED", "COMPLETE"]),
        ),
      )
      .orderBy(desc(dispatchBatchesTable.createdAt))
      .limit(1);
    if (existing) {
      return { alreadyQueued: true as const, batchId: existing.id };
    }

    const [submission] = await tx
      .select({
        answers: submissionAnswersTable.answers,
        status: submissionAnswersTable.status,
      })
      .from(submissionAnswersTable)
      .where(
        and(
          eq(submissionAnswersTable.dealId, dealId),
          eq(submissionAnswersTable.status, "submitted"),
        ),
      )
      .orderBy(desc(submissionAnswersTable.createdAt))
      .limit(1);
    const packageParse = routableCannabisApplicationAnswersSchema.safeParse(
      submission?.answers,
    );
    if (!packageParse.success) {
      throw new Error(
        `Market dispatch requires a persisted, completed application package for deal ${dealId}`,
      );
    }

    const requiredDocumentTypes = [
      "axel_cannabis_application",
      "acord_130",
      "trean_cannabis_supp",
    ];
    const packageDocuments = await tx
      .select({ documentType: dealDocumentsTable.documentType })
      .from(dealDocumentsTable)
      .where(
        and(
          eq(dealDocumentsTable.dealId, dealId),
          inArray(dealDocumentsTable.documentType, requiredDocumentTypes),
        ),
      );
    const persistedDocumentTypes = new Set(
      packageDocuments.map((document) => document.documentType),
    );
    const missingDocuments = requiredDocumentTypes.filter(
      (documentType) => !persistedDocumentTypes.has(documentType),
    );
    if (missingDocuments.length > 0) {
      throw new Error(
        `Market dispatch package is missing required documents for deal ${dealId}: ${missingDocuments.join(", ")}`,
      );
    }

    const rankedMarkets = await tx
      .select()
      .from(dealMarketsTable)
      .where(
        and(
          eq(dealMarketsTable.dealId, dealId),
          eq(dealMarketsTable.rankingState, "PROVISIONAL"),
        ),
      )
      .orderBy(asc(dealMarketsTable.rank))
      .for("update");
    const routedMarkets = rankedMarkets.filter((market) => market.isRouted);
    if (routedMarkets.length === 0) {
      throw new Error(`No routed PROVISIONAL deal_markets found for deal ${dealId}`);
    }

    const [batch] = await tx
      .insert(dispatchBatchesTable)
      .values({ dealId, status: "QUEUED" })
      .returning({ id: dispatchBatchesTable.id });

    await tx
      .update(dealMarketsTable)
      .set({ rankingState: "QUEUED", updatedAt: new Date() })
      .where(inArray(dealMarketsTable.id, rankedMarkets.map((market) => market.id)));

    for (const market of routedMarkets) {
      await tx.insert(dispatchItemsTable).values({
        batchId: batch.id,
        dealMarketId: market.id,
        rank: market.rank,
        status: "PENDING",
      });
    }

    await tx.insert(activityLogTable).values({
      dealId,
      entityType: "deal",
      entityId: dealId,
      eventType: "market_dispatch_queued",
      description: `Market dispatch queued: ${routedMarkets.length} market(s) will receive the submission in rank order.`,
      metadata: {
        batch_id: batch.id,
        item_count: routedMarkets.length,
        queued_by: actorId ?? null,
      },
      createdBy: actorId ?? null,
    });

    return { batchId: batch.id, itemCount: routedMarkets.length };
  });

  logger.info({ dealId, ...result }, "market-dispatch: queue resolved");
  return result;
}

// ---------------------------------------------------------------------------
// processQueuedMarketDispatches
// ---------------------------------------------------------------------------

/**
 * Worker sweep: process all QUEUED/PROCESSING batches, one item at a time,
 * in strict rank order.
 *
 * Idempotent under concurrent sweeps: each item is locked with SELECT FOR UPDATE
 * before attempting, ensuring only one sweep acts on any given item at a time.
 */
export async function processQueuedMarketDispatches(): Promise<void> {
  // Find all live batches.
  const batches = await db
    .select()
    .from(dispatchBatchesTable)
    .where(inArray(dispatchBatchesTable.status, ["QUEUED", "PROCESSING"]));

  for (const batch of batches) {
    await processBatch(batch.id, batch.dealId);
  }
}

async function processBatch(batchId: string, dealId: string): Promise<void> {
  const claimId = randomUUID();
  const claimExpiredBefore = new Date(Date.now() - WORKER_CLAIM_TTL_MS);
  const [claimed] = await db
    .update(dispatchBatchesTable)
    .set({
      status: "PROCESSING",
      workerClaimId: claimId,
      workerClaimedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(dispatchBatchesTable.id, batchId),
        inArray(dispatchBatchesTable.status, ["QUEUED", "PROCESSING"]),
        or(
          isNull(dispatchBatchesTable.workerClaimId),
          lt(dispatchBatchesTable.workerClaimedAt, claimExpiredBefore),
        ),
      ),
    )
    .returning({ id: dispatchBatchesTable.id });
  if (!claimed) return;

  // Load items in rank order.
  const items = await db
    .select()
    .from(dispatchItemsTable)
    .where(eq(dispatchItemsTable.batchId, batchId))
    .orderBy(asc(dispatchItemsTable.rank));

  let anyAccepted = false;

  // Check if already locked (any previously sent item).
  const sentItems = items.filter((i) => i.status === "SENT");
  if (sentItems.length > 0) anyAccepted = true;
  if (!anyAccepted) {
    const [locked] = await db
      .select({ id: dealMarketsTable.id })
      .from(dealMarketsTable)
      .where(
        and(
          eq(dealMarketsTable.dealId, dealId),
          eq(dealMarketsTable.rankingState, "LOCKED"),
        ),
      )
      .limit(1);
    anyAccepted = !!locked;
  }

  for (const item of items) {
    const [activeClaim] = await db
      .select({ id: dispatchBatchesTable.id })
      .from(dispatchBatchesTable)
      .where(
        and(
          eq(dispatchBatchesTable.id, batchId),
          eq(dispatchBatchesTable.status, "PROCESSING"),
          eq(dispatchBatchesTable.workerClaimId, claimId),
        ),
      )
      .limit(1);
    if (!activeClaim) return;

    // Skip terminal items.
    if (item.status === "SENT" || item.status === "SKIPPED" || item.status === "DELIVERY_UNKNOWN") {
      continue;
    }

    // Count existing attempts for this item.
    const attempts = await db
      .select()
      .from(dispatchAttemptsTable)
      .where(eq(dispatchAttemptsTable.itemId, item.id))
      .orderBy(asc(dispatchAttemptsTable.attemptNumber));

    const attemptCount = attempts.length;
    const lastAttempt = attempts[attemptCount - 1];

    // Already exhausted — mark FAILED and continue.
    if (
      item.status === "FAILED" &&
      attemptCount >= MAX_ATTEMPTS
    ) {
      // Already handled in a prior sweep — continue to next item.
      continue;
    }

    // If the last attempt is a PERMANENT_FAILURE or DELIVERY_UNKNOWN, skip.
    if (lastAttempt) {
      if (!lastAttempt.outcome) {
        await finalizeAttempt(
          lastAttempt.id,
          "DELIVERY_UNKNOWN",
          lastAttempt.providerMessageId,
          "Worker lease expired after provider attempt started; delivery requires manual review",
        );
        await db.transaction(async (tx) => {
          await tx
            .update(dispatchItemsTable)
            .set({ status: "DELIVERY_UNKNOWN", updatedAt: new Date() })
            .where(eq(dispatchItemsTable.id, item.id));
          await tx
            .update(dealMarketsTable)
            .set({
              sendStatus: "DELIVERY_UNKNOWN",
              lastSendError: "Worker stopped during provider attempt; manual review required",
              updatedAt: new Date(),
            })
            .where(eq(dealMarketsTable.id, item.dealMarketId));
          await tx.insert(activityLogTable).values({
            dealId,
            dealMarketId: item.dealMarketId,
            entityType: "deal_market",
            entityId: item.dealMarketId,
            eventType: "market_dispatch_delivery_unknown",
            description: "Worker stopped during a provider attempt. Delivery status requires manual review before retrying.",
            metadata: {
              batch_id: batchId,
              item_id: item.id,
              attempt_id: lastAttempt.id,
              internal: true,
            },
          });
        });
        continue;
      }
      if (lastAttempt.outcome === "SUCCESS") {
        const devLogged = lastAttempt.errorCategory === "DEV_LOGGED";
        if (!devLogged && !anyAccepted) {
          await lockDealMarkets(dealId, batchId);
          anyAccepted = true;
        }
        await db.transaction(async (tx) => {
          await tx
            .update(dispatchItemsTable)
            .set({ status: devLogged ? "SKIPPED" : "SENT", updatedAt: new Date() })
            .where(eq(dispatchItemsTable.id, item.id));
          await tx
            .update(dealMarketsTable)
            .set({
              sendStatus: devLogged ? "PENDING" : "SENT",
              sentAt: devLogged ? null : lastAttempt.completedAt,
              lastSendError: devLogged ? "Development mode: recorded without provider delivery" : null,
              updatedAt: new Date(),
            })
            .where(eq(dealMarketsTable.id, item.dealMarketId));
        });
        continue;
      }
      if (lastAttempt.outcome === "PERMANENT_FAILURE") {
        await markItemFailed(
          item.id,
          item.dealMarketId,
          dealId,
          lastAttempt.errorDetail ?? "Permanent failure",
          batchId,
        );
        continue;
      }
      if (lastAttempt.outcome === "DELIVERY_UNKNOWN") {
        // Already terminal — skip without retry.
        continue;
      }
      // If transient and still under limit: fall through to retry.
      if (lastAttempt.outcome === "TRANSIENT_FAILURE" && attemptCount >= MAX_ATTEMPTS) {
        await markItemFailed(item.id, item.dealMarketId, dealId, lastAttempt.errorDetail ?? "Max retries exhausted", batchId);
        continue;
      }
    }

    // Attempt to send this item.
    const result = await attemptSend(item.id, item.dealMarketId, dealId, attemptCount + 1);

    if (result.outcome === "SUCCESS") {
      // Atomically lock all deal_markets for this deal on the first accepted send.
      if (result.providerAccepted && !anyAccepted) {
        await lockDealMarkets(dealId, batchId);
        anyAccepted = true;
      }

      // Dev-mode records are terminal for the local sweep but are not delivery
      // and must never be represented as provider-accepted.
      await db.transaction(async (tx) => {
        await tx
          .update(dispatchItemsTable)
          .set({
            status: result.providerAccepted ? "SENT" : "SKIPPED",
            updatedAt: new Date(),
          })
          .where(eq(dispatchItemsTable.id, item.id));

        await tx
          .update(dealMarketsTable)
          .set({
            sendStatus: result.providerAccepted ? "SENT" : "PENDING",
            sentAt: result.providerAccepted ? new Date() : null,
            sendAttemptCount: drizzleSql`${dealMarketsTable.sendAttemptCount} + 1`,
            lastSendError: result.providerAccepted
              ? null
              : "Development mode: recorded without provider delivery",
            updatedAt: new Date(),
          })
          .where(eq(dealMarketsTable.id, item.dealMarketId));
      });

      logger.info(
        {
          batchId,
          itemId: item.id,
          dealMarketId: item.dealMarketId,
          providerAccepted: result.providerAccepted,
        },
        result.providerAccepted
          ? "market-dispatch: item sent"
          : "market-dispatch: item recorded in development mode",
      );

    } else if (result.outcome === "DELIVERY_UNKNOWN") {
      // Terminal — manual repair required.
      await db.transaction(async (tx) => {
        await tx
          .update(dispatchItemsTable)
          .set({ status: "DELIVERY_UNKNOWN", updatedAt: new Date() })
          .where(eq(dispatchItemsTable.id, item.id));

        await tx
          .update(dealMarketsTable)
          .set({
            sendStatus: "DELIVERY_UNKNOWN",
            sendAttemptCount: drizzleSql`${dealMarketsTable.sendAttemptCount} + 1`,
            lastSendError: result.error ?? "Delivery unknown — manual repair required",
            updatedAt: new Date(),
          })
          .where(eq(dealMarketsTable.id, item.dealMarketId));

        await tx.insert(activityLogTable).values({
          dealId,
          dealMarketId: item.dealMarketId,
          entityType: "deal_market",
          entityId: item.dealMarketId,
          eventType: "market_dispatch_delivery_unknown",
          description: `Market send delivery status unknown for market thread. Manual repair required to avoid accidental duplicate.`,
          metadata: {
            batch_id: batchId,
            item_id: item.id,
            deal_market_id: item.dealMarketId,
            error: result.error ?? null,
            internal: true,
          },
        });
      });

      logger.warn({ batchId, itemId: item.id, dealMarketId: item.dealMarketId }, "market-dispatch: DELIVERY_UNKNOWN — manual repair required");

    } else if (result.outcome === "PERMANENT_FAILURE") {
      await markItemFailed(item.id, item.dealMarketId, dealId, result.error ?? "Permanent failure", batchId);

    } else {
      // TRANSIENT_FAILURE — will be retried in a later sweep if under limit.
      if (result.skippedConcurrent) {
        break;
      }
      await db
        .update(dealMarketsTable)
        .set({
          sendAttemptCount: drizzleSql`${dealMarketsTable.sendAttemptCount} + 1`,
          lastSendError: result.error ?? "Transient failure",
          updatedAt: new Date(),
        })
        .where(eq(dealMarketsTable.id, item.dealMarketId));

      logger.warn(
        { batchId, itemId: item.id, dealMarketId: item.dealMarketId, attemptCount: attemptCount + 1 },
        "market-dispatch: transient failure — will retry",
      );
      if (attemptCount + 1 >= MAX_ATTEMPTS) {
        await markItemFailed(
          item.id,
          item.dealMarketId,
          dealId,
          result.error ?? "Max retries exhausted",
          batchId,
        );
        continue;
      }
      // Strict ordering: do not advance to the next rank until this item either
      // succeeds or exhausts its retry budget.
      break;
    }
  }

  // Reload items to determine final batch status.
  const finalItems = await db
    .select()
    .from(dispatchItemsTable)
    .where(eq(dispatchItemsTable.batchId, batchId));

  const allTerminal = finalItems.every(
    (i) => i.status === "SENT" || i.status === "FAILED" || i.status === "SKIPPED" || i.status === "DELIVERY_UNKNOWN",
  );

  if (allTerminal) {
    const anySent = finalItems.some((i) => i.status === "SENT");
    const batchStatus = anySent ? "COMPLETE" : "FAILED";

    await db
      .update(dispatchBatchesTable)
      .set({
        status: batchStatus,
        workerClaimId: null,
        workerClaimedAt: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(dispatchBatchesTable.id, batchId),
          eq(dispatchBatchesTable.workerClaimId, claimId),
        ),
      );

    if (batchStatus === "FAILED") {
      // Alert: no markets received the submission.
      await db.insert(activityLogTable).values({
        dealId,
        entityType: "deal",
        entityId: dealId,
        eventType: "market_dispatch_all_failed",
        description: "All market dispatch sends failed. ADMIN/CSA review required before re-routing.",
        metadata: { batch_id: batchId, internal: true },
      });

      // Update all non-SENT deal_markets rankingState to FAILED.
      await db
        .update(dealMarketsTable)
        .set({ rankingState: "FAILED", updatedAt: new Date() })
        .where(
          and(
            eq(dealMarketsTable.dealId, dealId),
            inArray(dealMarketsTable.rankingState, ["QUEUED", "DISPATCHING"]),
          ),
        );
    }

    logger.info({ batchId, dealId, batchStatus }, "market-dispatch: batch finalized");
  } else {
    await db
      .update(dispatchBatchesTable)
      .set({ workerClaimId: null, workerClaimedAt: null, updatedAt: new Date() })
      .where(
        and(
          eq(dispatchBatchesTable.id, batchId),
          eq(dispatchBatchesTable.workerClaimId, claimId),
        ),
      );
  }
}

/**
 * Mark an item as FAILED after exhausted retries or a permanent error.
 * Continues processing later ranks.
 */
async function markItemFailed(
  itemId: string,
  dealMarketId: string,
  dealId: string,
  errorDetail: string,
  batchId: string,
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .update(dispatchItemsTable)
      .set({ status: "FAILED", updatedAt: new Date() })
      .where(eq(dispatchItemsTable.id, itemId));

    await tx
      .update(dealMarketsTable)
      .set({
        sendStatus: "FAILED",
        lastSendError: errorDetail,
        updatedAt: new Date(),
      })
      .where(eq(dealMarketsTable.id, dealMarketId));

    await tx.insert(activityLogTable).values({
      dealId,
      dealMarketId,
      entityType: "deal_market",
      entityId: dealMarketId,
      eventType: "market_dispatch_failed",
      description: `Market send failed: ${errorDetail}. Continuing to the next ranked market.`,
      metadata: {
        batch_id: batchId,
        item_id: itemId,
        deal_market_id: dealMarketId,
        error: errorDetail,
        internal: true,
      },
    });
  });

  logger.warn({ itemId, dealMarketId, dealId, errorDetail }, "market-dispatch: item failed — continuing to next rank");
}

/**
 * Atomically lock all deal_markets for this deal (membership, rates, ranks, underwriters).
 * Called after the first provider-accepted send.
 */
async function lockDealMarkets(dealId: string, batchId: string): Promise<void> {
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .update(dealMarketsTable)
      .set({ rankingState: "LOCKED", lockedAt: now, updatedAt: now })
      .where(eq(dealMarketsTable.dealId, dealId));

    await tx.insert(activityLogTable).values({
      dealId,
      entityType: "deal",
      entityId: dealId,
      eventType: "market_ranking_locked",
      description: "First provider-accepted market send: ranked market set permanently locked.",
      metadata: { batch_id: batchId, locked_at: now.toISOString(), internal: true },
    });
  });

  logger.info({ dealId, batchId }, "market-dispatch: deal_markets locked after first accepted send");
}

// ---------------------------------------------------------------------------
// attemptSend — builds the email and calls the email service
// ---------------------------------------------------------------------------

interface AttemptResult {
  outcome: "SUCCESS" | "TRANSIENT_FAILURE" | "PERMANENT_FAILURE" | "DELIVERY_UNKNOWN";
  providerAccepted: boolean;
  providerMessageId?: string | null;
  error?: string;
  skippedConcurrent?: boolean;
}

async function buildSubmissionAttachments(
  dealId: string,
): Promise<Array<{ filename: string; content: string }>> {
  const [deal, submission] = await Promise.all([
    db
      .select({
        businessName: dealsTable.businessName,
        state: dealsTable.state,
        vertical: dealsTable.vertical,
        productType: dealsTable.productType,
        annualPayroll: dealsTable.annualPayroll,
        employeeCountFt: dealsTable.employeeCountFt,
        coverageEffectiveDate: dealsTable.coverageEffectiveDate,
      })
      .from(dealsTable)
      .where(eq(dealsTable.id, dealId))
      .limit(1)
      .then((rows) => rows[0]),
    db
      .select({
        answers: submissionAnswersTable.answers,
        status: submissionAnswersTable.status,
      })
      .from(submissionAnswersTable)
      .where(
        and(
          eq(submissionAnswersTable.dealId, dealId),
          eq(submissionAnswersTable.status, "submitted"),
        ),
      )
      .orderBy(desc(submissionAnswersTable.createdAt))
      .limit(1)
      .then((rows) => rows[0]),
  ]);

  if (!deal) {
    throw new Error(`Deal ${dealId} not found while building submission package`);
  }
  const packageParse = routableCannabisApplicationAnswersSchema.safeParse(
    submission?.answers,
  );
  if (!packageParse.success) {
    throw new Error(
      `Deal ${dealId} has no persisted, completed application package`,
    );
  }

  const summary = [
    `Business: ${deal.businessName ?? "Unnamed Business"}`,
    `Product: ${deal.productType ?? "Workers' Compensation"}`,
    `State: ${deal.state ?? "—"}`,
    `Vertical: ${deal.vertical ?? "—"}`,
    `Annual payroll: ${deal.annualPayroll ?? "—"}`,
    `Full-time employees: ${deal.employeeCountFt ?? "—"}`,
    `Coverage effective date: ${deal.coverageEffectiveDate ?? "—"}`,
    "",
    "Generated by Axel Workforce OS from the completed submission.",
  ].join("\n");

  const attachments: Array<{ filename: string; content: string }> = [
    {
      filename: "submission-summary.txt",
      content: Buffer.from(summary, "utf8").toString("base64"),
    },
  ];

  const [axel, acord, trean] = await Promise.all([
    fillAxelCannabisApplication(packageParse.data),
    fillAcord130(packageParse.data),
    fillTreanSupp(packageParse.data),
  ]);
  attachments.push(
    {
      filename: "axel-cannabis-wc-application.pdf",
      content: Buffer.from(axel).toString("base64"),
    },
    {
      filename: "acord-130.pdf",
      content: Buffer.from(acord).toString("base64"),
    },
    {
      filename: "trean-cannabis-supplement.pdf",
      content: Buffer.from(trean).toString("base64"),
    },
  );

  return attachments;
}

async function attemptSend(
  itemId: string,
  dealMarketId: string,
  dealId: string,
  attemptNumber: number,
): Promise<AttemptResult> {
  // Build a stable idempotency key for this attempt.
  const idempotencyKey = `dm-${dealMarketId}-attempt-${attemptNumber}`;

  const startedAt = new Date();
  let attemptId!: string;

  // Create the attempt record.
  const [attempt] = await db
    .insert(dispatchAttemptsTable)
    .values({
      itemId,
      attemptNumber,
      idempotencyKey,
      startedAt,
    })
    .onConflictDoNothing()
    .returning({ id: dispatchAttemptsTable.id });

  // If conflict (duplicate attempt number due to concurrent sweep), skip.
  if (!attempt) {
    logger.info({ itemId, attemptNumber }, "market-dispatch: attempt already exists, skipping");
    return {
      outcome: "TRANSIENT_FAILURE",
      providerAccepted: false,
      error: "Concurrent attempt already recorded",
      skippedConcurrent: true,
    };
  }
  attemptId = attempt.id;

  // Load the deal_market + underwriter + market email address.
  const [dmRow] = await db
    .select()
    .from(dealMarketsTable)
    .where(eq(dealMarketsTable.id, dealMarketId));

  if (!dmRow) {
    await finalizeAttempt(attemptId, "PERMANENT_FAILURE", null, "deal_market row not found");
    return { outcome: "PERMANENT_FAILURE", providerAccepted: false, error: "deal_market row not found" };
  }

  // Update deal_market to DISPATCHING state.
  await db
    .update(dealMarketsTable)
    .set({ rankingState: "DISPATCHING", updatedAt: new Date() })
    .where(
      and(
        eq(dealMarketsTable.id, dealMarketId),
        inArray(dealMarketsTable.rankingState, ["QUEUED", "DISPATCHING"]),
      ),
    );

  // Load the underwriter email.
  let toEmail: string;
  if (dmRow.assignedUnderwriterId) {
    const [uw] = await db
      .select({ email: marketUnderwritersTable.email })
      .from(marketUnderwritersTable)
      .where(eq(marketUnderwritersTable.id, dmRow.assignedUnderwriterId));
    if (!uw) {
      await finalizeAttempt(attemptId, "PERMANENT_FAILURE", null, "Assigned underwriter not found");
      return { outcome: "PERMANENT_FAILURE", providerAccepted: false, error: "Assigned underwriter not found" };
    }
    toEmail = uw.email;
  } else {
    await finalizeAttempt(attemptId, "PERMANENT_FAILURE", null, "No assigned underwriter on deal_market");
    return { outcome: "PERMANENT_FAILURE", providerAccepted: false, error: "No assigned underwriter on deal_market" };
  }

  // Load the market name.
  const [market] = await db
    .select({ name: marketsTable.name })
    .from(marketsTable)
    .where(eq(marketsTable.id, dmRow.marketId));

  const marketName = market?.name ?? "Market";

  // Send via emailService with dealMarketId + idempotencyKey.
  let sendResult: Awaited<ReturnType<typeof sendDealEmail>>;
  try {
    const attachments = await buildSubmissionAttachments(dealId);
    sendResult = await sendDealEmail({
      dealId,
      dealMarketId,
      to: [toEmail],
      subject: `Workers' Compensation Submission — ${marketName}`,
      text: `Please find the attached submission package for your review.\n\nThis message was sent to ${marketName} as part of an automatic multi-market routing.`,
      sentBy: "system",
      idempotencyKey,
      attachments,
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error({ err, itemId, dealMarketId }, "market-dispatch: sendDealEmail threw");
    await finalizeAttempt(attemptId, "TRANSIENT_FAILURE", null, errMsg);
    return { outcome: "TRANSIENT_FAILURE", providerAccepted: false, error: errMsg };
  }

  // dev_logged is NOT provider acceptance — treat as success for test purposes
  // but do NOT lock the ranking. The spec says "provider-accepted status ('sent')"
  // and "dev_logged is not provider acceptance".
  if (sendResult.status === "sent") {
    await finalizeAttempt(attemptId, "SUCCESS", sendResult.providerMessageId ?? null, null);
    return {
      outcome: "SUCCESS",
      providerAccepted: true,
      providerMessageId: sendResult.providerMessageId,
    };
  }

  if (sendResult.status === "dev_logged") {
    // Not provider-accepted — record as dev_logged success for dev environments.
    // Per spec: dev_logged is not provider acceptance. We record a transient failure
    // so that in live mode retries would go to the real provider, but we do NOT
    // lock the ranking. In dev mode, we still need the dispatch to progress, so
    // treat it as a non-locking success.
    await finalizeAttempt(
      attemptId,
      "SUCCESS",
      null,
      "dev_logged — not provider accepted",
      "DEV_LOGGED",
    );
    return { outcome: "SUCCESS", providerAccepted: false, providerMessageId: null };
  }

  // failed
  const errMsg = sendResult.error ?? "Provider returned failure";
  const outcome =
    sendResult.failureKind === "DELIVERY_UNKNOWN"
      ? "DELIVERY_UNKNOWN"
      : sendResult.failureKind === "PERMANENT"
        ? "PERMANENT_FAILURE"
        : "TRANSIENT_FAILURE";
  await finalizeAttempt(attemptId, outcome, null, errMsg);
  return { outcome, providerAccepted: false, error: errMsg };
}

async function finalizeAttempt(
  attemptId: string,
  outcome: "SUCCESS" | "TRANSIENT_FAILURE" | "PERMANENT_FAILURE" | "DELIVERY_UNKNOWN",
  providerMessageId: string | null,
  errorDetail: string | null,
  errorCategory?: string | null,
): Promise<void> {
  await db
    .update(dispatchAttemptsTable)
    .set({
      completedAt: new Date(),
      outcome,
      providerMessageId,
      errorCategory: errorCategory ?? null,
      errorDetail,
    })
    .where(eq(dispatchAttemptsTable.id, attemptId));
}

// ---------------------------------------------------------------------------
// Dispatch status helper (used by routes and tests)
// ---------------------------------------------------------------------------

export type DispatchStatusSummary = {
  batchId: string | null;
  batchStatus: string | null;
  items: Array<{
    dealMarketId: string;
    rank: number;
    status: string;
    attemptCount: number;
    lastError: string | null;
    sentAt: Date | null;
  }>;
};

export async function getDispatchStatus(dealId: string): Promise<DispatchStatusSummary> {
  const [batch] = await db
    .select()
    .from(dispatchBatchesTable)
    .where(eq(dispatchBatchesTable.dealId, dealId))
    .orderBy(desc(dispatchBatchesTable.createdAt));

  if (!batch) return { batchId: null, batchStatus: null, items: [] };

  const items = await db
    .select()
    .from(dispatchItemsTable)
    .where(eq(dispatchItemsTable.batchId, batch.id))
    .orderBy(asc(dispatchItemsTable.rank));

  const dmIds = items.map((i) => i.dealMarketId);
  const dmRows =
    dmIds.length > 0
      ? await db
          .select({
            id: dealMarketsTable.id,
            sendAttemptCount: dealMarketsTable.sendAttemptCount,
            lastSendError: dealMarketsTable.lastSendError,
            sentAt: dealMarketsTable.sentAt,
          })
          .from(dealMarketsTable)
          .where(inArray(dealMarketsTable.id, dmIds))
      : [];

  const dmMap = new Map(dmRows.map((d) => [d.id, d]));

  return {
    batchId: batch.id,
    batchStatus: batch.status,
    items: items.map((i) => {
      const dm = dmMap.get(i.dealMarketId);
      return {
        dealMarketId: i.dealMarketId,
        rank: i.rank,
        status: i.status,
        attemptCount: dm?.sendAttemptCount ?? 0,
        lastError: dm?.lastSendError ?? null,
        sentAt: dm?.sentAt ?? null,
      };
    }),
  };
}
