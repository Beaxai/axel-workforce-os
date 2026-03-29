import { Router, type IRouter } from "express";
import { db, dealsTable, accountsTable, partnersTable, resourcesTable } from "@workspace/db";
import { ilike, or } from "drizzle-orm";

const router: IRouter = Router();

router.get("/", async (req, res) => {
  const q = req.query.q as string | undefined;
  if (!q || q.trim().length === 0) return res.json({ deals: [], accounts: [], partners: [], resources: [] });

  const pattern = `%${q}%`;

  const [deals, accounts, partners, resources] = await Promise.all([
    db.select().from(dealsTable).where(or(ilike(dealsTable.businessName, pattern), ilike(dealsTable.referenceCode, pattern))).limit(10),
    db.select().from(accountsTable).where(ilike(accountsTable.businessName, pattern)).limit(10),
    db.select().from(partnersTable).where(or(ilike(partnersTable.name, pattern), ilike(partnersTable.agencyName, pattern))).limit(10),
    db.select().from(resourcesTable).where(ilike(resourcesTable.title, pattern)).limit(10),
  ]);

  res.json({ deals, accounts, partners, resources });
});

export default router;
