import { Router, type IRouter } from "express";
import { db, agentRegistrationsTable, insertAgentRegistrationSchema } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

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

export default router;
