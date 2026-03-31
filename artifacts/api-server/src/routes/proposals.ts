import { Router, type IRouter } from "express";
import {
  db,
  proposalsTable,
  underwritingPackagesTable,
  dealsTable,
  quotesTable,
  activityLogTable,
  submissionAnswersTable,
  lossHistoryDocumentsTable,
  dealDocumentsTable,
} from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

router.post("/", async (req, res) => {
  try {
    const {
      deal_id, quote_id, wc_annual_premium, wc_monthly_premium,
      wfs_monthly_pepm, wfs_annual_total, total_monthly, total_annual,
      emod, schedule_rating, rating_breakdown, effective_date,
      expiration_date, carrier_name, program_name, vertical_id,
    } = req.body;

    if (!deal_id) {
      return res.status(400).json({ error: "deal_id is required" });
    }

    const [proposal] = await db.insert(proposalsTable).values({
      dealId: deal_id,
      quoteId: quote_id || null,
      status: "draft",
      wcAnnualPremium: wc_annual_premium?.toString() || null,
      wcMonthlyPremium: wc_monthly_premium?.toString() || null,
      wfsMonthlyPepm: wfs_monthly_pepm?.toString() || null,
      wfsAnnualTotal: wfs_annual_total?.toString() || null,
      totalMonthly: total_monthly?.toString() || null,
      totalAnnual: total_annual?.toString() || null,
      emod: emod?.toString() || null,
      scheduleRating: schedule_rating?.toString() || null,
      ratingBreakdown: rating_breakdown || null,
      effectiveDate: effective_date || null,
      expirationDate: expiration_date || null,
      carrierName: carrier_name || null,
      programName: program_name || null,
      verticalId: vertical_id || null,
    }).returning();

    await db.update(dealsTable)
      .set({ proposalStatus: "draft" })
      .where(eq(dealsTable.id, deal_id));

    await db.insert(activityLogTable).values({
      dealId: deal_id,
      entityType: "proposal",
      entityId: proposal.id,
      eventType: "proposal_created",
      description: `Proposal created. WC Annual Premium: $${Number(wc_annual_premium || 0).toLocaleString()}.`,
      metadata: { proposal_id: proposal.id },
    });

    res.json({ success: true, proposal });
  } catch (err: any) {
    console.error("Create proposal error:", err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/:dealId", async (req, res) => {
  try {
    const [proposal] = await db
      .select()
      .from(proposalsTable)
      .where(eq(proposalsTable.dealId, req.params.dealId))
      .orderBy(desc(proposalsTable.createdAt))
      .limit(1);

    res.json({ proposal: proposal || null });
  } catch (err: any) {
    console.error("Get proposal error:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/:proposalId/request-approved-proposal", async (req, res) => {
  try {
    const { proposalId } = req.params;

    const [proposal] = await db
      .select()
      .from(proposalsTable)
      .where(eq(proposalsTable.id, proposalId))
      .limit(1);

    if (!proposal) {
      return res.status(404).json({ error: "Proposal not found." });
    }

    if (proposal.status === "underwriting_notified" || proposal.status === "approved_proposal_requested") {
      return res.status(400).json({ error: "Underwriting submission has already been requested for this proposal." });
    }

    const triggerType = "staff_manual";

    const [uwPackage] = await db.insert(underwritingPackagesTable).values({
      dealId: proposal.dealId!,
      proposalId: proposalId,
      triggerType,
      status: "pending",
    }).returning();

    await db.update(proposalsTable)
      .set({ status: "approved_proposal_requested", updatedAt: new Date() })
      .where(eq(proposalsTable.id, proposalId));

    await db.update(dealsTable)
      .set({ proposalStatus: "approved_proposal_requested" })
      .where(eq(dealsTable.id, proposal.dealId!));

    await db.insert(activityLogTable).values({
      dealId: proposal.dealId!,
      entityType: "proposal",
      entityId: proposalId,
      eventType: "approved_proposal_requested",
      description: `Approved proposal requested. Underwriting package assembly initiated.`,
      metadata: { proposal_id: proposalId, trigger_type: triggerType, uw_package_id: uwPackage.id },
    });

    assembleAndSendUwPackage(uwPackage.id, proposal.dealId!, proposalId).catch(err =>
      console.error("UW package assembly failed:", err)
    );

    res.json({
      success: true,
      uwPackageId: uwPackage.id,
      message: "Request received. Underwriting team will be notified shortly.",
    });
  } catch (err: any) {
    console.error("Request approved proposal error:", err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/:proposalId/uw-package-status", async (req, res) => {
  try {
    const [pkg] = await db
      .select()
      .from(underwritingPackagesTable)
      .where(eq(underwritingPackagesTable.proposalId, req.params.proposalId))
      .orderBy(desc(underwritingPackagesTable.createdAt))
      .limit(1);

    res.json({ package: pkg || null });
  } catch (err: any) {
    console.error("Get UW package status error:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/:dealId/create-from-quote", async (req, res) => {
  try {
    const { dealId } = req.params;

    const [deal] = await db
      .select()
      .from(dealsTable)
      .where(eq(dealsTable.id, dealId))
      .limit(1);

    if (!deal) return res.status(404).json({ error: "Deal not found" });

    const [quote] = await db
      .select()
      .from(quotesTable)
      .where(eq(quotesTable.dealId, dealId))
      .orderBy(desc(quotesTable.createdAt))
      .limit(1);

    if (!quote) return res.status(404).json({ error: "No quote found for this deal" });

    const wcBreakdown = (quote.wcRatingBreakdown as any)?.data || quote.wcRatingBreakdown;
    const wfsBreakdown = (quote.wfsRatingBreakdown as any)?.data || quote.wfsRatingBreakdown;

    const wcPremium = wcBreakdown?.result?.wcPremium ?? wcBreakdown?.calculation?.finalPremium ?? (Number(quote.wcPremium) || 0);
    const wcMonthlyPremium = wcPremium / 12;
    const wfsMonthlyFee = wfsBreakdown?.result?.monthlyWFSFee ?? wfsBreakdown?.calculation?.monthlyWFSFee ?? (Number(quote.monthlyWfsFee) || 0);
    const wfsAnnualTotal = wfsBreakdown?.calculation?.annualWFSFee ?? (wfsMonthlyFee * 12);
    const pepm = wfsBreakdown?.result?.pepm ?? wfsBreakdown?.calculation?.pepm ?? (Number(quote.pepm) || 0);
    const totalMonthly = wcMonthlyPremium + wfsMonthlyFee;
    const totalAnnual = wcPremium + wfsAnnualTotal;

    const effectiveDate = new Date();
    const expirationDate = new Date();
    expirationDate.setFullYear(expirationDate.getFullYear() + 1);

    const [proposal] = await db.insert(proposalsTable).values({
      dealId,
      quoteId: quote.id,
      status: "draft",
      wcAnnualPremium: wcPremium.toFixed(2),
      wcMonthlyPremium: wcMonthlyPremium.toFixed(2),
      wfsMonthlyPepm: pepm.toFixed(2),
      wfsAnnualTotal: wfsAnnualTotal.toFixed(2),
      totalMonthly: totalMonthly.toFixed(2),
      totalAnnual: totalAnnual.toFixed(2),
      emod: (Number(quote.eMod) || 1).toFixed(3),
      scheduleRating: (Number(quote.scheduleRating) || 1).toFixed(2),
      ratingBreakdown: { wc: wcBreakdown, wfs: wfsBreakdown },
      effectiveDate: effectiveDate.toISOString().split("T")[0],
      expirationDate: expirationDate.toISOString().split("T")[0],
      carrierName: "Axel Insurance Services",
      programName: quote.isPeo ? "Kind PEO Program" : "Workers' Compensation",
      verticalId: deal.verticalId || deal.vertical || "cannabis",
    }).returning();

    await db.update(dealsTable)
      .set({ proposalStatus: "draft" })
      .where(eq(dealsTable.id, dealId));

    await db.insert(activityLogTable).values({
      dealId,
      entityType: "proposal",
      entityId: proposal.id,
      eventType: "proposal_created",
      description: `Proposal auto-generated from quote. WC Annual Premium: $${wcPremium.toLocaleString()}.`,
      metadata: { proposal_id: proposal.id, quote_id: quote.id },
    });

    res.json({ success: true, proposal });
  } catch (err: any) {
    console.error("Create proposal from quote error:", err);
    res.status(500).json({ error: err.message });
  }
});

async function assembleAndSendUwPackage(packageId: string, dealId: string, proposalId: string) {
  try {
    await db.update(underwritingPackagesTable)
      .set({ status: "assembling" })
      .where(eq(underwritingPackagesTable.id, packageId));

    const docs: Array<{ type: string; label: string; path?: string }> = [];

    const [proposal] = await db
      .select()
      .from(proposalsTable)
      .where(eq(proposalsTable.id, proposalId))
      .limit(1);

    if (proposal) {
      docs.push({ type: "proposal", label: "Proposal Summary" });
    }

    const [submissionAnswers] = await db
      .select()
      .from(submissionAnswersTable)
      .where(eq(submissionAnswersTable.dealId, dealId))
      .orderBy(desc(submissionAnswersTable.createdAt))
      .limit(1);

    if (submissionAnswers) {
      docs.push({ type: "submission_answers", label: "Application Answers" });
    }

    const lossHistoryDocs = await db
      .select()
      .from(lossHistoryDocumentsTable)
      .where(eq(lossHistoryDocumentsTable.dealId, dealId));

    lossHistoryDocs.forEach(d => {
      docs.push({ type: "loss_history", label: `Loss Run: ${d.yearsCovered || d.fileName}`, path: d.storagePath });
    });

    const dealDocs = await db
      .select()
      .from(dealDocumentsTable)
      .where(eq(dealDocumentsTable.dealId, dealId));

    dealDocs.forEach(d => {
      docs.push({ type: d.documentType, label: d.name });
    });

    await db.update(underwritingPackagesTable)
      .set({
        status: "sent",
        documents: docs,
        emailSentTo: ["underwriting@axelworkforce.com"],
        emailSentAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(underwritingPackagesTable.id, packageId));

    await db.update(proposalsTable)
      .set({
        status: "underwriting_notified",
        uwNotifiedAt: new Date(),
        uwNotificationTrigger: "staff_manual",
        updatedAt: new Date(),
      })
      .where(eq(proposalsTable.id, proposalId));

    await db.update(dealsTable)
      .set({ proposalStatus: "underwriting_notified" })
      .where(eq(dealsTable.id, dealId));

    await db.insert(activityLogTable).values({
      dealId,
      entityType: "proposal",
      entityId: packageId,
      eventType: "uw_package_sent",
      description: `Underwriting submission package assembled. ${docs.length} documents included.`,
      metadata: { package_id: packageId, proposal_id: proposalId, document_count: docs.length },
    });
  } catch (err) {
    console.error("assembleAndSendUwPackage error:", err);

    await db.update(underwritingPackagesTable)
      .set({ status: "failed", updatedAt: new Date() })
      .where(eq(underwritingPackagesTable.id, packageId));

    await db.insert(activityLogTable).values({
      dealId,
      entityType: "proposal",
      entityId: packageId,
      eventType: "uw_package_failed",
      description: `Underwriting package assembly failed: ${(err as Error).message}`,
      metadata: { package_id: packageId },
    });
  }
}

export default router;
