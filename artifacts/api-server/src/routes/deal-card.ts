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
import crypto from "node:crypto";
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
  dealMarketsTable,
  marketsTable,
  marketUnderwritersTable,
  agentProfilesTable,
  userProfilesTable,
  partnersTable,
  dispatchBatchesTable,
  dispatchItemsTable,
  dealInboundEmailsTable,
  dealOutboundEmailsTable,
  correspondenceThreadsTable,
  type Deal,
  type Account,
  type DealRfi,
} from "@workspace/db";
import { eq, desc, and, sql, inArray, isNull, asc } from "drizzle-orm";
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
import { sendDealEmail, ensureCorrespondenceThread, ensureDealMarketEmailAddress } from "../services/emailService";
import { enrichInboundEmailBody, sanitizeInboundHtml } from "../lib/inbound-email";
import { isTrustedCorrespondenceStaff, trustedActorMayAccessDeal } from "../lib/correspondence-policy";
import { promoteOverflowMarket } from "../lib/market-dispatch";
import { canCorrespond, canManageMarket, canSelect, canTransition, isCurrentSelection } from "../lib/market-engagement";

const router: IRouter = Router();

const INTERNAL_ROLES = new Set(["ADMIN", "CSA", "AGENT", "UNDERWRITER"]);
const APPROVE_DECLINE_ROLES = new Set(["ADMIN", "UNDERWRITER"]);
const MARKET_MANAGEMENT_ROLES = new Set(["ADMIN", "CSA", "UNDERWRITER"]);

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
  // Avoid passing malformed route input to PostgreSQL's UUID cast. Several
  // read-only callers use this common loader before their route-specific
  // validation and should return their normal not-found/invalid response.
  if (!UUID_RE.test(id)) return undefined;
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
  const deal = await loadDeal(String(req.params.id));
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
): Promise<Array<{
  id: string;
  name: string;
  avatarUrl: string | null;
  role: string | null;
  agentFirstName?: string | null;
  agentLastName?: string | null;
  agentPartnerName?: string | null;
}>> {
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
  const agentRows = await db
    .select({
      userId: agentProfilesTable.userId,
      firstName: agentProfilesTable.firstName,
      lastName: agentProfilesTable.lastName,
      partnerName: partnersTable.name,
    })
    .from(agentProfilesTable)
    .innerJoin(partnersTable, eq(partnersTable.id, agentProfilesTable.partnerId));
  const agentByUserId = new Map(
    agentRows
      .filter((agent) => agent.userId)
      .map((agent) => [agent.userId!, agent]),
  );

  const teamIds = new Set(
    [deal.ownerId, deal.producingAgentId, deal.referralPartnerId].filter((v): v is string => !!v),
  );
  const out = new Map<string, {
    id: string;
    name: string;
    avatarUrl: string | null;
    role: string | null;
    agentFirstName?: string | null;
    agentLastName?: string | null;
    agentPartnerName?: string | null;
  }>();
  for (const u of users) {
    const role = u.role ? u.role.toUpperCase() : null;
    const include = (role && INTERNAL_ROLES.has(role)) || teamIds.has(u.id);
    if (!include) continue;
    if (out.has(u.id)) continue;
    const agent = agentByUserId.get(u.id);
    out.set(u.id, {
      id: u.id,
      name:
        `${agent?.firstName ?? ""} ${agent?.lastName ?? ""}`.replace(/\s+/g, " ").trim() ||
        agent?.partnerName ||
        `${u.firstName ?? ""} ${u.lastName ?? ""}`.replace(/\s+/g, " ").trim() ||
        u.email,
      avatarUrl: u.avatarUrl ?? null,
      role,
      agentFirstName: agent?.firstName,
      agentLastName: agent?.lastName,
      agentPartnerName: agent?.partnerName,
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
): Promise<Array<{
  userId: string;
  name: string;
  relation: string;
  avatarUrl: string | null;
  title: string | null;
  email: string | null;
  phoneDirect: string | null;
  phoneMobile: string | null;
  department: string | null;
  agentFirstName?: string | null;
  agentLastName?: string | null;
  agentPartnerName?: string | null;
}>> {
  const slots: Array<{ id: string | null; relation: string }> = [
    { id: deal.ownerId, relation: "Owner" },
    { id: deal.producingAgentId, relation: "Producing Agent" },
    { id: deal.referralPartnerId, relation: "Referral Partner" },
  ];
  const ids = [...new Set(slots.map((s) => s.id).filter((v): v is string => !!v))];
  if (ids.length === 0) return [];
  const users = await db
    .select({
      id: usersTable.id,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
      email: usersTable.email,
      phone: usersTable.phone,
      mobile: usersTable.mobile,
      avatarUrl: usersTable.avatarUrl,
    })
    .from(usersTable)
    .where(inArray(usersTable.id, ids));
  const byId = new Map(
    users.map((u) => [
      u.id,
      {
        name: `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email,
        email: u.email,
        phoneDirect: u.phone ?? null,
        phoneMobile: u.mobile ?? null,
        avatarUrl: u.avatarUrl ?? null,
      },
    ]),
  );
  const profiles = await db
    .select({
      userId: userProfilesTable.userId,
      title: userProfilesTable.title,
      phoneDirect: userProfilesTable.phoneDirect,
      phoneMobile: userProfilesTable.phoneMobile,
      department: userProfilesTable.department,
    })
    .from(userProfilesTable)
    .where(inArray(userProfilesTable.userId, ids));
  const profileByUserId = new Map(profiles.map((profile) => [profile.userId, profile]));
  const agentRows = await db
    .select({
      userId: agentProfilesTable.userId,
      firstName: agentProfilesTable.firstName,
      lastName: agentProfilesTable.lastName,
      partnerName: partnersTable.name,
    })
    .from(agentProfilesTable)
    .innerJoin(partnersTable, eq(partnersTable.id, agentProfilesTable.partnerId))
    .where(inArray(agentProfilesTable.userId, ids));
  const agentByUserId = new Map(
    agentRows
      .filter((agent) => agent.userId)
      .map((agent) => [agent.userId!, agent]),
  );
  const seen = new Set<string>();
  const team: Array<{
    userId: string;
    name: string;
    relation: string;
    avatarUrl: string | null;
    title: string | null;
    email: string | null;
    phoneDirect: string | null;
    phoneMobile: string | null;
    department: string | null;
    agentFirstName?: string | null;
    agentLastName?: string | null;
    agentPartnerName?: string | null;
  }> = [];
  for (const s of slots) {
    if (!s.id || seen.has(s.id)) continue;
    seen.add(s.id);
    const u = byId.get(s.id);
    const profile = profileByUserId.get(s.id);
    const agent = agentByUserId.get(s.id);
    team.push({
      userId: s.id,
      name:
        `${agent?.firstName ?? ""} ${agent?.lastName ?? ""}`.replace(/\s+/g, " ").trim() ||
        agent?.partnerName ||
        u?.name ||
        "Agent",
      relation: s.relation,
      avatarUrl: u?.avatarUrl ?? null,
      title: profile?.title ?? null,
      email: u?.email ?? null,
      phoneDirect: profile?.phoneDirect ?? u?.phoneDirect ?? null,
      phoneMobile: profile?.phoneMobile ?? u?.phoneMobile ?? null,
      department: profile?.department ?? null,
      agentFirstName: agent?.firstName,
      agentLastName: agent?.lastName,
      agentPartnerName: agent?.partnerName,
    });
  }
  return team;
}

/* --------------------------------------------------------------------------
 * GET /deal-card/:id/activity — role-filtered collaboration feed
 *
 * ADMIN/CSA: all activity including market-scoped activity.
 * All other roles: no secondary market activity. Existing internal-note
 * visibility remains unchanged for internal staff.
 * Optional ?dealMarketId= to filter to a specific market thread (ADMIN/CSA only).
 * ------------------------------------------------------------------------ */
router.get("/:id/activity", async (req, res) => {
  const actor = actorFrom(req);
  const deal = await loadDeal(req.params.id);
  if (!deal) return res.status(404).json({ error: "Deal not found" });
  if (!canViewDeal(deal, actor)) return res.status(403).json({ error: "Insufficient permissions" });

  const dealMarketIdFilter = req.query.dealMarketId as string | undefined;
  const generalOnly = req.query.general === "true";

  // If filtering by dealMarketId, only ADMIN/CSA may do so.
  const trustedCorrespondence = await trustedActorMayAccessDeal(req.user, deal.id);
  const canManageMarkets = Boolean(trustedCorrespondence);
  if (dealMarketIdFilter && !canManageMarkets) {
    return res.status(403).json({ error: "Only market-management staff may filter activity by market" });
  }

  let rows = await db
    .select()
    .from(activityLogTable)
    .where(eq(activityLogTable.dealId, deal.id))
    .orderBy(desc(activityLogTable.createdAt));

  if (dealMarketIdFilter) {
    rows = rows.filter((r) => r.dealMarketId === dealMarketIdFilter);
  } else if (generalOnly) {
    rows = rows.filter((r) => r.dealMarketId == null);
  }

  if (canManageMarkets) {
    // ADMIN/CSA see everything (all market-scoped activity, internal notes).
    return res.json({ activity: rows });
  }

  // Non-trusted callers never receive a market-scoped fallback — even a
  // primary market activity record may carry a subject, address, or reply
  // identity. Market lifecycle remains available through its scoped controls.
  const filtered = rows.filter((r) => {
    const privateChannel = (r.metadata as { correspondence_private?: boolean } | null)?.correspondence_private;
    // Correspondence activity is never a primary-market fallback. It has its
    // own channel endpoints and is hidden from every non-trusted response.
    if (privateChannel) return false;
    // Strip internal activity.
    if (
      !INTERNAL_ROLES.has(actor.role) &&
      (r.metadata as { internal?: boolean } | null)?.internal
    ) return false;
    // Allow general deal activity (no market scope).
    if (r.dealMarketId == null) return true;
    return false;
  });

  return res.json({ activity: filtered });
});

/* --------------------------------------------------------------------------
 * Axel-controlled correspondence. Market threads are intentionally absent
 * from the generic activity feed and can only be read here by trusted staff.
 * ------------------------------------------------------------------------ */
function correspondenceMessage(row: any, direction: "INBOUND" | "OUTBOUND") {
  return direction === "INBOUND"
    ? {
        id: row.id,
        channel: row.channel,
        direction,
        threadId: row.correspondenceThreadId ?? row.dealMarketId ?? "held",
        dealId: row.dealId,
        dealMarketId: row.dealMarketId,
        subject: row.subject,
        from: { name: row.fromName ?? null, email: row.fromEmail },
        to: Array.isArray(row.toEmails) ? row.toEmails : [],
        cc: Array.isArray(row.ccEmails) ? row.ccEmails : [],
        bodyText: row.bodyText,
        bodyHtml: null,
        receivedAt: row.receivedAt?.toISOString?.() ?? row.receivedAt,
        sentAt: null,
        deliveryState: null,
        enrichment: row.bodyEnrichmentStatus,
        heldReason: row.heldReason ?? null,
      }
    : {
        id: row.id,
        channel: row.channel,
        direction,
        threadId: row.correspondenceThreadId ?? row.dealMarketId ?? "legacy",
        dealId: row.dealId,
        dealMarketId: row.dealMarketId,
        subject: row.subject,
        from: { name: null, email: row.fromEmail },
        to: Array.isArray(row.toEmails) ? row.toEmails : [],
        cc: Array.isArray(row.ccEmails) ? row.ccEmails : [],
        // Legacy outbound rows can contain only HTML. Supply inert extracted
        // text so clients never have to interpret raw HTML as a text fallback.
        bodyText: row.bodyText ?? (row.bodyHtml ? sanitizeInboundHtml(row.bodyHtml) : null),
        bodyHtml: row.bodyHtml,
        receivedAt: null,
        sentAt: row.createdAt?.toISOString?.() ?? row.createdAt,
        deliveryState: row.status,
        enrichment: null,
      };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type HeldReleaseTarget = {
  channel: "MARKET" | "BROKER";
  threadId: string;
  listenerEmail: string;
  senderEmail: string;
};

type CorrespondenceQueryExecutor = Pick<typeof db, "select">;

// This is deliberately shared by the queue and release action. A queue entry
// is releasable only when re-running every server-side identity check succeeds;
// it is not enough that the row merely has a historical candidate reference.
async function resolveHeldReleaseTarget(
  row: typeof dealInboundEmailsTable.$inferSelect,
  query: CorrespondenceQueryExecutor = db,
): Promise<HeldReleaseTarget | null> {
  if (
    row.channel !== "HELD" ||
    !row.dealId ||
    row.heldReason === "AMBIGUOUS_RECIPIENT_IDENTITIES" ||
    row.heldReason === "HEADER_IDENTITY_CONTRADICTION"
  ) return null;
  const to = Array.isArray(row.toEmails) ? row.toEmails : [];
  const cc = Array.isArray(row.ccEmails) ? row.ccEmails : [];
  if (to.length !== 1 || cc.length) return null;

  const senderEmail = row.fromEmail.replace(/^.*<([^>]+)>.*$/, "$1").trim().toLowerCase();
  if (row.dealMarketId) {
    const [market] = await query.select({
      threadId: correspondenceThreadsTable.id,
      listener: correspondenceThreadsTable.listenerEmail,
      snapshot: dealMarketsTable.submissionEmailSnapshot,
      underwriter: marketUnderwritersTable.email,
    }).from(dealMarketsTable)
      .innerJoin(correspondenceThreadsTable, and(eq(correspondenceThreadsTable.dealMarketId, dealMarketsTable.id), eq(correspondenceThreadsTable.channel, "MARKET")))
      .leftJoin(marketUnderwritersTable, eq(marketUnderwritersTable.id, dealMarketsTable.assignedUnderwriterId))
      .where(and(eq(dealMarketsTable.id, row.dealMarketId), eq(dealMarketsTable.dealId, row.dealId))).limit(1);
    const expectedSender = market?.snapshot ?? market?.underwriter;
    if (!market || market.listener.toLowerCase() !== to[0].toLowerCase() || !expectedSender || expectedSender.toLowerCase() !== senderEmail) return null;
    return { channel: "MARKET", threadId: market.threadId, listenerEmail: market.listener, senderEmail: expectedSender };
  }

  if (!row.correspondenceThreadId) return null;
  const [thread] = await query.select({
    id: correspondenceThreadsTable.id,
    listener: correspondenceThreadsTable.listenerEmail,
    email: usersTable.email,
  }).from(correspondenceThreadsTable)
    .innerJoin(usersTable, eq(usersTable.id, correspondenceThreadsTable.participantUserId))
    .where(and(eq(correspondenceThreadsTable.id, row.correspondenceThreadId), eq(correspondenceThreadsTable.channel, "BROKER"), eq(correspondenceThreadsTable.dealId, row.dealId))).limit(1);
  if (!thread || thread.listener.toLowerCase() !== to[0].toLowerCase() || !thread.email || thread.email.toLowerCase() !== senderEmail) return null;
  return { channel: "BROKER", threadId: thread.id, listenerEmail: thread.listener, senderEmail: thread.email };
}

// Global held queue is deliberately separate from deal/market feeds. It also
// includes unmatched mail with no deal/org, so only explicitly trusted Axel
// staff (never an external role) can review it.
router.get("/correspondence/held", async (req, res) => {
  if (!(await isTrustedCorrespondenceStaff(req.user))) return res.status(403).json({ error: "Trusted Axel correspondence staff required" });
  const limit = Math.min(Number(req.query.limit) || 100, 250);
  const allRows = await db.select()
    .from(dealInboundEmailsTable)
    .where(eq(dealInboundEmailsTable.channel, "HELD"))
    .orderBy(desc(dealInboundEmailsTable.receivedAt));
  const heldDealIds = [...new Set(allRows.map((row) => row.dealId).filter((id): id is string => !!id))];
  const heldDeals = heldDealIds.length ? await db.select({ id: dealsTable.id, orgId: dealsTable.orgId })
    .from(dealsTable).where(inArray(dealsTable.id, heldDealIds)) : [];
  const heldOrgByDeal = new Map(heldDeals.map((deal) => [deal.id, deal.orgId]));
  // Null-deal mail has no tenant and remains in the trusted global queue;
  // associated mail is scoped to the reviewing staff member's current org.
  const rows = allRows
    .filter((row) => row.dealId == null || heldOrgByDeal.get(row.dealId) === req.user!.orgId)
    .slice(0, limit);
  const marketIds = [...new Set(rows.map((row) => row.dealMarketId).filter((id): id is string => !!id))];
  const candidates = marketIds.length ? await db.select({
    dealMarketId: dealMarketsTable.id, marketName: marketsTable.name,
    contactName: marketUnderwritersTable.name, contactEmail: marketUnderwritersTable.email,
  }).from(dealMarketsTable).innerJoin(marketsTable, eq(marketsTable.id, dealMarketsTable.marketId))
    .leftJoin(marketUnderwritersTable, eq(marketUnderwritersTable.id, dealMarketsTable.assignedUnderwriterId))
    .where(inArray(dealMarketsTable.id, marketIds)) : [];
  const candidateByMarket = new Map(candidates.map((candidate) => [candidate.dealMarketId, candidate]));
  const messages = await Promise.all(rows.map(async (row) => {
    const target = await resolveHeldReleaseTarget(row);
    return {
      ...correspondenceMessage(row, "INBOUND"),
      candidate: row.dealMarketId
        ? { channel: "MARKET", ...(candidateByMarket.get(row.dealMarketId) ?? {}) }
        : row.correspondenceThreadId ? { channel: "BROKER" } : null,
      isReleasable: target !== null,
      releasableTarget: target && {
        channel: target.channel,
        threadId: target.threadId,
        listenerEmail: target.listenerEmail,
        senderEmail: target.senderEmail,
      },
      senderAuthEvidence: row.senderAuthEvidence ?? null,
    };
  }));
  return res.json({ messages });
});

const heldReleaseSchema = z.object({
  channel: z.enum(["MARKET", "BROKER"]),
  senderConfirmed: z.literal(true),
}).strict();

// Releasing held inbound mail is a staff classification action, not forwarding
// or auto-routing. The candidate must already have one server-issued listener,
// no CC, a matching persisted participant/contact, and no ambiguity/cross-ID.
router.post("/correspondence/held/:messageId/release", async (req, res) => {
  if (!UUID_RE.test(req.params.messageId)) return res.status(400).json({ error: "Invalid inbound message identifier" });
  if (!(await isTrustedCorrespondenceStaff(req.user))) return res.status(403).json({ error: "Trusted Axel correspondence staff required" });
  const parsed = heldReleaseSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid release confirmation", issues: parsed.error.issues });
  // Lock every identity record which release relies on, then resolve again
  // under those locks. A stale queue read cannot race a deal transfer,
  // listener reassignment, or contact/participant email change into a release.
  const outcome = await db.transaction(async (tx) => {
    await tx.execute(sql`
      SELECT id FROM deal_inbound_emails
      WHERE id = ${req.params.messageId} AND channel = 'HELD'
      FOR UPDATE
    `);
    const [row] = await tx.select().from(dealInboundEmailsTable)
      .where(and(eq(dealInboundEmailsTable.id, req.params.messageId), eq(dealInboundEmailsTable.channel, "HELD")))
      .limit(1);
    if (!row || !row.dealId) return { kind: "CONFLICT" as const };
    await tx.execute(sql`SELECT id FROM deals WHERE id = ${row.dealId} FOR UPDATE`);
    const [heldDeal] = await tx.select({ orgId: dealsTable.orgId }).from(dealsTable)
      .where(eq(dealsTable.id, row.dealId)).limit(1);
    if (!heldDeal || heldDeal.orgId !== req.user!.orgId) return { kind: "FORBIDDEN" as const };

    if (row.dealMarketId) {
      await tx.execute(sql`SELECT id FROM deal_markets WHERE id = ${row.dealMarketId} AND deal_id = ${row.dealId} FOR UPDATE`);
      await tx.execute(sql`SELECT id FROM correspondence_threads WHERE deal_market_id = ${row.dealMarketId} AND channel = 'MARKET' FOR UPDATE`);
      await tx.execute(sql`SELECT id FROM market_underwriters WHERE id = (SELECT assigned_underwriter_id FROM deal_markets WHERE id = ${row.dealMarketId}) FOR UPDATE`);
    } else if (row.correspondenceThreadId) {
      await tx.execute(sql`SELECT id FROM correspondence_threads WHERE id = ${row.correspondenceThreadId} AND deal_id = ${row.dealId} AND channel = 'BROKER' FOR UPDATE`);
      await tx.execute(sql`SELECT id FROM users WHERE id = (SELECT participant_user_id FROM correspondence_threads WHERE id = ${row.correspondenceThreadId}) FOR UPDATE`);
    }

    const target = await resolveHeldReleaseTarget(row, tx);
    if (!target || target.channel !== parsed.data.channel) return { kind: "CONFLICT" as const };
    const [updated] = await tx.update(dealInboundEmailsTable).set({
      channel: target.channel, correspondenceThreadId: target.threadId, heldReason: null,
    }).where(and(eq(dealInboundEmailsTable.id, row.id), eq(dealInboundEmailsTable.channel, "HELD"))).returning({ id: dealInboundEmailsTable.id });
    if (!updated) return { kind: "CONFLICT" as const };
    await tx.insert(activityLogTable).values({
      dealId: row.dealId!, dealMarketId: row.dealMarketId, entityType: "deal",
      entityId: row.dealId!, eventType: "inbound_email_released",
      description: `Held ${target.channel.toLowerCase()} email released after staff sender confirmation`,
      metadata: { correspondence_private: true, inbound_email_id: row.id, released_by: req.user!.id, sender_auth_evidence: row.senderAuthEvidence ?? null },
    });
    return { kind: "RELEASED" as const, channel: target.channel, messageId: row.id };
  });
  if (outcome.kind === "FORBIDDEN") return res.status(403).json({ error: "Held message belongs to another organization" });
  if (outcome.kind !== "RELEASED") return res.status(409).json({ error: "Held message was already released, reclassified, or failed current identity validation" });
  return res.json({ released: true, channel: outcome.channel, messageId: outcome.messageId });
});

async function trustedDealContext(req: Request, dealId: string, res: any) {
  if (!UUID_RE.test(dealId)) {
    res.status(400).json({ error: "Invalid deal identifier" });
    return null;
  }
  const deal = await loadDeal(dealId);
  if (!deal) {
    res.status(404).json({ error: "Deal not found" });
    return null;
  }
  const context = await trustedActorMayAccessDeal(req.user, dealId);
  if (!context) {
    res.status(403).json({ error: "Trusted active Axel ADMIN or CSA membership for this deal organization is required" });
    return null;
  }
  return context;
}

router.get("/:id/correspondence/market/:dealMarketId", async (req, res) => {
  const context = await trustedDealContext(req, req.params.id, res);
  if (!context) return;
  if (!UUID_RE.test(req.params.dealMarketId)) return res.status(400).json({ error: "Invalid market identifier" });
  const [market] = await db
    .select({
      dealMarketId: dealMarketsTable.id,
      marketId: dealMarketsTable.marketId,
      marketName: marketsTable.name,
      contactName: marketUnderwritersTable.name,
      contactEmail: marketUnderwritersTable.email,
      snapshotEmail: dealMarketsTable.submissionEmailSnapshot,
    })
    .from(dealMarketsTable)
    .innerJoin(marketsTable, eq(marketsTable.id, dealMarketsTable.marketId))
    .leftJoin(marketUnderwritersTable, eq(marketUnderwritersTable.id, dealMarketsTable.assignedUnderwriterId))
    .where(and(eq(dealMarketsTable.id, req.params.dealMarketId), eq(dealMarketsTable.dealId, context.deal.id)))
    .limit(1);
  if (!market) return res.status(404).json({ error: "Selected market thread was not found" });
  let [thread] = await db.select().from(correspondenceThreadsTable).where(and(
    eq(correspondenceThreadsTable.channel, "MARKET"),
    eq(correspondenceThreadsTable.dealMarketId, market.dealMarketId),
  )).limit(1);
  if (!thread) {
    const address = await ensureDealMarketEmailAddress(market.dealMarketId, context.deal.id, market.marketId);
    thread = await ensureCorrespondenceThread({
      channel: "MARKET",
      dealId: context.deal.id,
      dealMarketId: market.dealMarketId,
      marketListener: address.emailAddress,
      marketSubjectToken: address.subjectToken,
    });
  }
  const [inbound, outbound] = await Promise.all([
    db.select().from(dealInboundEmailsTable).where(and(
      eq(dealInboundEmailsTable.dealId, context.deal.id),
      eq(dealInboundEmailsTable.dealMarketId, market.dealMarketId),
      eq(dealInboundEmailsTable.channel, "MARKET"),
    )),
    db.select().from(dealOutboundEmailsTable).where(and(
      eq(dealOutboundEmailsTable.dealId, context.deal.id),
      eq(dealOutboundEmailsTable.dealMarketId, market.dealMarketId),
      eq(dealOutboundEmailsTable.channel, "MARKET"),
    )),
  ]);
  const messages = [
    ...inbound.map((row) => correspondenceMessage(row, "INBOUND")),
    ...outbound.map((row) => correspondenceMessage(row, "OUTBOUND")),
  ].sort((a, b) => String(a.receivedAt ?? a.sentAt).localeCompare(String(b.receivedAt ?? b.sentAt)));
  return res.json({
    market: {
      dealMarketId: market.dealMarketId,
      marketName: market.marketName,
      contact: { name: market.contactName ?? null, email: market.snapshotEmail ?? market.contactEmail ?? null },
      threadId: thread?.id ?? null,
    },
    messages,
  });
});

const controlledMessageSchema = z.object({
  subject: z.string().trim().min(1).max(300),
  text: z.string().trim().min(1).max(50_000),
  html: z.string().trim().max(100_000).optional(),
  requestId: z.string().uuid().optional(),
}).strict();

router.post("/:id/correspondence/market/:dealMarketId", async (req, res) => {
  const context = await trustedDealContext(req, req.params.id, res);
  if (!context) return;
  if (!UUID_RE.test(req.params.dealMarketId)) return res.status(400).json({ error: "Invalid market identifier" });
  const parsed = controlledMessageSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid message", issues: parsed.error.issues });
  const [recipient] = await db
    .select({
      snapshot: dealMarketsTable.submissionEmailSnapshot,
      underwriterEmail: marketUnderwritersTable.email,
      isActive: dealMarketsTable.isActive,
      marketStatus: dealMarketsTable.marketStatus,
      engagementSource: dealMarketsTable.engagementSource,
    })
    .from(dealMarketsTable)
    .leftJoin(marketUnderwritersTable, eq(dealMarketsTable.assignedUnderwriterId, marketUnderwritersTable.id))
    .where(and(eq(dealMarketsTable.id, req.params.dealMarketId), eq(dealMarketsTable.dealId, context.deal.id)))
    .limit(1);
  if (!recipient) return res.status(404).json({ error: "Selected market thread was not found" });
  if (!canCorrespond(recipient.engagementSource as any, recipient.isActive, recipient.marketStatus as any) || !(recipient.snapshot ?? recipient.underwriterEmail)) {
    return res.status(409).json({ error: "This market is not active for correspondence or has no approved contact" });
  }
  try {
    const result = await sendDealEmail({
      channel: "MARKET",
      dealId: context.deal.id,
      dealMarketId: req.params.dealMarketId,
      to: [recipient.snapshot ?? recipient.underwriterEmail!],
      subject: parsed.data.subject,
      text: parsed.data.text,
      html: parsed.data.html,
      idempotencyKey: parsed.data.requestId ? `manual-${parsed.data.requestId}` : undefined,
      sentBy: [context.actor.firstName, context.actor.lastName].filter(Boolean).join(" ") || context.actor.email,
    });
    if (!result.ok) return res.status(502).json({ error: result.error ?? "Market email failed", deliveryState: result.deliveryState, outboundId: result.outboundId });
    const [outbound] = await db.select().from(dealOutboundEmailsTable).where(eq(dealOutboundEmailsTable.id, result.outboundId)).limit(1);
    return res.status(201).json({ message: correspondenceMessage(outbound, "OUTBOUND") });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(message.includes("POLICY") ? 422 : 409).json({ error: message });
  }
});

router.post("/:id/correspondence/inbound/:messageId/retry-body", async (req, res) => {
  const context = await trustedDealContext(req, req.params.id, res);
  if (!context) return;
  if (!UUID_RE.test(req.params.messageId)) return res.status(400).json({ error: "Invalid inbound message identifier" });
  const [inbound] = await db.select().from(dealInboundEmailsTable).where(and(
    eq(dealInboundEmailsTable.id, req.params.messageId),
    eq(dealInboundEmailsTable.dealId, context.deal.id),
  )).limit(1);
  if (!inbound) return res.status(404).json({ error: "Inbound message not found" });
  try {
    const result = await enrichInboundEmailBody(inbound.id);
    return res.json({ message: correspondenceMessage(result.row, "INBOUND"), enriched: result.enriched });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(message === "RESEND_RETRIEVAL_UNAVAILABLE" ? 409 : 502).json({ error: message });
  }
});

async function brokerParticipantThread(deal: Deal, userId: string) {
  if (![deal.ownerId, deal.producingAgentId, deal.referralPartnerId].includes(userId)) return null;
  const [participant] = await db
    .select({ id: usersTable.id, email: usersTable.email, role: orgMembersTable.role })
    .from(usersTable)
    .innerJoin(orgMembersTable, and(eq(orgMembersTable.userId, usersTable.id), eq(orgMembersTable.isPrimaryOrg, true)))
    .where(eq(usersTable.id, userId))
    .limit(1);
  if (!participant || participant.role.toUpperCase() !== "AGENT") return null;
  const [thread] = await db.select().from(correspondenceThreadsTable).where(and(
    eq(correspondenceThreadsTable.channel, "BROKER"),
    eq(correspondenceThreadsTable.dealId, deal.id),
    eq(correspondenceThreadsTable.participantUserId, userId),
  )).limit(1);
  return { participant, thread };
}

async function brokerParticipants(deal: Deal) {
  const ids = [...new Set([deal.ownerId, deal.producingAgentId, deal.referralPartnerId].filter((id): id is string => !!id))];
  if (!ids.length) return [];
  const rows = await db
    .select({
      userId: usersTable.id,
      email: usersTable.email,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
      role: orgMembersTable.role,
    })
    .from(usersTable)
    .innerJoin(orgMembersTable, and(eq(orgMembersTable.userId, usersTable.id), eq(orgMembersTable.isPrimaryOrg, true)))
    .where(inArray(usersTable.id, ids));
  return rows
    .filter((row) => row.role.toUpperCase() === "AGENT")
    .map((row) => ({
      userId: row.userId,
      email: row.email,
      name: [row.firstName, row.lastName].filter(Boolean).join(" ") || row.email,
    }));
}

router.get("/:id/correspondence", async (req, res) => {
  if (!UUID_RE.test(req.params.id)) return res.status(400).json({ error: "Invalid deal identifier" });
  const deal = await loadDeal(req.params.id);
  if (!deal) return res.status(404).json({ error: "Deal not found" });
  const trusted = await trustedActorMayAccessDeal(req.user, deal.id);
  const participant = trusted ? null : await brokerParticipantThread(deal, req.user!.id);
  if (!trusted && !participant) return res.status(403).json({ error: "Insufficient permissions" });
  return res.json({
    market: { canRead: Boolean(trusted), canSend: Boolean(trusted), canReviewHeld: Boolean(trusted) },
    broker: {
      canRead: Boolean(trusted || participant),
      canSend: Boolean(trusted),
      canReply: Boolean(participant),
      // An external participant does not receive a directory of other brokers.
      eligibleRecipients: trusted ? await brokerParticipants(deal) : [],
    },
  });
});

router.get("/:id/correspondence/broker", async (req, res) => {
  if (!UUID_RE.test(req.params.id)) return res.status(400).json({ error: "Invalid deal identifier" });
  const deal = await loadDeal(req.params.id);
  if (!deal) return res.status(404).json({ error: "Deal not found" });
  const trusted = await trustedActorMayAccessDeal(req.user, deal.id);
  const participant = trusted ? null : await brokerParticipantThread(deal, req.user!.id);
  if (!trusted && !participant) return res.status(403).json({ error: "Insufficient permissions" });
  // A participant without a persisted thread must see no rows; treating null
  // as an unscoped filter would disclose every broker thread on the deal.
  if (participant && !participant.thread) return res.json({ messages: [] });
  const allowedThreadId = participant?.thread?.id ?? null;
  const [inbound, outbound] = await Promise.all([
    db.select().from(dealInboundEmailsTable).where(and(
      eq(dealInboundEmailsTable.dealId, deal.id),
      eq(dealInboundEmailsTable.channel, "BROKER"),
    )),
    db.select().from(dealOutboundEmailsTable).where(and(
      eq(dealOutboundEmailsTable.dealId, deal.id),
      eq(dealOutboundEmailsTable.channel, "BROKER"),
    )),
  ]);
  const messages = [
    ...inbound.filter((r) => !allowedThreadId || r.correspondenceThreadId === allowedThreadId).map((r) => correspondenceMessage(r, "INBOUND")),
    ...outbound.filter((r) => !allowedThreadId || r.correspondenceThreadId === allowedThreadId).map((r) => correspondenceMessage(r, "OUTBOUND")),
  ].sort((a, b) => String(a.receivedAt ?? a.sentAt).localeCompare(String(b.receivedAt ?? b.sentAt)));
  return res.json({ messages });
});

const brokerMessageSchema = controlledMessageSchema.extend({ recipientUserId: z.string().uuid() });
router.post("/:id/correspondence/broker", async (req, res) => {
  const context = await trustedDealContext(req, req.params.id, res);
  if (!context) return;
  const parsed = brokerMessageSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid message", issues: parsed.error.issues });
  const participant = await brokerParticipantThread(context.deal, parsed.data.recipientUserId);
  if (!participant) return res.status(403).json({ error: "Recipient is not an authorized deal-associated broker or agent" });
  try {
    const result = await sendDealEmail({
      channel: "BROKER",
      dealId: context.deal.id,
      recipientUserId: participant.participant.id,
      to: [participant.participant.email],
      subject: parsed.data.subject,
      text: parsed.data.text,
      html: parsed.data.html,
      idempotencyKey: parsed.data.requestId ? `manual-${parsed.data.requestId}` : undefined,
      sentBy: [context.actor.firstName, context.actor.lastName].filter(Boolean).join(" ") || context.actor.email,
    });
    if (!result.ok) return res.status(502).json({ error: result.error ?? "Broker email failed", deliveryState: result.deliveryState, outboundId: result.outboundId });
    const [outbound] = await db.select().from(dealOutboundEmailsTable).where(eq(dealOutboundEmailsTable.id, result.outboundId)).limit(1);
    return res.status(201).json({ message: correspondenceMessage(outbound, "OUTBOUND") });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(message.includes("POLICY") ? 422 : 409).json({ error: message });
  }
});

router.post("/:id/correspondence/broker/reply", async (req, res) => {
  if (!UUID_RE.test(req.params.id)) return res.status(400).json({ error: "Invalid deal identifier" });
  const deal = await loadDeal(req.params.id);
  if (!deal) return res.status(404).json({ error: "Deal not found" });
  // Trusted staff use the dedicated composer endpoint; this endpoint has no
  // recipient field and is intentionally restricted to the participant.
  if (await trustedActorMayAccessDeal(req.user, deal.id)) {
    return res.status(403).json({ error: "Use the broker composer to select an authorized recipient" });
  }
  const participant = await brokerParticipantThread(deal, req.user!.id);
  if (!participant) return res.status(403).json({ error: "Only an authorized deal-associated broker or agent may reply" });
  const parsed = controlledMessageSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid message", issues: parsed.error.issues });
  const thread = participant.thread ?? await ensureCorrespondenceThread({
    channel: "BROKER",
    dealId: deal.id,
    participantUserId: req.user!.id,
  });
  const [row] = await db.insert(dealInboundEmailsTable).values({
    dealId: deal.id,
    dealMarketId: null,
    messageId: `portal-broker-${crypto.randomUUID()}`,
    fromEmail: participant.participant.email,
    fromName: [req.user!.firstName, req.user!.lastName].filter(Boolean).join(" ") || null,
    subject: parsed.data.subject,
    bodyText: parsed.data.text,
    bodyHtml: null,
    channel: "BROKER",
    correspondenceThreadId: thread.id,
    bodyEnrichmentStatus: "COMPLETE",
    receivedAt: new Date(),
    processedAt: new Date(),
  }).returning();
  return res.status(201).json({ message: correspondenceMessage(row, "INBOUND") });
});

router.get("/:id/correspondence/held", async (req, res) => {
  const context = await trustedDealContext(req, req.params.id, res);
  if (!context) return;
  const rows = await db.select().from(dealInboundEmailsTable).where(and(
    eq(dealInboundEmailsTable.dealId, context.deal.id),
    eq(dealInboundEmailsTable.channel, "HELD"),
  )).orderBy(desc(dealInboundEmailsTable.receivedAt));
  return res.json({ messages: rows.map((row) => correspondenceMessage(row, "INBOUND")) });
});

/* --------------------------------------------------------------------------
 * POST /deal-card/:id/messages — persist a composer message
 * ------------------------------------------------------------------------ */
const messageSchema = z.object({
  message: z.string().trim().min(1).max(5000),
  internal: z.boolean().optional(),
  dealMarketId: z.string().uuid().optional(),
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

  if (parsed.data.dealMarketId) {
    const trusted = await trustedActorMayAccessDeal(req.user, deal.id);
    if (!trusted) {
      return res.status(403).json({ error: "Only trusted active Axel ADMIN or CSA staff may send market correspondence" });
    }
    if (internal) {
      return res.status(400).json({ error: "Market correspondence cannot be an internal note" });
    }

    const [recipient] = await db
      .select({
        marketName: marketsTable.name,
        underwriterEmail: marketUnderwritersTable.email,
        submissionEmailSnapshot: dealMarketsTable.submissionEmailSnapshot,
        isActive: dealMarketsTable.isActive,
        marketStatus: dealMarketsTable.marketStatus,
        engagementSource: dealMarketsTable.engagementSource,
      })
      .from(dealMarketsTable)
      .innerJoin(marketsTable, eq(dealMarketsTable.marketId, marketsTable.id))
      .leftJoin(
        marketUnderwritersTable,
        eq(dealMarketsTable.assignedUnderwriterId, marketUnderwritersTable.id),
      )
      .where(
        and(
          eq(dealMarketsTable.id, parsed.data.dealMarketId),
          eq(dealMarketsTable.dealId, deal.id),
        ),
      )
      .limit(1);

    if (!recipient) {
      return res.status(404).json({ error: "Selected market thread was not found" });
    }
    const allowed = canCorrespond(
      recipient.engagementSource as Parameters<typeof canCorrespond>[0],
      recipient.isActive,
      recipient.marketStatus as Parameters<typeof canCorrespond>[2],
    );
    if (!allowed) {
      return res.status(409).json({
        error: "This market engagement is not active for correspondence yet.",
      });
    }
    if (recipient.engagementSource === "AXEL_KEEP") {
      const [entry] = await db.insert(activityLogTable).values({
        dealId: deal.id,
        dealMarketId: parsed.data.dealMarketId,
        entityType: "deal_market",
        entityId: parsed.data.dealMarketId,
        eventType: "message",
        description: parsed.data.message,
        metadata: { author, role: actor.role, internal: true, mentions: parsed.data.mentions ?? [] },
        createdBy: actor.id,
      }).returning();
      return res.json({ success: true, entry, status: "internal" });
    }
    const recipientEmail = recipient.underwriterEmail ?? recipient.submissionEmailSnapshot;
    if (!recipientEmail) {
      return res.status(409).json({ error: "Selected market has no assigned underwriter email" });
    }

    const result = await sendDealEmail({
      channel: "MARKET",
      dealId: deal.id,
      dealMarketId: parsed.data.dealMarketId,
      to: [recipientEmail],
      subject: `${deal.businessName ?? "Applicant"} submission — ${recipient.marketName}`,
      text: `${parsed.data.message}\n\n— ${author}`,
      sentBy: author,
    });
    if (!result.ok) {
      return res.status(502).json({
        error:
          result.failureKind === "DELIVERY_UNKNOWN"
            ? "Delivery status is unknown. Review the thread before retrying."
            : result.error ?? "Market email failed",
      });
    }
    return res.json({ success: true, outboundId: result.outboundId, status: result.status });
  }

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
 * GET /deal-card/:id/market-routing-summary
 *
 * ADMIN/CSA: full routing summary with all ranks, generated rates, appetite
 *   results, underwriter info, lock state, retries, and failures.
 * All other roles: primary-only summary (annualAmount, productLane, status)
 *   — no secondary market names, rates, or metadata.
 * ------------------------------------------------------------------------ */
router.get("/:id/market-routing-summary", async (req, res) => {
  const actor = actorFrom(req);
  const deal = await loadDeal(req.params.id);
  if (!deal) return res.status(404).json({ error: "Deal not found" });
  if (!canViewDeal(deal, actor)) return res.status(403).json({ error: "Insufficient permissions" });

  const isAdminCsa = Boolean(await trustedActorMayAccessDeal(req.user, deal.id));

  // Load deal_markets for this deal.
  const dealMarkets = await db
    .select()
    .from(dealMarketsTable)
    .where(eq(dealMarketsTable.dealId, deal.id))
    .orderBy(asc(dealMarketsTable.rank), asc(dealMarketsTable.createdAt));

  if (dealMarkets.length === 0) {
    return res.json({ hasMarkets: false, markets: [], primaryPricing: null });
  }

  // Load batch info.
  const [batch] = await db
    .select()
    .from(dispatchBatchesTable)
    .where(eq(dispatchBatchesTable.dealId, deal.id))
    .orderBy(desc(dispatchBatchesTable.createdAt));
  const candidateRetryBatches = await db.select().from(dispatchBatchesTable).where(and(
    eq(dispatchBatchesTable.dealId, deal.id),
    inArray(dispatchBatchesTable.status, ["FAILED", "COMPLETE"]),
  )).orderBy(desc(dispatchBatchesTable.createdAt));
  const candidateBatchIds = candidateRetryBatches.map((row) => row.id);
  const failedItems = candidateBatchIds.length
    ? await db.select().from(dispatchItemsTable).where(and(
        inArray(dispatchItemsTable.batchId, candidateBatchIds),
        eq(dispatchItemsTable.status, "FAILED"),
      ))
    : [];
  const failedCountByBatch = new Map<string, number>();
  for (const item of failedItems) {
    failedCountByBatch.set(item.batchId, (failedCountByBatch.get(item.batchId) ?? 0) + 1);
  }
  const retryableBatches = candidateRetryBatches
    .filter((row) => (failedCountByBatch.get(row.id) ?? 0) > 0)
    .map((row) => ({
      batchId: row.id,
      batchStatus: row.status,
      batchKind: row.batchKind,
      isLaunchBatch: row.isLaunchBatch,
      promotedDealMarketId: row.promotedDealMarketId,
      failedItemCount: failedCountByBatch.get(row.id) ?? 0,
      createdAt: row.createdAt,
    }));

  // Load markets + underwriters for display.
  const marketIds = [...new Set(dealMarkets.map((dm) => dm.marketId))];
  const underwriterIds = [...new Set(dealMarkets.map((dm) => dm.assignedUnderwriterId).filter((id): id is string => !!id))];

  const [marketRows, underwriterRows] = await Promise.all([
    marketIds.length > 0
      ? db.select({ id: marketsTable.id, name: marketsTable.name, marketType: marketsTable.marketType })
          .from(marketsTable)
          .where(inArray(marketsTable.id, marketIds))
      : Promise.resolve([]),
    underwriterIds.length > 0
      ? db.select({ id: marketUnderwritersTable.id, name: marketUnderwritersTable.name, email: marketUnderwritersTable.email })
          .from(marketUnderwritersTable)
          .where(inArray(marketUnderwritersTable.id, underwriterIds))
      : Promise.resolve([]),
  ]);

  const marketMap = new Map(marketRows.map((m) => [m.id, m]));
  const uwMap = new Map(underwriterRows.map((u) => [u.id, u]));

  const primaryDm = dealMarkets.find((dm) => dm.isPrimary);

  if (!isAdminCsa) {
    // Non-ADMIN/CSA: return only primary-only summary — no secondary names, rates, or metadata.
    if (!primaryDm) {
      return res.json({ hasMarkets: true, primaryPricing: null });
    }
    return res.json({
      hasMarkets: true,
      primaryPricing: {
        annualAmount: primaryDm.generatedRate == null ? null : Number(primaryDm.generatedRate),
        productLane: primaryDm.marketType === "WC_CARRIER" ? "WC" : "PEO",
        rankingState: primaryDm.rankingState,
        sendStatus: primaryDm.sendStatus,
      },
    });
  }

  // ADMIN/CSA: full routing summary.
  const fullSummary = dealMarkets.map((dm) => {
    const market = marketMap.get(dm.marketId);
    const uw = dm.assignedUnderwriterId ? uwMap.get(dm.assignedUnderwriterId) : null;
    return {
      dealMarketId: dm.id,
      rank: dm.rank,
      verticalRank: dm.verticalRank,
      isPrimary: dm.isPrimary,
      isRouted: dm.isRouted,
      isActive: dm.isActive,
      marketStatus: dm.marketStatus,
      isSelected: dm.isSelected,
      engagementSource: dm.engagementSource,
      marketId: dm.marketId,
      marketName: market?.name ?? null,
      marketType: dm.marketType,
      generatedRate: dm.generatedRate == null ? null : Number(dm.generatedRate),
      appetiteOutcome: dm.appetiteOutcome,
      rankingState: dm.rankingState,
      sendStatus: dm.sendStatus,
      sendAttemptCount: dm.sendAttemptCount,
      lastSendError: dm.lastSendError,
      sentAt: dm.sentAt,
      lockedAt: dm.lockedAt,
      assignedUnderwriter: uw ? { id: uw.id, name: uw.name, email: uw.email } : null,
    };
  });

  return res.json({
    hasMarkets: true,
    batchId: batch?.id ?? null,
    batchStatus: batch?.status ?? null,
    batchKind: batch?.batchKind ?? null,
    isLaunchBatch: batch?.isLaunchBatch ?? false,
    retryableBatches,
    markets: fullSummary,
    primaryPricing: primaryDm
      ? {
          annualAmount: primaryDm.generatedRate == null ? null : Number(primaryDm.generatedRate),
          productLane: primaryDm.marketType === "WC_CARRIER" ? "WC" : "PEO",
          rankingState: primaryDm.rankingState,
          sendStatus: primaryDm.sendStatus,
        }
      : null,
  });
});

async function requireMarketManagement(req: Request, res: any) {
  const actor = actorFrom(req);
  if (!canManageMarket(actor.role)) {
    res.status(403).json({ error: "ADMIN, UNDERWRITER, or CSA role required" });
    return null;
  }
  const deal = await loadDeal(String(req.params.id));
  if (!deal) {
    res.status(404).json({ error: "Deal not found" });
    return null;
  }
  if (!canViewDeal(deal, actor)) {
    res.status(403).json({ error: "Insufficient permissions" });
    return null;
  }
  return { actor, deal };
}

router.post("/:id/markets/:dealMarketId/promote", async (req, res) => {
  const context = await trustedDealContext(req, req.params.id, res);
  if (!context) return;
  try {
    const result = await promoteOverflowMarket(req.params.id, req.params.dealMarketId, context.actor.id);
    return res.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(message.includes("not found") ? 404 : 409).json({ error: message });
  }
});

router.post("/:id/markets/:dealMarketId/keep-axel", async (req, res) => {
  const context = await requireMarketManagement(req, res);
  if (!context) return;
  const result = await db.transaction(async (tx) => {
    const [row] = await tx.select().from(dealMarketsTable).where(and(
      eq(dealMarketsTable.id, req.params.dealMarketId),
      eq(dealMarketsTable.dealId, req.params.id),
      eq(dealMarketsTable.engagementSource, "AXEL_KEEP"),
    )).for("update");
    if (!row) return null;
    if (row.isActive) return row;
    const [updated] = await tx.update(dealMarketsTable).set({
      isActive: true,
      marketStatus: "ACTIVE",
      updatedAt: new Date(),
    }).where(eq(dealMarketsTable.id, row.id)).returning();
    await tx.insert(activityLogTable).values({
      dealId: req.params.id,
      dealMarketId: row.id,
      entityType: "deal_market",
      entityId: row.id,
      eventType: "market_axel_kept",
      description: "Account kept with Axel as an active internal engagement.",
      metadata: { kept_by: context.actor.id, internal: true },
      createdBy: context.actor.id,
    });
    return updated;
  });
  if (!result) return res.status(404).json({ error: "Axel keep option not found" });
  return res.json({ success: true, market: result });
});

const marketStatusSchema = z.object({
  status: z.enum(["QUOTE_RECEIVED", "DECLINED", "NO_RESPONSE"]),
});

router.patch("/:id/markets/:dealMarketId/status", async (req, res) => {
  const context = await requireMarketManagement(req, res);
  if (!context) return;
  const parsed = marketStatusSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid market status" });
  const [current] = await db.select({
    status: dealMarketsTable.marketStatus,
    engagementSource: dealMarketsTable.engagementSource,
  })
    .from(dealMarketsTable)
    .where(and(eq(dealMarketsTable.id, req.params.dealMarketId), eq(dealMarketsTable.dealId, req.params.id)));
  if (!current || !canTransition(
    current.engagementSource as Parameters<typeof canTransition>[0],
    current.status as Parameters<typeof canTransition>[1],
    parsed.data.status,
  )) {
    return res.status(409).json({ error: "Invalid market status transition" });
  }
  const [updated] = await db.update(dealMarketsTable).set({
    marketStatus: parsed.data.status,
    updatedAt: new Date(),
  }).where(and(
    eq(dealMarketsTable.id, req.params.dealMarketId),
    eq(dealMarketsTable.dealId, req.params.id),
    eq(dealMarketsTable.isActive, true),
    eq(dealMarketsTable.marketStatus, current.status),
  )).returning();
  if (!updated) return res.status(409).json({ error: "Market is not active" });
  return res.json({ success: true, market: updated });
});

router.post("/:id/markets/:dealMarketId/select", async (req, res) => {
  const context = await requireMarketManagement(req, res);
  if (!context) return;
  const selected = await db.transaction(async (tx) => {
    await tx.select({ id: dealsTable.id }).from(dealsTable)
      .where(eq(dealsTable.id, req.params.id)).for("update");
    const [target] = await tx.select().from(dealMarketsTable).where(and(
      eq(dealMarketsTable.id, req.params.dealMarketId),
      eq(dealMarketsTable.dealId, req.params.id),
      eq(dealMarketsTable.isActive, true),
      inArray(dealMarketsTable.marketStatus, ["ACTIVE", "SENT", "QUOTE_RECEIVED", "SELECTED"]),
    )).for("update");
    if (!target) return null;
    if (isCurrentSelection(
      target.isSelected,
      target.marketStatus as Parameters<typeof isCurrentSelection>[1],
    )) return target;
    if (!canSelect(
      target.engagementSource as Parameters<typeof canSelect>[0],
      target.isActive,
      target.marketStatus as Parameters<typeof canSelect>[2],
    )) return null;
    await tx.update(dealMarketsTable).set({
      isSelected: false,
      isPrimary: false,
      marketStatus: sql`CASE
        WHEN ${dealMarketsTable.isSelected} AND ${dealMarketsTable.engagementSource} = 'AXEL_KEEP' THEN 'ACTIVE'
        WHEN ${dealMarketsTable.isSelected} THEN 'QUOTE_RECEIVED'
        ELSE ${dealMarketsTable.marketStatus}
      END`,
      updatedAt: new Date(),
    })
      .where(eq(dealMarketsTable.dealId, req.params.id));
    const [updated] = await tx.update(dealMarketsTable).set({
      isSelected: true,
      isPrimary: true,
      marketStatus: "SELECTED",
      updatedAt: new Date(),
    }).where(eq(dealMarketsTable.id, target.id)).returning();
    return updated;
  });
  if (!selected) return res.status(409).json({ error: "Only an active market can be selected" });
  return res.json({ success: true, market: selected });
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
    description: `${author} updated ${def.label}: ${diffs.map((d) => d.label).join(", ")}.`,
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
    // Full-address fields (pass-through keys on the loose schema).
    const addrFields: Array<[string, string]> = [["street1", "street"], ["street2", "suite/unit"], ["city", "city"]];
    for (const [key, label] of addrFields) {
      const pv = String((p as Record<string, unknown>)[key] ?? "");
      const nv = String((n as Record<string, unknown>)[key] ?? "");
      if (pv !== nv) changes.push({ metric: "locations", field: `${locLabel} ${label}`, before: pv || null, after: nv || null });
    }

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
