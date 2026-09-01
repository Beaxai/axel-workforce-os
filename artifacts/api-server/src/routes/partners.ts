import { Router, type IRouter } from "express";
import {
  agenciesTable,
  agentProfilesTable,
  contactsTable,
  db,
  partnersTable,
  insertPartnerSchema,
} from "@workspace/db";
import { eq, desc, and, sql } from "drizzle-orm";
import { z } from "zod/v4";
import { requireRoles } from "../middleware/require-auth";

const router: IRouter = Router();

const agencyContactSchema = z.object({
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  email: z.email(),
  title: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  mobile: z.string().trim().optional(),
  role: z
    .enum(["office_manager", "accounting", "licensing", "other"])
    .default("other"),
  isPrimary: z.boolean().default(false),
  notes: z.string().trim().optional(),
});

const createAgentSchema = z.object({
  agencyId: z.uuid(),
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  email: z.email(),
  status: z.enum(["Active", "Pending", "Suspended", "Terminated"]).default("Active"),
  title: z.string().trim().optional(),
  phoneDirect: z.string().trim().optional(),
  phoneMobile: z.string().trim().optional(),
  individualNpn: z.string().trim().optional(),
  licenseStates: z.array(z.string().trim().min(2).max(2)).default([]),
  contacts: z.array(agencyContactSchema).max(10).default([]),
});

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

router.post("/agents", requireRoles("ADMIN", "CSA"), async (req, res) => {
  const parsed = createAgentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues });
  }
  if (parsed.data.contacts.filter((contact) => contact.isPrimary).length > 1) {
    return res.status(400).json({ error: "Only one agency contact may be primary" });
  }

  const created = await db.transaction(async (tx) => {
    const [agency] = await tx
      .select()
      .from(agenciesTable)
      .where(eq(agenciesTable.id, parsed.data.agencyId))
      .for("update");
    if (!agency) return null;

    const displayName = `${parsed.data.firstName} ${parsed.data.lastName}`
      .replace(/\s+/g, " ")
      .trim();
    const [partner] = await tx
      .insert(partnersTable)
      .values({
        partnerType: "Agent",
        name: displayName,
        agencyName: agency.legalName,
        agencyId: agency.id,
        contactName: displayName,
        contactEmail: parsed.data.email,
        contactPhone: parsed.data.phoneDirect,
        status: parsed.data.status,
        licenseStates: parsed.data.licenseStates,
        npn: parsed.data.individualNpn,
      })
      .returning();

    const [profile] = await tx
      .insert(agentProfilesTable)
      .values({
        partnerId: partner.id,
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        title: parsed.data.title,
        phoneDirect: parsed.data.phoneDirect,
        phoneMobile: parsed.data.phoneMobile,
        individualNpn: parsed.data.individualNpn,
        licenseNumbers:
          parsed.data.licenseStates.length > 0
            ? { statesLicensed: parsed.data.licenseStates }
            : null,
      })
      .returning();

    if (parsed.data.contacts.length > 0) {
      if (parsed.data.contacts.some((contact) => contact.isPrimary)) {
        await tx.execute(
          sql`select pg_advisory_xact_lock(hashtextextended(${`agency:${agency.id}`}, 0))`,
        );
        await tx
          .update(contactsTable)
          .set({ isPrimary: false, updatedAt: new Date() })
          .where(
            and(
              eq(contactsTable.entityType, "agency"),
              eq(contactsTable.entityId, agency.id),
              eq(contactsTable.isPrimary, true),
            ),
          );
      }
      await tx.insert(contactsTable).values(
        parsed.data.contacts.map((contact) => ({
          ...contact,
          entityType: "agency",
          entityId: agency.id,
        })),
      );
    }

    return {
      ...partner,
      ...profile,
      agencyLegalName: agency.legalName,
      agencyStatus: agency.status,
    };
  });

  if (!created) return res.status(404).json({ error: "Agency not found" });
  return res.status(201).json(created);
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
