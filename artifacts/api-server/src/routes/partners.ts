import { Router, type IRouter } from "express";
import {
  agenciesTable,
  agentProfilesTable,
  db,
  partnersTable,
  insertPartnerSchema,
} from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";

const router: IRouter = Router();

router.get("/", async (req, res) => {
  const type = req.query.type as string | undefined;
  if (type === "Agent") {
    const rows = await db
      .select({
        partner: partnersTable,
        profile: agentProfilesTable,
        agency: agenciesTable,
      })
      .from(partnersTable)
      .leftJoin(
        agentProfilesTable,
        eq(agentProfilesTable.partnerId, partnersTable.id),
      )
      .leftJoin(agenciesTable, eq(agenciesTable.id, partnersTable.agencyId))
      .where(eq(partnersTable.partnerType, "Agent"))
      .orderBy(desc(partnersTable.createdAt));
    res.json(
      rows.map(({ partner, profile, agency }) => ({
        ...partner,
        firstName: profile?.firstName ?? null,
        lastName: profile?.lastName ?? null,
        title: profile?.title ?? null,
        phoneDirect: profile?.phoneDirect ?? null,
        phoneMobile: profile?.phoneMobile ?? null,
        individualNpn: profile?.individualNpn ?? null,
        licenseNumbers: profile?.licenseNumbers ?? null,
        registrationId: profile?.registrationId ?? null,
        userId: profile?.userId ?? null,
        agencyLegalName: agency?.legalName ?? null,
        agencyStatus: agency?.status ?? null,
      })),
    );
    return;
  }
  let query = db
    .select()
    .from(partnersTable)
    .orderBy(desc(partnersTable.createdAt))
    .$dynamic();
  if (type) query = query.where(eq(partnersTable.partnerType, type));
  const rows = await query;
  res.json(rows);
});

router.get("/:id", async (req, res) => {
  const [row] = await db
    .select({
      partner: partnersTable,
      profile: agentProfilesTable,
      agency: agenciesTable,
    })
    .from(partnersTable)
    .leftJoin(
      agentProfilesTable,
      eq(agentProfilesTable.partnerId, partnersTable.id),
    )
    .leftJoin(agenciesTable, eq(agenciesTable.id, partnersTable.agencyId))
    .where(eq(partnersTable.id, req.params.id));
  if (!row) return res.status(404).json({ error: "Not found" });
  return res.json({
    ...row.partner,
    firstName: row.profile?.firstName ?? null,
    lastName: row.profile?.lastName ?? null,
    title: row.profile?.title ?? null,
    phoneDirect: row.profile?.phoneDirect ?? null,
    phoneMobile: row.profile?.phoneMobile ?? null,
    individualNpn: row.profile?.individualNpn ?? null,
    licenseNumbers: row.profile?.licenseNumbers ?? null,
    registrationId: row.profile?.registrationId ?? null,
    userId: row.profile?.userId ?? null,
    agencyLegalName: row.agency?.legalName ?? null,
    agencyStatus: row.agency?.status ?? null,
  });
});

router.post("/", async (req, res) => {
  const parsed = insertPartnerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
  const [row] = await db.insert(partnersTable).values(parsed.data).returning();
  return res.status(201).json(row);
});

router.patch("/:id", async (req, res) => {
  const parsed = insertPartnerSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
  const [row] = await db.update(partnersTable).set({ ...parsed.data, updatedAt: new Date() }).where(eq(partnersTable.id, req.params.id)).returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  return res.json(row);
});

router.delete("/:id", async (req, res) => {
  const [row] = await db.delete(partnersTable).where(eq(partnersTable.id, req.params.id)).returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  return res.json({ deleted: true });
});

export default router;
