/**
 * Phase 4C — Deal Card collaboration hub API.
 *
 * Mounted at /deal-card with a broad role gate (all party types) because §8
 * grants EMPLOYER/CARRIER/PEO scoped access that the INTERNAL_SALES-gated
 * /deals router cannot express. Fine-grained, server-side enforcement of the §8
 * access matrix happens INSIDE each handler — the server is the enforcement
 * boundary; the UI only hides affordances.
 */
import { Router, type IRouter, type Request } from "express";
import {
  db,
  dealsTable,
  accountsTable,
  activityLogTable,
  lossHistoryDocumentsTable,
  type Deal,
  type Account,
} from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { z } from "zod/v4";
import {
  buildSections,
  canEditSection,
  isOwnDeal,
  getSectionDef,
  RATING_RELEVANT_KEYS,
  type DealCardActor,
  type SectionKey,
} from "../lib/deal-sections";

const router: IRouter = Router();

const INTERNAL_ROLES = new Set(["ADMIN", "CSA", "AGENT", "UNDERWRITER"]);
const APPROVE_DECLINE_ROLES = new Set(["ADMIN", "UNDERWRITER"]);

/** Deal columns kept in sync with the linked account (company-level data). */
const ACCOUNT_SYNC: Record<string, string> = {
  businessName: "businessName",
  fein: "fein",
  entityType: "entityType",
  state: "state",
  vertical: "vertical",
  productType: "productType",
  annualPayroll: "annualPayroll",
  emod: "emod",
  employeeCountFt: "headcount",
};

/** numeric() columns drizzle wants as strings. */
const NUMERIC_STRING_KEYS = new Set(["annualPayroll", "emod"]);

function actorFrom(req: Request): DealCardActor {
  const u = req.user!;
  return { id: u.id, role: u.role as DealCardActor["role"], orgId: u.orgId };
}

async function loadDeal(id: string): Promise<Deal | undefined> {
  const [deal] = await db.select().from(dealsTable).where(eq(dealsTable.id, id)).limit(1);
  return deal;
}

async function loadAccount(accountId: string | null): Promise<Account | null> {
  if (!accountId) return null;
  const [account] = await db.select().from(accountsTable).where(eq(accountsTable.id, accountId)).limit(1);
  return account ?? null;
}

async function lossRunsUploaded(dealId: string): Promise<boolean> {
  const rows = await db
    .select({ id: lossHistoryDocumentsTable.id })
    .from(lossHistoryDocumentsTable)
    .where(eq(lossHistoryDocumentsTable.dealId, dealId))
    .limit(1);
  return rows.length > 0;
}

function canViewDeal(deal: Deal, actor: DealCardActor): boolean {
  if (INTERNAL_ROLES.has(actor.role)) return true;
  // External parties only see their own deal.
  if (actor.role === "EMPLOYER") return isOwnDeal(deal, actor);
  // CARRIER / PEO / VENDOR: scoped read, fail closed. An unscoped (null-org)
  // deal is never readable by an external party, and the actor must have an org
  // that matches the deal's org.
  return !!deal.orgId && !!actor.orgId && deal.orgId === actor.orgId;
}

/* --------------------------------------------------------------------------
 * GET /deal-card/:id/submission — sectioned fields + completeness
 * ------------------------------------------------------------------------ */
router.get("/:id/submission", async (req, res) => {
  const actor = actorFrom(req);
  const deal = await loadDeal(req.params.id);
  if (!deal) return res.status(404).json({ error: "Deal not found" });
  if (!canViewDeal(deal, actor)) return res.status(403).json({ error: "Insufficient permissions" });

  const account = await loadAccount(deal.accountId);
  const hasLossRuns = await lossRunsUploaded(deal.id);
  const { sections, aggregateComplete, total } = buildSections(deal, account, hasLossRuns);

  const access: Record<string, boolean> = {};
  for (const s of sections) access[s.key] = canEditSection(s.key as SectionKey, deal, actor);

  return res.json({
    deal,
    account,
    sections,
    aggregateComplete,
    total,
    access,
    canApprove: APPROVE_DECLINE_ROLES.has(actor.role),
  });
});

/* --------------------------------------------------------------------------
 * GET /deal-card/:id/activity — role-filtered collaboration feed
 * ------------------------------------------------------------------------ */
router.get("/:id/activity", async (req, res) => {
  const actor = actorFrom(req);
  const deal = await loadDeal(req.params.id);
  if (!deal) return res.status(404).json({ error: "Deal not found" });
  if (!canViewDeal(deal, actor)) return res.status(403).json({ error: "Insufficient permissions" });

  const rows = await db
    .select()
    .from(activityLogTable)
    .where(eq(activityLogTable.dealId, deal.id))
    .orderBy(desc(activityLogTable.createdAt));

  // §8: internal notes are never rendered for external parties.
  const filtered = INTERNAL_ROLES.has(actor.role)
    ? rows
    : rows.filter((r) => !(r.metadata as { internal?: boolean } | null)?.internal);

  return res.json({ activity: filtered });
});

/* --------------------------------------------------------------------------
 * POST /deal-card/:id/messages — persist a composer message
 * ------------------------------------------------------------------------ */
const messageSchema = z.object({
  message: z.string().trim().min(1).max(5000),
  internal: z.boolean().optional(),
});

router.post("/:id/messages", async (req, res) => {
  const actor = actorFrom(req);
  // View-only external parties (CARRIER/PEO/VENDOR) cannot post.
  if (!INTERNAL_ROLES.has(actor.role) && actor.role !== "EMPLOYER") {
    return res.status(403).json({ error: "Insufficient permissions" });
  }
  const parsed = messageSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid message", issues: parsed.error.issues });

  const deal = await loadDeal(req.params.id);
  if (!deal) return res.status(404).json({ error: "Deal not found" });
  if (!canViewDeal(deal, actor)) return res.status(403).json({ error: "Insufficient permissions" });

  // Only internal staff may post internal notes.
  const internal = INTERNAL_ROLES.has(actor.role) ? !!parsed.data.internal : false;
  const u = req.user!;
  const author = [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email;

  const [entry] = await db
    .insert(activityLogTable)
    .values({
      dealId: deal.id,
      entityType: "deal",
      entityId: deal.id,
      eventType: "message",
      description: parsed.data.message,
      metadata: { author, role: actor.role, internal },
      createdBy: actor.id,
    })
    .returning();

  return res.json({ success: true, entry });
});

/* --------------------------------------------------------------------------
 * PATCH /deal-card/:id/submission/:section — edit a section
 * ------------------------------------------------------------------------ */
function coerce(key: string, type: string, value: unknown): { ok: true; value: unknown } | { ok: false; error: string } {
  if (value === null || value === "") return { ok: true, value: null };
  switch (type) {
    case "number": {
      const n = Number(value);
      if (Number.isNaN(n)) return { ok: false, error: `${key} must be a number` };
      return { ok: true, value: NUMERIC_STRING_KEYS.has(key) ? String(n) : n };
    }
    case "boolean":
      return { ok: true, value: Boolean(value) };
    case "array":
      if (!Array.isArray(value)) return { ok: false, error: `${key} must be an array` };
      return { ok: true, value };
    case "date": {
      const s = String(value);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return { ok: false, error: `${key} must be YYYY-MM-DD` };
      return { ok: true, value: s };
    }
    case "text":
    default: {
      const s = String(value).trim();
      if (key === "fein" && !/^\d{2}-?\d{7}$/.test(s)) {
        return { ok: false, error: "FEIN must be 9 digits (NN-NNNNNNN)" };
      }
      return { ok: true, value: s };
    }
  }
}

router.patch("/:id/submission/:section", async (req, res) => {
  const actor = actorFrom(req);
  const section = req.params.section as SectionKey;
  const def = getSectionDef(section);
  if (!def) return res.status(404).json({ error: "Unknown section" });

  const deal = await loadDeal(req.params.id);
  if (!deal) return res.status(404).json({ error: "Deal not found" });

  if (!canEditSection(section, deal, actor)) {
    return res.status(403).json({ error: "Insufficient permissions" });
  }

  const incoming = (req.body?.fields ?? {}) as Record<string, unknown>;
  const account = await loadAccount(deal.accountId);

  const dealUpdates: Record<string, unknown> = {};
  const accountUpdates: Record<string, unknown> = {};
  const diffs: Array<{ field: string; label: string; from: unknown; to: unknown }> = [];
  let ratingChanged = false;

  for (const [key, rawVal] of Object.entries(incoming)) {
    const field = def.fields.find((f) => f.key === key);
    if (!field || field.readOnly || field.source === "computed") continue;

    const coerced = coerce(key, field.type, rawVal);
    if (!coerced.ok) return res.status(400).json({ error: coerced.error });
    const nextVal = coerced.value;

    const current =
      field.source === "deal"
        ? (deal as Record<string, unknown>)[key]
        : ((account ?? {}) as Record<string, unknown>)[key];

    if (JSON.stringify(current ?? null) === JSON.stringify(nextVal ?? null)) continue;

    diffs.push({ field: key, label: field.label, from: current ?? null, to: nextVal ?? null });
    if (RATING_RELEVANT_KEYS.has(key)) ratingChanged = true;

    if (field.source === "deal") {
      dealUpdates[key] = nextVal;
      const synced = ACCOUNT_SYNC[key];
      if (synced) {
        accountUpdates[synced] = key === "employeeCountFt" ? (nextVal == null ? null : Number(nextVal)) : nextVal;
      }
    } else {
      accountUpdates[key] = nextVal;
    }
  }

  if (diffs.length === 0) {
    return res.json({ success: true, changed: false });
  }

  if (ratingChanged) dealUpdates.ratingStale = true;

  if (Object.keys(dealUpdates).length > 0) {
    await db.update(dealsTable).set(dealUpdates).where(eq(dealsTable.id, deal.id));
  }
  if (account && Object.keys(accountUpdates).length > 0) {
    accountUpdates.updatedAt = new Date();
    await db.update(accountsTable).set(accountUpdates).where(eq(accountsTable.id, account.id));
  }

  const u = req.user!;
  const author = [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email;

  // One expandable entry per multi-field save (spec §7).
  await db.insert(activityLogTable).values({
    dealId: deal.id,
    entityType: "submission",
    entityId: deal.id,
    eventType: "section_edited",
    description: `${author} updated ${def.label} (${diffs.length} field${diffs.length > 1 ? "s" : ""}).`,
    metadata: { section, diffs, rating_stale: ratingChanged, author, role: actor.role },
    createdBy: actor.id,
  });

  // Company-level edits also log to the linked account feed (spec §7 / 4A).
  if (account && Object.keys(accountUpdates).length > 1) {
    await db.insert(activityLogTable).values({
      entityType: "account",
      entityId: account.id,
      eventType: "synced_from_deal",
      description: `Account synced from deal ${deal.referenceCode}: ${diffs.map((d) => d.label).join(", ")}.`,
      metadata: { deal_id: deal.id, fields: diffs.map((d) => d.field) },
      createdBy: actor.id,
    });
  }

  const updatedDeal = (await loadDeal(deal.id))!;
  const updatedAccount = await loadAccount(updatedDeal.accountId);
  const hasLossRuns = await lossRunsUploaded(deal.id);
  const { sections, aggregateComplete, total } = buildSections(updatedDeal, updatedAccount, hasLossRuns);

  return res.json({
    success: true,
    changed: true,
    ratingStale: updatedDeal.ratingStale,
    diffs,
    sections,
    aggregateComplete,
    total,
    deal: updatedDeal,
  });
});

/* --------------------------------------------------------------------------
 * POST /deal-card/:id/approve — UNDERWRITER / ADMIN only (§8)
 * ------------------------------------------------------------------------ */
router.post("/:id/approve", async (req, res) => {
  const actor = actorFrom(req);
  if (!APPROVE_DECLINE_ROLES.has(actor.role)) {
    return res.status(403).json({ error: "Only underwriters and admins may approve" });
  }
  const deal = await loadDeal(req.params.id);
  if (!deal) return res.status(404).json({ error: "Deal not found" });

  await db.update(dealsTable).set({ stage: "APPROVED_QUOTED" }).where(eq(dealsTable.id, deal.id));

  const u = req.user!;
  const author = [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email;
  await db.insert(activityLogTable).values({
    dealId: deal.id,
    entityType: "deal",
    entityId: deal.id,
    eventType: "deal_approved",
    description: `${author} approved the submission. Stage advanced to Approved / Quoted.`,
    metadata: { from_stage: deal.stage, to_stage: "APPROVED_QUOTED", author, role: actor.role },
    createdBy: actor.id,
  });

  return res.json({ success: true, stage: "APPROVED_QUOTED" });
});

/* --------------------------------------------------------------------------
 * POST /deal-card/:id/decline — UNDERWRITER / ADMIN only (§8)
 * ------------------------------------------------------------------------ */
const declineSchema = z.object({ reason: z.string().trim().min(1).max(2000) });

router.post("/:id/decline", async (req, res) => {
  const actor = actorFrom(req);
  if (!APPROVE_DECLINE_ROLES.has(actor.role)) {
    return res.status(403).json({ error: "Only underwriters and admins may decline" });
  }
  const parsed = declineSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "A decline reason is required" });

  const deal = await loadDeal(req.params.id);
  if (!deal) return res.status(404).json({ error: "Deal not found" });

  await db
    .update(dealsTable)
    .set({ stage: "LOST", closedAt: new Date() })
    .where(eq(dealsTable.id, deal.id));

  const u = req.user!;
  const author = [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email;
  await db.insert(activityLogTable).values({
    dealId: deal.id,
    entityType: "deal",
    entityId: deal.id,
    eventType: "deal_declined",
    description: `${author} declined the submission. Reason: ${parsed.data.reason}`,
    metadata: { from_stage: deal.stage, to_stage: "LOST", reason: parsed.data.reason, author, role: actor.role },
    createdBy: actor.id,
  });

  return res.json({ success: true, stage: "LOST" });
});

/* --------------------------------------------------------------------------
 * POST /deal-card/:id/clear-rating-stale — called after a successful re-rate
 * ------------------------------------------------------------------------ */
router.post("/:id/clear-rating-stale", async (req, res) => {
  const actor = actorFrom(req);
  const deal = await loadDeal(req.params.id);
  if (!deal) return res.status(404).json({ error: "Deal not found" });
  if (!canEditSection("workforce", deal, actor)) {
    return res.status(403).json({ error: "Insufficient permissions" });
  }

  await db.update(dealsTable).set({ ratingStale: false }).where(eq(dealsTable.id, deal.id));

  const u = req.user!;
  const author = [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email;
  await db.insert(activityLogTable).values({
    dealId: deal.id,
    entityType: "deal",
    entityId: deal.id,
    eventType: "re_rated",
    description: `${author} re-rated the deal. Rating is current.`,
    metadata: { author, role: actor.role },
    createdBy: actor.id,
  });

  return res.json({ success: true, ratingStale: false });
});

export default router;
