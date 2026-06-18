import { Router, type IRouter } from "express";
import { db, dealsTable, insertDealSchema, quotesTable, contactsTable, notesTable, tasksTable, activityLogTable, insertActivityLogSchema, dealEmailAddressesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { z } from "zod/v4";
import { findOrCreateAccount } from "../lib/accounts";

const router: IRouter = Router();

// account_id is NOT NULL in the DB; allow callers to omit it and we derive (or
// create) the owning account from the deal payload.
const createDealSchema = insertDealSchema.extend({ accountId: z.string().uuid().optional() });

router.get("/", async (_req, res) => {
  const rows = await db.select().from(dealsTable).orderBy(desc(dealsTable.createdAt));
  res.json(rows);
});

router.get("/:id", async (req, res) => {
  const [row] = await db.select().from(dealsTable).where(eq(dealsTable.id, req.params.id));
  if (!row) return res.status(404).json({ error: "Not found" });
  return res.json(row);
});

router.post("/", async (req, res) => {
  const parsed = createDealSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
  let accountId = parsed.data.accountId;
  if (!accountId) {
    const { account } = await findOrCreateAccount({
      businessName: parsed.data.businessName,
      fein: parsed.data.fein,
      state: parsed.data.state,
      vertical: parsed.data.vertical,
      entityType: parsed.data.entityType,
      productType: parsed.data.productType,
      annualPayroll: parsed.data.annualPayroll,
      headcount: parsed.data.employeeCountFt,
      emod: parsed.data.emod,
    });
    accountId = account.id;
  }
  const [row] = await db.insert(dealsTable).values({ ...parsed.data, accountId }).returning();
  return res.status(201).json(row);
});

router.patch("/:id", async (req, res) => {
  const parsed = insertDealSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
  const [row] = await db.update(dealsTable).set(parsed.data).where(eq(dealsTable.id, req.params.id)).returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  return res.json(row);
});

router.delete("/:id", async (req, res) => {
  const [row] = await db.delete(dealsTable).where(eq(dealsTable.id, req.params.id)).returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  return res.json({ deleted: true });
});

router.get("/:id/quotes", async (req, res) => {
  const rows = await db.select().from(quotesTable).where(eq(quotesTable.dealId, req.params.id));
  res.json(rows);
});

router.get("/:id/contacts", async (req, res) => {
  const rows = await db.select().from(contactsTable).where(eq(contactsTable.dealId, req.params.id));
  res.json(rows);
});

router.get("/:id/notes", async (req, res) => {
  const rows = await db.select().from(notesTable).where(eq(notesTable.dealId, req.params.id)).orderBy(desc(notesTable.createdAt));
  res.json(rows);
});

router.get("/:id/tasks", async (req, res) => {
  const rows = await db.select().from(tasksTable).where(eq(tasksTable.dealId, req.params.id));
  res.json(rows);
});

router.get("/:id/activity", async (req, res) => {
  const rows = await db.select().from(activityLogTable).where(eq(activityLogTable.dealId, req.params.id)).orderBy(desc(activityLogTable.createdAt));
  res.json(rows);
});

router.post("/:id/activity", async (req, res) => {
  const parsed = insertActivityLogSchema.safeParse({ ...req.body, dealId: req.params.id });
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
  const [row] = await db.insert(activityLogTable).values(parsed.data).returning();
  return res.status(201).json(row);
});

router.get("/:id/email", async (req, res) => {
  const [row] = await db.select().from(dealEmailAddressesTable).where(eq(dealEmailAddressesTable.dealId, req.params.id));
  res.json(row || null);
});

router.post("/:id/email", async (req, res) => {
  const dealId = req.params.id;
  const { emailAddress, companySlug } = req.body;
  if (!emailAddress || !companySlug) return res.status(400).json({ error: "emailAddress and companySlug required" });
  const [existing] = await db.select().from(dealEmailAddressesTable).where(eq(dealEmailAddressesTable.dealId, dealId));
  if (existing) return res.json(existing);
  const [row] = await db.insert(dealEmailAddressesTable).values({
    dealId,
    emailAddress,
    companySlug,
    fileId: dealId.slice(0, 8),
  }).returning();
  return res.status(201).json(row);
});

export default router;
