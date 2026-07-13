import { Router, type IRouter } from "express";
import { db, dealsTable, insertDealSchema, quotesTable, contactsTable, notesTable, tasksTable, activityLogTable, insertActivityLogSchema, dealEmailAddressesTable, usersTable, accountsTable, lossHistoryDocumentsTable, implementationTrackersTable, type Deal } from "@workspace/db";
import { eq, desc, inArray, sql } from "drizzle-orm";
import { z } from "zod/v4";
import { PIPELINE_STAGE_KEYS } from "@workspace/pipeline";
import { buildSections } from "../lib/deal-sections";
import { findOrCreateAccount } from "../lib/accounts";
import { instantiateJourneysForDeal } from "../lib/journey-instantiate";

const router: IRouter = Router();

/** A drizzle db handle or an in-flight transaction — helpers accept either so
 *  their reads/writes can participate in the caller's transaction. */
type Db = typeof db;
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type DbOrTx = Db | Tx;

// account_id is NOT NULL in the DB; allow callers to omit it and we derive (or
// create) the owning account from the deal payload.
const createDealSchema = insertDealSchema.extend({ accountId: z.string().uuid().optional() });

/** Reject stage values outside the canonical 8 operational keys. Returns an
 *  error message string, or null when valid. Undefined/null (field omitted) is OK. */
function validateStage(stage: unknown): string | null {
  if (stage !== undefined && stage !== null && !(PIPELINE_STAGE_KEYS as readonly string[]).includes(stage as string)) {
    return `Invalid stage "${String(stage)}". Must be one of: ${PIPELINE_STAGE_KEYS.join(", ")}`;
  }
  return null;
}

/** Bind-readiness gate for canonical stage 9 (BOUND). A deal is bind-ready when
 *  its submission is complete (every section) AND a quote exists for it.
 *  NOTE (flag for Curtis): "approved quote" is currently modelled as the mere
 *  presence of a generated quote row, because the schema has no dedicated
 *  quote-approval flag. Tighten here if a stricter approval state is required. */
async function isBindReady(deal: Deal, dbc: DbOrTx): Promise<{ ready: boolean; reason?: string }> {
  const [account] = deal.accountId
    ? await dbc.select().from(accountsTable).where(eq(accountsTable.id, deal.accountId)).limit(1)
    : [undefined];
  const lossRuns = await dbc
    .select({ id: lossHistoryDocumentsTable.id })
    .from(lossHistoryDocumentsTable)
    .where(eq(lossHistoryDocumentsTable.dealId, deal.id))
    .limit(1);
  const { aggregateComplete, total } = buildSections(deal, account ?? null, lossRuns.length > 0);
  if (total === 0 || aggregateComplete < total) {
    return {
      ready: false,
      reason: `Not bind-ready: submission incomplete (${aggregateComplete}/${total} sections complete). Complete all sections before moving to Bound.`,
    };
  }
  const quote = await dbc
    .select({ id: quotesTable.id })
    .from(quotesTable)
    .where(eq(quotesTable.dealId, deal.id))
    .limit(1);
  if (quote.length === 0) {
    return {
      ready: false,
      reason: "Not bind-ready: no approved quote exists for this deal. Generate a quote before moving to Bound.",
    };
  }
  return { ready: true };
}

/** Relocated Bound trigger (P5b W1 Task 5): instantiate journeys from active
 *  templates on entry to BOUND. Runs inside the caller's FOR UPDATE
 *  transaction; idempotency lives in instantiateJourneysForDeal (a tracker per
 *  (deal, type, productType) is only ever created once). */
async function fireImplementationTrigger(deal: Deal, author: string, actorId: string | undefined, dbc: DbOrTx): Promise<string[]> {
  const result = await instantiateJourneysForDeal(deal, dbc);

  if (result.noTemplate) {
    await dbc.insert(activityLogTable).values({
      dealId: deal.id,
      entityType: "deal",
      entityId: deal.id,
      eventType: "STAGE_CHANGE",
      description: `Bound — no active journey template for product ${deal.productType ?? "—"}; no journey created.`,
      metadata: { author, productType: deal.productType ?? null },
      createdBy: actorId,
    });
    return [];
  }

  if (result.created.length > 0) {
    await dbc.insert(activityLogTable).values({
      dealId: deal.id,
      entityType: "deal",
      entityId: deal.id,
      eventType: "STAGE_CHANGE",
      description: `Deal moved to Bound — journey${result.created.length > 1 ? "s" : ""} instantiated from ${result.created.length} template${result.created.length > 1 ? "s" : ""}.`,
      metadata: { createdFromTemplates: result.created, skippedTemplates: result.skipped, author },
      createdBy: actorId,
    });
  }
  return result.created;
}

/** Shape of the quote workforce_profile JSONB used for KPI fallbacks. */
interface WorkforceProfileLite {
  eMod?: number;
  locations?: {
    classCodes?: { fullTimeEmployees?: number; partTimeEmployees?: number; annualPayroll?: number }[];
  }[];
}

router.get("/", async (_req, res) => {
  // Returns ALL deals — LOST is a stage (a board column), not a filtered outcome.
  const rows = await db.select().from(dealsTable).orderBy(desc(dealsTable.createdAt));

  // Enrich each deal with card-face KPIs (locations / employees / payroll / exMod),
  // falling back to the latest quote's workforce_profile when the deal-level
  // columns are null — the same fallback the deal-card modal header uses.
  const ids = rows.map((r) => r.id);
  const quoteRows = ids.length
    ? await db
        .select({
          dealId: quotesTable.dealId,
          workforceProfile: quotesTable.workforceProfile,
          wcPremium: quotesTable.wcPremium,
          wcFinalPremium: quotesTable.wcFinalPremium,
          pepm: quotesTable.pepm,
          peoPepm: quotesTable.peoPepm,
        })
        .from(quotesTable)
        .where(inArray(quotesTable.dealId, ids))
        .orderBy(desc(quotesTable.createdAt))
    : [];
  const latestProfile = new Map<string, WorkforceProfileLite>();
  const latestWcPremium = new Map<string, string>();
  const latestPepm = new Map<string, string>();
  for (const q of quoteRows) {
    if (!q.dealId) continue;
    if (q.workforceProfile && !latestProfile.has(q.dealId)) {
      latestProfile.set(q.dealId, q.workforceProfile as WorkforceProfileLite);
    }
    const wc = q.wcPremium ?? q.wcFinalPremium;
    if (wc != null && parseFloat(wc) > 0 && !latestWcPremium.has(q.dealId)) {
      latestWcPremium.set(q.dealId, wc);
    }
    const pepm = q.peoPepm ?? q.pepm;
    if (pepm != null && parseFloat(pepm) > 0 && !latestPepm.has(q.dealId)) {
      latestPepm.set(q.dealId, pepm);
    }
  }
  const enriched = rows.map((r) => {
    const wp = latestProfile.get(r.id);
    const codes = wp?.locations?.flatMap((l) => l.classCodes ?? []) ?? [];
    const wpEmployees = codes.reduce(
      (sum, c) => sum + (c.fullTimeEmployees ?? 0) + (c.partTimeEmployees ?? 0),
      0,
    );
    const wpPayroll = codes.reduce((sum, c) => sum + (c.annualPayroll ?? 0), 0);
    const dealEmployees =
      r.employeeCountFt !== null || r.employeeCountPt !== null
        ? (r.employeeCountFt ?? 0) + (r.employeeCountPt ?? 0)
        : null;
    const dealWc = r.wcPremium != null && parseFloat(r.wcPremium) > 0 ? r.wcPremium : null;
    const dealPepm = r.wfsPepmRate != null && parseFloat(r.wfsPepmRate) > 0 ? r.wfsPepmRate : null;
    return {
      ...r,
      // Premium fallbacks: deal-level columns win; otherwise the latest quote's.
      wcPremium: dealWc ?? latestWcPremium.get(r.id) ?? r.wcPremium,
      wfsPepmRate: dealPepm ?? latestPepm.get(r.id) ?? r.wfsPepmRate,
      kpiLocations: r.numberOfLocations ?? (wp?.locations?.length || null),
      kpiEmployees: dealEmployees ?? (wpEmployees > 0 ? wpEmployees : null),
      kpiPayroll: r.annualPayroll ?? (wpPayroll > 0 ? String(wpPayroll) : null),
      kpiExMod: r.emod ?? (wp?.eMod != null ? String(wp.eMod) : null),
    };
  });
  res.json(enriched);
});

router.get("/:id", async (req, res) => {
  const [row] = await db.select().from(dealsTable).where(eq(dealsTable.id, req.params.id));
  if (!row) return res.status(404).json({ error: "Not found" });
  return res.json(row);
});

router.post("/", async (req, res) => {
  const parsed = createDealSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
  const invalid = validateStage(parsed.data.stage);
  if (invalid) return res.status(400).json({ error: invalid });
  let accountId = parsed.data.accountId;
  if (!accountId) {
    const { account } = await findOrCreateAccount({
      businessName: parsed.data.businessName,
      fein: parsed.data.fein,
      state: parsed.data.state,
      vertical: parsed.data.vertical,
      entityType: parsed.data.entityType,
      productType: parsed.data.productType,
      annualPayroll: parsed.data.annualPayroll,
      headcount: parsed.data.employeeCountFt,
      emod: parsed.data.emod,
    });
    accountId = account.id;
  }
  const [row] = await db.insert(dealsTable).values({ ...parsed.data, accountId }).returning();
  return res.status(201).json(row);
});

router.patch("/:id", async (req, res) => {
  const parsed = insertDealSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
  const invalid = validateStage(parsed.data.stage);
  if (invalid) return res.status(400).json({ error: invalid });

  const u = req.user;
  const author = u ? [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email : "System";

  // The stage transition, bind gate, activity log, and Bound trigger all run in
  // one transaction with a FOR UPDATE lock on the deal, so concurrent transitions
  // serialize (no TOCTOU) and any failure rolls the whole move back atomically —
  // making the relocated implementation-tracker trigger idempotent.
  const result = await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(dealsTable)
      .where(eq(dealsTable.id, req.params.id))
      .for("update")
      .limit(1);
    if (!existing) return { status: 404, body: { error: "Not found" } };

    const nextStage = parsed.data.stage ?? undefined;
    const stageChanging = nextStage !== undefined && nextStage !== existing.stage;

    // Bind gate (canonical stage 9): entering BOUND requires bind-readiness.
    if (stageChanging && nextStage === "BOUND") {
      const readiness = await isBindReady(existing, tx);
      if (!readiness.ready) {
        return { status: 409, body: { error: readiness.reason ?? "Deal is not ready to bind." } };
      }
    }

    const [row] = await tx.update(dealsTable).set(parsed.data).where(eq(dealsTable.id, req.params.id)).returning();

    if (stageChanging) {
      // from_stage/to_stage logged on every stage move.
      await tx.insert(activityLogTable).values({
        dealId: row.id,
        entityType: "deal",
        entityId: row.id,
        eventType: "STAGE_CHANGE",
        description: `Stage changed from ${existing.stage ?? "—"} to ${nextStage}.`,
        metadata: { from_stage: existing.stage, to_stage: nextStage, author, role: u?.role ?? null },
        createdBy: u?.id,
      });
      // Relocated Bound trigger fires on entry to stage 9.
      if (nextStage === "BOUND") {
        await fireImplementationTrigger(row, author, u?.id, tx);
      }
    }

    return { status: 200, body: row };
  });

  return res.status(result.status).json(result.body);
});

router.delete("/:id", async (req, res) => {
  const [row] = await db.delete(dealsTable).where(eq(dealsTable.id, req.params.id)).returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  return res.json({ deleted: true });
});

router.get("/:id/quotes", async (req, res) => {
  const rows = await db.select().from(quotesTable).where(eq(quotesTable.dealId, req.params.id));
  res.json(rows);
});

router.get("/:id/contacts", async (req, res) => {
  const rows = await db.select().from(contactsTable).where(eq(contactsTable.dealId, req.params.id));
  res.json(rows);
});

router.get("/:id/notes", async (req, res) => {
  const rows = await db.select().from(notesTable).where(eq(notesTable.dealId, req.params.id)).orderBy(desc(notesTable.createdAt));
  res.json(rows);
});

router.get("/:id/tasks", async (req, res) => {
  const rows = await db.select().from(tasksTable).where(eq(tasksTable.dealId, req.params.id));
  // Resolve assignee display names so the UI can show a real name + wire the
  // mini-profile popover off the assignee user id (tasks.assigned_to is a FK).
  const ids = [...new Set(rows.map((r) => r.assignedTo).filter((v): v is string => !!v))];
  const users = ids.length
    ? await db
        .select({ id: usersTable.id, firstName: usersTable.firstName, lastName: usersTable.lastName, email: usersTable.email })
        .from(usersTable)
        .where(inArray(usersTable.id, ids))
    : [];
  const nameById = new Map(
    users.map((u) => [u.id, `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email]),
  );
  res.json(
    rows.map((r) => ({
      ...r,
      assigneeName: r.assignedTo ? nameById.get(r.assignedTo) ?? null : null,
    })),
  );
});

router.get("/:id/activity", async (req, res) => {
  const rows = await db.select().from(activityLogTable).where(eq(activityLogTable.dealId, req.params.id)).orderBy(desc(activityLogTable.createdAt));
  res.json(rows);
});

router.post("/:id/activity", async (req, res) => {
  const parsed = insertActivityLogSchema.safeParse({ ...req.body, dealId: req.params.id });
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
  const [row] = await db.insert(activityLogTable).values(parsed.data).returning();
  return res.status(201).json(row);
});

router.get("/:id/email", async (req, res) => {
  const [row] = await db.select().from(dealEmailAddressesTable).where(eq(dealEmailAddressesTable.dealId, req.params.id));
  res.json(row || null);
});

router.post("/:id/email", async (req, res) => {
  const dealId = req.params.id;
  const { emailAddress, companySlug } = req.body;
  if (!emailAddress || !companySlug) return res.status(400).json({ error: "emailAddress and companySlug required" });
  const [existing] = await db.select().from(dealEmailAddressesTable).where(eq(dealEmailAddressesTable.dealId, dealId));
  if (existing) return res.json(existing);
  const [row] = await db.insert(dealEmailAddressesTable).values({
    dealId,
    emailAddress,
    companySlug,
    fileId: dealId.slice(0, 8),
  }).returning();
  return res.status(201).json(row);
});

export default router;
