/**
 * market-dispatch.ts — ADMIN/CSA-only route module
 *
 * Mounted at /market-dispatch
 *
 * GET  /:dealId          — dispatch state for a deal
 * POST /:dealId/retry    — retry terminal failed/delivery-unknown items
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
import { getDispatchStatus } from "../lib/market-dispatch";

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
// POST /:dealId/retry — retry terminal failed/delivery-unknown items deliberately
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

    // Load items that are FAILED or DELIVERY_UNKNOWN — these can be retried.
    const items = await db
      .select()
      .from(dispatchItemsTable)
      .where(
        and(
          eq(dispatchItemsTable.batchId, batch.id),
          inArray(dispatchItemsTable.status, ["FAILED", "DELIVERY_UNKNOWN"]),
        ),
      );

    if (items.length === 0) {
      return res.status(409).json({ error: "No failed or delivery-unknown items to retry" });
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
        .values({ dealId, status: "QUEUED" })
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
    const outcome = await db.transaction(async (tx) => {
      const [batch] = await tx
        .select()
        .from(dispatchBatchesTable)
        .where(
          and(
            eq(dispatchBatchesTable.dealId, dealId),
            inArray(dispatchBatchesTable.status, ["QUEUED", "PROCESSING", "FAILED"]),
          ),
        )
        .orderBy(desc(dispatchBatchesTable.createdAt))
        .limit(1)
        .for("update");
      if (!batch) return { ok: false as const, status: 404, error: "No active dispatch batch found for this deal" };
      if (batch.status === "PROCESSING" || batch.workerClaimId) {
        return {
          ok: false as const,
          status: 409,
          error: "Cannot cancel while a dispatch worker is processing this batch. Review delivery status when it finishes.",
        };
      }

      const items = await tx
        .select()
        .from(dispatchItemsTable)
        .where(eq(dispatchItemsTable.batchId, batch.id));
      const [lockedMarket] = await tx
        .select({ id: dealMarketsTable.id })
        .from(dealMarketsTable)
        .where(
          and(
            eq(dealMarketsTable.dealId, dealId),
            eq(dealMarketsTable.rankingState, "LOCKED"),
          ),
        )
        .limit(1);
      if (items.some((item) => item.status === "SENT") || lockedMarket) {
        return {
          ok: false as const,
          status: 409,
          error: "Cannot cancel: at least one market received the submission and the ranking is locked.",
        };
      }

      await tx
        .update(dispatchBatchesTable)
        .set({
          status: "CANCELLED",
          cancelledAt: new Date(),
          cancelledBy: actor.id,
          cancelReason: reason.trim(),
          workerClaimId: null,
          workerClaimedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(dispatchBatchesTable.id, batch.id));
      await tx
        .update(dealMarketsTable)
        .set({
          rankingState: "PROVISIONAL",
          sendStatus: "PENDING",
          sendAttemptCount: 0,
          lastSendError: null,
          updatedAt: new Date(),
        })
        .where(eq(dealMarketsTable.dealId, dealId));
      await tx.insert(activityLogTable).values({
        dealId,
        entityType: "deal",
        entityId: dealId,
        eventType: "market_dispatch_cancelled",
        description: `${actorName} cancelled the market dispatch batch. Markets reset to PROVISIONAL. Reason: ${reason.trim()}.`,
        metadata: {
          batch_id: batch.id,
          cancelled_by: actor.id,
          reason: reason.trim(),
          deal_market_ids: items.map((item) => item.dealMarketId),
          internal: true,
        },
        createdBy: actor.id,
      });
      return { ok: true as const, batchId: batch.id };
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
