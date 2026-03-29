import { Router, type IRouter } from "express";
import { db, quotesTable, insertQuoteSchema } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/", async (_req, res) => {
  const rows = await db.select().from(quotesTable);
  res.json(rows);
});

router.get("/by-deal/:dealId", async (req, res) => {
  const [row] = await db.select().from(quotesTable).where(eq(quotesTable.dealId, req.params.dealId));
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(row);
});

router.get("/:id", async (req, res) => {
  const [row] = await db.select().from(quotesTable).where(eq(quotesTable.id, req.params.id));
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(row);
});

router.post("/", async (req, res) => {
  const parsed = insertQuoteSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
  const [row] = await db.insert(quotesTable).values(parsed.data).returning();
  res.status(201).json(row);
});

router.patch("/:id", async (req, res) => {
  const parsed = insertQuoteSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
  const [row] = await db.update(quotesTable).set(parsed.data).where(eq(quotesTable.id, req.params.id)).returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(row);
});

export default router;
