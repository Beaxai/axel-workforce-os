import { Router, type IRouter } from "express";
import {
  agenciesTable,
  agentProfilesTable,
  agentRegistrationsTable,
  db,
  partnersTable,
} from "@workspace/db";
import { asc, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod/v4";
import { createOrMatchAgency } from "../lib/agencies";
import {
  addProductionMetrics,
  EMPTY_PRODUCTION_METRICS,
  getProductionMetricsByAgentIds,
} from "../lib/production-metrics";
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
  licenseNumber: z.string().trim().optional(),
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
  licenseNumber: z.string().trim(),
  statesLicensed: z.array(z.string().trim().min(2).max(2)),
  linesOfAuthority: z.array(z.string().trim().min(1)),
  eoCarrier: z.string().trim(),
  eoPolicyNumber: z.string().trim(),
  eoCoverageAmount: z.preprocess(
    (value) => typeof value === "number" ? String(value) : value,
    z.string().trim().refine(
      (value) => value === "" || (Number.isFinite(Number(value)) && Number(value) >= 0),
      "E&O coverage amount must be a non-negative number",
    ),
  ),
  eoExpirationDate: z.union([z.iso.date(), z.literal("")]),
  eoCertificateUrl: z.string().trim(),
  agreementSignedAt: z.union([z.iso.date(), z.literal("")]),
  agreementUrl: z.string().trim(),
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
  const agents = rows.length
    ? await db
        .select({
          agencyId: partnersTable.agencyId,
          userId: agentProfilesTable.userId,
        })
        .from(partnersTable)
        .innerJoin(
          agentProfilesTable,
          eq(agentProfilesTable.partnerId, partnersTable.id),
        )
        .where(inArray(partnersTable.agencyId, rows.map((agency) => agency.id)))
    : [];
  const metricsByAgent = await getProductionMetricsByAgentIds(
    agents.flatMap((agent) => (agent.userId ? [agent.userId] : [])),
  );
  const metricsByAgency = new Map(
    rows.map((agency) => [agency.id, { ...EMPTY_PRODUCTION_METRICS }]),
  );
  for (const agent of agents) {
    if (!agent.agencyId || !agent.userId) continue;
    metricsByAgency.set(
      agent.agencyId,
      addProductionMetrics(
        metricsByAgency.get(agent.agencyId) ?? {
          ...EMPTY_PRODUCTION_METRICS,
        },
        metricsByAgent.get(agent.userId) ?? { ...EMPTY_PRODUCTION_METRICS },
      ),
    );
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
      productionMetrics:
        metricsByAgency.get(agency.id) ?? { ...EMPTY_PRODUCTION_METRICS },
    };
  }));
});

router.get("/:id", async (req, res) => {
  const agencyId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const [agency] = await db
    .select()
    .from(agenciesTable)
    .where(eq(agenciesTable.id, agencyId))
    .limit(1);
  if (!agency) return res.status(404).json({ error: "Agency not found" });

  const [registration] = await db
    .select({
      agreementSignedAt: agentRegistrationsTable.agreementSignedAt,
      zoomScheduledAt: agentRegistrationsTable.zoomScheduledAt,
      eoExpirationDate: agentRegistrationsTable.eoExpirationDate,
    })
    .from(agentRegistrationsTable)
    .where(eq(agentRegistrationsTable.agencyId, agency.id))
    .orderBy(desc(agentRegistrationsTable.createdAt), desc(agentRegistrationsTable.id))
    .limit(1);
  const agents = await db
    .select({ userId: agentProfilesTable.userId })
    .from(partnersTable)
    .innerJoin(
      agentProfilesTable,
      eq(agentProfilesTable.partnerId, partnersTable.id),
    )
    .where(eq(partnersTable.agencyId, agency.id));
  const agentIds = agents.flatMap((agent) => (agent.userId ? [agent.userId] : []));
  const metricsByAgent = await getProductionMetricsByAgentIds(agentIds);
  const productionMetrics = agentIds.reduce(
    (total, userId) =>
      addProductionMetrics(
        total,
        metricsByAgent.get(userId) ?? { ...EMPTY_PRODUCTION_METRICS },
      ),
    { ...EMPTY_PRODUCTION_METRICS },
  );

  return res.json({
    ...agency,
    registration: registration ?? null,
    productionMetrics,
  });
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
  for (const field of [
    "dba",
    "mainPhone",
    "website",
    "address",
    "agencyNpn",
    "licenseNumber",
    "eoCarrier",
    "eoPolicyNumber",
    "eoCoverageAmount",
    "eoExpirationDate",
    "eoCertificateUrl",
    "agreementUrl",
  ] as const) {
    if (field in parsed.data) data[field] = parsed.data[field] || null;
  }
  if ("agreementSignedAt" in parsed.data) {
    data.agreementSignedAt = parsed.data.agreementSignedAt
      ? new Date(`${parsed.data.agreementSignedAt}T12:00:00.000Z`)
      : null;
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