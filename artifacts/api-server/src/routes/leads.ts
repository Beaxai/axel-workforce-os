import { Router, type IRouter, type RequestHandler } from "express";
import { db, leadsTable, insertLeadSchema, accountsTable, activityLogTable } from "@workspace/db";
import { eq, desc, ilike, and, or } from "drizzle-orm";
import { findOrCreateAccount } from "../lib/accounts";

const router: IRouter = Router();

/** AGENTs only see leads assigned to them; ADMIN/CSA see everything. */
function ownershipFilter(req: Parameters<RequestHandler>[0]) {
  if (req.user?.role === "AGENT") return eq(leadsTable.assignedTo, req.user.id);
  return undefined;
}

router.get("/", async (req, res) => {
  const search = req.query.search as string | undefined;
  const status = req.query.status as string | undefined;

  let query = db.select().from(leadsTable).orderBy(desc(leadsTable.createdAt)).$dynamic();
  const conditions = [];
  const own = ownershipFilter(req);
  if (own) conditions.push(own);
  if (search) {
    conditions.push(or(ilike(leadsTable.companyName, `%${search}%`), ilike(leadsTable.contactName, `%${search}%`)));
  }
  if (status && status !== "All") conditions.push(eq(leadsTable.status, status));
  if (conditions.length > 0) query = query.where(and(...conditions));
  res.json(await query);
});

router.get("/:id", async (req, res) => {
  const [row] = await db.select().from(leadsTable).where(eq(leadsTable.id, req.params.id));
  if (!row) return res.status(404).json({ error: "Not found" });
  if (req.user?.role === "AGENT" && row.assignedTo !== req.user.id) {
    return res.status(403).json({ error: "Insufficient permissions" });
  }
  res.json(row);
});

router.post("/", async (req, res) => {
  const parsed = insertLeadSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
  // AGENTs always own the leads they create.
  const values = req.user?.role === "AGENT" ? { ...parsed.data, assignedTo: req.user.id } : parsed.data;
  const [row] = await db.insert(leadsTable).values(values).returning();
  res.status(201).json(row);
});

router.patch("/:id", async (req, res) => {
  const [existing] = await db.select().from(leadsTable).where(eq(leadsTable.id, req.params.id));
  if (!existing) return res.status(404).json({ error: "Not found" });
  if (req.user?.role === "AGENT" && existing.assignedTo !== req.user.id) {
    return res.status(403).json({ error: "Insufficient permissions" });
  }
  const parsed = insertLeadSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
  const [row] = await db
    .update(leadsTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(leadsTable.id, req.params.id))
    .returning();
  res.json(row);
});

router.delete("/:id", async (req, res) => {
  const [existing] = await db.select().from(leadsTable).where(eq(leadsTable.id, req.params.id));
  if (!existing) return res.status(404).json({ error: "Not found" });
  if (req.user?.role === "AGENT" && existing.assignedTo !== req.user.id) {
    return res.status(403).json({ error: "Insufficient permissions" });
  }
  await db.delete(leadsTable).where(eq(leadsTable.id, req.params.id));
  res.json({ deleted: true });
});

/**
 * Convert a lead into an account. Idempotent: a lead already linked to an account
 * returns that account. Pass `{ startSubmission: true }` to signal the client to
 * route into the quote/submission flow afterwards.
 */
router.post("/:id/convert", async (req, res) => {
  const [lead] = await db.select().from(leadsTable).where(eq(leadsTable.id, req.params.id));
  if (!lead) return res.status(404).json({ error: "Not found" });
  if (req.user?.role === "AGENT" && lead.assignedTo !== req.user.id) {
    return res.status(403).json({ error: "Insufficient permissions" });
  }

  const startSubmission = req.body?.startSubmission === true || req.query.startSubmission === "true";

  if (lead.convertedAccountId) {
    const [account] = await db.select().from(accountsTable).where(eq(accountsTable.id, lead.convertedAccountId));
    return res.json({ account, created: false, alreadyConverted: true, startSubmission });
  }

  const { account, created } = await findOrCreateAccount({
    businessName: lead.companyName,
    state: lead.state,
    vertical: lead.vertical,
    primaryContact: lead.contactName,
    contactEmail: lead.email,
    contactPhone: lead.phone,
  });

  await db
    .update(leadsTable)
    .set({ status: "converted", convertedAccountId: account.id, updatedAt: new Date() })
    .where(eq(leadsTable.id, lead.id));

  await db.insert(activityLogTable).values({
    entityType: "account",
    entityId: account.id,
    eventType: "lead_converted",
    description: `Converted from lead "${lead.companyName}".`,
    metadata: { lead_id: lead.id },
  });

  res.status(201).json({ account, created, alreadyConverted: false, startSubmission });
});

export default router;
