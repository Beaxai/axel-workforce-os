import { Router, type IRouter } from "express";
import { db, dealsTable, accountsTable, partnersTable, resourcesTable } from "@workspace/db";
import { ilike, or, and, isNull } from "drizzle-orm";
import { resolveActor, visibleAccountCondition, visibleDealCondition } from "../lib/scope";

const router: IRouter = Router();

router.get("/", async (req, res) => {
  const q = req.query.q as string | undefined;
  if (!q || q.trim().length === 0) return res.json({ deals: [], accounts: [], partners: [], resources: [] });

  const pattern = `%${q}%`;

  // SEC-1: global search composes the actor's deal/account visibility, so a
  // search can never surface another tenant's rows. Partners and resources
  // are shared reference data — unscoped by design.
  const actor = await resolveActor(req);
  const dealScope = await visibleDealCondition(actor);
  const accountScope = await visibleAccountCondition(actor);

  const dealWhere = and(
    isNull(dealsTable.archivedAt),
    or(ilike(dealsTable.businessName, pattern), ilike(dealsTable.referenceCode, pattern)),
    ...(dealScope ? [dealScope] : []),
  );
  const accountWhere = accountScope
    ? and(ilike(accountsTable.businessName, pattern), accountScope)
    : ilike(accountsTable.businessName, pattern);

  const [deals, accounts, partners, resources] = await Promise.all([
    db.select().from(dealsTable).where(dealWhere).limit(10),
    db.select().from(accountsTable).where(accountWhere).limit(10),
    db.select().from(partnersTable).where(or(ilike(partnersTable.name, pattern), ilike(partnersTable.agencyName, pattern))).limit(10),
    db.select().from(resourcesTable).where(ilike(resourcesTable.title, pattern)).limit(10),
  ]);

  return res.json({ deals, accounts, partners, resources });
});

export default router;
