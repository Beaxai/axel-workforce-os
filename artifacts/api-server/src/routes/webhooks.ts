import { Router, type Request, type Response } from "express";
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
import { and, eq, inArray } from "drizzle-orm";
import { retrieveAndStoreSignedDocuments } from "../services/helloSignService";

const router = Router();

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

        await db.insert(activityLogTable).values({
          dealId: sigRecord.dealId,
          entityType: "deal",
          entityId: sigRecord.dealId!,
          eventType: "signature_viewed",
          description: `Bind document package viewed${signerEmail ? " by " + signerEmail : ""}.`,
          metadata: { hellosign_signature_request_id: helloSignId, signer_email: signerEmail },
        });
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

        await db.insert(activityLogTable).values({
          dealId: sigRecord.dealId,
          entityType: "deal",
          entityId: sigRecord.dealId!,
          eventType: "document_signed",
          description: `${signerName} signed the bind documents. ${allSigned ? "All parties have signed." : "Awaiting remaining signatures."}`,
          metadata: {
            hellosign_signature_request_id: helloSignId,
            signer_name: signerName,
            all_signed: allSigned,
            signers: updatedSigners,
          },
        });
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

        // Auto-transition the linked account from a Prospect stage to "New Client"
        // on bind completion, and log it to the account's activity feed. Mirrors
        // the manual PATCH /accounts/:id stage_changed path; createdBy is null
        // (system action). Only Prospect-stage accounts are advanced so an
        // already-active client is never downgraded.
        //
        // Idempotent under duplicate `all_signed` delivery: the stage update is a
        // single conditional UPDATE ... WHERE client_stage IN (prospect stages)
        // RETURNING, run inside a transaction with the activity insert. A second
        // delivery matches zero rows (stage is already "New Client"), so no
        // duplicate row is written and no duplicate activity is logged.
        const boundDealId = sigRecord.dealId;
        if (boundDealId) {
          const [deal] = await db
            .select({ accountId: dealsTable.accountId })
            .from(dealsTable)
            .where(eq(dealsTable.id, boundDealId));

          const accountId = deal?.accountId;
          if (accountId) {
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
                .where(
                  and(
                    eq(accountsTable.id, accountId),
                    inArray(accountsTable.clientStage, [...PROSPECT_STAGES]),
                  ),
                )
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
        }
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

        await db.insert(activityLogTable).values({
          dealId: sigRecord.dealId,
          entityType: "deal",
          entityId: sigRecord.dealId!,
          eventType: "signature_declined",
          description: `Signature declined${decliner ? " by " + decliner.signer_name : ""}. Bind package has been reset — review and resend.`,
          metadata: { hellosign_signature_request_id: helloSignId, decliner_email: decliner?.signer_email_address },
        });
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

        await db.insert(activityLogTable).values({
          dealId: sigRecord.dealId,
          entityType: "deal",
          entityId: sigRecord.dealId!,
          eventType: "signature_expired",
          description: "Signature request expired before all parties signed. Please resend.",
          metadata: { hellosign_signature_request_id: helloSignId },
        });
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
