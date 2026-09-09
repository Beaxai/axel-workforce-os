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
import { z } from "zod/v4";
import {
  cancelMarketDispatch,
  getDispatchStatus,
  isManualDispatchRetryEligible,
  retryBatchMetadata,
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
  const parsed = z.object({ batchId: z.string().uuid() }).safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "A valid batchId is required; retry cannot infer a batch." });
  }

  try {
    const result = await db.transaction(async (tx) => {
      const [batch] = await tx.select().from(dispatchBatchesTable).where(and(
        eq(dispatchBatchesTable.id, parsed.data.batchId),
        eq(dispatchBatchesTable.dealId, dealId),
        inArray(dispatchBatchesTable.status, ["FAILED", "COMPLETE"]),
      )).for("update");
      if (!batch) return { error: "Retryable dispatch batch not found for this deal", status: 404 as const };
      if (!batch.applicationSnapshot || !batch.applicationSnapshotHash || !batch.routingInputSnapshot) {
        return { error: "This dispatch predates immutable package snapshots and cannot be retried automatically.", status: 409 as const };
      }
      const terminalItems = await tx.select().from(dispatchItemsTable).where(and(
        eq(dispatchItemsTable.batchId, batch.id),
        inArray(dispatchItemsTable.status, ["FAILED", "DELIVERY_UNKNOWN"]),
      )).for("update");
      const items = terminalItems.filter((item) => isManualDispatchRetryEligible(item.status));
      if (items.length === 0) {
        return { error: "No confirmed failed items are eligible for retry.", status: 409 as const };
      }
      const dealMarketIds = items.map((item) => item.dealMarketId);
      // Preserve the complete attempt history on the prior batch and create
      // fresh dispatch items with a new retry budget.
      await tx
        .update(dispatchBatchesTable)
        .set({
          status: "CANCELLED",
          cancelledAt: new Date(),
          cancelledBy: actor.id,
          cancelReason: "Superseded by manual retry",
          updatedAt: new Date(),
        })
        .where(and(
          eq(dispatchBatchesTable.id, batch.id),
          inArray(dispatchBatchesTable.status, ["FAILED", "COMPLETE"]),
        ));

      const [retryBatch] = await tx
        .insert(dispatchBatchesTable)
        .values({
          dealId,
          ...retryBatchMetadata(batch),
          status: "QUEUED",
          applicationSnapshot: batch.applicationSnapshot,
          applicationSnapshotHash: batch.applicationSnapshotHash,
          routingInputSnapshot: batch.routingInputSnapshot,
        })
        .returning({ id: dispatchBatchesTable.id });
      for (const item of items) {
        await tx.insert(dispatchItemsTable).values({
          batchId: retryBatch.id,
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
          batch_id: retryBatch.id,
          deal_market_ids: dealMarketIds,
          retried_by: actor.id,
          internal: true,
        },
        createdBy: actor.id,
      });
      return { retryBatchId: retryBatch.id, itemCount: items.length };
    });
    if ("error" in result) return res.status(result.status!).json({ error: result.error });
    req.log.info({ dealId, batchId: result.retryBatchId, itemCount: result.itemCount }, "market-dispatch: retry initiated");
    return res.json({ success: true, batchId: result.retryBatchId, retriedCount: result.itemCount });
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
