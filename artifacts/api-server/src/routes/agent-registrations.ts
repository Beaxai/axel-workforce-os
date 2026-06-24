import { Router, type IRouter, type Request, type Response } from "express";
import {
  db,
  agentRegistrationsTable,
  insertAgentRegistrationSchema,
  usersTable,
  orgMembersTable,
  userProfilesTable,
} from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { findUserByEmail, getAuthUserById } from "../lib/auth";

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
  const [reg] = await db
    .select()
    .from(agentRegistrationsTable)
    .where(eq(agentRegistrationsTable.id, req.params.id));
  if (!reg) return res.status(404).json({ error: "Not found" });
  if (reg.userId) return res.status(409).json({ error: "Registration already linked to a user" });
  if (!reg.email) return res.status(400).json({ error: "Registration is missing an email" });

  const orgId = reg.partnerId ?? null;
  const roleMetadata = {
    agencyName: reg.agencyName ?? null,
    licenseNumbers: reg.licenseNumbers ?? [],
    statesLicensed: reg.statesLicensed ?? [],
    linesOfAuthority: reg.linesOfAuthority ?? [],
    eoCarrier: reg.eoCarrier ?? null,
    eoExpiration: reg.eoExpirationDate ?? null,
  };

  const existing = await findUserByEmail(reg.email);

  const userId = await db.transaction(async (tx) => {
    let uid: string;
    if (existing) {
      uid = existing.id;
    } else {
      const [user] = await tx
        .insert(usersTable)
        .values({
          email: reg.email!.toLowerCase().trim(),
          firstName: reg.firstName ?? null,
          lastName: reg.lastName ?? null,
          phone: reg.phone ?? null,
          status: "invited",
        })
        .returning();
      uid = user.id;
      await tx
        .insert(orgMembersTable)
        .values({ userId: uid, orgId, role: "AGENT", isPrimaryOrg: true });
    }
    await tx
      .insert(userProfilesTable)
      .values({ userId: uid, title: reg.title ?? null, roleMetadata })
      .onConflictDoUpdate({
        target: userProfilesTable.userId,
        set: { roleMetadata, updatedAt: new Date() },
      });
    await tx
      .update(agentRegistrationsTable)
      .set({ status: "approved", userId: uid, reviewedAt: new Date() })
      .where(eq(agentRegistrationsTable.id, reg.id));
    return uid;
  });

  const authUser = await getAuthUserById(userId);
  return res.status(201).json({ user: authUser, registrationId: reg.id });
});

export default router;
