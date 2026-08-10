import { Router, type Request, type Response } from "express";
import express from "express";
import crypto from "crypto";
import {
  db,
  signatureRequestsTable,
  bindDocumentPackagesTable,
  dealsTable,
  accountsTable,
  activityLogTable,
  PROSPECT_STAGES,
} from "@workspace/db";
import { and, eq, inArray, ne } from "drizzle-orm";
import { retrieveAndStoreSignedDocuments } from "../services/helloSignService";
import { getSignwellDocument } from "../services/signwellService";
import { stripeGet, stripeConfigured } from "../services/stripeService";
import { setBrokerFeeStatus } from "../lib/broker-fee";

/**
 * Auto-transition the linked account from a Prospect stage to "New Client" on
 * bind completion. Idempotent: a conditional UPDATE ... WHERE stage IN
 * (prospect stages) RETURNING inside a tx — duplicate deliveries match zero
 * rows, so no duplicate stage change or activity row. Shared by the SignWell
 * and legacy HelloSign completion handlers.
 */
async function advanceAccountOnBind(boundDealId: string): Promise<void> {
  const [deal] = await db
    .select({ accountId: dealsTable.accountId })
    .from(dealsTable)
    .where(eq(dealsTable.id, boundDealId));
  const accountId = deal?.accountId;
  if (!accountId) return;
  await db.transaction(async (tx) => {
    const [account] = await tx
      .select({ id: accountsTable.id, clientStage: accountsTable.clientStage })
      .from(accountsTable)
      .where(eq(accountsTable.id, accountId));
    if (!account) return;
    const fromStage = account.clientStage ?? "—";
    const advanced = await tx
      .update(accountsTable)
      .set({ clientStage: "New Client", updatedAt: new Date() })
      .where(and(eq(accountsTable.id, accountId), inArray(accountsTable.clientStage, [...PROSPECT_STAGES])))
      .returning({ id: accountsTable.id });
    if (advanced.length === 0) return; // already advanced or not a prospect
    await tx.insert(activityLogTable).values({
      dealId: boundDealId,
      entityType: "account",
      entityId: accountId,
      eventType: "stage_changed",
      description: `Stage changed from "${fromStage}" to "New Client" (deal bound).`,
      metadata: {
        changes: [{ field: "clientStage", label: "Stage", from: fromStage, to: "New Client" }],
        trigger: "bind_completed",
        dealId: boundDealId,
      },
      createdBy: null,
    });
  });
}
import { processInboundEmail, type InboundEmail } from "../lib/inbound-email";

const router = Router();

// ---------------------------------------------------------------------------
// Resend inbound email webhook (`email.received`).
// Resend signs webhooks Svix-style: HMAC-SHA256 of `${id}.${timestamp}.${body}`
// keyed with the base64 secret after the `whsec_` prefix. Verification is
// enforced when RESEND_WEBHOOK_SECRET is set (skipped in dev so simulated
// payloads can be tested before the domain/webhook exists).
// ---------------------------------------------------------------------------
function verifySvixSignature(req: Request, rawBody: string): boolean {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) return true; // dev mode — no secret configured yet

  const id = req.header("svix-id");
  const timestamp = req.header("svix-timestamp");
  const sigHeader = req.header("svix-signature");
  if (!id || !timestamp || !sigHeader) return false;

  // Reject stale timestamps (5 min tolerance) to limit replay.
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 300) return false;

  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = crypto
    .createHmac("sha256", key)
    .update(`${id}.${timestamp}.${rawBody}`)
    .digest("base64");

  // Header may contain multiple space-separated `v1,<sig>` entries.
  return sigHeader.split(" ").some((part) => {
    const sig = part.split(",")[1];
    if (!sig) return false;
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  });
}

function parseAddressList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") return value.split(",").map((s) => s.trim()).filter(Boolean);
  return [];
}

// Raw body handling: on the root `/webhooks` mount this router runs before
// express.json, so express.text captures the raw string. On the `/api/webhooks`
// mount the body is already parsed — there app.ts's json verify hook has stashed
// the exact signed bytes on req.rawBody. Signature is always computed over the
// original bytes, never a re-serialization.
router.post("/resend-inbound", express.text({ type: "*/*", limit: "10mb" }), async (req: Request, res: Response) => {
  try {
    const rawBody: string =
      (req as any).rawBody ??
      (typeof req.body === "string" ? req.body : JSON.stringify(req.body ?? {}));

    if (!verifySvixSignature(req, rawBody)) {
      return res.status(401).json({ error: "invalid signature" });
    }

    const payload = JSON.parse(rawBody);
    if (payload?.type !== "email.received") {
      return res.status(200).json({ ignored: true, type: payload?.type ?? null });
    }

    const d = payload.data ?? {};
    // Headers may arrive as an array of {name,value} or as a plain object.
    const headers: Record<string, string> = {};
    if (Array.isArray(d.headers)) {
      for (const h of d.headers) {
        if (h?.name) headers[String(h.name).toLowerCase()] = String(h.value ?? "");
      }
    } else if (d.headers && typeof d.headers === "object") {
      for (const [k, v] of Object.entries(d.headers)) {
        headers[k.toLowerCase()] = String(v ?? "");
      }
    }

    const email: InboundEmail = {
      messageId: String(d.email_id ?? headers["message-id"] ?? crypto.randomUUID()),
      to: [...parseAddressList(d.to), ...parseAddressList(d.cc)],
      from: String(d.from ?? "unknown"),
      fromName: null,
      subject: d.subject ?? null,
      bodyHtml: d.html ?? null,
      bodyText: d.text ?? null,
      inReplyTo: headers["in-reply-to"] || null,
      references: (headers["references"] || "").match(/<[^>]+>/g) ?? [],
      receivedAt: d.created_at ? new Date(d.created_at) : new Date(),
    };

    const result = await processInboundEmail(email);
    return res.status(200).json({
      ok: true,
      duplicate: result.duplicate,
      routed: Boolean(result.dealId),
      method: result.method,
    });
  } catch (err) {
    console.error("Resend inbound webhook error:", err);
    return res.status(500).json({ error: "processing failed" });
  }
});

// ---------------------------------------------------------------------------
// SignWell webhook (v2.7: SignWell platform-wide). Register in the SignWell
// dashboard pointing at /api/webhooks/signwell. Events carry
// { event: { type, related_signer? }, data: { object: <document> } }.
// Trust model: instead of relying on payload hashes, any state-changing event
// is server-side confirmed by re-fetching the document from SignWell's API —
// a forged webhook can therefore never mark a deal signed.
// ---------------------------------------------------------------------------
router.post("/signwell", async (req: Request, res: Response) => {
  res.status(200).send("ok");
  try {
    const payload: any = typeof req.body === "object" ? req.body : JSON.parse(String(req.body || "{}"));
    const eventType: string | undefined = payload?.event?.type;
    const doc: any = payload?.data?.object;
    if (!eventType || !doc?.id) return;

    const [sigRecord] = await db
      .select()
      .from(signatureRequestsTable)
      .where(eq(signatureRequestsTable.hellosignSignatureRequestId, doc.id))
      .limit(1);
    if (!sigRecord) {
      console.warn("[signwell webhook] no matching signature_request for document", doc.id);
      return;
    }
    if (sigRecord.status === "signed") return; // terminal — idempotent

    const logDealId = sigRecord.dealId;
    const updatedEvents = [
      ...((sigRecord.webhookEvents as any[]) || []),
      { event_type: eventType, received_at: new Date().toISOString(), signer: payload?.event?.related_signer?.email || null },
    ];

    // Trust model: EVERY event is a hint only. Before any state change (or
    // even a "viewed" activity row), confirm against SignWell's API — the
    // live document is the sole source of truth, so forged payloads can at
    // worst trigger a harmless re-sync.
    const live = await getSignwellDocument(doc.id).catch((err) => {
      console.error("[signwell webhook] confirmation fetch failed:", err instanceof Error ? err.message : err);
      return null;
    });
    if (!live) return;
    const liveStatus = String(live.status || "").toLowerCase();

    if (eventType === "document_viewed") {
      await db
        .update(signatureRequestsTable)
        .set({ webhookEvents: updatedEvents, updatedAt: new Date() })
        .where(eq(signatureRequestsTable.id, sigRecord.id));
      if (logDealId) {
        await db.insert(activityLogTable).values({
          dealId: logDealId,
          entityType: "deal",
          entityId: logDealId,
          eventType: "signature_viewed",
          description: `Bind document package viewed${payload?.event?.related_signer?.email ? " by " + payload.event.related_signer.email : ""}.`,
          metadata: { signwell_document_id: doc.id },
        });
      }
      return;
    }

    if (eventType === "document_signed" || eventType === "document_completed") {
      const liveRecipients: any[] = live.recipients || [];
      const signedEmails = new Set(
        liveRecipients.filter((r) => ["signed", "completed", "complete"].includes(String(r.status).toLowerCase())).map((r) => String(r.email).toLowerCase()),
      );
      const updatedSigners = ((sigRecord.signers as any[]) || []).map((s: any) =>
        signedEmails.has(String(s.email).toLowerCase()) && s.status !== "signed"
          ? { ...s, status: "signed", signed_at: new Date().toISOString() }
          : s,
      );
      // "allSigned" comes exclusively from the live document status —
      // recipient-derived state alone never triggers finalization.
      const allSigned = liveStatus === "completed";

      // Never downgrade a terminal `signed` record (e.g. late/replayed
      // partial event after completion): conditional updates only.
      await db
        .update(signatureRequestsTable)
        .set({
          signers: updatedSigners,
          ...(allSigned ? {} : { status: "partially_signed" }),
          webhookEvents: updatedEvents,
          updatedAt: new Date(),
        })
        .where(and(eq(signatureRequestsTable.id, sigRecord.id), ne(signatureRequestsTable.status, "signed")));
      if (!allSigned) {
        await db
          .update(dealsTable)
          .set({ bindStatus: "partially_signed" })
          .where(and(eq(dealsTable.id, sigRecord.dealId!), ne(dealsTable.bindStatus, "signed")));
      }

      if (logDealId && !allSigned) {
        const signerEmail = payload?.event?.related_signer?.email;
        const signerName = updatedSigners.find((s: any) => s.email?.toLowerCase() === String(signerEmail || "").toLowerCase())?.name || "A signer";
        await db.insert(activityLogTable).values({
          dealId: logDealId,
          entityType: "deal",
          entityId: logDealId,
          eventType: "document_signed",
          description: `${signerName} signed the bind documents. Awaiting remaining signatures.`,
          metadata: { signwell_document_id: doc.id, signers: updatedSigners },
        });
      }

      if (allSigned) {
        await retrieveAndStoreSignedDocuments(doc.id);
        await advanceAccountOnBind(sigRecord.dealId!);
      }
      return;
    }

    if (eventType === "document_declined" || eventType === "document_expired" || eventType === "document_canceled") {
      // Only act if the live document actually reports the terminal status
      // the webhook claims — otherwise it's forged/stale; record and ignore.
      const claimedStatus = eventType.replace("document_", "");
      const liveMatches =
        liveStatus === claimedStatus || (claimedStatus === "canceled" && ["canceled", "cancelled"].includes(liveStatus));
      if (!liveMatches) {
        await db
          .update(signatureRequestsTable)
          .set({ webhookEvents: updatedEvents, updatedAt: new Date() })
          .where(eq(signatureRequestsTable.id, sigRecord.id));
        return;
      }
      await db
        .update(signatureRequestsTable)
        .set({ status: claimedStatus, webhookEvents: updatedEvents, updatedAt: new Date() })
        .where(and(eq(signatureRequestsTable.id, sigRecord.id), ne(signatureRequestsTable.status, "signed")));
      if (logDealId) {
        await db.insert(activityLogTable).values({
          dealId: logDealId,
          entityType: "deal",
          entityId: logDealId,
          eventType: "signature_request_" + eventType.replace("document_", ""),
          description: `Signature request ${eventType.replace("document_", "")}${payload?.event?.related_signer?.email ? " by " + payload.event.related_signer.email : ""}.`,
          metadata: { signwell_document_id: doc.id },
        });
      }
      return;
    }

    // Unhandled event types: just record them.
    await db
      .update(signatureRequestsTable)
      .set({ webhookEvents: updatedEvents, updatedAt: new Date() })
      .where(eq(signatureRequestsTable.id, sigRecord.id));
  } catch (err) {
    console.error("[signwell webhook] processing error:", err instanceof Error ? err.message : err);
  }
});

// ---------------------------------------------------------------------------
// Stripe webhook — auto-marks the broker fee PAID when its payment link is
// paid. Register in the Stripe dashboard pointing at /api/webhooks/stripe with
// the `checkout.session.completed` event. Same trust model as SignWell: the
// payload is a hint only — we re-fetch the Checkout Session from Stripe's API
// with our own key and act on ITS payment_status + metadata (payment-link
// metadata propagates onto sessions), so no signing secret is required and a
// forged webhook can at worst trigger a harmless re-check.
// ---------------------------------------------------------------------------
router.post("/stripe", async (req: Request, res: Response) => {
  res.status(200).json({ received: true });
  try {
    const payload: any = typeof req.body === "object" ? req.body : JSON.parse(String(req.body || "{}"));
    if (payload?.type !== "checkout.session.completed") return;
    const sessionId: string | undefined = payload?.data?.object?.id;
    if (!sessionId || !sessionId.startsWith("cs_")) return;
    if (!stripeConfigured()) return;

    const session = await stripeGet(`/checkout/sessions/${sessionId}`);
    if (session?.payment_status !== "paid") return;
    const dealId: string | undefined = session?.metadata?.dealId;
    if (session?.metadata?.purpose !== "broker_fee" || !dealId) return;

    // setBrokerFeeStatus is idempotent (no-op when already PAID) and also
    // satisfies the checklist's broker-fee line + logs the activity.
    const result = await setBrokerFeeStatus(dealId, "PAID", "Stripe (payment link)");
    if (!result.ok) {
      console.error(`[stripe webhook] could not mark broker fee paid for deal ${dealId}: ${result.error}`);
    }
  } catch (err) {
    console.error("[stripe webhook] processing error:", err instanceof Error ? err.message : err);
  }
});

router.post("/hellosign", async (req: Request, res: Response) => {
  res.status(200).send("Hello API Event Received");

  try {
    let payload: any;
    const bodyStr = typeof req.body === "string" ? req.body : JSON.stringify(req.body);

    if (bodyStr.includes("json=")) {
      const params = new URLSearchParams(bodyStr);
      payload = JSON.parse(params.get("json") || "{}");
    } else {
      payload = typeof req.body === "object" ? req.body : JSON.parse(bodyStr);
    }

    const event = payload?.event;
    const signatureRequest = payload?.signature_request;

    if (!event || !signatureRequest) return;

    if (process.env.HELLOSIGN_WEBHOOK_SECRET) {
      const expectedHash = crypto
        .createHmac("sha256", process.env.HELLOSIGN_WEBHOOK_SECRET)
        .update(event.event_time + event.event_type)
        .digest("hex");

      if (event.event_hash !== expectedHash) {
        console.error("HelloSign webhook: invalid event hash — possible spoofed request");
        return;
      }
    }

    const helloSignId = signatureRequest.signature_request_id;
    const eventType = event.event_type;

    const [sigRecord] = await db
      .select()
      .from(signatureRequestsTable)
      .where(eq(signatureRequestsTable.hellosignSignatureRequestId, helloSignId))
      .limit(1);

    if (!sigRecord) {
      console.warn("HelloSign webhook: no matching signature_request for HS ID", helloSignId);
      return;
    }

    const logDealId = sigRecord.dealId;

    const updatedEvents = [
      ...((sigRecord.webhookEvents as any[]) || []),
      {
        event_type: eventType,
        event_time: event.event_time,
        received_at: new Date().toISOString(),
        metadata: event.event_metadata || {},
      },
    ];

    switch (eventType) {
      case "signature_request_viewed": {
        const signerEmail = event.event_metadata?.related_signature_id
          ? (signatureRequest.signatures as any[])?.find(
              (s: any) => s.signature_id === event.event_metadata.related_signature_id
            )?.signer_email_address
          : null;

        if (logDealId) {
          await db.insert(activityLogTable).values({
            dealId: logDealId,
            entityType: "deal",
            entityId: logDealId,
            eventType: "signature_viewed",
            description: `Bind document package viewed${signerEmail ? " by " + signerEmail : ""}.`,
            metadata: { hellosign_signature_request_id: helloSignId, signer_email: signerEmail },
          });
        }
        break;
      }

      case "signature_request_signed": {
        const relatedSigId = event.event_metadata?.related_signature_id;
        const updatedSigners = ((sigRecord.signers as any[]) || []).map((s: any) =>
          s.signature_id === relatedSigId
            ? { ...s, status: "signed", signed_at: new Date().toISOString() }
            : s
        );

        const allSigned = updatedSigners.every((s: any) => s.status === "signed");

        await db
          .update(signatureRequestsTable)
          .set({
            signers: updatedSigners,
            status: allSigned ? "signed" : "partially_signed",
            webhookEvents: updatedEvents,
            updatedAt: new Date(),
          })
          .where(eq(signatureRequestsTable.id, sigRecord.id));

        await db
          .update(dealsTable)
          .set({ bindStatus: allSigned ? "signed" : "partially_signed" })
          .where(eq(dealsTable.id, sigRecord.dealId!));

        const signerName = updatedSigners.find((s: any) => s.signature_id === relatedSigId)?.name || "A signer";

        if (logDealId) {
          await db.insert(activityLogTable).values({
            dealId: logDealId,
            entityType: "deal",
            entityId: logDealId,
            eventType: "document_signed",
            description: `${signerName} signed the bind documents. ${allSigned ? "All parties have signed." : "Awaiting remaining signatures."}`,
            metadata: {
              hellosign_signature_request_id: helloSignId,
              signer_name: signerName,
              all_signed: allSigned,
              signers: updatedSigners,
            },
          });
        }
        break;
      }

      case "signature_request_all_signed": {
        // Bind is complete here: all parties have signed.
        await db
          .update(signatureRequestsTable)
          .set({
            webhookEvents: updatedEvents,
            updatedAt: new Date(),
          })
          .where(eq(signatureRequestsTable.id, sigRecord.id));

        await retrieveAndStoreSignedDocuments(helloSignId);
        if (sigRecord.dealId) await advanceAccountOnBind(sigRecord.dealId);
        break;
      }

      case "signature_request_declined": {
        await db
          .update(signatureRequestsTable)
          .set({
            status: "declined",
            webhookEvents: updatedEvents,
            updatedAt: new Date(),
          })
          .where(eq(signatureRequestsTable.id, sigRecord.id));

        await db
          .update(bindDocumentPackagesTable)
          .set({
            status: "generating",
            updatedAt: new Date(),
          })
          .where(eq(bindDocumentPackagesTable.id, sigRecord.bindPackageId!));

        await db
          .update(dealsTable)
          .set({ bindStatus: "bind_requested" })
          .where(eq(dealsTable.id, sigRecord.dealId!));

        const decliner = (signatureRequest.signatures as any[])?.find(
          (s: any) => s.signature_id === event.event_metadata?.related_signature_id
        );

        if (logDealId) {
          await db.insert(activityLogTable).values({
            dealId: logDealId,
            entityType: "deal",
            entityId: logDealId,
            eventType: "signature_declined",
            description: `Signature declined${decliner ? " by " + decliner.signer_name : ""}. Bind package has been reset — review and resend.`,
            metadata: { hellosign_signature_request_id: helloSignId, decliner_email: decliner?.signer_email_address },
          });
        }
        break;
      }

      case "signature_request_expired": {
        await db
          .update(signatureRequestsTable)
          .set({
            status: "expired",
            webhookEvents: updatedEvents,
            updatedAt: new Date(),
          })
          .where(eq(signatureRequestsTable.id, sigRecord.id));

        await db
          .update(dealsTable)
          .set({ bindStatus: "bind_requested" })
          .where(eq(dealsTable.id, sigRecord.dealId!));

        if (logDealId) {
          await db.insert(activityLogTable).values({
            dealId: logDealId,
            entityType: "deal",
            entityId: logDealId,
            eventType: "signature_expired",
            description: "Signature request expired before all parties signed. Please resend.",
            metadata: { hellosign_signature_request_id: helloSignId },
          });
        }
        break;
      }

      default: {
        await db
          .update(signatureRequestsTable)
          .set({
            webhookEvents: updatedEvents,
            updatedAt: new Date(),
          })
          .where(eq(signatureRequestsTable.id, sigRecord.id));
        break;
      }
    }
  } catch (err) {
    console.error("HelloSign webhook processing error:", err);
  }
});

export default router;
