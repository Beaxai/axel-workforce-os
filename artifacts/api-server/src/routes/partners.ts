import { Router, type IRouter } from "express";
import {
  accountsTable,
  agenciesTable,
  agentRegistrationsTable,
  agentProfilesTable,
  contactsTable,
  db,
  dealsTable,
  passwordResetTokensTable,
  partnersTable,
  sessionsTable,
  usersTable,
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
  phone: z.string().trim().optional(),
  mobile: z.string().trim().optional(),
  role: z.enum([
    "principal",
    "producer",
    "account_executive",
    "account_manager",
    "accounting_manager",
    "csr",
    "marketing",
    "other",
  ]),
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

const editAgentProfileSchema = z.object({
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().nullable().optional(),
  title: z.string().trim().nullable().optional(),
  email: z.email().nullable().optional(),
  phoneDirect: z.string().trim().nullable().optional(),
  phoneMobile: z.string().trim().nullable().optional(),
  individualNpn: z.string().trim().nullable().optional(),
  licenseStates: z.array(z.string().trim().min(2).max(2)).optional(),
  notes: z.string().trim().nullable().optional(),
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
      portalUser: usersTable,
    })
    .from(partnersTable)
    .leftJoin(
      agentProfilesTable,
      eq(agentProfilesTable.partnerId, partnersTable.id),
    )
    .leftJoin(agenciesTable, eq(agenciesTable.id, partnersTable.agencyId))
    .leftJoin(usersTable, eq(usersTable.id, agentProfilesTable.userId))
    .where(eq(partnersTable.id, req.params.id));
  if (!row) return res.status(404).json({ error: "Not found" });

  const [registration] = row.profile?.registrationId
    ? await db
        .select()
        .from(agentRegistrationsTable)
        .where(eq(agentRegistrationsTable.id, row.profile.registrationId))
        .limit(1)
    : await db
        .select()
        .from(agentRegistrationsTable)
        .where(eq(agentRegistrationsTable.partnerId, row.partner.id))
        .orderBy(desc(agentRegistrationsTable.createdAt))
        .limit(1);

  const associatedDeals = row.profile?.userId
    ? await db
        .select({
          id: dealsTable.id,
          clientName: accountsTable.businessName,
          fallbackClientName: dealsTable.businessName,
          stage: dealsTable.stage,
          wcPremium: dealsTable.wcPremium,
          estimatedPremium: dealsTable.estimatedPremium,
        })
        .from(dealsTable)
        .innerJoin(accountsTable, eq(accountsTable.id, dealsTable.accountId))
        .where(eq(dealsTable.producingAgentId, row.profile.userId))
        .orderBy(desc(dealsTable.createdAt))
    : [];
  const dealRows = associatedDeals.map((deal) => ({
    id: deal.id,
    clientName: deal.clientName || deal.fallbackClientName || "Client",
    stage: deal.stage,
    premium: Number(deal.wcPremium || deal.estimatedPremium || 0),
  }));

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
    email: row.partner.contactEmail ?? row.portalUser?.email ?? registration?.email,
    agentLicenseStates:
      row.partner.licenseStates ??
      (row.profile?.licenseNumbers &&
      typeof row.profile.licenseNumbers === "object" &&
      "statesLicensed" in row.profile.licenseNumbers &&
      Array.isArray(row.profile.licenseNumbers.statesLicensed)
        ? row.profile.licenseNumbers.statesLicensed
        : []),
    registration: registration
      ? {
          id: registration.id,
          status: registration.status,
          createdAt: registration.createdAt,
          agreementSignedAt: registration.agreementSignedAt,
          zoomScheduledAt: registration.zoomScheduledAt,
          eoExpirationDate: registration.eoExpirationDate,
        }
      : null,
    dealCount: dealRows.length,
    wcPremiumTotal: dealRows.reduce((sum, deal) => sum + deal.premium, 0),
    associatedDeals: dealRows,
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

router.patch(
  "/:id/agent-profile",
  requireRoles("ADMIN", "CSA"),
  async (req, res) => {
    const parsed = editAgentProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues });
    }
    const partnerId = req.params.id as string;

    const updated = await db.transaction(async (tx) => {
      const [partner] = await tx
        .select()
        .from(partnersTable)
        .where(eq(partnersTable.id, partnerId))
        .for("update");
      if (!partner || partner.partnerType !== "Agent") return null;

      const [profile] = await tx
        .select()
        .from(agentProfilesTable)
        .where(eq(agentProfilesTable.partnerId, partner.id))
        .for("update");
      if (!profile) return null;

      const lastName =
        parsed.data.lastName === undefined
          ? profile.lastName
          : parsed.data.lastName || null;
      const nextDisplayName = [parsed.data.firstName, lastName]
        .filter(Boolean)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      const licenseStates =
        parsed.data.licenseStates ?? partner.licenseStates ?? [];

      const [updatedPartner] = await tx
        .update(partnersTable)
        .set({
          name: nextDisplayName,
          contactName: nextDisplayName,
          contactEmail:
            parsed.data.email === undefined
              ? partner.contactEmail
              : parsed.data.email,
          contactPhone:
            parsed.data.phoneDirect === undefined
              ? partner.contactPhone
              : parsed.data.phoneDirect,
          npn:
            parsed.data.individualNpn === undefined
              ? partner.npn
              : parsed.data.individualNpn,
          licenseStates,
          notes:
            parsed.data.notes === undefined ? partner.notes : parsed.data.notes,
          updatedAt: new Date(),
        })
        .where(eq(partnersTable.id, partner.id))
        .returning();

      const [updatedProfile] = await tx
        .update(agentProfilesTable)
        .set({
          firstName: parsed.data.firstName,
          lastName,
          title:
            parsed.data.title === undefined ? profile.title : parsed.data.title,
          phoneDirect:
            parsed.data.phoneDirect === undefined
              ? profile.phoneDirect
              : parsed.data.phoneDirect,
          phoneMobile:
            parsed.data.phoneMobile === undefined
              ? profile.phoneMobile
              : parsed.data.phoneMobile,
          individualNpn:
            parsed.data.individualNpn === undefined
              ? profile.individualNpn
              : parsed.data.individualNpn,
          licenseNumbers:
            parsed.data.licenseStates === undefined
              ? profile.licenseNumbers
              : { statesLicensed: licenseStates },
          updatedAt: new Date(),
        })
        .where(eq(agentProfilesTable.partnerId, partner.id))
        .returning();

      if (profile.userId && parsed.data.email) {
        await tx
          .update(usersTable)
          .set({ email: parsed.data.email })
          .where(eq(usersTable.id, profile.userId));
      }

      return { ...updatedPartner, ...updatedProfile };
    });

    if (!updated) {
      return res.status(404).json({ error: "Agent profile not found" });
    }
    return res.json(updated);
  },
);

router.patch("/:id", async (req, res) => {
  const parsed = insertPartnerSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
  const partnerId = req.params.id as string;
  const outcome = await db.transaction(async (tx) => {
    const [target] = await tx
      .select()
      .from(partnersTable)
      .where(eq(partnersTable.id, partnerId))
      .for("update");
    if (!target) return { kind: "notFound" as const };
    if (
      parsed.data.partnerType !== undefined &&
      parsed.data.partnerType !== target.partnerType
    ) {
      return { kind: "partnerTypeLocked" as const };
    }
    if (target.partnerType === "Agent" && parsed.data.status !== undefined) {
      return { kind: "agentStatus" as const };
    }
    const [row] = await tx
      .update(partnersTable)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(partnersTable.id, partnerId))
      .returning();
    return { kind: "updated" as const, row };
  });

  if (outcome.kind === "notFound") {
    return res.status(404).json({ error: "Not found" });
  }
  if (outcome.kind === "partnerTypeLocked") {
    return res.status(400).json({ error: "Partner type cannot be changed" });
  }
  if (outcome.kind === "agentStatus") {
    return res.status(400).json({
      error: "Use the administrator Agent status action",
    });
  }
  return res.json(outcome.row);
});

router.patch("/:id/status", requireRoles("ADMIN"), async (req, res) => {
  const parsed = z
    .object({ status: z.enum(["Suspended", "Terminated"]) })
    .safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues });
  }
  const partnerId = req.params.id as string;

  const result = await db.transaction(async (tx) => {
    const [partner] = await tx
      .select()
      .from(partnersTable)
      .where(eq(partnersTable.id, partnerId))
      .for("update");
    if (!partner || partner.partnerType !== "Agent") return null;

    const [profile] = await tx
      .select({ userId: agentProfilesTable.userId })
      .from(agentProfilesTable)
      .where(eq(agentProfilesTable.partnerId, partner.id))
      .limit(1);

    const [updated] = await tx
      .update(partnersTable)
      .set({ status: parsed.data.status, updatedAt: new Date() })
      .where(eq(partnersTable.id, partner.id))
      .returning();

    if (profile?.userId) {
      await tx
        .update(usersTable)
        .set({ status: "deactivated" })
        .where(eq(usersTable.id, profile.userId));
      await tx
        .delete(sessionsTable)
        .where(eq(sessionsTable.userId, profile.userId));
      await tx
        .delete(passwordResetTokensTable)
        .where(eq(passwordResetTokensTable.userId, profile.userId));
    }

    return {
      ...updated,
      portalAccessRevoked: Boolean(profile?.userId),
    };
  });

  if (!result) return res.status(404).json({ error: "Agent not found" });
  return res.json(result);
});

router.delete("/:id", async (req, res) => {
  const [row] = await db.delete(partnersTable).where(eq(partnersTable.id, req.params.id)).returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  return res.json({ deleted: true });
});

export default router;
