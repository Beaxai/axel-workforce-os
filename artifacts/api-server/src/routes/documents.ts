import { Router, type Request, type Response } from "express";
import {
  db,
  bindDocumentPackagesTable,
  uwFileViewsTable,
} from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

router.post("/signed-url", async (req: Request, res: Response) => {
  const { storage_path, deal_id } = req.body;
  if (!storage_path) return res.status(400).json({ error: "storage_path is required." });

  if (deal_id && !storage_path.includes(deal_id)) {
    return res.status(403).json({ error: "Document does not belong to this deal." });
  }

  return res.json({ signedUrl: null, storagePath: storage_path, message: "File storage not configured — path reference only." });
});

router.post("/log-view", async (req: Request, res: Response) => {
  const { deal_id, document_type, storage_path } = req.body;
  try {
    await db.insert(uwFileViewsTable).values({
      dealId: deal_id,
      documentType: document_type,
      storagePath: storage_path,
    });
    res.json({ success: true });
  } catch {
    res.json({ success: true });
  }
});

router.get("/bind-package/:dealId", async (req: Request<{ dealId: string }>, res: Response) => {
  const [data] = await db
    .select()
    .from(bindDocumentPackagesTable)
    .where(eq(bindDocumentPackagesTable.dealId, req.params.dealId))
    .orderBy(desc(bindDocumentPackagesTable.createdAt))
    .limit(1);

  res.json({ bindPackage: data || null });
});

export default router;
