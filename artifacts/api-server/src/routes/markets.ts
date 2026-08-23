/**
 * markets.ts — Express router for market configuration and routing.
 *
 * ADMIN/CSA:  reads + simulation (GET /markets/*, POST /markets/simulate,
 *             GET /markets/deals/:dealId, POST /markets/deals/:dealId/rank)
 * ADMIN only: mutations (POST/PATCH/DELETE on markets, underwriters, appetite
 *             rules, rate sets, rate rules; activation; nested creation)
 *
 * All responses are plain JSON suitable for the manual React API client.
 *
 * Endpoint contracts:
 *   GET    /markets                                    → { data: Market[] }
 *   GET    /markets/:marketId                          → { data: MarketWithNested }
 *   POST   /markets                                    → 201 { data: Market }
 *   PATCH  /markets/:marketId                          → { data: Market }
 *   POST   /markets/:marketId/activate                 → { data: Market }
 *   POST   /markets/:marketId/deactivate               → { data: Market }
 *   DELETE /markets/:marketId                          → 204
 *
 *   GET    /markets/:marketId/underwriters             → { data: MarketUnderwriter[] }
 *   POST   /markets/:marketId/underwriters             → 201 { data: MarketUnderwriter }
 *   PATCH  /markets/:marketId/underwriters/:uwId       → { data: MarketUnderwriter }
 *   DELETE /markets/:marketId/underwriters/:uwId       → 204
 *
 *   GET    /markets/:marketId/appetite-rules           → { data: MarketAppetiteRule[] }
 *   POST   /markets/:marketId/appetite-rules           → 201 { data: MarketAppetiteRule }
 *   PATCH  /markets/:marketId/appetite-rules/:ruleId   → { data: MarketAppetiteRule }
 *   DELETE /markets/:marketId/appetite-rules/:ruleId   → 204
 *
 *   GET    /markets/:marketId/rate-sets                → { data: MarketRateSet[] }
 *   POST   /markets/:marketId/rate-sets                → 201 { data: MarketRateSet }
 *   PATCH  /markets/:marketId/rate-sets/:rateSetId     → { data: MarketRateSet }
 *   DELETE /markets/:marketId/rate-sets/:rateSetId     → 204
 *
 *   GET    /markets/:marketId/rate-sets/:rateSetId/rules            → { data: MarketRateRule[] }
 *   POST   /markets/:marketId/rate-sets/:rateSetId/rules            → 201 { data: MarketRateRule }
 *   PATCH  /markets/:marketId/rate-sets/:rateSetId/rules/:ruleId    → { data: MarketRateRule }
 *   DELETE /markets/:marketId/rate-sets/:rateSetId/rules/:ruleId    → 204
 *
 *   POST   /markets/simulate                           → { data: RankingResult }
 *   GET    /markets/deals/:dealId                      → { data: DealMarket[] }
 *   POST   /markets/deals/:dealId/rank                 → { data: RankingResult, dealMarketIds: string[] }
 */

import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod/v4";
import {
  db,
  marketsTable,
  marketUnderwritersTable,
  marketAppetiteRulesTable,
  marketRateSetsTable,
  marketRateRulesTable,
  dealMarketsTable,
} from "@workspace/db";
import type {
  InsertMarket,
  InsertMarketUnderwriter,
  InsertMarketAppetiteRule,
  InsertMarketRateSet,
  InsertMarketRateRule,
} from "@workspace/db";
import {
  simulateRanking,
  rankAndPersistProvisional,
  checkMarketActivation,
  normalizeRatingInput,
} from "../lib/market-routing";

const router: IRouter = Router();

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const CreateMarketBody = z.object({
  name: z.string().min(1),
  marketType: z.enum(["WC_CARRIER", "PEO_PROGRAM"]),
  productLane: z.enum(["WC", "PEO"]),
  partnerId: z.string().uuid().optional().nullable(),
  orgId: z.string().uuid().optional().nullable(),
  isAppointed: z.boolean().optional(),
  effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  expirationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  notes: z.string().optional().nullable(),
});

const PatchMarketBody = CreateMarketBody.partial().extend({
  // isActive is excluded from generic PATCH; use /activate or /deactivate
});

const CreateUnderwriterBody = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  userId: z.string().uuid().optional().nullable(),
  isActive: z.boolean().optional(),
  effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  expirationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
});

const PatchUnderwriterBody = CreateUnderwriterBody.partial();

const CreateAppetiteRuleBody = z.object({
  productLane: z.enum(["WC", "PEO"]),
  vertical: z.string().optional().nullable(),
  eligibleStates: z.array(z.string().length(2)).optional().nullable(),
  eligibleClassCodes: z.array(z.string()).optional().nullable(),
  eligibleIndustries: z.array(z.string()).optional().nullable(),
  payrollMin: z.string().optional().nullable(),
  payrollMax: z.string().optional().nullable(),
  premiumMin: z.string().optional().nullable(),
  premiumMax: z.string().optional().nullable(),
  headcountMin: z.number().int().positive().optional().nullable(),
  headcountMax: z.number().int().positive().optional().nullable(),
  appetiteOutcome: z.enum(["MATCHED", "CONDITIONAL", "REFERRAL"]).optional(),
  conditions: z.array(z.unknown()).optional().nullable(),
  primaryUnderwriterId: z.string().uuid().optional().nullable(),
  isActive: z.boolean().optional(),
  effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  expirationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  notes: z.string().optional().nullable(),
});

const PatchAppetiteRuleBody = CreateAppetiteRuleBody.partial();

const CreateRateSetBody = z.object({
  productLane: z.enum(["WC", "PEO"]),
  sourceType: z.enum(["MANUAL", "IMPORT", "API"]).optional(),
  version: z.number().int().positive().optional(),
  status: z.enum(["DRAFT", "ACTIVE", "SUPERSEDED", "ARCHIVED"]).optional(),
  effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  expirationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  sourceRef: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const PatchRateSetBody = CreateRateSetBody.partial();

const CreateRateRuleBody = z.object({
  ruleType: z.enum(["WC", "PEO"]),
  ruleData: z.record(z.string(), z.unknown()),
  displayOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

const PatchRateRuleBody = CreateRateRuleBody.partial();

const WcRatingUnitBody = z.object({
  state: z.string().length(2),
  classCode: z.string().min(1),
  annualPayroll: z.number().nonnegative(),
});

const SimulateBody = z.object({
  productLane: z.enum(["WC", "PEO"]),
  effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  states: z.array(z.string().length(2)).min(1),
  vertical: z.string().optional().nullable(),
  /**
   * Explicit per-unit WC rating breakdown.
   * When provided, overrides classCodes/annualPayroll for WC rating.
   * Each unit must have an exact market rate rule; no fallback.
   */
  ratingUnits: z.array(WcRatingUnitBody).min(1).optional(),
  classCodes: z.array(z.string()).optional(),
  industries: z.array(z.string()).optional(),
  annualPayroll: z.number().nonnegative().optional(),
  headcount: z.number().int().positive().optional(),
  eMod: z.number().optional(),
  scheduleRating: z.number().optional(),
});

// ---------------------------------------------------------------------------
// GET /markets  — list all markets (ADMIN/CSA)
// ---------------------------------------------------------------------------
router.get("/", async (req: Request, res: Response): Promise<void> => {
  const markets = await db.select().from(marketsTable).orderBy(marketsTable.name);
  res.json({ data: markets });
});

// ---------------------------------------------------------------------------
// POST /markets/simulate  — no-write simulation (ADMIN/CSA)
// Must be defined BEFORE /:marketId to avoid route conflicts.
// ---------------------------------------------------------------------------
router.post("/simulate", async (req: Request, res: Response): Promise<void> => {
  const parsed = SimulateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const normalized = normalizeRatingInput(parsed.data);
  if (!normalized.ok) {
    res.status(400).json({ error: normalized.errors.join("; ") });
    return;
  }

  req.log.info(
    { productLane: normalized.input.productLane },
    "Market ranking simulation requested",
  );

  const result = await simulateRanking(normalized.input);
  res.json({ data: result });
});

// ---------------------------------------------------------------------------
// GET /markets/deals/:dealId  — full ranking for a deal (ADMIN/CSA)
// Must be defined before /:marketId
// ---------------------------------------------------------------------------
router.get("/deals/:dealId", async (req: Request, res: Response): Promise<void> => {
  const dealId = Array.isArray(req.params.dealId) ? req.params.dealId[0] : req.params.dealId;

  const rows = await db
    .select()
    .from(dealMarketsTable)
    .where(eq(dealMarketsTable.dealId, dealId))
    .orderBy(dealMarketsTable.rank);

  res.json({ data: rows });
});

// ---------------------------------------------------------------------------
// POST /markets/deals/:dealId/rank  — rank and persist provisional (ADMIN/CSA)
// ---------------------------------------------------------------------------
router.post("/deals/:dealId/rank", async (req: Request, res: Response): Promise<void> => {
  const dealId = Array.isArray(req.params.dealId) ? req.params.dealId[0] : req.params.dealId;

  const parsed = SimulateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const normalized = normalizeRatingInput(parsed.data);
  if (!normalized.ok) {
    res.status(400).json({ error: normalized.errors.join("; ") });
    return;
  }

  req.log.info(
    { dealId, productLane: normalized.input.productLane },
    "Deal market ranking requested",
  );

  const result = await rankAndPersistProvisional(dealId, normalized.input);

  if (!result.ok) {
    res.status(409).json({ error: result.error });
    return;
  }

  res.json({ data: result.result, dealMarketIds: result.dealMarketIds });
});

// ---------------------------------------------------------------------------
// GET /markets/:marketId  — single market with nested data (ADMIN/CSA)
// ---------------------------------------------------------------------------
router.get("/:marketId", async (req: Request, res: Response): Promise<void> => {
  const marketId = Array.isArray(req.params.marketId) ? req.params.marketId[0] : req.params.marketId;

  const [market] = await db
    .select()
    .from(marketsTable)
    .where(eq(marketsTable.id, marketId));

  if (!market) {
    res.status(404).json({ error: "Market not found" });
    return;
  }

  const [underwriters, appetiteRules, rateSets] = await Promise.all([
    db.select().from(marketUnderwritersTable).where(eq(marketUnderwritersTable.marketId, marketId)),
    db.select().from(marketAppetiteRulesTable).where(eq(marketAppetiteRulesTable.marketId, marketId)),
    db.select().from(marketRateSetsTable).where(eq(marketRateSetsTable.marketId, marketId)).orderBy(desc(marketRateSetsTable.version)),
  ]);

  res.json({ data: { ...market, underwriters, appetiteRules, rateSets } });
});

// ---------------------------------------------------------------------------
// POST /markets  — create market (ADMIN only)
// ---------------------------------------------------------------------------
router.post("/", async (req: Request, res: Response): Promise<void> => {
  if (req.user?.role !== "ADMIN") {
    res.status(403).json({ error: "ADMIN role required" });
    return;
  }

  const parsed = CreateMarketBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { marketType, productLane } = parsed.data;
  if (
    (marketType === "WC_CARRIER" && productLane !== "WC") ||
    (marketType === "PEO_PROGRAM" && productLane !== "PEO")
  ) {
    res.status(400).json({ error: "marketType and productLane are inconsistent" });
    return;
  }

  const values: InsertMarket = {
    ...parsed.data,
    isActive: false, // always starts inactive; activate separately
  };

  const [market] = await db.insert(marketsTable).values(values).returning();
  req.log.info({ marketId: market.id }, "Market created");
  res.status(201).json({ data: market });
});

// ---------------------------------------------------------------------------
// PATCH /markets/:marketId  — update market fields (ADMIN only)
// ---------------------------------------------------------------------------
router.patch("/:marketId", async (req: Request, res: Response): Promise<void> => {
  if (req.user?.role !== "ADMIN") {
    res.status(403).json({ error: "ADMIN role required" });
    return;
  }

  const marketId = Array.isArray(req.params.marketId) ? req.params.marketId[0] : req.params.marketId;

  const parsed = PatchMarketBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { marketType: _mt, productLane: _pl, ...rest } = parsed.data;
  // Omit marketType + productLane from patch (these are structural; delete and recreate)

  const [updated] = await db
    .update(marketsTable)
    .set({ ...rest, updatedAt: new Date() })
    .where(eq(marketsTable.id, marketId))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Market not found" });
    return;
  }

  req.log.info({ marketId }, "Market updated");
  res.json({ data: updated });
});

// ---------------------------------------------------------------------------
// POST /markets/:marketId/activate  (ADMIN only)
// ---------------------------------------------------------------------------
router.post("/:marketId/activate", async (req: Request, res: Response): Promise<void> => {
  if (req.user?.role !== "ADMIN") {
    res.status(403).json({ error: "ADMIN role required" });
    return;
  }

  const marketId = Array.isArray(req.params.marketId) ? req.params.marketId[0] : req.params.marketId;
  const check = await checkMarketActivation(marketId);
  if (!check.canActivate) {
    res.status(422).json({ error: "Market cannot be activated", reasons: check.reasons });
    return;
  }

  const [updated] = await db
    .update(marketsTable)
    .set({ isActive: true, updatedAt: new Date() })
    .where(eq(marketsTable.id, marketId))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Market not found" });
    return;
  }

  req.log.info({ marketId }, "Market activated");
  res.json({ data: updated });
});

// ---------------------------------------------------------------------------
// POST /markets/:marketId/deactivate  (ADMIN only)
// ---------------------------------------------------------------------------
router.post("/:marketId/deactivate", async (req: Request, res: Response): Promise<void> => {
  if (req.user?.role !== "ADMIN") {
    res.status(403).json({ error: "ADMIN role required" });
    return;
  }

  const marketId = Array.isArray(req.params.marketId) ? req.params.marketId[0] : req.params.marketId;

  const [updated] = await db
    .update(marketsTable)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(marketsTable.id, marketId))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Market not found" });
    return;
  }

  req.log.info({ marketId }, "Market deactivated");
  res.json({ data: updated });
});

// ---------------------------------------------------------------------------
// DELETE /markets/:marketId  (ADMIN only)
// ---------------------------------------------------------------------------
router.delete("/:marketId", async (req: Request, res: Response): Promise<void> => {
  if (req.user?.role !== "ADMIN") {
    res.status(403).json({ error: "ADMIN role required" });
    return;
  }

  const marketId = Array.isArray(req.params.marketId) ? req.params.marketId[0] : req.params.marketId;

  const [deleted] = await db
    .delete(marketsTable)
    .where(eq(marketsTable.id, marketId))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Market not found" });
    return;
  }

  req.log.info({ marketId }, "Market deleted");
  res.sendStatus(204);
});

// ---------------------------------------------------------------------------
// GET /markets/:marketId/underwriters
// ---------------------------------------------------------------------------
router.get("/:marketId/underwriters", async (req: Request, res: Response): Promise<void> => {
  const marketId = Array.isArray(req.params.marketId) ? req.params.marketId[0] : req.params.marketId;

  const rows = await db
    .select()
    .from(marketUnderwritersTable)
    .where(eq(marketUnderwritersTable.marketId, marketId))
    .orderBy(marketUnderwritersTable.name);

  res.json({ data: rows });
});

// ---------------------------------------------------------------------------
// POST /markets/:marketId/underwriters  (ADMIN only)
// ---------------------------------------------------------------------------
router.post("/:marketId/underwriters", async (req: Request, res: Response): Promise<void> => {
  if (req.user?.role !== "ADMIN") {
    res.status(403).json({ error: "ADMIN role required" });
    return;
  }

  const marketId = Array.isArray(req.params.marketId) ? req.params.marketId[0] : req.params.marketId;

  const parsed = CreateUnderwriterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const values: InsertMarketUnderwriter = { ...parsed.data, marketId };
  const [uw] = await db.insert(marketUnderwritersTable).values(values).returning();
  req.log.info({ marketId, underwriterId: uw.id }, "Market underwriter created");
  res.status(201).json({ data: uw });
});

// ---------------------------------------------------------------------------
// PATCH /markets/:marketId/underwriters/:uwId  (ADMIN only)
// ---------------------------------------------------------------------------
router.patch("/:marketId/underwriters/:uwId", async (req: Request, res: Response): Promise<void> => {
  if (req.user?.role !== "ADMIN") {
    res.status(403).json({ error: "ADMIN role required" });
    return;
  }

  const marketId = Array.isArray(req.params.marketId) ? req.params.marketId[0] : req.params.marketId;
  const uwId = Array.isArray(req.params.uwId) ? req.params.uwId[0] : req.params.uwId;

  const parsed = PatchUnderwriterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [updated] = await db
    .update(marketUnderwritersTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(
      and(
        eq(marketUnderwritersTable.id, uwId),
        eq(marketUnderwritersTable.marketId, marketId),
      ),
    )
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Underwriter not found" });
    return;
  }

  req.log.info({ marketId, underwriterId: uwId }, "Market underwriter updated");
  res.json({ data: updated });
});

// ---------------------------------------------------------------------------
// DELETE /markets/:marketId/underwriters/:uwId  (ADMIN only)
// ---------------------------------------------------------------------------
router.delete("/:marketId/underwriters/:uwId", async (req: Request, res: Response): Promise<void> => {
  if (req.user?.role !== "ADMIN") {
    res.status(403).json({ error: "ADMIN role required" });
    return;
  }

  const marketId = Array.isArray(req.params.marketId) ? req.params.marketId[0] : req.params.marketId;
  const uwId = Array.isArray(req.params.uwId) ? req.params.uwId[0] : req.params.uwId;

  const [deleted] = await db
    .delete(marketUnderwritersTable)
    .where(
      and(
        eq(marketUnderwritersTable.id, uwId),
        eq(marketUnderwritersTable.marketId, marketId),
      ),
    )
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Underwriter not found" });
    return;
  }

  req.log.info({ marketId, underwriterId: uwId }, "Market underwriter deleted");
  res.sendStatus(204);
});

// ---------------------------------------------------------------------------
// GET /markets/:marketId/appetite-rules
// ---------------------------------------------------------------------------
router.get("/:marketId/appetite-rules", async (req: Request, res: Response): Promise<void> => {
  const marketId = Array.isArray(req.params.marketId) ? req.params.marketId[0] : req.params.marketId;

  const rows = await db
    .select()
    .from(marketAppetiteRulesTable)
    .where(eq(marketAppetiteRulesTable.marketId, marketId))
    .orderBy(marketAppetiteRulesTable.createdAt);

  res.json({ data: rows });
});

// ---------------------------------------------------------------------------
// POST /markets/:marketId/appetite-rules  (ADMIN only)
// ---------------------------------------------------------------------------
router.post("/:marketId/appetite-rules", async (req: Request, res: Response): Promise<void> => {
  if (req.user?.role !== "ADMIN") {
    res.status(403).json({ error: "ADMIN role required" });
    return;
  }

  const marketId = Array.isArray(req.params.marketId) ? req.params.marketId[0] : req.params.marketId;

  const parsed = CreateAppetiteRuleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Verify primary underwriter belongs to this market if provided
  if (parsed.data.primaryUnderwriterId) {
    const [uw] = await db
      .select()
      .from(marketUnderwritersTable)
      .where(
        and(
          eq(marketUnderwritersTable.id, parsed.data.primaryUnderwriterId),
          eq(marketUnderwritersTable.marketId, marketId),
        ),
      );
    if (!uw) {
      res.status(422).json({ error: "primaryUnderwriterId must belong to this market" });
      return;
    }
  }

  const values: InsertMarketAppetiteRule = {
    ...parsed.data,
    marketId,
    conditions: (parsed.data.conditions as unknown[] | null | undefined) ?? null,
  };

  const [rule] = await db.insert(marketAppetiteRulesTable).values(values).returning();
  req.log.info({ marketId, ruleId: rule.id }, "Market appetite rule created");
  res.status(201).json({ data: rule });
});

// ---------------------------------------------------------------------------
// PATCH /markets/:marketId/appetite-rules/:ruleId  (ADMIN only)
// ---------------------------------------------------------------------------
router.patch("/:marketId/appetite-rules/:ruleId", async (req: Request, res: Response): Promise<void> => {
  if (req.user?.role !== "ADMIN") {
    res.status(403).json({ error: "ADMIN role required" });
    return;
  }

  const marketId = Array.isArray(req.params.marketId) ? req.params.marketId[0] : req.params.marketId;
  const ruleId = Array.isArray(req.params.ruleId) ? req.params.ruleId[0] : req.params.ruleId;

  const parsed = PatchAppetiteRuleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [updated] = await db
    .update(marketAppetiteRulesTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(
      and(
        eq(marketAppetiteRulesTable.id, ruleId),
        eq(marketAppetiteRulesTable.marketId, marketId),
      ),
    )
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Appetite rule not found" });
    return;
  }

  req.log.info({ marketId, ruleId }, "Market appetite rule updated");
  res.json({ data: updated });
});

// ---------------------------------------------------------------------------
// DELETE /markets/:marketId/appetite-rules/:ruleId  (ADMIN only)
// ---------------------------------------------------------------------------
router.delete("/:marketId/appetite-rules/:ruleId", async (req: Request, res: Response): Promise<void> => {
  if (req.user?.role !== "ADMIN") {
    res.status(403).json({ error: "ADMIN role required" });
    return;
  }

  const marketId = Array.isArray(req.params.marketId) ? req.params.marketId[0] : req.params.marketId;
  const ruleId = Array.isArray(req.params.ruleId) ? req.params.ruleId[0] : req.params.ruleId;

  const [deleted] = await db
    .delete(marketAppetiteRulesTable)
    .where(
      and(
        eq(marketAppetiteRulesTable.id, ruleId),
        eq(marketAppetiteRulesTable.marketId, marketId),
      ),
    )
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Appetite rule not found" });
    return;
  }

  req.log.info({ marketId, ruleId }, "Market appetite rule deleted");
  res.sendStatus(204);
});

// ---------------------------------------------------------------------------
// GET /markets/:marketId/rate-sets
// ---------------------------------------------------------------------------
router.get("/:marketId/rate-sets", async (req: Request, res: Response): Promise<void> => {
  const marketId = Array.isArray(req.params.marketId) ? req.params.marketId[0] : req.params.marketId;

  const rows = await db
    .select()
    .from(marketRateSetsTable)
    .where(eq(marketRateSetsTable.marketId, marketId))
    .orderBy(desc(marketRateSetsTable.version));

  res.json({ data: rows });
});

// ---------------------------------------------------------------------------
// POST /markets/:marketId/rate-sets  (ADMIN only)
// ---------------------------------------------------------------------------
router.post("/:marketId/rate-sets", async (req: Request, res: Response): Promise<void> => {
  if (req.user?.role !== "ADMIN") {
    res.status(403).json({ error: "ADMIN role required" });
    return;
  }

  const marketId = Array.isArray(req.params.marketId) ? req.params.marketId[0] : req.params.marketId;

  const parsed = CreateRateSetBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const values: InsertMarketRateSet = { ...parsed.data, marketId };
  const [rateSet] = await db.insert(marketRateSetsTable).values(values).returning();
  req.log.info({ marketId, rateSetId: rateSet.id }, "Market rate set created");
  res.status(201).json({ data: rateSet });
});

// ---------------------------------------------------------------------------
// PATCH /markets/:marketId/rate-sets/:rateSetId  (ADMIN only)
// ---------------------------------------------------------------------------
router.patch("/:marketId/rate-sets/:rateSetId", async (req: Request, res: Response): Promise<void> => {
  if (req.user?.role !== "ADMIN") {
    res.status(403).json({ error: "ADMIN role required" });
    return;
  }

  const marketId = Array.isArray(req.params.marketId) ? req.params.marketId[0] : req.params.marketId;
  const rateSetId = Array.isArray(req.params.rateSetId) ? req.params.rateSetId[0] : req.params.rateSetId;

  const parsed = PatchRateSetBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [updated] = await db
    .update(marketRateSetsTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(
      and(
        eq(marketRateSetsTable.id, rateSetId),
        eq(marketRateSetsTable.marketId, marketId),
      ),
    )
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Rate set not found" });
    return;
  }

  req.log.info({ marketId, rateSetId }, "Market rate set updated");
  res.json({ data: updated });
});

// ---------------------------------------------------------------------------
// DELETE /markets/:marketId/rate-sets/:rateSetId  (ADMIN only)
// ---------------------------------------------------------------------------
router.delete("/:marketId/rate-sets/:rateSetId", async (req: Request, res: Response): Promise<void> => {
  if (req.user?.role !== "ADMIN") {
    res.status(403).json({ error: "ADMIN role required" });
    return;
  }

  const marketId = Array.isArray(req.params.marketId) ? req.params.marketId[0] : req.params.marketId;
  const rateSetId = Array.isArray(req.params.rateSetId) ? req.params.rateSetId[0] : req.params.rateSetId;

  const [deleted] = await db
    .delete(marketRateSetsTable)
    .where(
      and(
        eq(marketRateSetsTable.id, rateSetId),
        eq(marketRateSetsTable.marketId, marketId),
      ),
    )
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Rate set not found" });
    return;
  }

  req.log.info({ marketId, rateSetId }, "Market rate set deleted");
  res.sendStatus(204);
});

// ---------------------------------------------------------------------------
// GET /markets/:marketId/rate-sets/:rateSetId/rules
// ---------------------------------------------------------------------------
router.get(
  "/:marketId/rate-sets/:rateSetId/rules",
  async (req: Request, res: Response): Promise<void> => {
    const marketId = Array.isArray(req.params.marketId) ? req.params.marketId[0] : req.params.marketId;
    const rateSetId = Array.isArray(req.params.rateSetId) ? req.params.rateSetId[0] : req.params.rateSetId;

    const rows = await db
      .select()
      .from(marketRateRulesTable)
      .where(
        and(
          eq(marketRateRulesTable.rateSetId, rateSetId),
          eq(marketRateRulesTable.marketId, marketId),
        ),
      )
      .orderBy(marketRateRulesTable.displayOrder);

    res.json({ data: rows });
  },
);

// ---------------------------------------------------------------------------
// POST /markets/:marketId/rate-sets/:rateSetId/rules  (ADMIN only)
// ---------------------------------------------------------------------------
router.post(
  "/:marketId/rate-sets/:rateSetId/rules",
  async (req: Request, res: Response): Promise<void> => {
    if (req.user?.role !== "ADMIN") {
      res.status(403).json({ error: "ADMIN role required" });
      return;
    }

    const marketId = Array.isArray(req.params.marketId) ? req.params.marketId[0] : req.params.marketId;
    const rateSetId = Array.isArray(req.params.rateSetId) ? req.params.rateSetId[0] : req.params.rateSetId;

    const parsed = CreateRateRuleBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    // Verify rate set belongs to this market
    const [rateSet] = await db
      .select()
      .from(marketRateSetsTable)
      .where(
        and(
          eq(marketRateSetsTable.id, rateSetId),
          eq(marketRateSetsTable.marketId, marketId),
        ),
      );
    if (!rateSet) {
      res.status(404).json({ error: "Rate set not found for this market" });
      return;
    }

    // Validate ruleType/lane alignment: WC rate set must have WC rules, PEO must have PEO.
    if (parsed.data.ruleType !== rateSet.productLane) {
      res.status(422).json({
        error: `ruleType '${parsed.data.ruleType}' does not match rate set productLane '${rateSet.productLane}'`,
      });
      return;
    }

    // Also validate the rate set's market lane matches the market.
    const [mkt] = await db.select().from(marketsTable).where(eq(marketsTable.id, marketId));
    if (mkt && rateSet.productLane !== mkt.productLane) {
      res.status(422).json({
        error: `Rate set productLane '${rateSet.productLane}' does not match market productLane '${mkt.productLane}'`,
      });
      return;
    }

    const values: InsertMarketRateRule = { ...parsed.data, rateSetId, marketId };
    const [rule] = await db.insert(marketRateRulesTable).values(values).returning();
    req.log.info({ marketId, rateSetId, ruleId: rule.id }, "Market rate rule created");
    res.status(201).json({ data: rule });
  },
);

// ---------------------------------------------------------------------------
// PATCH /markets/:marketId/rate-sets/:rateSetId/rules/:ruleId  (ADMIN only)
// ---------------------------------------------------------------------------
router.patch(
  "/:marketId/rate-sets/:rateSetId/rules/:ruleId",
  async (req: Request, res: Response): Promise<void> => {
    if (req.user?.role !== "ADMIN") {
      res.status(403).json({ error: "ADMIN role required" });
      return;
    }

    const marketId = Array.isArray(req.params.marketId) ? req.params.marketId[0] : req.params.marketId;
    const rateSetId = Array.isArray(req.params.rateSetId) ? req.params.rateSetId[0] : req.params.rateSetId;
    const ruleId = Array.isArray(req.params.ruleId) ? req.params.ruleId[0] : req.params.ruleId;

    const parsed = PatchRateRuleBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const [updated] = await db
      .update(marketRateRulesTable)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(
        and(
          eq(marketRateRulesTable.id, ruleId),
          eq(marketRateRulesTable.rateSetId, rateSetId),
          eq(marketRateRulesTable.marketId, marketId),
        ),
      )
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Rate rule not found" });
      return;
    }

    req.log.info({ marketId, rateSetId, ruleId }, "Market rate rule updated");
    res.json({ data: updated });
  },
);

// ---------------------------------------------------------------------------
// DELETE /markets/:marketId/rate-sets/:rateSetId/rules/:ruleId  (ADMIN only)
// ---------------------------------------------------------------------------
router.delete(
  "/:marketId/rate-sets/:rateSetId/rules/:ruleId",
  async (req: Request, res: Response): Promise<void> => {
    if (req.user?.role !== "ADMIN") {
      res.status(403).json({ error: "ADMIN role required" });
      return;
    }

    const marketId = Array.isArray(req.params.marketId) ? req.params.marketId[0] : req.params.marketId;
    const rateSetId = Array.isArray(req.params.rateSetId) ? req.params.rateSetId[0] : req.params.rateSetId;
    const ruleId = Array.isArray(req.params.ruleId) ? req.params.ruleId[0] : req.params.ruleId;

    const [deleted] = await db
      .delete(marketRateRulesTable)
      .where(
        and(
          eq(marketRateRulesTable.id, ruleId),
          eq(marketRateRulesTable.rateSetId, rateSetId),
          eq(marketRateRulesTable.marketId, marketId),
        ),
      )
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "Rate rule not found" });
      return;
    }

    req.log.info({ marketId, rateSetId, ruleId }, "Market rate rule deleted");
    res.sendStatus(204);
  },
);

export default router;
