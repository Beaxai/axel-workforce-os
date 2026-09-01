import { Router, type IRouter, type Request, type Response } from "express";
import {
  db,
  agentRegistrationsTable,
  insertAgentRegistrationSchema,
  usersTable,
  orgMembersTable,
  userProfilesTable,
  partnersTable,
} from "@workspace/db";
import { and, eq, desc } from "drizzle-orm";
import { getAuthUserById } from "../lib/auth";
import { createOrMatchAgency } from "../lib/agencies";
import { upsertAgentProfile } from "../lib/agent-profiles";

const router: IRouter = Router();

router.get("/", async (_req, res) => {
  const rows = await db.select().from(agentRegistrationsTable).orderBy(desc(agentRegistrationsTable.createdAt));
  res.json(rows);
});

router.get("/:id", async (req, res) => {
  const [row] = await db.select().from(agentRegistrationsTable).where(eq(agentRegistrationsTable.id, req.params.id));
  if (!row) return res.status(404).json({ error: "Not found" });
  return res.json(row);
});

router.post("/", async (req, res) => {
  const parsed = insertAgentRegistrationSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
  const [row] = await db.insert(agentRegistrationsTable).values(parsed.data).returning();
  return res.status(201).json(row);
});

router.patch("/:id", async (req, res) => {
  const allowedFields: Record<string, boolean> = {
    status: true, reviewedBy: true, reviewedAt: true, declineReason: true,
    agreementEnvelopeId: true, agreementSentAt: true, agreementSignedAt: true,
    agreementUrl: true, zoomScheduledAt: true, zoomCompletedAt: true,
    onboardingAdminId: true, partnerId: true, userId: true,
    agencyName: true, firstName: true, lastName: true, email: true, phone: true,
    agencyAddress: true, agencyPhone: true, agencyDba: true, agencyWebsite: true,
    agencyNpn: true, individualNpn: true, statesLicensed: true,
    linesOfAuthority: true, licenseNumbers: true, title: true,
    eoCarrier: true, eoPolicyNumber: true, eoCoverageAmount: true,
    eoExpirationDate: true, eoCertificateUrl: true, referralSource: true,
  };

  const timestampFields = new Set(["reviewedAt", "agreementSentAt", "agreementSignedAt", "zoomScheduledAt", "zoomCompletedAt"]);

  const updateData: Record<string, any> = {};
  for (const [key, val] of Object.entries(req.body)) {
    if (allowedFields[key]) {
      if (timestampFields.has(key) && typeof val === "string") {
        updateData[key] = new Date(val);
      } else {
        updateData[key] = val;
      }
    }
  }

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ error: "No valid fields to update" });
  }

  const [row] = await db.update(agentRegistrationsTable).set(updateData).where(eq(agentRegistrationsTable.id, req.params.id)).returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  return res.json(row);
});

// POST /api/agent-registrations/:id/approve — ADMIN/CSA (mount-gated).
// Atomically provisions an AGENT login from the registration: creates the user
// (status `invited`, completes via reset flow) + AGENT org membership +
// user_profiles (role_metadata seeded from the registration), then marks the
// registration approved and links it to the new user. Idempotent on email:
// reuses an existing user instead of creating a duplicate.
router.post("/:id/approve", async (req: Request<{ id: string }>, res: Response) => {
  const approval = await db.transaction(async (tx) => {
    const [reg] = await tx
      .select()
      .from(agentRegistrationsTable)
      .where(eq(agentRegistrationsTable.id, req.params.id))
      .for("update");
    if (!reg) return { kind: "notFound" as const };
    if (!reg.email) return { kind: "missingEmail" as const };
    if (reg.userId && reg.partnerId) {
      return {
        kind: "existing" as const,
        registrationId: reg.id,
        userId: reg.userId,
        partnerId: reg.partnerId,
      };
    }

    const orgId = reg.partnerId ?? null;
    const roleMetadata = {
      agencyName: reg.agencyName ?? null,
      licenseNumbers: reg.licenseNumbers ?? [],
      statesLicensed: reg.statesLicensed ?? [],
      linesOfAuthority: reg.linesOfAuthority ?? [],
      eoCarrier: reg.eoCarrier ?? null,
      eoExpiration: reg.eoExpirationDate ?? null,
    };
    const agency = await createOrMatchAgency(tx, {
      legalName: reg.agencyName,
      dba: reg.agencyDba,
      status: "active",
      mainPhone: reg.agencyPhone,
      website: reg.agencyWebsite,
      address: reg.agencyAddress,
      agencyNpn: reg.agencyNpn,
      statesLicensed: reg.statesLicensed,
      linesOfAuthority: reg.linesOfAuthority,
    });
    let partnerId = reg.partnerId;
    if (partnerId) {
      const [linkedPartner] = await tx
        .update(partnersTable)
        .set({ agencyId: agency.id, updatedAt: new Date() })
        .where(
          and(
            eq(partnersTable.id, partnerId),
            eq(partnersTable.partnerType, "Agent"),
          ),
        )
        .returning({ id: partnersTable.id });
      if (!linkedPartner) {
        throw new Error(
          "Registration partner link must reference an Agent partner",
        );
      }
    } else {
      const partnerName = `${reg.firstName} ${reg.lastName}`.trim();
      const [partner] = await tx
        .insert(partnersTable)
        .values({
          partnerType: "Agent",
          name: partnerName,
          agencyName: agency.legalName,
          agencyId: agency.id,
          licenseStates: Array.isArray(reg.statesLicensed)
            ? reg.statesLicensed.filter(
                (state): state is string => typeof state === "string",
              )
            : null,
          npn: reg.individualNpn,
          contactEmail: reg.email.toLowerCase().trim(),
          contactPhone: reg.phone,
          status: "Active",
        })
        .returning({ id: partnersTable.id });
      partnerId = partner.id;
    }

    let uid = reg.userId;
    if (!uid) {
      const normalizedEmail = reg.email.toLowerCase().trim();
      const [existing] = await tx
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, normalizedEmail));
      uid = existing?.id;
    }
    if (!uid) {
      const [user] = await tx
        .insert(usersTable)
        .values({
          email: reg.email.toLowerCase().trim(),
          firstName: reg.firstName ?? null,
          lastName: reg.lastName ?? null,
          phone: reg.phone ?? null,
          status: "invited",
        })
        .returning();
      uid = user.id;
      await tx
        .insert(orgMembersTable)
        .values({
          userId: uid,
          orgId,
          role: "AGENT",
          isPrimaryOrg: true,
        });
    }
    await tx
      .insert(userProfilesTable)
      .values({ userId: uid, title: reg.title ?? null, roleMetadata })
      .onConflictDoUpdate({
        target: userProfilesTable.userId,
        set: { roleMetadata, updatedAt: new Date() },
      });
    await upsertAgentProfile(tx, {
      partnerId,
      registrationId: reg.id,
      userId: uid,
      firstName: reg.firstName,
      lastName: reg.lastName || null,
      title: reg.title,
      phoneDirect: reg.phone,
      phoneMobile: null,
      individualNpn: reg.individualNpn,
      licenseNumbers:
        reg.licenseNumbers == null
          ? null
          : JSON.parse(JSON.stringify(reg.licenseNumbers)),
    });
    await tx
      .update(agentRegistrationsTable)
      .set({
        agencyId: agency.id,
        status: "approved",
        userId: uid,
        partnerId,
        reviewedAt: new Date(),
      })
      .where(eq(agentRegistrationsTable.id, reg.id));
    return {
      kind: "created" as const,
      registrationId: reg.id,
      userId: uid,
      partnerId,
    };
  });

  if (approval.kind === "notFound") {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (approval.kind === "missingEmail") {
    res.status(400).json({ error: "Registration is missing an email" });
    return;
  }
  const authUser = await getAuthUserById(approval.userId);
  res.status(approval.kind === "created" ? 201 : 200).json({
    user: authUser,
    registrationId: approval.registrationId,
    partnerId: approval.partnerId,
  });
});

export default router;
