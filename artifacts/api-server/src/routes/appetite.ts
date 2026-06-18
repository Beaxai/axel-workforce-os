import { Router, type IRouter } from "express";
import { db, appetiteTable } from "@workspace/db";
import { eq, and, ilike, sql, count } from "drizzle-orm";

const router: IRouter = Router();

router.get("/", async (req, res) => {
  const { state, determination, search, page = "0", limit = "50" } = req.query as Record<string, string>;
  const pageNum = parseInt(page) || 0;
  const limitNum = Math.min(parseInt(limit) || 50, 100);
  const offset = pageNum * limitNum;

  const conditions = [];
  if (state) conditions.push(eq(appetiteTable.state, state.toUpperCase()));
  if (determination) conditions.push(eq(appetiteTable.uwDetermination, determination));
  if (search) conditions.push(ilike(appetiteTable.description, `%${search}%`));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, [countResult]] = await Promise.all([
    db.select().from(appetiteTable)
      .where(whereClause)
      .orderBy(appetiteTable.state, appetiteTable.classCode)
      .limit(limitNum)
      .offset(offset),
    db.select({ total: count() }).from(appetiteTable).where(whereClause),
  ]);

  res.json({ data: rows, total: countResult?.total || 0 });
});

router.get("/:state/:classCode", async (req, res) => {
  const { state, classCode } = req.params;

  const [row] = await db.select({
    uwDetermination: appetiteTable.uwDetermination,
    uwConsiderations: appetiteTable.uwConsiderations,
    description: appetiteTable.description,
    baseRate: appetiteTable.baseRate,
  })
    .from(appetiteTable)
    .where(and(
      eq(appetiteTable.state, state.toUpperCase()),
      eq(appetiteTable.classCode, classCode),
    ))
    .limit(1);

  if (!row) {
    return res.json({
      uwDetermination: "Unknown",
      uwConsiderations: null,
      description: null,
      baseRate: null,
    });
  }

  return res.json(row);
});

router.post("/batch", async (req, res) => {
  const { lookups } = req.body as { lookups: Array<{ state: string; class_code: string }> };

  if (!lookups?.length) return res.json({ results: [] });

  const states = [...new Set(lookups.map(l => l.state.toUpperCase()))];

  const data = await db.select({
    state: appetiteTable.state,
    classCode: appetiteTable.classCode,
    uwDetermination: appetiteTable.uwDetermination,
    uwConsiderations: appetiteTable.uwConsiderations,
  })
    .from(appetiteTable)
    .where(
      states.length === 1
        ? eq(appetiteTable.state, states[0])
        : sql`${appetiteTable.state} IN (${sql.join(states.map(s => sql`${s}`), sql`, `)})`
    );

  const index: Record<string, typeof data[number]> = {};
  data.forEach(r => { index[`${r.state}:${r.classCode}`] = r; });

  const results = lookups.map(l => {
    const match = index[`${l.state.toUpperCase()}:${l.class_code}`];
    return {
      state: l.state,
      class_code: l.class_code,
      uw_determination: match?.uwDetermination || "Unknown",
      uw_considerations: match?.uwConsiderations || null,
    };
  });

  return res.json({ results });
});

export default router;
