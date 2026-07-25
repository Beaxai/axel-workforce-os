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
  dealRfisTable,
  quotesTable,
  usersTable,
  orgMembersTable,
  type Deal,
  type Account,
  type DealRfi,
} from "@workspace/db";
import { eq, desc, and, sql, inArray } from "drizzle-orm";
import {
  generateQuoteVariations,
  type VariationBaseInputs,
  type DealContext,
} from "../utils/quoteVariations";
import {
  calculateWCPremium,
  calculateMultiLocationWC,
  type MultiLocationInput,
} from "../utils/ratingEngine";
import { z } from "zod/v4";
import { reRateQuoteAfterParamsUpdate } from "../lib/indication-rerate";
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

  const team = await loadDealTeam(deal);
  const directory = await loadDealDirectory(deal);

  return res.json({
    deal,
    account,
    sections,
    aggregateComplete,
    total,
    access,
    team,
    directory,
    canApprove: APPROVE_DECLINE_ROLES.has(actor.role),
  });
});

/**
 * Scoped participant directory for the deal card: internal staff (the people
 * an external party may legitimately @mention / see as actors on their deal)
 * plus the deal's own team members. Returned with the submission payload so
 * EMPLOYER/CARRIER/PEO viewers — who cannot call the internal-sales-gated
 * GET /api/users — still get mention candidates and avatar resolution.
 */
async function loadDealDirectory(
  deal: Deal,
): Promise<Array<{ id: string; name: string; avatarUrl: string | null; role: string | null }>> {
  const users = await db
    .select({
      id: usersTable.id,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
      email: usersTable.email,
      avatarUrl: usersTable.avatarUrl,
      role: orgMembersTable.role,
    })
    .from(usersTable)
    .leftJoin(orgMembersTable, eq(orgMembersTable.userId, usersTable.id));

  const teamIds = new Set(
    [deal.ownerId, deal.producingAgentId, deal.referralPartnerId].filter((v): v is string => !!v),
  );
  const out = new Map<string, { id: string; name: string; avatarUrl: string | null; role: string | null }>();
  for (const u of users) {
    const role = u.role ? u.role.toUpperCase() : null;
    const include = (role && INTERNAL_ROLES.has(role)) || teamIds.has(u.id);
    if (!include) continue;
    if (out.has(u.id)) continue;
    out.set(u.id, {
      id: u.id,
      name: `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email,
      avatarUrl: u.avatarUrl ?? null,
      role,
    });
  }
  // Keep DB (users-table) order so the modal's no-team fallback picks the same
  // first-three people as the Pipeline card face (which uses GET /api/users order).
  return [...out.values()];
}

/** Resolve a deal's real team members (owner / producing agent / referral
 * partner) to {userId, name, relation, avatarUrl} so the UI can render avatars
 * wired to the shared mini-profile popover. Order-stable; duplicates collapsed. */
async function loadDealTeam(
  deal: Deal,
): Promise<Array<{ userId: string; name: string; relation: string; avatarUrl: string | null }>> {
  const slots: Array<{ id: string | null; relation: string }> = [
    { id: deal.ownerId, relation: "Owner" },
    { id: deal.producingAgentId, relation: "Producing Agent" },
    { id: deal.referralPartnerId, relation: "Referral Partner" },
  ];
  const ids = [...new Set(slots.map((s) => s.id).filter((v): v is string => !!v))];
  if (ids.length === 0) return [];
  const users = await db
    .select({ id: usersTable.id, firstName: usersTable.firstName, lastName: usersTable.lastName, email: usersTable.email, avatarUrl: usersTable.avatarUrl })
    .from(usersTable)
    .where(inArray(usersTable.id, ids));
  const byId = new Map(
    users.map((u) => [u.id, { name: `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email, avatarUrl: u.avatarUrl ?? null }]),
  );
  const seen = new Set<string>();
  const team: Array<{ userId: string; name: string; relation: string; avatarUrl: string | null }> = [];
  for (const s of slots) {
    if (!s.id || seen.has(s.id)) continue;
    seen.add(s.id);
    const u = byId.get(s.id);
    team.push({ userId: s.id, name: u?.name ?? "User", relation: s.relation, avatarUrl: u?.avatarUrl ?? null });
  }
  return team;
}

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
  // @mention display names selected via the composer autocomplete; stored in
  // metadata so the feed can highlight them without re-resolving users.
  mentions: z.array(z.string().trim().min(1).max(120)).max(20).optional(),
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
      metadata: { author, role: actor.role, internal, mentions: parsed.data.mentions ?? [] },
      createdBy: actor.id,
    })
    .returning();

  return res.json({ success: true, entry });
});

/* --------------------------------------------------------------------------
 * RFIs (Request For Information) — blocking items raised on a deal.
 *
 * An OPEN + blocking RFI hard-blocks Approve server-side (see /approve). RFIs
 * are created/resolved by internal staff only; external parties get a
 * §8-filtered read (internal-only RFIs are hidden from them).
 * ------------------------------------------------------------------------ */
function visibleRfis(rows: DealRfi[], actor: DealCardActor): DealRfi[] {
  if (INTERNAL_ROLES.has(actor.role)) return rows;
  return rows.filter((r) => !r.internal);
}

async function loadRfis(dealId: string): Promise<DealRfi[]> {
  return db
    .select()
    .from(dealRfisTable)
    .where(eq(dealRfisTable.dealId, dealId))
    .orderBy(desc(dealRfisTable.createdAt));
}

function openBlockingCount(rows: DealRfi[]): number {
  return rows.filter((r) => r.status === "OPEN" && r.blocking).length;
}

// GET /deal-card/:id/rfis — role-filtered list + open-blocking count
router.get("/:id/rfis", async (req, res) => {
  const actor = actorFrom(req);
  const deal = await loadDeal(req.params.id);
  if (!deal) return res.status(404).json({ error: "Deal not found" });
  if (!canViewDeal(deal, actor)) return res.status(403).json({ error: "Insufficient permissions" });

  const rows = visibleRfis(await loadRfis(deal.id), actor);
  return res.json({ rfis: rows, openBlocking: openBlockingCount(rows) });
});

// POST /deal-card/:id/rfis — internal staff raise an RFI
const createRfiSchema = z.object({
  subject: z.string().trim().min(1).max(200),
  detail: z.string().trim().max(2000).optional(),
  blocking: z.boolean().optional(),
  internal: z.boolean().optional(),
  dueInHours: z.number().int().min(1).max(24 * 30).optional(),
});

router.post("/:id/rfis", async (req, res) => {
  const actor = actorFrom(req);
  if (!INTERNAL_ROLES.has(actor.role)) {
    return res.status(403).json({ error: "Only internal staff may raise an RFI" });
  }
  const parsed = createRfiSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid RFI", issues: parsed.error.issues });

  const deal = await loadDeal(req.params.id);
  if (!deal) return res.status(404).json({ error: "Deal not found" });
  if (!canViewDeal(deal, actor)) return res.status(403).json({ error: "Insufficient permissions" });

  const u = req.user!;
  const author = [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email;
  const dueAt = parsed.data.dueInHours
    ? new Date(Date.now() + parsed.data.dueInHours * 60 * 60 * 1000)
    : null;
  const blocking = parsed.data.blocking ?? true;

  const [rfi] = await db
    .insert(dealRfisTable)
    .values({
      dealId: deal.id,
      subject: parsed.data.subject,
      detail: parsed.data.detail ?? null,
      blocking,
      internal: !!parsed.data.internal,
      dueAt,
      createdBy: actor.id,
      createdByName: author,
    })
    .returning();

  await db.insert(activityLogTable).values({
    dealId: deal.id,
    entityType: "deal",
    entityId: deal.id,
    eventType: "rfi_raised",
    description: `${author} raised an RFI: ${parsed.data.subject}${blocking ? " (blocking)" : ""}.`,
    metadata: { author, role: actor.role, rfi_id: rfi.id, blocking, internal: !!parsed.data.internal },
    createdBy: actor.id,
  });

  return res.json({ success: true, rfi });
});

// POST /deal-card/:id/rfis/:rfiId/resolve — internal staff resolve / waive
const resolveRfiSchema = z.object({
  status: z.enum(["RESOLVED", "WAIVED"]).optional(),
  note: z.string().trim().max(2000).optional(),
});

router.post("/:id/rfis/:rfiId/resolve", async (req, res) => {
  const actor = actorFrom(req);
  if (!INTERNAL_ROLES.has(actor.role)) {
    return res.status(403).json({ error: "Only internal staff may resolve an RFI" });
  }
  const parsed = resolveRfiSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid request", issues: parsed.error.issues });

  const deal = await loadDeal(req.params.id);
  if (!deal) return res.status(404).json({ error: "Deal not found" });
  if (!canViewDeal(deal, actor)) return res.status(403).json({ error: "Insufficient permissions" });

  const [existing] = await db
    .select()
    .from(dealRfisTable)
    .where(and(eq(dealRfisTable.id, req.params.rfiId), eq(dealRfisTable.dealId, deal.id)))
    .limit(1);
  if (!existing) return res.status(404).json({ error: "RFI not found" });
  if (existing.status !== "OPEN") return res.status(409).json({ error: "RFI is already closed" });

  const status = parsed.data.status ?? "RESOLVED";
  const u = req.user!;
  const author = [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email;

  const [rfi] = await db
    .update(dealRfisTable)
    .set({
      status,
      resolvedAt: new Date(),
      resolvedBy: actor.id,
      resolvedByName: author,
      resolutionNote: parsed.data.note ?? null,
    })
    .where(eq(dealRfisTable.id, existing.id))
    .returning();

  await db.insert(activityLogTable).values({
    dealId: deal.id,
    entityType: "deal",
    entityId: deal.id,
    eventType: status === "WAIVED" ? "rfi_waived" : "rfi_resolved",
    description: `${author} ${status === "WAIVED" ? "waived" : "resolved"} the RFI: ${existing.subject}.`,
    metadata: { author, role: actor.role, rfi_id: existing.id, status },
    createdBy: actor.id,
  });

  return res.json({ success: true, rfi });
});

/* --------------------------------------------------------------------------
 * Quote variations (P6 iteration 2) — AI-proposed alternative pricing
 * scenarios for a deal's CURRENT quote. Internal staff only. The AI picks
 * which levers (eMod / schedule rating / PEO) to adjust; the real rating
 * engine computes every premium so the numbers stay bindable.
 * ------------------------------------------------------------------------ */
type QuoteRow = typeof quotesTable.$inferSelect;

/** Build rating-engine base inputs from a saved quote row, or null if unratable. */
function baseInputsFromQuote(q: QuoteRow): VariationBaseInputs | null {
  const levers = {
    eMod: q.eMod != null ? Number(q.eMod) : 1.0,
    scheduleRating: q.scheduleRating != null ? Number(q.scheduleRating) : 1.0,
    isPEO: !!q.isPeo,
  };

  // Multi-location quote: workforceProfile holds the original locations payload.
  const wp = q.workforceProfile as { locations?: unknown } | null;
  if (wp && Array.isArray(wp.locations) && wp.locations.length > 0) {
    return { multi: { locations: wp.locations as MultiLocationInput["locations"] }, levers };
  }

  // Single-location quote. Recover the ZIP from the stored rating breakdown
  // (the rate engine persists its inputs there; CA pricing requires a ZIP).
  if (q.state && q.classCode && q.annualPayroll != null) {
    const bd = q.wcRatingBreakdown as { inputs?: { zip?: string } } | null;
    const zip = bd?.inputs?.zip;
    return {
      single: {
        state: q.state,
        classCode: q.classCode,
        annualPayroll: Number(q.annualPayroll),
        zip: zip || undefined,
      },
      levers,
    };
  }

  return null;
}

async function loadQuote(dealId: string): Promise<QuoteRow | null> {
  const [q] = await db.select().from(quotesTable).where(eq(quotesTable.dealId, dealId)).limit(1);
  return q ?? null;
}

/** Re-rate a quote's base inputs with an explicit lever set. Used by both the
 * non-persisting what-if preview and the persisting apply path. */
async function rateWithLevers(
  base: VariationBaseInputs,
  levers: { eMod: number; scheduleRating: number; isPEO: boolean },
): Promise<{ premium: number; breakdown: unknown }> {
  if (base.multi) {
    const result = await calculateMultiLocationWC({ ...base.multi, ...levers });
    return { premium: result.finalPremium, breakdown: result };
  }
  if (base.single) {
    const result = await calculateWCPremium({
      state: base.single.state,
      classCode: base.single.classCode,
      annualPayroll: base.single.annualPayroll,
      zip: base.single.zip,
      ...levers,
    });
    return { premium: result.result.wcPremium, breakdown: result };
  }
  throw new Error("Quote is missing inputs required to re-rate");
}

// GET /deal-card/:id/quote-variations — internal staff only
router.get("/:id/quote-variations", async (req, res) => {
  const actor = actorFrom(req);
  if (!INTERNAL_ROLES.has(actor.role)) {
    return res.status(403).json({ error: "Only internal staff may view quote variations" });
  }
  const deal = await loadDeal(req.params.id);
  if (!deal) return res.status(404).json({ error: "Deal not found" });
  if (!canViewDeal(deal, actor)) return res.status(403).json({ error: "Insufficient permissions" });

  const quote = await loadQuote(deal.id);
  if (!quote) return res.json({ hasQuote: false, basePremium: 0, variations: [], usedAi: false });

  const base = baseInputsFromQuote(quote);
  if (!base) return res.json({ hasQuote: false, basePremium: 0, variations: [], usedAi: false });

  const ctx: DealContext = {
    businessName: deal.businessName,
    vertical: deal.vertical,
    productType: deal.productType,
    annualPayroll: deal.annualPayroll != null ? Number(deal.annualPayroll) : null,
    yearsInBusiness: deal.yearsInBusiness,
    hasPriorCoverage: deal.hasPriorCoverage,
    lapseInCoverage: deal.lapseInCoverage,
  };

  const storedPremium = quote.wcPremium != null ? Number(quote.wcPremium) : 0;

  try {
    const { basePremium, variations, usedAi } = await generateQuoteVariations(base, ctx, storedPremium);
    return res.json({ hasQuote: true, basePremium, baseLevers: base.levers, variations, usedAi });
  } catch (err) {
    req.log.error({ err }, "quote-variations generation failed");
    return res.status(500).json({ error: "Failed to generate quote variations" });
  }
});

// POST /deal-card/:id/quote-variations/preview — re-rate arbitrary levers WITHOUT
// persisting (the "what-if" panel). Internal staff only.
const previewVariationSchema = z.object({
  eMod: z.number().min(0.5).max(2.0),
  scheduleRating: z.number().min(0.5).max(2.0),
  isPEO: z.boolean(),
});

router.post("/:id/quote-variations/preview", async (req, res) => {
  const actor = actorFrom(req);
  if (!INTERNAL_ROLES.has(actor.role)) {
    return res.status(403).json({ error: "Only internal staff may preview quote variations" });
  }
  const parsed = previewVariationSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid request", issues: parsed.error.issues });

  const deal = await loadDeal(req.params.id);
  if (!deal) return res.status(404).json({ error: "Deal not found" });
  if (!canViewDeal(deal, actor)) return res.status(403).json({ error: "Insufficient permissions" });

  const quote = await loadQuote(deal.id);
  if (!quote) return res.status(409).json({ error: "Deal has no quote to vary" });

  const base = baseInputsFromQuote(quote);
  if (!base) return res.status(409).json({ error: "Quote is missing inputs required to re-rate" });

  const basePremium = quote.wcPremium != null ? Number(quote.wcPremium) : 0;
  const levers = { eMod: parsed.data.eMod, scheduleRating: parsed.data.scheduleRating, isPEO: parsed.data.isPEO };

  try {
    const { premium } = await rateWithLevers(base, levers);
    const delta = premium - basePremium;
    const deltaPct = basePremium > 0 ? Math.round((delta / basePremium) * 100) : 0;
    return res.json({ premium, basePremium, delta, deltaPct, levers });
  } catch (err) {
    req.log.error({ err }, "quote-variation preview re-rate failed");
    return res.status(400).json({ error: "Failed to re-rate the variation" });
  }
});

// POST /deal-card/:id/quote-variations/apply — promote a variation into the quote
const applyVariationSchema = z.object({
  eMod: z.number().min(0.5).max(2.0).optional(),
  scheduleRating: z.number().min(0.5).max(2.0).optional(),
  isPEO: z.boolean().optional(),
  label: z.string().trim().max(60).optional(),
});

router.post("/:id/quote-variations/apply", async (req, res) => {
  const actor = actorFrom(req);
  if (!INTERNAL_ROLES.has(actor.role)) {
    return res.status(403).json({ error: "Only internal staff may apply a quote variation" });
  }
  const parsed = applyVariationSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid request", issues: parsed.error.issues });

  const deal = await loadDeal(req.params.id);
  if (!deal) return res.status(404).json({ error: "Deal not found" });
  if (!canViewDeal(deal, actor)) return res.status(403).json({ error: "Insufficient permissions" });

  const quote = await loadQuote(deal.id);
  if (!quote) return res.status(409).json({ error: "Deal has no quote to vary" });

  const base = baseInputsFromQuote(quote);
  if (!base) return res.status(409).json({ error: "Quote is missing inputs required to re-rate" });

  const levers = {
    eMod: parsed.data.eMod ?? base.levers.eMod,
    scheduleRating: parsed.data.scheduleRating ?? base.levers.scheduleRating,
    isPEO: parsed.data.isPEO ?? base.levers.isPEO,
  };

  let premium: number;
  let breakdown: unknown;
  try {
    ({ premium, breakdown } = await rateWithLevers(base, levers));
  } catch (err) {
    req.log.error({ err }, "quote-variation apply re-rate failed");
    return res.status(400).json({ error: "Failed to re-rate the variation" });
  }

  await db
    .update(quotesTable)
    .set({
      eMod: String(levers.eMod),
      scheduleRating: String(levers.scheduleRating),
      isPeo: levers.isPEO,
      wcPremium: String(premium),
      wcRatingBreakdown: breakdown,
      ratedAt: new Date(),
    })
    .where(eq(quotesTable.dealId, deal.id));

  const u = req.user!;
  const author = [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email;
  await db.insert(activityLogTable).values({
    dealId: deal.id,
    entityType: "deal",
    entityId: deal.id,
    eventType: "quote_variation_applied",
    description: `${author} applied a quote variation${parsed.data.label ? ` (${parsed.data.label})` : ""}. New WC premium $${premium.toLocaleString()}.`,
    metadata: { author, role: actor.role, levers, premium, label: parsed.data.label ?? null },
    createdBy: actor.id,
  });

  return res.json({ success: true, premium, levers });
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

  // Hard block: any OPEN blocking RFI prevents approval (server is the boundary).
  // The update is guarded by a NOT EXISTS subquery so the check and the stage
  // change are atomic — a blocking RFI created concurrently cannot slip through
  // the gap between a read and a write (no TOCTOU race).
  const updated = await db
    .update(dealsTable)
    .set({ stage: "APPROVED_QUOTED" })
    .where(
      and(
        eq(dealsTable.id, deal.id),
        sql`NOT EXISTS (SELECT 1 FROM ${dealRfisTable} WHERE ${dealRfisTable.dealId} = ${deal.id} AND ${dealRfisTable.status} = 'OPEN' AND ${dealRfisTable.blocking} = true)`,
      ),
    )
    .returning({ id: dealsTable.id });

  if (updated.length === 0) {
    // No row updated: blocking RFI(s) exist. Re-read them for the response.
    const blockingRfis = (await loadRfis(deal.id)).filter((r) => r.status === "OPEN" && r.blocking);
    return res.status(409).json({
      error: `Cannot approve — ${blockingRfis.length} blocking RFI${blockingRfis.length > 1 ? "s" : ""} still open.`,
      blockingRfis: blockingRfis.map((r) => ({ id: r.id, subject: r.subject })),
    });
  }

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

  // Decline moves the deal to the LOST stage (a board column) and stamps closedAt.
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

/* --------------------------------------------------------------------------
 * §Indication parameter editing — the deal card's Quote tab is a living
 * indication that internal parties (broker/underwriter/admin) adjust as the
 * deal progresses. Every field change is audited (before/after, actor,
 * timestamp) and the quote auto re-rates through a single seam
 * (see lib/indication-rerate.ts — flagged for owner review).
 *
 * Client gating: edits set `paramsPendingReview`; client-facing reads must
 * serve `approvedSnapshot` until an internal party approves.
 * ------------------------------------------------------------------------ */

type IndicationMetric = "locations" | "employees" | "payroll" | "exmod";

type ParamChange = { metric: IndicationMetric; field: string; before: unknown; after: unknown };

const wpClassCodeSchema = z.object({
  classCode: z.string().trim().min(1),
  description: z.string().optional(),
  annualPayroll: z.coerce.number().min(0),
  fullTimeEmployees: z.coerce.number().int().min(0).optional(),
  partTimeEmployees: z.coerce.number().int().min(0).optional(),
}).loose();

const wpLocationSchema = z.object({
  state: z.string().trim().length(2),
  zip: z.string().optional(),
  classCodes: z.array(wpClassCodeSchema).min(1),
}).loose();

const indicationParamsSchema = z.object({
  metric: z.enum(["locations", "employees", "payroll", "exmod"]),
  workforceProfile: z.object({
    locations: z.array(wpLocationSchema).min(1),
    eMod: z.coerce.number().min(0.5).max(2.0).optional(),
    scheduleRating: z.coerce.number().optional(),
    isPEO: z.boolean().optional(),
  }).loose(),
});

type WpLoc = z.infer<typeof wpLocationSchema>;

/** Field-level diff between the previous and next workforce profile. */
function diffIndicationParams(
  prev: { locations?: WpLoc[]; eMod?: number } | null,
  next: { locations: WpLoc[]; eMod?: number },
): ParamChange[] {
  const changes: ParamChange[] = [];
  const prevLocs: WpLoc[] = prev?.locations ?? [];
  const nextLocs = next.locations;

  const prevEmod = prev?.eMod ?? null;
  const nextEmod = next.eMod ?? null;
  if (prevEmod !== nextEmod) {
    changes.push({ metric: "exmod", field: "Experience Mod", before: prevEmod, after: nextEmod });
  }

  const maxLocs = Math.max(prevLocs.length, nextLocs.length);
  for (let i = 0; i < maxLocs; i++) {
    const p = prevLocs[i];
    const n = nextLocs[i];
    const locLabel = `Location ${i + 1}`;
    if (!p && n) {
      changes.push({ metric: "locations", field: `${locLabel}`, before: null, after: `${n.state}${n.zip ? ` ${n.zip}` : ""} (added)` });
      continue;
    }
    if (p && !n) {
      changes.push({ metric: "locations", field: `${locLabel}`, before: `${p.state}${p.zip ? ` ${p.zip}` : ""}`, after: "(removed)" });
      continue;
    }
    if (!p || !n) continue;
    if (p.state !== n.state) changes.push({ metric: "locations", field: `${locLabel} state`, before: p.state, after: n.state });
    if ((p.zip || "") !== (n.zip || "")) changes.push({ metric: "locations", field: `${locLabel} ZIP`, before: p.zip || null, after: n.zip || null });

    const maxCc = Math.max(p.classCodes.length, n.classCodes.length);
    for (let j = 0; j < maxCc; j++) {
      const pc = p.classCodes[j];
      const nc = n.classCodes[j];
      const ccLabel = `${locLabel} · class ${nc?.classCode ?? pc?.classCode ?? j + 1}`;
      if (!pc && nc) {
        changes.push({ metric: "locations", field: ccLabel, before: null, after: "(class code added)" });
        continue;
      }
      if (pc && !nc) {
        changes.push({ metric: "locations", field: ccLabel, before: pc.classCode, after: "(class code removed)" });
        continue;
      }
      if (!pc || !nc) continue;
      if (pc.classCode !== nc.classCode) changes.push({ metric: "locations", field: `${ccLabel} code`, before: pc.classCode, after: nc.classCode });
      if (Number(pc.annualPayroll) !== Number(nc.annualPayroll)) {
        changes.push({ metric: "payroll", field: `${ccLabel} annual payroll`, before: Number(pc.annualPayroll), after: Number(nc.annualPayroll) });
      }
      if (Number(pc.fullTimeEmployees ?? 0) !== Number(nc.fullTimeEmployees ?? 0)) {
        changes.push({ metric: "employees", field: `${ccLabel} full-time`, before: Number(pc.fullTimeEmployees ?? 0), after: Number(nc.fullTimeEmployees ?? 0) });
      }
      if (Number(pc.partTimeEmployees ?? 0) !== Number(nc.partTimeEmployees ?? 0)) {
        changes.push({ metric: "employees", field: `${ccLabel} part-time`, before: Number(pc.partTimeEmployees ?? 0), after: Number(nc.partTimeEmployees ?? 0) });
      }
    }
  }
  return changes;
}

function approvedSnapshotFrom(q: QuoteRow) {
  return {
    workforceProfile: q.workforceProfile,
    eMod: q.eMod,
    wcRatingBreakdown: q.wcRatingBreakdown,
    wcIndicationMin: q.wcIndicationMin,
    wcIndicationMax: q.wcIndicationMax,
    wcFinalPremium: q.wcFinalPremium,
    wcPremium: q.wcPremium,
  };
}

// PATCH /deal-card/:id/indication-params — save edited parameters, audit each
// field change, then re-rate through the seam.
router.patch("/:id/indication-params", async (req, res) => {
  const actor = actorFrom(req);
  if (!INTERNAL_ROLES.has(actor.role)) {
    return res.status(403).json({ error: "Only broker, underwriter, or admin may edit indication parameters" });
  }
  const deal = await loadDeal(req.params.id);
  if (!deal) return res.status(404).json({ error: "Deal not found" });

  const parsed = indicationParamsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });

  const [quote] = await db.select().from(quotesTable).where(eq(quotesTable.dealId, deal.id)).limit(1);
  if (!quote) return res.status(409).json({ error: "Deal has no quote to update" });

  const prevProfile = (quote.workforceProfile ?? null) as { locations?: WpLoc[]; eMod?: number } | null;
  const nextProfile = parsed.data.workforceProfile;
  const changes = diffIndicationParams(prevProfile, nextProfile);
  if (changes.length === 0) {
    return res.json({ success: true, changed: 0, pendingReview: quote.paramsPendingReview ?? false });
  }

  // First edit since last approval: freeze the client-approved view.
  const snapshot = quote.paramsPendingReview ? quote.approvedSnapshot : approvedSnapshotFrom(quote);

  await db
    .update(quotesTable)
    .set({
      workforceProfile: nextProfile,
      eMod: nextProfile.eMod != null ? String(nextProfile.eMod) : quote.eMod,
      approvedSnapshot: snapshot,
      paramsPendingReview: true,
    })
    .where(eq(quotesTable.id, quote.id));

  const u = req.user!;
  const author = [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email;
  // One audit row per changed field: timestamp, before/after, acting party.
  await db.insert(activityLogTable).values(
    changes.map((ch) => ({
      dealId: deal.id,
      entityType: "quote",
      entityId: quote.id,
      eventType: "indication_param_edited",
      description: `${author} changed ${ch.field}: ${ch.before ?? "—"} → ${ch.after ?? "—"}`,
      // internal:true — hidden from external parties until approved.
      metadata: { metric: ch.metric, field: ch.field, before: ch.before ?? null, after: ch.after ?? null, author, role: actor.role, internal: true },
      createdBy: actor.id,
    })),
  );

  const rerate = await reRateQuoteAfterParamsUpdate(quote.id, nextProfile as Parameters<typeof reRateQuoteAfterParamsUpdate>[1]);
  const [fresh] = await db.select().from(quotesTable).where(eq(quotesTable.id, quote.id)).limit(1);

  return res.json({
    success: true,
    changed: changes.length,
    pendingReview: true,
    rerate,
    quote: fresh,
  });
});

// POST /deal-card/:id/indication-params/approve — internal agreement reached;
// the live values become the client-visible view.
router.post("/:id/indication-params/approve", async (req, res) => {
  const actor = actorFrom(req);
  if (!INTERNAL_ROLES.has(actor.role)) {
    return res.status(403).json({ error: "Only broker, underwriter, or admin may approve" });
  }
  const deal = await loadDeal(req.params.id);
  if (!deal) return res.status(404).json({ error: "Deal not found" });
  const [quote] = await db.select().from(quotesTable).where(eq(quotesTable.dealId, deal.id)).limit(1);
  if (!quote) return res.status(409).json({ error: "Deal has no quote" });

  await db
    .update(quotesTable)
    .set({ approvedSnapshot: approvedSnapshotFrom(quote), paramsPendingReview: false })
    .where(eq(quotesTable.id, quote.id));

  const u = req.user!;
  const author = [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email;
  await db.insert(activityLogTable).values({
    dealId: deal.id,
    entityType: "quote",
    entityId: quote.id,
    eventType: "indication_params_approved",
    description: `${author} approved the updated indication details for client visibility.`,
    metadata: { author, role: actor.role },
    createdBy: actor.id,
  });

  return res.json({ success: true, pendingReview: false });
});

// GET /deal-card/:id/indication-params/history?metric= — per-field change log
// for the detail views (internal only; these entries are internal-flagged).
router.get("/:id/indication-params/history", async (req, res) => {
  const actor = actorFrom(req);
  const deal = await loadDeal(req.params.id);
  if (!deal) return res.status(404).json({ error: "Deal not found" });
  if (!INTERNAL_ROLES.has(actor.role)) {
    return res.status(403).json({ error: "Insufficient permissions" });
  }

  const rows = await db
    .select()
    .from(activityLogTable)
    .where(and(
      eq(activityLogTable.dealId, deal.id),
      inArray(activityLogTable.eventType, ["indication_param_edited", "indication_params_approved"]),
    ))
    .orderBy(desc(activityLogTable.createdAt))
    .limit(200);

  const metric = typeof req.query.metric === "string" ? req.query.metric : null;
  const filtered = metric
    ? rows.filter((r) => {
        const m = r.metadata as { metric?: string } | null;
        return r.eventType === "indication_params_approved" || m?.metric === metric;
      })
    : rows;

  return res.json({ history: filtered });
});

export default router;
