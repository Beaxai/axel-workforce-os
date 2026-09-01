import { Router, type IRouter } from "express";
import { agenciesTable, agentRegistrationsTable, db } from "@workspace/db";
import { asc, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod/v4";
import { createOrMatchAgency } from "../lib/agencies";
import { requireRoles } from "../middleware/require-auth";

const router: IRouter = Router();

const createAgencySchema = z.object({
  legalName: z.string().trim().min(1),
  mainPhone: z.string().trim().min(1),
  dba: z.string().trim().optional(),
  status: z.enum(["pending", "active", "suspended", "terminated"]).optional(),
  website: z.string().trim().optional(),
  address: z.string().trim().optional(),
  agencyNpn: z.string().trim().optional(),
  statesLicensed: z.array(z.string().trim().min(2).max(2)).optional(),
  linesOfAuthority: z.array(z.string().trim().min(1)).optional(),
}).strict();

const updateAgencySchema = z.object({
  legalName: z.string().trim().min(1),
  dba: z.string().trim(),
  status: z.enum(["pending", "active", "suspended", "terminated"]),
  mainPhone: z.string().trim(),
  website: z.string().trim(),
  address: z.string().trim(),
  agencyNpn: z.string().trim(),
  statesLicensed: z.array(z.string().trim().min(2).max(2)),
  linesOfAuthority: z.array(z.string().trim().min(1)),
}).partial().strict();

router.get("/", async (_req, res) => {
  const rows = await db
    .select()
    .from(agenciesTable)
    .orderBy(asc(agenciesTable.legalName));
  const registrations = rows.length
    ? await db
        .select({
          agencyId: agentRegistrationsTable.agencyId,
          agreementSignedAt: agentRegistrationsTable.agreementSignedAt,
          zoomScheduledAt: agentRegistrationsTable.zoomScheduledAt,
          eoExpirationDate: agentRegistrationsTable.eoExpirationDate,
          createdAt: agentRegistrationsTable.createdAt,
        })
        .from(agentRegistrationsTable)
        .where(inArray(agentRegistrationsTable.agencyId, rows.map((agency) => agency.id)))
        .orderBy(desc(agentRegistrationsTable.createdAt), desc(agentRegistrationsTable.id))
    : [];
  // Results are ordered newest-first, so the first value retained per agency is
  // the deterministic latest linked registration.
  const registrationByAgency = new Map<string, (typeof registrations)[number]>();
  for (const registration of registrations) {
    if (registration.agencyId && !registrationByAgency.has(registration.agencyId)) {
      registrationByAgency.set(registration.agencyId, registration);
    }
  }
  res.json(rows.map((agency) => {
    const registration = registrationByAgency.get(agency.id);
    return {
      ...agency,
      registration: registration
        ? {
            agreementSignedAt: registration.agreementSignedAt,
            zoomScheduledAt: registration.zoomScheduledAt,
            eoExpirationDate: registration.eoExpirationDate,
          }
        : null,
    };
  }));
});

router.post("/", requireRoles("ADMIN", "CSA"), async (req, res) => {
  const parsed = createAgencySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues });
  }
  const agency = await db.transaction((tx) =>
    createOrMatchAgency(tx, {
      ...parsed.data,
      status: parsed.data.status ?? "active",
    }),
  );
  return res.status(201).json(agency);
});

router.patch("/:id", requireRoles("ADMIN", "CSA"), async (req, res) => {
  const parsed = updateAgencySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues });
  }
  if (Object.keys(parsed.data).length === 0) {
    return res.status(400).json({ error: "No agency fields to update" });
  }
  const data: Record<string, unknown> = { ...parsed.data, updatedAt: new Date() };
  for (const field of ["dba", "mainPhone", "website", "address", "agencyNpn"] as const) {
    if (field in parsed.data) data[field] = parsed.data[field] || null;
  }
  for (const field of ["statesLicensed", "linesOfAuthority"] as const) {
    if (field in parsed.data) data[field] = parsed.data[field]?.length ? parsed.data[field] : null;
  }
  const agencyId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const [agency] = await db
    .update(agenciesTable)
    .set(data)
    .where(eq(agenciesTable.id, agencyId))
    .returning();
  if (!agency) return res.status(404).json({ error: "Agency not found" });
  return res.json(agency);
});

export default router;