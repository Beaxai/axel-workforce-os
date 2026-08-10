import { Router, type Request, type Response } from "express";
import {
  db,
  signatureRequestsTable,
  bindDocumentPackagesTable,
  activityLogTable,
} from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { sendBindPackageForSignature } from "../services/helloSignService";
import { signwellConfigured, sendSignwellReminder } from "../services/signwellService";

const router = Router();

router.post("/send/:bindPackageId", async (req: Request<{ bindPackageId: string }>, res: Response) => {
  const { bindPackageId } = req.params;

  const [bindPkg] = await db
    .select()
    .from(bindDocumentPackagesTable)
    .where(eq(bindDocumentPackagesTable.id, bindPackageId))
    .limit(1);

  if (!bindPkg) return res.status(404).json({ error: "Bind package not found." });

  if (bindPkg.status === "signed") {
    return res.status(400).json({ error: "This bind package has already been fully signed." });
  }

  if (bindPkg.status !== "pending_signature" && bindPkg.status !== "generating") {
    return res.status(400).json({
      error: `Cannot send for signature — current status: ${bindPkg.status}. Package must be in pending_signature or generating state.`,
    });
  }

  try {
    const result = await sendBindPackageForSignature(bindPackageId);
    return res.json({ success: true, ...result });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/:dealId", async (req: Request<{ dealId: string }>, res: Response) => {
  const [data] = await db
    .select()
    .from(signatureRequestsTable)
    .where(eq(signatureRequestsTable.dealId, req.params.dealId))
    .orderBy(desc(signatureRequestsTable.createdAt))
    .limit(1);

  res.json({ signatureRequest: data || null });
});

router.get("/:dealId/signed-url", async (req: Request<{ dealId: string }>, res: Response) => {
  const [sigRecord] = await db
    .select()
    .from(signatureRequestsTable)
    .where(eq(signatureRequestsTable.dealId, req.params.dealId))
    .orderBy(desc(signatureRequestsTable.createdAt))
    .limit(1);

  if (!sigRecord?.signedDocumentsPath) {
    return res.status(404).json({ error: "Signed documents not yet available." });
  }

  return res.json({ signedUrl: null, storagePath: sigRecord.signedDocumentsPath });
});

router.post("/:dealId/resend", async (req: Request<{ dealId: string }>, res: Response) => {
  const { emailAddress } = req.body;

  const [sigRecord] = await db
    .select()
    .from(signatureRequestsTable)
    .where(eq(signatureRequestsTable.dealId, req.params.dealId))
    .orderBy(desc(signatureRequestsTable.createdAt))
    .limit(1);

  if (!sigRecord) return res.status(404).json({ error: "No signature request found." });
  if (sigRecord.status === "signed") return res.status(400).json({ error: "Already fully signed." });

  // Real provider: trigger SignWell's reminder emails to pending recipients.
  const externalId = sigRecord.hellosignSignatureRequestId;
  if (signwellConfigured() && externalId && !externalId.startsWith("stub_")) {
    try {
      await sendSignwellReminder(externalId);
    } catch (err: any) {
      return res.status(502).json({ error: `SignWell reminder failed: ${err.message}` });
    }
  }

  await db.insert(activityLogTable).values({
    dealId: req.params.dealId,
    entityType: "deal",
    entityId: req.params.dealId,
    eventType: "signature_reminder_sent",
    description: `Signature reminder sent to ${emailAddress}.`,
    metadata: {
      hellosign_signature_request_id: sigRecord.hellosignSignatureRequestId,
    },
  });

  return res.json({ success: true });
});

export default router;
