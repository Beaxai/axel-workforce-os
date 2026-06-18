import { Router, type IRouter, type Request, type Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import {
  db,
  lossHistoryDocumentsTable,
  activityLogTable,
} from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";

const uploadDir = path.join(process.cwd(), "uploads", "loss-history");
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
      cb(new Error("Only PDF files are accepted for loss history."));
    }
  },
});

const router: IRouter = Router();

router.get("/:dealId", async (req, res) => {
  const rows = await db
    .select()
    .from(lossHistoryDocumentsTable)
    .where(eq(lossHistoryDocumentsTable.dealId, req.params.dealId))
    .orderBy(desc(lossHistoryDocumentsTable.uploadedAt));
  res.json({ documents: rows });
});

router.post("/:dealId/upload", upload.single("file"), async (req: Request<{ dealId: string }>, res: Response) => {
  const { dealId } = req.params;
  const { yearsCovered, notes } = req.body;

  if (!req.file) {
    return res.status(400).json({ error: "No file provided." });
  }

  const storagePath = `loss-history/${req.file.filename}`;

  const [doc] = await db
    .insert(lossHistoryDocumentsTable)
    .values({
      dealId,
      fileName: req.file.originalname,
      storagePath,
      fileSizeBytes: req.file.size,
      yearsCovered: yearsCovered || null,
      notes: notes || null,
    })
    .returning();

  await db.insert(activityLogTable).values({
    dealId,
    entityType: "loss_history",
    entityId: doc.id,
    eventType: "loss_history_uploaded",
    description: `Loss run document uploaded: ${req.file.originalname}`,
    metadata: { storage_path: storagePath, years_covered: yearsCovered },
  });

  res.json({ success: true, document: doc });
});

router.delete("/:dealId/:docId", async (req, res) => {
  const { dealId, docId } = req.params;

  const [doc] = await db
    .select()
    .from(lossHistoryDocumentsTable)
    .where(
      and(
        eq(lossHistoryDocumentsTable.id, docId),
        eq(lossHistoryDocumentsTable.dealId, dealId)
      )
    );

  if (!doc) return res.status(404).json({ error: "Document not found." });

  const filePath = path.join(process.cwd(), "uploads", doc.storagePath);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  await db.delete(lossHistoryDocumentsTable).where(eq(lossHistoryDocumentsTable.id, docId));

  res.json({ success: true });
});

export default router;
