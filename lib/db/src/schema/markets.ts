import {
  pgTable,
  uuid,
  text,
  integer,
  numeric,
  boolean,
  date,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
  check,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sql } from "drizzle-orm";
import { organizationsTable } from "./organizations";
import { usersTable } from "./users";
import { dealsTable } from "./deals";
import { partnersTable } from "./partners";

// ---------------------------------------------------------------------------
// Product lanes
// ---------------------------------------------------------------------------
export const MARKET_PRODUCT_LANES = ["WC", "PEO"] as const;
export type MarketProductLane = (typeof MARKET_PRODUCT_LANES)[number];

export const MARKET_TYPES = ["WC_CARRIER", "PEO_PROGRAM"] as const;
export type MarketType = (typeof MARKET_TYPES)[number];

export const APPETITE_OUTCOMES = ["MATCHED", "CONDITIONAL", "REFERRAL"] as const;
export type AppetiteOutcome = (typeof APPETITE_OUTCOMES)[number];

export const RATE_SET_SOURCE_TYPES = ["MANUAL", "IMPORT", "API"] as const;
export type RateSetSourceType = (typeof RATE_SET_SOURCE_TYPES)[number];

export const RATE_SET_STATUSES = ["DRAFT", "ACTIVE", "SUPERSEDED", "ARCHIVED"] as const;
export type RateSetStatus = (typeof RATE_SET_STATUSES)[number];

export const DEAL_MARKET_RANKING_STATES = [
  "PROVISIONAL",
  "QUEUED",
  "DISPATCHING",
  "LOCKED",
  "FAILED",
] as const;
export type DealMarketRankingState = (typeof DEAL_MARKET_RANKING_STATES)[number];

export const DEAL_MARKET_SEND_STATUSES = [
  "PENDING",
  "SENT",
  "FAILED",
  "DELIVERY_UNKNOWN",
] as const;
export type DealMarketSendStatus = (typeof DEAL_MARKET_SEND_STATUSES)[number];

export const DISPATCH_BATCH_STATUSES = [
  "QUEUED",
  "PROCESSING",
  "COMPLETE",
  "FAILED",
  "CANCELLED",
] as const;
export type DispatchBatchStatus = (typeof DISPATCH_BATCH_STATUSES)[number];

export const DISPATCH_ITEM_STATUSES = [
  "PENDING",
  "SENT",
  "FAILED",
  "DELIVERY_UNKNOWN",
  "SKIPPED",
] as const;
export type DispatchItemStatus = (typeof DISPATCH_ITEM_STATUSES)[number];

export const ATTEMPT_OUTCOMES = [
  "SUCCESS",
  "TRANSIENT_FAILURE",
  "PERMANENT_FAILURE",
  "DELIVERY_UNKNOWN",
] as const;
export type AttemptOutcome = (typeof ATTEMPT_OUTCOMES)[number];

// ---------------------------------------------------------------------------
// markets
// ---------------------------------------------------------------------------
export const marketsTable = pgTable(
  "markets",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    name: text("name").notNull(),
    marketType: text("market_type").notNull(), // WC_CARRIER | PEO_PROGRAM
    productLane: text("product_lane").notNull(), // WC | PEO
    // Optional link to an existing partner for cross-reference.
    partnerId: uuid("partner_id").references(() => partnersTable.id),
    orgId: uuid("org_id").references(() => organizationsTable.id),
    isActive: boolean("is_active").notNull().default(false),
    isAppointed: boolean("is_appointed").notNull().default(false),
    effectiveDate: date("effective_date", { mode: "string" }),
    expirationDate: date("expiration_date", { mode: "string" }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [
    uniqueIndex("uq_markets_name_type").on(t.name, t.marketType),
    index("idx_markets_active_lane").on(t.isActive, t.productLane),
    check("chk_markets_type", sql`${t.marketType} IN ('WC_CARRIER','PEO_PROGRAM')`),
    check("chk_markets_lane", sql`${t.productLane} IN ('WC','PEO')`),
    check(
      "chk_markets_lane_type_match",
      sql`(${t.marketType} = 'WC_CARRIER' AND ${t.productLane} = 'WC') OR (${t.marketType} = 'PEO_PROGRAM' AND ${t.productLane} = 'PEO')`,
    ),
    check(
      "chk_markets_expiry_after_effective",
      sql`${t.expirationDate} IS NULL OR ${t.effectiveDate} IS NULL OR ${t.expirationDate} > ${t.effectiveDate}`,
    ),
  ],
);

export const insertMarketSchema = createInsertSchema(marketsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertMarket = z.infer<typeof insertMarketSchema>;
export type Market = typeof marketsTable.$inferSelect;

// ---------------------------------------------------------------------------
// market_underwriters
// ---------------------------------------------------------------------------
export const marketUnderwritersTable = pgTable(
  "market_underwriters",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    marketId: uuid("market_id")
      .references(() => marketsTable.id, { onDelete: "cascade" })
      .notNull(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    // Optional link to an Axel application user.
    userId: uuid("user_id").references(() => usersTable.id),
    isActive: boolean("is_active").notNull().default(true),
    effectiveDate: date("effective_date", { mode: "string" }),
    expirationDate: date("expiration_date", { mode: "string" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [
    uniqueIndex("uq_market_underwriter_market_email").on(t.marketId, t.email),
    index("idx_market_underwriters_market_active").on(t.marketId, t.isActive),
    check(
      "chk_muw_expiry_after_effective",
      sql`${t.expirationDate} IS NULL OR ${t.effectiveDate} IS NULL OR ${t.expirationDate} > ${t.effectiveDate}`,
    ),
  ],
);

export const insertMarketUnderwriterSchema = createInsertSchema(
  marketUnderwritersTable,
).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMarketUnderwriter = z.infer<typeof insertMarketUnderwriterSchema>;
export type MarketUnderwriter = typeof marketUnderwritersTable.$inferSelect;

// ---------------------------------------------------------------------------
// market_appetite_rules
// ---------------------------------------------------------------------------
export const marketAppetiteRulesTable = pgTable(
  "market_appetite_rules",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    marketId: uuid("market_id")
      .references(() => marketsTable.id, { onDelete: "cascade" })
      .notNull(),
    productLane: text("product_lane").notNull(), // WC | PEO
    vertical: text("vertical"), // null = any vertical
    eligibleStates: text("eligible_states").array(), // null = any state
    eligibleClassCodes: text("eligible_class_codes").array(), // null = any class code
    eligibleIndustries: text("eligible_industries").array(), // null = any industry
    payrollMin: numeric("payroll_min", { precision: 18, scale: 2 }),
    payrollMax: numeric("payroll_max", { precision: 18, scale: 2 }),
    premiumMin: numeric("premium_min", { precision: 18, scale: 2 }),
    premiumMax: numeric("premium_max", { precision: 18, scale: 2 }),
    headcountMin: integer("headcount_min"),
    headcountMax: integer("headcount_max"),
    appetiteOutcome: text("appetite_outcome").notNull().default("MATCHED"), // MATCHED | CONDITIONAL | REFERRAL
    // JSON array of machine-checkable condition objects for CONDITIONAL rules.
    conditions: jsonb("conditions"),
    // The primary routing underwriter for this rule.
    // Required for MATCHED and CONDITIONAL rules in active/rankable configurations.
    primaryUnderwriterId: uuid("primary_underwriter_id").references(
      () => marketUnderwritersTable.id,
    ),
    isActive: boolean("is_active").notNull().default(true),
    effectiveDate: date("effective_date", { mode: "string" }),
    expirationDate: date("expiration_date", { mode: "string" }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [
    index("idx_mar_market_active").on(t.marketId, t.isActive),
    index("idx_mar_lane_outcome").on(t.productLane, t.appetiteOutcome),
    check("chk_mar_outcome", sql`${t.appetiteOutcome} IN ('MATCHED','CONDITIONAL','REFERRAL')`),
    check("chk_mar_lane", sql`${t.productLane} IN ('WC','PEO')`),
    check(
      "chk_mar_payroll_range",
      sql`${t.payrollMax} IS NULL OR ${t.payrollMin} IS NULL OR ${t.payrollMax} >= ${t.payrollMin}`,
    ),
    check(
      "chk_mar_premium_range",
      sql`${t.premiumMax} IS NULL OR ${t.premiumMin} IS NULL OR ${t.premiumMax} >= ${t.premiumMin}`,
    ),
    check(
      "chk_mar_headcount_range",
      sql`${t.headcountMax} IS NULL OR ${t.headcountMin} IS NULL OR ${t.headcountMax} >= ${t.headcountMin}`,
    ),
    check(
      "chk_mar_expiry_after_effective",
      sql`${t.expirationDate} IS NULL OR ${t.effectiveDate} IS NULL OR ${t.expirationDate} > ${t.effectiveDate}`,
    ),
  ],
);

export const insertMarketAppetiteRuleSchema = createInsertSchema(
  marketAppetiteRulesTable,
).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMarketAppetiteRule = z.infer<typeof insertMarketAppetiteRuleSchema>;
export type MarketAppetiteRule = typeof marketAppetiteRulesTable.$inferSelect;

// ---------------------------------------------------------------------------
// market_rate_sets
// ---------------------------------------------------------------------------
export const marketRateSetsTable = pgTable(
  "market_rate_sets",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    marketId: uuid("market_id")
      .references(() => marketsTable.id, { onDelete: "cascade" })
      .notNull(),
    productLane: text("product_lane").notNull(), // WC | PEO
    sourceType: text("source_type").notNull().default("MANUAL"), // MANUAL | IMPORT | API
    version: integer("version").notNull().default(1),
    status: text("status").notNull().default("DRAFT"), // DRAFT | ACTIVE | SUPERSEDED | ARCHIVED
    effectiveDate: date("effective_date", { mode: "string" }),
    expirationDate: date("expiration_date", { mode: "string" }),
    // For IMPORT/API: reference to source document or feed identifier.
    sourceRef: text("source_ref"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [
    uniqueIndex("uq_market_rate_set_version").on(t.marketId, t.productLane, t.version),
    // Only one ACTIVE rate set per market+lane may exist (enforced by partial unique index).
    // Drizzle supports raw-SQL partial unique indexes via the sql tag.
    uniqueIndex("uq_market_rate_set_active_lane").on(t.marketId, t.productLane).where(
      sql`${t.status} = 'ACTIVE'`,
    ),
    index("idx_mrs_market_status").on(t.marketId, t.status),
    check("chk_mrs_source", sql`${t.sourceType} IN ('MANUAL','IMPORT','API')`),
    check(
      "chk_mrs_status",
      sql`${t.status} IN ('DRAFT','ACTIVE','SUPERSEDED','ARCHIVED')`,
    ),
    check("chk_mrs_lane", sql`${t.productLane} IN ('WC','PEO')`),
    check(
      "chk_mrs_expiry_after_effective",
      sql`${t.expirationDate} IS NULL OR ${t.effectiveDate} IS NULL OR ${t.expirationDate} > ${t.effectiveDate}`,
    ),
  ],
);

export const insertMarketRateSetSchema = createInsertSchema(marketRateSetsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertMarketRateSet = z.infer<typeof insertMarketRateSetSchema>;
export type MarketRateSet = typeof marketRateSetsTable.$inferSelect;

// ---------------------------------------------------------------------------
// market_rate_rules  (typed manual rate rules per rate set)
// ---------------------------------------------------------------------------
// Each row is a single rate rule entry within a rate set. The `ruleType` and
// `ruleData` JSONB fields support both WC and PEO typed payloads validated by
// the service layer. Keeping them in one table simplifies versioning and audit.
//
// WC ruleData shape (validated in service):
//   { state, classCode, baseRate, scheduleRatingMin?, scheduleRatingMax?,
//     eModMin?, eModMax?, minimumPremium?, stateMultiplier? }
//
// PEO ruleData shape:
//   { wcLoadFactor, wfsBasePepm, wfsHeadcountDiscount?, minimumAnnualWc?,
//     adminFeePercent? }
// ---------------------------------------------------------------------------
export const marketRateRulesTable = pgTable(
  "market_rate_rules",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    rateSetId: uuid("rate_set_id")
      .references(() => marketRateSetsTable.id, { onDelete: "cascade" })
      .notNull(),
    marketId: uuid("market_id")
      .references(() => marketsTable.id, { onDelete: "cascade" })
      .notNull(),
    ruleType: text("rule_type").notNull(), // WC | PEO
    ruleData: jsonb("rule_data").notNull(),
    displayOrder: integer("display_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [
    index("idx_mrr_rate_set").on(t.rateSetId, t.isActive),
    index("idx_mrr_market").on(t.marketId),
    check("chk_mrr_type", sql`${t.ruleType} IN ('WC','PEO')`),
  ],
);

export const insertMarketRateRuleSchema = createInsertSchema(marketRateRulesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertMarketRateRule = z.infer<typeof insertMarketRateRuleSchema>;
export type MarketRateRule = typeof marketRateRulesTable.$inferSelect;

// ---------------------------------------------------------------------------
// deal_markets  (authoritative per-deal ranked market set)
// ---------------------------------------------------------------------------
export const dealMarketsTable = pgTable(
  "deal_markets",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    dealId: uuid("deal_id")
      .references(() => dealsTable.id, { onDelete: "cascade" })
      .notNull(),
    marketId: uuid("market_id")
      .references(() => marketsTable.id)
      .notNull(),
    marketType: text("market_type").notNull(), // WC_CARRIER | PEO_PROGRAM
    // Appetite context at the time of ranking (snapshot references).
    matchedAppetiteRuleId: uuid("matched_appetite_rule_id").references(
      () => marketAppetiteRulesTable.id,
    ),
    assignedUnderwriterId: uuid("assigned_underwriter_id").references(
      () => marketUnderwritersTable.id,
    ),
    // Rate source identity preserved for audit/snapshot.
    rateSetId: uuid("rate_set_id").references(() => marketRateSetsTable.id),
    rateSetVersion: integer("rate_set_version"),
    // Generated rate: comparable annual amount used for ranking.
    generatedRate: numeric("generated_rate", { precision: 18, scale: 2 }).notNull(),
    // Immutable full breakdown snapshot stored at ranking time.
    rateBreakdownSnapshot: jsonb("rate_breakdown_snapshot"),
    rank: integer("rank").notNull(),
    isPrimary: boolean("is_primary").notNull().default(false),
    isRouted: boolean("is_routed").notNull().default(false),
    appetiteOutcome: text("appetite_outcome").notNull().default("MATCHED"),
    rankingState: text("ranking_state").notNull().default("PROVISIONAL"),
    // Rolled-up send status (updated by dispatch worker).
    sendStatus: text("send_status").notNull().default("PENDING"),
    sendAttemptCount: integer("send_attempt_count").notNull().default(0),
    lastSendError: text("last_send_error"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [
    uniqueIndex("uq_deal_markets_deal_market").on(t.dealId, t.marketId),
    uniqueIndex("uq_deal_markets_deal_rank").on(t.dealId, t.rank),
    index("idx_deal_markets_deal_state").on(t.dealId, t.rankingState),
    index("idx_deal_markets_market").on(t.marketId),
    check("chk_dm_rank_positive", sql`${t.rank} > 0`),
    // rank<=4 ↔ isRouted: routed iff rank<=4, and rank<=4 implies routed.
    check("chk_dm_rank_routed_equiv", sql`(${t.rank} <= 4) = (${t.isRouted} = true)`),
    // rank=1 ↔ isPrimary: primary iff rank=1, and rank=1 implies primary.
    check("chk_dm_primary_rank1_equiv", sql`(${t.rank} = 1) = (${t.isPrimary} = true)`),
    check("chk_dm_rate_nonneg", sql`${t.generatedRate} >= 0`),
    check(
      "chk_dm_outcome",
      sql`${t.appetiteOutcome} IN ('MATCHED','CONDITIONAL','REFERRAL')`,
    ),
    check(
      "chk_dm_ranking_state",
      sql`${t.rankingState} IN ('PROVISIONAL','QUEUED','DISPATCHING','LOCKED','FAILED')`,
    ),
    check(
      "chk_dm_send_status",
      sql`${t.sendStatus} IN ('PENDING','SENT','FAILED','DELIVERY_UNKNOWN')`,
    ),
    check("chk_dm_type", sql`${t.marketType} IN ('WC_CARRIER','PEO_PROGRAM')`),
  ],
);

export const insertDealMarketSchema = createInsertSchema(dealMarketsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertDealMarket = z.infer<typeof insertDealMarketSchema>;
export type DealMarket = typeof dealMarketsTable.$inferSelect;

// ---------------------------------------------------------------------------
// dispatch_batches
// ---------------------------------------------------------------------------
export const dispatchBatchesTable = pgTable(
  "dispatch_batches",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    dealId: uuid("deal_id")
      .references(() => dealsTable.id, { onDelete: "cascade" })
      .notNull(),
    status: text("status").notNull().default("QUEUED"),
    // Soft cancel: set by ADMIN/CSA for failed batches before a re-rate.
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancelledBy: uuid("cancelled_by").references(() => usersTable.id),
    cancelReason: text("cancel_reason"),
    // Durable worker lease. Provider I/O remains outside a DB transaction, so
    // a compare-and-set lease prevents concurrent sweep/cancel races.
    workerClaimId: uuid("worker_claim_id"),
    workerClaimedAt: timestamp("worker_claimed_at", { withTimezone: true }),
    // Immutable carrier package captured when the batch is queued. Workers
    // render from this snapshot rather than mutable submission answers.
    applicationSnapshot: jsonb("application_snapshot"),
    applicationSnapshotHash: text("application_snapshot_hash"),
    routingInputSnapshot: jsonb("routing_input_snapshot"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [
    // One live (non-CANCELLED, non-COMPLETE) batch per deal: partial unique index.
    uniqueIndex("uq_dispatch_batches_deal_live").on(t.dealId).where(
      sql`${t.status} NOT IN ('CANCELLED','COMPLETE')`,
    ),
    index("idx_dispatch_batches_deal_status").on(t.dealId, t.status),
    check(
      "chk_db_status",
      sql`${t.status} IN ('QUEUED','PROCESSING','COMPLETE','FAILED','CANCELLED')`,
    ),
  ],
);

export const insertDispatchBatchSchema = createInsertSchema(dispatchBatchesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertDispatchBatch = z.infer<typeof insertDispatchBatchSchema>;
export type DispatchBatch = typeof dispatchBatchesTable.$inferSelect;

// ---------------------------------------------------------------------------
// dispatch_items  (one ordered item per routed deal_market per batch)
// ---------------------------------------------------------------------------
export const dispatchItemsTable = pgTable(
  "dispatch_items",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    batchId: uuid("batch_id")
      .references(() => dispatchBatchesTable.id, { onDelete: "cascade" })
      .notNull(),
    dealMarketId: uuid("deal_market_id")
      .references(() => dealMarketsTable.id)
      .notNull(),
    rank: integer("rank").notNull(), // snapshot of deal_market rank at queue time
    status: text("status").notNull().default("PENDING"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [
    uniqueIndex("uq_dispatch_items_batch_market").on(t.batchId, t.dealMarketId),
    uniqueIndex("uq_dispatch_items_batch_rank").on(t.batchId, t.rank),
    index("idx_dispatch_items_batch_status").on(t.batchId, t.status),
    check("chk_di_rank_positive", sql`${t.rank} > 0`),
    check(
      "chk_di_status",
      sql`${t.status} IN ('PENDING','SENT','FAILED','DELIVERY_UNKNOWN','SKIPPED')`,
    ),
  ],
);

export const insertDispatchItemSchema = createInsertSchema(dispatchItemsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertDispatchItem = z.infer<typeof insertDispatchItemSchema>;
export type DispatchItem = typeof dispatchItemsTable.$inferSelect;

// ---------------------------------------------------------------------------
// dispatch_attempts  (one row per provider send attempt)
// ---------------------------------------------------------------------------
export const dispatchAttemptsTable = pgTable(
  "dispatch_attempts",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    itemId: uuid("item_id")
      .references(() => dispatchItemsTable.id, { onDelete: "cascade" })
      .notNull(),
    attemptNumber: integer("attempt_number").notNull(),
    // Stable idempotency key for the provider (e.g. Resend).
    idempotencyKey: text("idempotency_key"),
    providerMessageId: text("provider_message_id"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    outcome: text("outcome"), // SUCCESS | TRANSIENT_FAILURE | PERMANENT_FAILURE | DELIVERY_UNKNOWN
    errorCategory: text("error_category"),
    errorDetail: text("error_detail"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [
    uniqueIndex("uq_dispatch_attempts_item_num").on(t.itemId, t.attemptNumber),
    index("idx_dispatch_attempts_item").on(t.itemId),
    check(
      "chk_da_outcome",
      sql`${t.outcome} IS NULL OR ${t.outcome} IN ('SUCCESS','TRANSIENT_FAILURE','PERMANENT_FAILURE','DELIVERY_UNKNOWN')`,
    ),
    check("chk_da_attempt_positive", sql`${t.attemptNumber} > 0`),
  ],
);

export const insertDispatchAttemptSchema = createInsertSchema(dispatchAttemptsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertDispatchAttempt = z.infer<typeof insertDispatchAttemptSchema>;
export type DispatchAttempt = typeof dispatchAttemptsTable.$inferSelect;

// ---------------------------------------------------------------------------
// deal_market_email_addresses
// Market-specific listener addresses for inbound routing.
// ---------------------------------------------------------------------------
export const dealMarketEmailAddressesTable = pgTable(
  "deal_market_email_addresses",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    dealMarketId: uuid("deal_market_id")
      .references(() => dealMarketsTable.id, { onDelete: "cascade" })
      .notNull()
      .unique(),
    dealId: uuid("deal_id")
      .references(() => dealsTable.id)
      .notNull(),
    marketId: uuid("market_id")
      .references(() => marketsTable.id)
      .notNull(),
    // Unique listener address under submissions.axelins.com
    emailAddress: text("email_address").notNull().unique(),
    // Opaque subject token (does NOT expose rank or competitor information)
    subjectToken: text("subject_token").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [
    index("idx_dma_deal_market").on(t.dealId, t.marketId),
    index("idx_dma_email").on(t.emailAddress),
  ],
);

export const insertDealMarketEmailAddressSchema = createInsertSchema(
  dealMarketEmailAddressesTable,
).omit({ id: true, createdAt: true });
export type InsertDealMarketEmailAddress = z.infer<
  typeof insertDealMarketEmailAddressSchema
>;
export type DealMarketEmailAddress = typeof dealMarketEmailAddressesTable.$inferSelect;
