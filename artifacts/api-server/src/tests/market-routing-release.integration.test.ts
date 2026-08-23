import { after, describe, it } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import express, { type Express } from "express";
import { and, eq, inArray } from "drizzle-orm";
import {
  accountsTable,
  activityLogTable,
  db,
  dealDocumentsTable,
  dealEmailAddressesTable,
  dealMarketsTable,
  dealOutboundEmailsTable,
  dealsTable,
  dispatchAttemptsTable,
  dispatchBatchesTable,
  dispatchItemsTable,
  marketUnderwritersTable,
  marketsTable,
  proposalsTable,
  quotesTable,
  submissionAnswersTable,
} from "@workspace/db";
import {
  cannabisApplicationAnswersSchema,
  routableCannabisApplicationAnswersSchema,
} from "@workspace/cannabis-application";
import {
  cancelMarketDispatch,
  processMarketDispatchBatch,
} from "../lib/market-dispatch.js";
import { hashCanonicalApplicationAnswers } from "../lib/canonical-routing-package.js";
import proposalsRouter from "../routes/proposals.js";
import submissionRouter from "../routes/submission.js";

const fixtureId = randomUUID().replaceAll("-", "").slice(0, 12);

const yesNoAnswers = {
  q1_aircraftWatercraft: "no",
  q2_hazardousMaterial: "no",
  q3_undergroundOrAbove15ft: "no",
  q4_workOnWater: "no",
  q5_otherBusiness: "no",
  q6_subcontractorsUsed: "no",
  q7_workSubletWithoutCoi: "no",
  q8_writtenSafetyProgram: "yes",
  q9_groupTransportation: "no",
  q10_employeesUnder16OrOver60: "no",
  q11_seasonalEmployees: "no",
  q12_volunteerLabor: "no",
  q13_employeesWithHandicaps: "no",
  q14_outOfStateTravel: "no",
  q15_athleticTeamsSponsored: "no",
  q16_physicalsRequired: "yes",
  q17_otherInsurance: "no",
  q18_priorCoverageDeclined: "no",
  q19_employeeHealthPlans: "yes",
  q20_workForOtherBusinesses: "no",
  q21_leasedEmployees: "no",
  q22_workFromHome: "no",
  q23_taxLiensOrBankruptcy: "no",
  q24_unpaidWcPremium: "no",
} as const;

const completedAnswers = cannabisApplicationAnswersSchema.parse({
  legalBusinessName: `Release Routing Fixture ${fixtureId}`,
  fein: "12-3456789",
  entityType: "LLC",
  businessStreetAddress: "100 Test Street",
  businessCity: "Los Angeles",
  businessState: "CA",
  businessZip: "90001",
  primaryContactName: "Test Contact",
  contactEmail: "release-routing@example.test",
  contactPhone: "555-555-0100",
  primaryClassOfBusiness: "Clerical Office",
  totalEmployeesAll: "3",
  annualPayroll: "150000",
  locations: [
    {
      loc: "1",
      streetAddress: "100 Test Street",
      suite: "",
      city: "Los Angeles",
      state: "CA",
      zip: "90001",
    },
  ],
  classCodes: [
    {
      loc: "1",
      classCode: "8810",
      description: "Clerical Office",
      fullTime: "3",
      partTime: "0",
      annualPayroll: "150000",
    },
  ],
  signatoryName: "Test Contact",
  signatoryDate: "2026-08-23",
  ...yesNoAnswers,
});

const completedApplicationHash = hashCanonicalApplicationAnswers(completedAnswers);

async function postJson(
  router: Express,
  path: string,
  body: Record<string, unknown>,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const server = createServer(router);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");

  try {
    const response = await fetch(`http://127.0.0.1:${address.port}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    return {
      status: response.status,
      body: (await response.json()) as Record<string, unknown>,
    };
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
}

function applicationSnapshot() {
  assert.equal(
    routableCannabisApplicationAnswersSchema.safeParse(completedAnswers).success,
    true,
  );
  return {
    version: 1,
    applicationHash: completedApplicationHash,
    ratingInput: {
      productLane: "WC",
      states: ["CA"],
      ratingUnits: [
        { state: "CA", classCode: "8810", annualPayroll: 150000 },
      ],
      annualPayroll: 150000,
      headcount: 3,
      eMod: 1,
      scheduleRating: 1,
    },
  };
}

async function deleteFixtureDeal(dealId: string): Promise<void> {
  await db.delete(activityLogTable).where(eq(activityLogTable.dealId, dealId));
  await db.delete(proposalsTable).where(eq(proposalsTable.dealId, dealId));
  await db.delete(dealOutboundEmailsTable).where(eq(dealOutboundEmailsTable.dealId, dealId));
  await db.delete(dispatchBatchesTable).where(eq(dispatchBatchesTable.dealId, dealId));
  await db.delete(dealDocumentsTable).where(eq(dealDocumentsTable.dealId, dealId));
  await db.delete(submissionAnswersTable).where(eq(submissionAnswersTable.dealId, dealId));
  await db.delete(dealEmailAddressesTable).where(eq(dealEmailAddressesTable.dealId, dealId));
  await db.delete(dealMarketsTable).where(eq(dealMarketsTable.dealId, dealId));
  await db.delete(quotesTable).where(eq(quotesTable.dealId, dealId));
  await db.delete(dealsTable).where(eq(dealsTable.id, dealId));
}

describe("market routing release invariants (database integration)", () => {
  const cleanupAccounts = new Set<string>();
  const cleanupDeals = new Set<string>();
  const cleanupMarkets = new Set<string>();

  after(async () => {
    for (const dealId of cleanupDeals) {
      await deleteFixtureDeal(dealId);
    }
    for (const marketId of cleanupMarkets) {
      await db.delete(marketsTable).where(eq(marketsTable.id, marketId));
    }
    for (const accountId of cleanupAccounts) {
      await db.delete(accountsTable).where(eq(accountsTable.id, accountId));
    }
  });

  it("allows only one provider send while concurrent workers and cancellation race", async () => {
    const [account] = await db
      .insert(accountsTable)
      .values({ businessName: `Dispatch Race ${fixtureId}` })
      .returning({ id: accountsTable.id });
    cleanupAccounts.add(account.id);
    const [deal] = await db
      .insert(dealsTable)
      .values({
        referenceCode: `T-RACE-${fixtureId}`,
        accountId: account.id,
        businessName: `Dispatch Race ${fixtureId}`,
        productType: "WC",
        vertical: "Cannabis",
        state: "CA",
        annualPayroll: "150000",
        employeeCountFt: 3,
        stage: "UW_REVIEW",
        submissionStatus: "submitted",
      })
      .returning({ id: dealsTable.id });
    cleanupDeals.add(deal.id);
    const [market] = await db
      .insert(marketsTable)
      .values({
        name: `Dispatch Race Market ${fixtureId}`,
        marketType: "WC_CARRIER",
        productLane: "WC",
        isActive: true,
        isAppointed: true,
      })
      .returning({ id: marketsTable.id });
    cleanupMarkets.add(market.id);
    const [underwriter] = await db
      .insert(marketUnderwritersTable)
      .values({
        marketId: market.id,
        name: "Fixture Underwriter",
        email: `dispatch-${fixtureId}@example.test`,
      })
      .returning({ id: marketUnderwritersTable.id });
    const [dealMarket] = await db
      .insert(dealMarketsTable)
      .values({
        dealId: deal.id,
        marketId: market.id,
        marketType: "WC_CARRIER",
        assignedUnderwriterId: underwriter.id,
        generatedRate: "2500.00",
        rateBreakdownSnapshot: {
          totalPremium: 2500,
          routingPackageSnapshot: applicationSnapshot(),
        },
        rank: 1,
        isPrimary: true,
        isRouted: true,
        appetiteOutcome: "MATCHED",
        rankingState: "QUEUED",
        sendStatus: "PENDING",
      })
      .returning({ id: dealMarketsTable.id });
    const [batch] = await db
      .insert(dispatchBatchesTable)
      .values({
        dealId: deal.id,
        status: "QUEUED",
        applicationSnapshot: completedAnswers,
        applicationSnapshotHash: completedApplicationHash,
        routingInputSnapshot: applicationSnapshot().ratingInput,
      })
      .returning({ id: dispatchBatchesTable.id });
    const [item] = await db
      .insert(dispatchItemsTable)
      .values({ batchId: batch.id, dealMarketId: dealMarket.id, rank: 1, status: "PENDING" })
      .returning({ id: dispatchItemsTable.id });

    const originalFetch = globalThis.fetch;
    const originalApiKey = process.env.RESEND_API_KEY;
    let providerCalls = 0;
    let providerStarted!: () => void;
    let releaseProvider!: () => void;
    const providerStartedPromise = new Promise<void>((resolve) => {
      providerStarted = resolve;
    });
    const releaseProviderPromise = new Promise<void>((resolve) => {
      releaseProvider = resolve;
    });

    try {
      process.env.RESEND_API_KEY = "release-integration-test";
      globalThis.fetch = async () => {
        providerCalls += 1;
        providerStarted();
        await releaseProviderPromise;
        return new Response(JSON.stringify({ id: `provider-${fixtureId}` }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      };

      const firstWorker = processMarketDispatchBatch(batch.id, deal.id);
      await providerStartedPromise;
      const secondWorker = processMarketDispatchBatch(batch.id, deal.id);
      const cancelOutcome = await cancelMarketDispatch(deal.id, {
        actorName: "Release integration test",
        reason: "Prove a claimed batch cannot be cancelled",
      });
      assert.equal(cancelOutcome.ok, false);
      if (cancelOutcome.ok) assert.fail("cancel succeeded after provider I/O began");
      assert.equal(cancelOutcome.status, 409);

      releaseProvider();
      await Promise.all([firstWorker, secondWorker]);
    } finally {
      globalThis.fetch = originalFetch;
      if (originalApiKey === undefined) delete process.env.RESEND_API_KEY;
      else process.env.RESEND_API_KEY = originalApiKey;
    }

    assert.equal(providerCalls, 1);
    const attempts = await db
      .select({ attemptNumber: dispatchAttemptsTable.attemptNumber, outcome: dispatchAttemptsTable.outcome })
      .from(dispatchAttemptsTable)
      .where(eq(dispatchAttemptsTable.itemId, item.id));
    assert.deepEqual(attempts, [{ attemptNumber: 1, outcome: "SUCCESS" }]);
    const [itemAfter] = await db
      .select({ status: dispatchItemsTable.status })
      .from(dispatchItemsTable)
      .where(eq(dispatchItemsTable.id, item.id));
    assert.equal(itemAfter.status, "SENT");
    const outbound = await db
      .select({ id: dealOutboundEmailsTable.id })
      .from(dealOutboundEmailsTable)
      .where(eq(dealOutboundEmailsTable.dealMarketId, dealMarket.id));
    assert.equal(outbound.length, 1);

    await deleteFixtureDeal(deal.id);
    cleanupDeals.delete(deal.id);
  });

  it("never re-sends an uncertain stale lease and marks it DELIVERY_UNKNOWN", async () => {
    const [account] = await db
      .insert(accountsTable)
      .values({ businessName: `Stale Lease ${fixtureId}` })
      .returning({ id: accountsTable.id });
    cleanupAccounts.add(account.id);
    const [deal] = await db
      .insert(dealsTable)
      .values({
        referenceCode: `T-STALE-${fixtureId}`,
        accountId: account.id,
        businessName: `Stale Lease ${fixtureId}`,
        productType: "WC",
        vertical: "Cannabis",
        state: "CA",
        annualPayroll: "150000",
        employeeCountFt: 3,
        stage: "UW_REVIEW",
        submissionStatus: "submitted",
      })
      .returning({ id: dealsTable.id });
    cleanupDeals.add(deal.id);
    const [market] = await db
      .insert(marketsTable)
      .values({
        name: `Stale Lease Market ${fixtureId}`,
        marketType: "WC_CARRIER",
        productLane: "WC",
        isActive: true,
        isAppointed: true,
      })
      .returning({ id: marketsTable.id });
    cleanupMarkets.add(market.id);
    const [underwriter] = await db
      .insert(marketUnderwritersTable)
      .values({
        marketId: market.id,
        name: "Stale Lease Underwriter",
        email: `stale-${fixtureId}@example.test`,
      })
      .returning({ id: marketUnderwritersTable.id });
    const [dealMarket] = await db
      .insert(dealMarketsTable)
      .values({
        dealId: deal.id,
        marketId: market.id,
        marketType: "WC_CARRIER",
        assignedUnderwriterId: underwriter.id,
        generatedRate: "2500.00",
        rateBreakdownSnapshot: { routingPackageSnapshot: applicationSnapshot() },
        rank: 1,
        isPrimary: true,
        isRouted: true,
        appetiteOutcome: "MATCHED",
        rankingState: "QUEUED",
        sendStatus: "PENDING",
      })
      .returning({ id: dealMarketsTable.id });
    const [batch] = await db
      .insert(dispatchBatchesTable)
      .values({
        dealId: deal.id,
        status: "PROCESSING",
        workerClaimId: randomUUID(),
        workerClaimedAt: new Date(Date.now() - 11 * 60 * 1000),
        applicationSnapshot: completedAnswers,
        applicationSnapshotHash: completedApplicationHash,
        routingInputSnapshot: applicationSnapshot().ratingInput,
      })
      .returning({ id: dispatchBatchesTable.id });
    const [item] = await db
      .insert(dispatchItemsTable)
      .values({ batchId: batch.id, dealMarketId: dealMarket.id, rank: 1, status: "PENDING" })
      .returning({ id: dispatchItemsTable.id });
    const [attempt] = await db
      .insert(dispatchAttemptsTable)
      .values({
        itemId: item.id,
        attemptNumber: 1,
        idempotencyKey: `dm-${dealMarket.id}-attempt-1`,
        startedAt: new Date(Date.now() - 11 * 60 * 1000),
      })
      .returning({ id: dispatchAttemptsTable.id });

    const originalFetch = globalThis.fetch;
    const originalApiKey = process.env.RESEND_API_KEY;
    let providerCalls = 0;
    try {
      process.env.RESEND_API_KEY = "release-integration-test";
      globalThis.fetch = async () => {
        providerCalls += 1;
        return new Response(JSON.stringify({ id: `unexpected-${fixtureId}` }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      };
      await processMarketDispatchBatch(batch.id, deal.id);
    } finally {
      globalThis.fetch = originalFetch;
      if (originalApiKey === undefined) delete process.env.RESEND_API_KEY;
      else process.env.RESEND_API_KEY = originalApiKey;
    }

    assert.equal(providerCalls, 0);
    const [attemptAfter] = await db
      .select({
        outcome: dispatchAttemptsTable.outcome,
        errorDetail: dispatchAttemptsTable.errorDetail,
      })
      .from(dispatchAttemptsTable)
      .where(eq(dispatchAttemptsTable.id, attempt.id));
    assert.equal(attemptAfter.outcome, "DELIVERY_UNKNOWN");
    assert.match(attemptAfter.errorDetail ?? "", /lease expired/i);
    const [itemAfter] = await db
      .select({ status: dispatchItemsTable.status })
      .from(dispatchItemsTable)
      .where(eq(dispatchItemsTable.id, item.id));
    assert.equal(itemAfter.status, "DELIVERY_UNKNOWN");
    const [marketAfter] = await db
      .select({ sendStatus: dealMarketsTable.sendStatus })
      .from(dealMarketsTable)
      .where(eq(dealMarketsTable.id, dealMarket.id));
    assert.equal(marketAfter.sendStatus, "DELIVERY_UNKNOWN");
    const unknownActivities = await db
      .select({ id: activityLogTable.id })
      .from(activityLogTable)
      .where(
        and(
          eq(activityLogTable.dealId, deal.id),
          eq(activityLogTable.eventType, "market_dispatch_delivery_unknown"),
        ),
      );
    assert.equal(unknownActivities.length, 1);
    const attemptCount = await db
      .select({ id: dispatchAttemptsTable.id })
      .from(dispatchAttemptsTable)
      .where(eq(dispatchAttemptsTable.itemId, item.id));
    assert.equal(attemptCount.length, 1);

    await deleteFixtureDeal(deal.id);
    cleanupDeals.delete(deal.id);
  });

  it("uses only the Primary PEO market total when creating a proposal", async () => {
    const [account] = await db
      .insert(accountsTable)
      .values({ businessName: `PEO Proposal ${fixtureId}` })
      .returning({ id: accountsTable.id });
    cleanupAccounts.add(account.id);
    const [deal] = await db
      .insert(dealsTable)
      .values({
        referenceCode: `T-PEO-${fixtureId}`,
        accountId: account.id,
        businessName: `PEO Proposal ${fixtureId}`,
        productType: "PEO",
        vertical: "Cannabis",
        state: "CA",
        annualPayroll: "500000",
        employeeCountFt: 60,
        stage: "UW_REVIEW",
      })
      .returning({ id: dealsTable.id });
    cleanupDeals.add(deal.id);
    const [quote] = await db
      .insert(quotesTable)
      .values({
        dealId: deal.id,
        status: "SUBMITTED",
        isPeo: true,
        wcPremium: "999.00",
        monthlyWfsFee: "999.00",
        pepm: "999.00",
      })
      .returning({ id: quotesTable.id });
    const [primaryMarket, secondaryMarket] = await db
      .insert(marketsTable)
      .values([
        {
          name: `PEO Primary ${fixtureId}`,
          marketType: "PEO_PROGRAM",
          productLane: "PEO",
          isActive: true,
          isAppointed: true,
        },
        {
          name: `PEO Secondary ${fixtureId}`,
          marketType: "PEO_PROGRAM",
          productLane: "PEO",
          isActive: true,
          isAppointed: true,
        },
      ])
      .returning({ id: marketsTable.id });
    cleanupMarkets.add(primaryMarket.id);
    cleanupMarkets.add(secondaryMarket.id);
    await db.insert(dealMarketsTable).values([
      {
        dealId: deal.id,
        marketId: primaryMarket.id,
        marketType: "PEO_PROGRAM",
        generatedRate: "12345.67",
        rateBreakdownSnapshot: {
          wcAnnual: 4000,
          wfsAnnual: 7000,
          adminFee: 1345.67,
          effectivePepm: 85,
          totalAnnual: 12345.67,
        },
        rank: 1,
        isPrimary: true,
        isRouted: true,
        appetiteOutcome: "MATCHED",
      },
      {
        dealId: deal.id,
        marketId: secondaryMarket.id,
        marketType: "PEO_PROGRAM",
        generatedRate: "98765.43",
        rateBreakdownSnapshot: { wcAnnual: 1, effectivePepm: 1 },
        rank: 2,
        isPrimary: false,
        isRouted: true,
        appetiteOutcome: "MATCHED",
      },
    ]);

    const app = express();
    app.use(express.json());
    app.use("/", proposalsRouter);
    const response = await postJson(app, `/${deal.id}/create-from-quote`, {});
    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);

    const [proposal] = await db
      .select()
      .from(proposalsTable)
      .where(eq(proposalsTable.quoteId, quote.id));
    assert.ok(proposal);
    assert.equal(proposal.wcAnnualPremium, "4000.00");
    assert.equal(proposal.wfsAnnualTotal, "8345.67");
    assert.equal(proposal.totalAnnual, "12345.67");
    assert.equal(proposal.totalMonthly, "1028.81");
    assert.equal(proposal.wfsMonthlyPepm, "85.00");
    assert.equal(proposal.programName, "Kind PEO Program");
    assert.equal(Number(proposal.wcAnnualPremium) + Number(proposal.wfsAnnualTotal), Number(proposal.totalAnnual));
    assert.notEqual(proposal.totalAnnual, "98765.43");
    assert.notEqual(proposal.totalAnnual, "12987.00");

    await deleteFixtureDeal(deal.id);
    cleanupDeals.delete(deal.id);
  });

  it("returns an audited 422 for a rejected routed submission and allows a corrected retry", async () => {
    const fein = `98-${fixtureId.slice(0, 7)}`;
    const businessName = `Corrected Submission ${fixtureId}`;
    const routedPayload = {
      businessName,
      vertical: "Cannabis",
      coverageType: "WC",
      businessState: "CA",
      totalPayroll: 150000,
      totalEmployees: 3,
      experienceMod: 1,
      fein,
      entityType: "LLC",
      contactName: "Test Contact",
      contactEmail: `corrected-${fixtureId}@example.test`,
      contactPhone: "555-555-0100",
      cannabisApplicationAnswers: completedAnswers,
    };
    const app = express();
    app.use(express.json());
    app.use("/", submissionRouter);

    const rejected = await postJson(app, "/submit-for-approval", routedPayload);
    assert.equal(rejected.status, 422);
    assert.equal(rejected.body.marketRoutingRequired, true);
    const rejectedDealId = rejected.body.dealId;
    assert.equal(typeof rejectedDealId, "string");

    const [rejectedDeal] = await db
      .select({
        accountId: dealsTable.accountId,
        stage: dealsTable.stage,
        submissionStatus: dealsTable.submissionStatus,
      })
      .from(dealsTable)
      .where(eq(dealsTable.id, rejectedDealId as string));
    assert.equal(rejectedDeal.stage, "SUBMISSION_REVIEW");
    assert.equal(rejectedDeal.submissionStatus, "routing_failed");
    const [failedActivity] = await db
      .select({ id: activityLogTable.id })
      .from(activityLogTable)
      .where(
        and(
          eq(activityLogTable.dealId, rejectedDealId as string),
          eq(activityLogTable.eventType, "market_routing_failed"),
        ),
      );
    assert.ok(failedActivity);
    const [failedQuote, failedDocument, failedBatch] = await Promise.all([
      db.select({ id: quotesTable.id }).from(quotesTable).where(eq(quotesTable.dealId, rejectedDealId as string)),
      db.select({ id: dealDocumentsTable.id }).from(dealDocumentsTable).where(eq(dealDocumentsTable.dealId, rejectedDealId as string)),
      db.select({ id: dispatchBatchesTable.id }).from(dispatchBatchesTable).where(eq(dispatchBatchesTable.dealId, rejectedDealId as string)),
    ]);
    assert.equal(failedQuote.length, 0);
    assert.equal(failedDocument.length, 0);
    assert.equal(failedBatch.length, 0);

    const corrected = await postJson(app, "/submit-for-approval", {
      ...routedPayload,
      coverageType: "ASO",
      workforceProfile: { isASO: true },
    });
    assert.equal(corrected.status, 200);
    assert.equal(corrected.body.success, true);
    assert.notEqual(corrected.body.dealId, rejectedDealId);

    const relatedDeals = await db
      .select({
        id: dealsTable.id,
        accountId: dealsTable.accountId,
        submissionStatus: dealsTable.submissionStatus,
      })
      .from(dealsTable)
      .where(inArray(dealsTable.id, [rejectedDealId as string, corrected.body.dealId as string]));
    assert.equal(relatedDeals.length, 2);
    assert.equal(relatedDeals.every((deal) => deal.accountId === rejectedDeal.accountId), true);
    assert.equal(relatedDeals.filter((deal) => deal.submissionStatus === "routing_failed").length, 1);
    const duplicateActivities = await db
      .select({ id: activityLogTable.id })
      .from(activityLogTable)
      .where(
        and(
          eq(activityLogTable.dealId, rejectedDealId as string),
          eq(activityLogTable.eventType, "duplicate_submission_blocked"),
        ),
      );
    assert.equal(duplicateActivities.length, 0);

    await deleteFixtureDeal(rejectedDealId as string);
    await deleteFixtureDeal(corrected.body.dealId as string);
    cleanupDeals.delete(rejectedDealId as string);
    cleanupDeals.delete(corrected.body.dealId as string);
    cleanupAccounts.add(rejectedDeal.accountId);
  });
});