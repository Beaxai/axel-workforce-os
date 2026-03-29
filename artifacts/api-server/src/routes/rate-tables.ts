import { Router, type IRouter } from "express";
import { db, rateTablesTable, pepmRatesTable, insertRateTableSchema } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();

router.get("/", async (req, res) => {
  const { state, class_code, carrier } = req.query;
  let query = db.select().from(rateTablesTable).$dynamic();
  const conditions = [];
  if (state) conditions.push(eq(rateTablesTable.state, String(state)));
  if (class_code) conditions.push(eq(rateTablesTable.classCode, String(class_code)));
  if (carrier) conditions.push(eq(rateTablesTable.carrier, String(carrier)));
  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }
  const rows = await query;
  res.json(rows);
});

router.post("/", async (req, res) => {
  const parsed = insertRateTableSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
  const [row] = await db.insert(rateTablesTable).values(parsed.data).returning();
  res.status(201).json(row);
});

router.get("/pepm", async (_req, res) => {
  const rows = await db.select().from(pepmRatesTable);
  res.json(rows);
});

export default router;
