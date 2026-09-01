import { Router, type IRouter, type Request, type Response } from "express";
import {
  db,
  agentRegistrationsTable,
  insertAgentRegistrationSchema,
  usersTable,
  orgMembersTable,
  userProfilesTable,
  partnersTable,
  activityLogTable,
  passwordResetTokensTable,
  userCredentialsTable,
} from "@workspace/db";
import { and, eq, desc, isNull, or } from "drizzle-orm";
import {
  generateToken,
  getAuthUserById,
  hashPassword,
} from "../lib/auth";
import { createOrMatchAgency } from "../lib/agencies";
import { upsertAgentProfile } from "../lib/agent-profiles";
import { requireRoles } from "../middleware/require-auth";

const router: IRouter = Router();

type ActivityWriter = Pick<typeof db, "insert" | "select">;

async function recordInheritedAccessIfNeeded(
  writer: ActivityWriter,
  input: {
    registrationId: string;
    partnerId: string;
    userId: string;
    adminId: string | null;
  },
) {
  const priorAccessEvents = await writer
    .select({ eventType: activityLogTable.eventType })
    .from(activityLogTable)
    .where(
      and(
        eq(activityLogTable.entityType, "agent_registration"),
        eq(activityLogTable.entityId, input.registrationId),
        or(
          eq(
            activityLogTable.eventType,
            "AGENT_INHERITED_PREEXISTING_ACCESS",
          ),
          eq(activityLogTable.eventType, "AGENT_CREDENTIALS_ISSUED"),
        ),
      ),
    );
  if (priorAccessEvents.length > 0) return;

  await writer.insert(activityLogTable).values({
    entityType: "agent_registration",
    entityId: input.registrationId,
    eventType: "AGENT_INHERITED_PREEXISTING_ACCESS",
    description:
      "Approved registration linked to an already-active user with pre-existing portal access.",
    metadata: {
      registrationId: input.registrationId,
      partnerId: input.partnerId,
      userId: input.userId,
    },
    createdBy: input.adminId,
  });
}

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
// Atomically provisions an inert AGENT identity from the registration: creates
// an invited user without credentials + AGENT membership + profile records,
// then marks the registration approved. Credential issuance is a separate
// admin-only action after the onboarding call is complete.
router.post("/:id/approve", async (req: Request<{ id: string }>, res: Response) => {
  const approval = await db.transaction(async (tx) => {
    const [reg] = await tx
      .select()
      .from(agentRegistrationsTable)
      .where(eq(agentRegistrationsTable.id, req.params.id))
      .for("update");
    if (!reg) return { kind: "notFound" as const };
    if (!reg.email) return { kind: "missingEmail" as const };
    const [prelinkedUser] = reg.userId
      ? await tx
          .select()
          .from(usersTable)
          .where(eq(usersTable.id, reg.userId))
          .for("update")
      : [];
    if (
      reg.userId &&
      reg.partnerId &&
      reg.status?.trim().toLowerCase() === "approved"
    ) {
      if (prelinkedUser?.status === "active") {
        await recordInheritedAccessIfNeeded(tx, {
          registrationId: reg.id,
          partnerId: reg.partnerId,
          userId: reg.userId,
          adminId: req.user?.id ?? null,
        });
      }
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
    let inheritedActiveAccess = prelinkedUser?.status === "active";
    if (!uid) {
      const normalizedEmail = reg.email.toLowerCase().trim();
      const [existing] = await tx
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, normalizedEmail));
      uid = existing?.id;
      inheritedActiveAccess = existing?.status === "active";
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
    if (inheritedActiveAccess) {
      await recordInheritedAccessIfNeeded(tx, {
        registrationId: reg.id,
        partnerId,
        userId: uid,
        adminId: req.user?.id ?? null,
      });
    }
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

router.post(
  "/:id/issue-credentials",
  requireRoles("ADMIN"),
  async (req: Request<{ id: string }>, res: Response) => {
    const issuedAt = new Date();
    const issuance = await db.transaction(async (tx) => {
      const [reg] = await tx
        .select()
        .from(agentRegistrationsTable)
        .where(eq(agentRegistrationsTable.id, req.params.id))
        .for("update");
      if (!reg) return { kind: "notFound" as const };
      if (!reg.zoomCompletedAt) return { kind: "callIncomplete" as const };
      if (
        reg.status?.trim().toLowerCase() !== "approved" ||
        !reg.userId ||
        !reg.partnerId
      ) {
        return { kind: "notApproved" as const };
      }

      const [user] = await tx
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, reg.userId))
        .for("update");
      if (!user) return { kind: "missingUser" as const };
      if (user.status !== "invited") {
        return { kind: "invalidStatus" as const, status: user.status };
      }

      const [existingCredential] = await tx
        .select({ id: userCredentialsTable.id })
        .from(userCredentialsTable)
        .where(eq(userCredentialsTable.userId, user.id));
      if (existingCredential) return { kind: "alreadyIssued" as const };

      const temporarySecret = generateToken().token;
      const temporaryPasswordHash = await hashPassword(temporarySecret);
      await tx.insert(userCredentialsTable).values({
        userId: user.id,
        passwordHash: temporaryPasswordHash,
      });

      await tx
        .update(passwordResetTokensTable)
        .set({ usedAt: issuedAt })
        .where(
          and(
            eq(passwordResetTokensTable.userId, user.id),
            isNull(passwordResetTokensTable.usedAt),
          ),
        );

      const setup = generateToken();
      await tx.insert(passwordResetTokensTable).values({
        userId: user.id,
        tokenHash: setup.tokenHash,
        expiresAt: new Date(issuedAt.getTime() + 60 * 60 * 1000),
      });
      await tx
        .update(usersTable)
        .set({ status: "active" })
        .where(eq(usersTable.id, user.id));
      await tx.insert(activityLogTable).values({
        entityType: "agent_registration",
        entityId: reg.id,
        eventType: "AGENT_CREDENTIALS_ISSUED",
        description:
          "Agent credentials issued after completion of the onboarding call.",
        metadata: {
          registrationId: reg.id,
          partnerId: reg.partnerId,
          userId: user.id,
          issuedAt: issuedAt.toISOString(),
        },
        createdBy: req.user!.id,
        createdAt: issuedAt,
      });

      return {
        kind: "issued" as const,
        registrationId: reg.id,
        userId: user.id,
        setupToken: setup.token,
        expiresAt: new Date(issuedAt.getTime() + 60 * 60 * 1000),
      };
    });

    if (issuance.kind === "notFound") {
      res.status(404).json({ error: "Registration not found" });
      return;
    }
    if (issuance.kind === "callIncomplete") {
      res.status(409).json({
        error: "Complete the onboarding call before issuing credentials",
      });
      return;
    }
    if (issuance.kind === "notApproved") {
      res.status(409).json({
        error: "Approve the registration before issuing credentials",
      });
      return;
    }
    if (issuance.kind === "missingUser") {
      res.status(409).json({ error: "Linked user was not found" });
      return;
    }
    if (issuance.kind === "invalidStatus") {
      res.status(409).json({
        error: `Credentials can only be issued to invited users`,
      });
      return;
    }
    if (issuance.kind === "alreadyIssued") {
      res.status(409).json({ error: "Credentials have already been issued" });
      return;
    }

    res.status(201).json({
      registrationId: issuance.registrationId,
      userId: issuance.userId,
      setupToken: issuance.setupToken,
      expiresAt: issuance.expiresAt,
    });
  },
);

export default router;
