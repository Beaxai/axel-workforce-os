/**
 * market-dispatch.ts — ADMIN/CSA-only route module
 *
 * Mounted at /market-dispatch
 *
 * GET  /:dealId          — dispatch state for a deal
 * POST /:dealId/retry    — retry confirmed failed items
 * POST /:dealId/cancel   — cancel undelivered batch; resets deal_markets to PROVISIONAL
 */

import { Router, type IRouter } from "express";
import {
  db,
  dealMarketsTable,
  dispatchBatchesTable,
  dispatchItemsTable,
  dispatchAttemptsTable,
  activityLogTable,
} from "@workspace/db";
import { and, eq, inArray, desc } from "drizzle-orm";
import {
  cancelMarketDispatch,
  getDispatchStatus,
  isManualDispatchRetryEligible,
} from "../lib/market-dispatch";

const router: IRouter = Router();

const ADMIN_CSA = new Set(["ADMIN", "CSA"]);

function requireAdminCsa(req: Parameters<typeof router.get>[1] extends (req: infer R, ...args: unknown[]) => unknown ? R : never, res: any, next: any) {
  if (!req.user || !ADMIN_CSA.has(req.user.role)) {
    return res.status(403).json({ error: "ADMIN or CSA role required" });
  }
  return next();
}

// Apply the role gate to all routes in this module.
router.use(requireAdminCsa as any);

// ---------------------------------------------------------------------------
// GET /:dealId — dispatch state
// ---------------------------------------------------------------------------
router.get("/:dealId", async (req, res) => {
  const { dealId } = req.params;
  try {
    const status = await getDispatchStatus(dealId);
    return res.json(status);
  } catch (err: unknown) {
    req.log.error({ err, dealId }, "market-dispatch: GET /:dealId failed");
    return res.status(500).json({ error: "Failed to retrieve dispatch status" });
  }
});

// ---------------------------------------------------------------------------
// POST /:dealId/retry — retry confirmed failed items deliberately
// ---------------------------------------------------------------------------
router.post("/:dealId/retry", async (req, res) => {
  const { dealId } = req.params;
  const actor = req.user!;
  const actorName = [actor.firstName, actor.lastName].filter(Boolean).join(" ") || actor.email;

  try {
    // Find the active batch for this deal.
    const [batch] = await db
      .select()
      .from(dispatchBatchesTable)
      .where(
        and(
          eq(dispatchBatchesTable.dealId, dealId),
          inArray(dispatchBatchesTable.status, ["FAILED", "COMPLETE"]),
        ),
      )
      .orderBy(desc(dispatchBatchesTable.createdAt));

    if (!batch) {
      return res.status(404).json({ error: "No dispatch batch found for this deal" });
    }
    if (
      !batch.applicationSnapshot ||
      !batch.applicationSnapshotHash ||
      !batch.routingInputSnapshot
    ) {
      return res.status(409).json({
        error:
          "This dispatch predates immutable package snapshots and cannot be retried automatically.",
      });
    }

    const terminalItems = await db
      .select()
      .from(dispatchItemsTable)
      .where(
        and(
          eq(dispatchItemsTable.batchId, batch.id),
          inArray(dispatchItemsTable.status, ["FAILED", "DELIVERY_UNKNOWN"]),
        ),
      );

    // DELIVERY_UNKNOWN is terminal. Provider acceptance may have happened, so
    // requeueing it could duplicate a carrier submission.
    const items = terminalItems.filter((item) =>
      isManualDispatchRetryEligible(item.status),
    );
    if (items.length === 0) {
      return res.status(409).json({
        error:
          "No confirmed failed items are eligible for retry. Delivery-unknown items require manual provider review and cannot be requeued.",
      });
    }

    const dealMarketIds = items.map((i) => i.dealMarketId);

    let retryBatchId!: string;
    await db.transaction(async (tx) => {
      // Preserve the complete attempt history on the prior batch and create
      // fresh dispatch items with a new retry budget.
      if (batch.status === "FAILED") {
        await tx
          .update(dispatchBatchesTable)
          .set({
            status: "CANCELLED",
            cancelledAt: new Date(),
            cancelledBy: actor.id,
            cancelReason: "Superseded by manual retry",
            updatedAt: new Date(),
          })
          .where(eq(dispatchBatchesTable.id, batch.id));
      }

      const [retryBatch] = await tx
        .insert(dispatchBatchesTable)
        .values({
          dealId,
          status: "QUEUED",
          applicationSnapshot: batch.applicationSnapshot,
          applicationSnapshotHash: batch.applicationSnapshotHash,
          routingInputSnapshot: batch.routingInputSnapshot,
        })
        .returning({ id: dispatchBatchesTable.id });
      retryBatchId = retryBatch.id;

      for (const item of items) {
        await tx.insert(dispatchItemsTable).values({
          batchId: retryBatchId,
          dealMarketId: item.dealMarketId,
          rank: item.rank,
          status: "PENDING",
        });
      }

      await tx
        .update(dealMarketsTable)
        .set({
          sendStatus: "PENDING",
          sendAttemptCount: 0,
          lastSendError: null,
          updatedAt: new Date(),
        })
        .where(inArray(dealMarketsTable.id, dealMarketIds));

      await tx.insert(activityLogTable).values({
        dealId,
        entityType: "deal",
        entityId: dealId,
        eventType: "market_dispatch_retry",
        description: `${actorName} manually retried ${items.length} failed market dispatch item(s).`,
        metadata: {
          prior_batch_id: batch.id,
          batch_id: retryBatchId,
          deal_market_ids: dealMarketIds,
          retried_by: actor.id,
          internal: true,
        },
        createdBy: actor.id,
      });
    });

    req.log.info({ dealId, batchId: retryBatchId, itemCount: items.length }, "market-dispatch: retry initiated");
    return res.json({ success: true, batchId: retryBatchId, retriedCount: items.length });
  } catch (err: unknown) {
    req.log.error({ err, dealId }, "market-dispatch: POST /:dealId/retry failed");
    return res.status(500).json({ error: "Failed to retry dispatch" });
  }
});

// ---------------------------------------------------------------------------
// POST /:dealId/cancel — cancel undelivered batch; reset to PROVISIONAL
// ---------------------------------------------------------------------------
router.post("/:dealId/cancel", async (req, res) => {
  const { dealId } = req.params;
  const { reason } = req.body as { reason?: string };
  const actor = req.user!;
  const actorName = [actor.firstName, actor.lastName].filter(Boolean).join(" ") || actor.email;
  if (!reason?.trim()) {
    return res.status(400).json({ error: "A cancellation reason is required" });
  }

  try {
    const outcome = await cancelMarketDispatch(dealId, {
      actorId: actor.id,
      actorName,
      reason: reason.trim(),
    });

    if (!outcome.ok) {
      return res.status(outcome.status).json({ error: outcome.error });
    }

    req.log.info({ dealId, batchId: outcome.batchId }, "market-dispatch: batch cancelled");
    return res.json({ success: true, batchId: outcome.batchId, message: "Batch cancelled; markets reset to PROVISIONAL for re-ranking." });
  } catch (err: unknown) {
    req.log.error({ err, dealId }, "market-dispatch: POST /:dealId/cancel failed");
    return res.status(500).json({ error: "Failed to cancel dispatch" });
  }
});

export default router;
