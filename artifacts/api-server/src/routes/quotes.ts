import { Router, type IRouter } from "express";
import { db, quotesTable, insertQuoteSchema } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import { projectQuoteForActor } from "../lib/quote-view";
import { canSeeDeal, resolveActor, visibleDealIds } from "../lib/scope";

const router: IRouter = Router();

// NOTE: every quote read goes through projectQuoteForActor — external/client
// actors are served the approved snapshot while indication-parameter edits
// are pending internal agreement.
// SEC-1: a quote is visible iff its parent deal is visible to the actor;
// out-of-scope ids 404 exactly like missing ones.

router.get("/", async (req, res) => {
  const actor = await resolveActor(req);
  const dealIds = await visibleDealIds(actor);
  const rows =
    dealIds === null
      ? await db.select().from(quotesTable)
      : dealIds.length === 0
        ? []
        : await db.select().from(quotesTable).where(inArray(quotesTable.dealId, dealIds));
  res.json(rows.map((r) => projectQuoteForActor(r, req.user?.role)));
});

router.get("/by-deal/:dealId", async (req, res) => {
  const actor = await resolveActor(req);
  if (!(await canSeeDeal(actor, req.params.dealId))) return res.status(404).json({ error: "Not found" });
  const [row] = await db.select().from(quotesTable).where(eq(quotesTable.dealId, req.params.dealId));
  if (!row) return res.status(404).json({ error: "Not found" });
  return res.json(projectQuoteForActor(row, req.user?.role));
});

router.get("/:id", async (req, res) => {
  const [row] = await db.select().from(quotesTable).where(eq(quotesTable.id, req.params.id));
  if (!row) return res.status(404).json({ error: "Not found" });
  const actor = await resolveActor(req);
  if (!(await canSeeDeal(actor, row.dealId))) return res.status(404).json({ error: "Not found" });
  return res.json(projectQuoteForActor(row, req.user?.role));
});

router.post("/", async (req, res) => {
  const parsed = insertQuoteSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
  const [row] = await db.insert(quotesTable).values(parsed.data).returning();
  return res.status(201).json(row);
});

router.patch("/:id", async (req, res) => {
  const parsed = insertQuoteSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
  const [existing] = await db.select().from(quotesTable).where(eq(quotesTable.id, req.params.id));
  if (!existing) return res.status(404).json({ error: "Not found" });
  const actor = await resolveActor(req);
  if (!(await canSeeDeal(actor, existing.dealId))) return res.status(404).json({ error: "Not found" });
  const [row] = await db.update(quotesTable).set(parsed.data).where(eq(quotesTable.id, req.params.id)).returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  return res.json(row);
});

export default router;
