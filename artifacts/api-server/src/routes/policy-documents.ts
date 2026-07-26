import { Router, type IRouter, type Request, type Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import {
  db,
  policyDocumentsTable,
  activityLogTable,
} from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { applyWcDocumentUpload } from "../lib/wc-tracker";

const uploadDir = path.join(process.cwd(), "uploads", "policy-documents");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const safeName = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, "_");
    const uniqueName = `${Date.now()}_${safeName}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are accepted for policy documents."));
    }
  },
});

const router: IRouter = Router();

router.get("/:dealId", async (req, res) => {
  const rows = await db
    .select()
    .from(policyDocumentsTable)
    .where(eq(policyDocumentsTable.dealId, req.params.dealId))
    .orderBy(desc(policyDocumentsTable.createdAt));
  res.json({ documents: rows });
});

router.post("/:dealId/upload", upload.single("file"), async (req: Request<{ dealId: string }>, res: Response) => {
  const { dealId } = req.params;
  const { documentType } = req.body;

  if (!req.file) {
    return res.status(400).json({ error: "No file provided." });
  }

  if (!documentType || !["binder", "policy"].includes(String(documentType))) {
    // multer has already written the file to disk — don't orphan it on a 400.
    fs.unlink(req.file.path, () => {});
    return res.status(400).json({ error: 'documentType must be "binder" or "policy".' });
  }

  const storagePath = `policy-documents/${req.file.filename}`;
  const file = req.file;

  // One transaction: a tracker failure must not leave an orphaned "successful" doc row.
  const result = await db.transaction(async (tx) => {
    const [doc] = await tx
      .insert(policyDocumentsTable)
      .values({
        dealId,
        policyId: null, // a binder precedes the policy record
        documentType,
        fileName: file.originalname,
        fileUrl: storagePath, // fileUrl is NOT NULL — store the disk path
        fileSize: file.size,
        source: "MANUAL", // §6C v1: internal rep uploads it
        uploadedBy: req.user?.id ?? null,
      })
      .returning();

    await tx.insert(activityLogTable).values({
      dealId,
      entityType: "policy_document",
      entityId: doc.id,
      eventType: "policy_document_uploaded",
      description: `${documentType === "binder" ? "Binder" : "Policy"} uploaded: ${file.originalname}`,
      metadata: { storage_path: storagePath, document_type: documentType },
    });

    // §6D: this document is de facto carrier acceptance — advance the tracker.
    const auto = await applyWcDocumentUpload(dealId, documentType as "binder" | "policy", req.user?.id, tx);
    if (auto.completed.length > 0) {
      await tx.insert(activityLogTable).values({
        dealId,
        entityType: "implementation_tracker",
        entityId: auto.trackerId!,
        eventType: "tracker_auto_advanced",
        description: `${documentType === "policy" ? "Policy" : "Binder"} upload auto-satisfied ${auto.completed.length} tracker gate${auto.completed.length > 1 ? "s" : ""}.`,
        metadata: { documentType, completedTaskIds: auto.completed },
        createdBy: req.user?.id ?? null,
      });
    }
    return { doc, auto };
  });

  return res.json({ success: true, document: result.doc, autoSatisfied: result.auto });
});

// Serve an uploaded binder/policy PDF inline so the client can preview it
// without downloading. Two path segments, so it can't collide with GET /:dealId.
router.get("/:docId/file", async (req, res) => {
  const [doc] = await db
    .select()
    .from(policyDocumentsTable)
    .where(eq(policyDocumentsTable.id, req.params.docId));

  if (!doc) return res.status(404).json({ error: "Document not found." });

  const uploadsRoot = path.join(process.cwd(), "uploads");
  const filePath = path.resolve(uploadsRoot, doc.fileUrl);
  if (!filePath.startsWith(uploadsRoot + path.sep)) {
    return res.status(400).json({ error: "Invalid document path." });
  }
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "Document file is missing from storage." });
  }

  const safeName = doc.fileName.replace(/[^a-zA-Z0-9._ -]/g, "_");
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${safeName}"`);
  const stream = fs.createReadStream(filePath);
  stream.on("error", () => {
    if (!res.headersSent) res.status(500).json({ error: "Failed to read document file." });
    else res.destroy();
  });
  stream.pipe(res);
  return undefined;
});

router.delete("/:docId", async (req, res) => {
  const { docId } = req.params;

  const [doc] = await db
    .select()
    .from(policyDocumentsTable)
    .where(eq(policyDocumentsTable.id, docId));

  if (!doc) return res.status(404).json({ error: "Document not found." });

  const filePath = path.join(process.cwd(), "uploads", doc.fileUrl);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  await db.delete(policyDocumentsTable).where(eq(policyDocumentsTable.id, docId));

  return res.status(204).end();
});

export default router;
