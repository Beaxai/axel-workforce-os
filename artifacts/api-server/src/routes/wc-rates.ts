import { Router, type IRouter } from "express";
import { db, wcRatesTable } from "@workspace/db";
import { eq, and, desc, ilike, sql, count, countDistinct, inArray } from "drizzle-orm";

const router: IRouter = Router();

router.get("/class-codes/search", async (req, res) => {
  const { q = "", state: stateFilter } = req.query;
  const searchTerm = String(q).trim();
  if (searchTerm.length < 1) return res.json([]);

  // Normalize numeric search terms by stripping leading zeros so e.g.
  // "0035" matches the canonical "35" stored in the rate sheet.
  const isNumeric = /^[0-9]+$/.test(searchTerm);
  const normalized = isNumeric ? searchTerm.replace(/^0+/, "") || "0" : searchTerm;

  const conditions = [];
  if (isNumeric && normalized !== searchTerm) {
    conditions.push(
      sql`(${wcRatesTable.classCode} ILIKE ${`%${searchTerm}%`} OR ${wcRatesTable.classCode} = ${normalized} OR ${wcRatesTable.description} ILIKE ${`%${searchTerm}%`})`
    );
  } else {
    conditions.push(
      sql`(${wcRatesTable.classCode} ILIKE ${`%${searchTerm}%`} OR ${wcRatesTable.description} ILIKE ${`%${searchTerm}%`})`
    );
  }
  if (stateFilter) conditions.push(eq(wcRatesTable.state, String(stateFilter)));

  const rows = await db
    .selectDistinctOn([wcRatesTable.classCode], {
      classCode: wcRatesTable.classCode,
      description: wcRatesTable.description,
    })
    .from(wcRatesTable)
    .where(conditions.length === 1 ? conditions[0] : and(...conditions))
    .orderBy(wcRatesTable.classCode)
    .limit(50);

  return res.json(rows);
});

router.get("/class-codes/by-states", async (req, res) => {
  const { states } = req.query;
  if (!states) return res.json([]);
  const stateList = String(states).split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
  if (stateList.length === 0) return res.json([]);

  const rows = await db
    .selectDistinctOn([wcRatesTable.classCode], {
      classCode: wcRatesTable.classCode,
    })
    .from(wcRatesTable)
    .where(inArray(wcRatesTable.state, stateList))
    .orderBy(wcRatesTable.classCode);

  return res.json(rows.map((r) => r.classCode));
});

router.get("/stats", async (_req, res) => {
  const [totalResult] = await db.select({ total: count() }).from(wcRatesTable);
  const [statesResult] = await db.select({ states: countDistinct(wcRatesTable.state) }).from(wcRatesTable);
  res.json({ totalRecords: totalResult.total, statesCovered: statesResult.states });
});

router.get("/lookup", async (req, res) => {
  const { state, classCode } = req.query;
  if (!state || !classCode) return res.status(400).json({ error: "state and classCode required" });

  const [rate] = await db
    .select()
    .from(wcRatesTable)
    .where(and(eq(wcRatesTable.state, state as string), eq(wcRatesTable.classCode, classCode as string)))
    .orderBy(desc(wcRatesTable.effectiveDate))
    .limit(1);

  if (!rate) return res.json({ found: false, state, classCode });
  return res.json({ found: true, ...rate });
});

router.get("/", async (req, res) => {
  const { state, classCode, page = "1", limit = "50" } = req.query;
  const pageNum = Math.max(1, parseInt(page as string));
  const limitNum = Math.min(100, parseInt(limit as string));
  const offset = (pageNum - 1) * limitNum;

  let query = db.select().from(wcRatesTable).$dynamic();

  const conditions = [];
  if (state) conditions.push(eq(wcRatesTable.state, state as string));
  if (classCode) conditions.push(ilike(wcRatesTable.classCode, `%${classCode}%`));

  if (conditions.length === 1) query = query.where(conditions[0]);
  else if (conditions.length === 2) query = query.where(and(conditions[0], conditions[1]));

  query = query.orderBy(wcRatesTable.state, wcRatesTable.classCode, desc(wcRatesTable.effectiveDate));

  let countQuery = db.select({ total: count() }).from(wcRatesTable).$dynamic();
  if (conditions.length === 1) countQuery = countQuery.where(conditions[0]);
  else if (conditions.length === 2) countQuery = countQuery.where(and(conditions[0], conditions[1]));

  const [rows, [totalResult]] = await Promise.all([
    query.limit(limitNum).offset(offset),
    countQuery,
  ]);

  res.json({
    data: rows,
    page: pageNum,
    limit: limitNum,
    total: totalResult.total,
    totalPages: Math.ceil(totalResult.total / limitNum),
  });
});

export default router;
