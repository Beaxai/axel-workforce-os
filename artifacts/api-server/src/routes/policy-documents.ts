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

  const [doc] = await db
    .insert(policyDocumentsTable)
    .values({
      dealId,
      policyId: null, // a binder precedes the policy record
      documentType,
      fileName: req.file.originalname,
      fileUrl: storagePath, // fileUrl is NOT NULL — store the disk path
      fileSize: req.file.size,
      source: "MANUAL", // §6C v1: internal rep uploads it
      uploadedBy: req.user?.id ?? null,
    })
    .returning();

  await db.insert(activityLogTable).values({
    dealId,
    entityType: "policy_document",
    entityId: doc.id,
    eventType: "policy_document_uploaded",
    description: `${documentType === "binder" ? "Binder" : "Policy"} uploaded: ${req.file.originalname}`,
    metadata: { storage_path: storagePath, document_type: documentType },
  });

  return res.json({ success: true, document: doc });
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
