import { Router, type IRouter } from "express";
import {
  db,
  submissionQuestionSetsTable,
  submissionQuestionsTable,
  submissionAnswersTable,
  bindDocumentPackagesTable,
  lossHistoryDocumentsTable,
  dealDocumentsTable,
  dealsTable,
  activityLogTable,
  quotesTable,
} from "@workspace/db";
import { eq, and, desc, asc } from "drizzle-orm";
import { cannabisApplicationAnswersSchema } from "@workspace/cannabis-application";
import { fillAcord130, fillTreanSupp, fillAxelCannabisApplication } from "../services/applicationPdfService";
import { buildIndicationSummaryPdf } from "../services/indicationPdfService";
import { findOrCreateAccount } from "../lib/accounts";

const router: IRouter = Router();

router.get("/question-set/:verticalId", async (req, res) => {
  const { verticalId } = req.params;

  const [questionSet] = await db
    .select()
    .from(submissionQuestionSetsTable)
    .where(
      and(
        eq(submissionQuestionSetsTable.verticalId, verticalId),
        eq(submissionQuestionSetsTable.isActive, true)
      )
    )
    .limit(1);

  if (!questionSet) {
    return res.status(404).json({ error: "Question set not found for vertical: " + verticalId });
  }

  const questions = await db
    .select()
    .from(submissionQuestionsTable)
    .where(eq(submissionQuestionsTable.questionSetId, questionSet.id))
    .orderBy(asc(submissionQuestionsTable.displayOrder));

  return res.json({ questionSet, questions });
});

router.get("/answers/:dealId", async (req, res) => {
  const { dealId } = req.params;

  const [row] = await db
    .select()
    .from(submissionAnswersTable)
    .where(eq(submissionAnswersTable.dealId, dealId))
    .orderBy(desc(submissionAnswersTable.createdAt))
    .limit(1);

  res.json({ answers: row || null });
});

router.post("/answers/:dealId", async (req, res) => {
  const { dealId } = req.params;
  const { answers, questionSetId, quoteId, status } = req.body;

  const [existing] = await db
    .select({ id: submissionAnswersTable.id })
    .from(submissionAnswersTable)
    .where(eq(submissionAnswersTable.dealId, dealId))
    .limit(1);

  let record;
  if (existing) {
    const [updated] = await db
      .update(submissionAnswersTable)
      .set({
        answers,
        status: status || "draft",
        updatedAt: new Date(),
        submittedAt: status === "submitted" ? new Date() : undefined,
      })
      .where(eq(submissionAnswersTable.id, existing.id))
      .returning();
    record = updated;
  } else {
    const [inserted] = await db
      .insert(submissionAnswersTable)
      .values({
        dealId,
        quoteId,
        questionSetId,
        answers,
        status: status || "draft",
      })
      .returning();
    record = inserted;
  }

  await db
    .update(dealsTable)
    .set({ submissionStatus: status || "in_progress" })
    .where(eq(dealsTable.id, dealId));

  await db.insert(activityLogTable).values({
    dealId,
    entityType: "submission",
    entityId: record.id,
    eventType: status === "submitted" ? "submission_completed" : "submission_updated",
    description:
      status === "submitted"
        ? "Submission application completed and submitted."
        : "Submission application saved as draft.",
    metadata: { question_set_id: questionSetId },
  });

  res.json({ success: true, record });
});

router.post("/request-bind/:dealId", async (req, res) => {
  const { dealId } = req.params;
  const { quoteId } = req.body;

  const [submission] = await db
    .select()
    .from(submissionAnswersTable)
    .where(eq(submissionAnswersTable.dealId, dealId))
    .limit(1);

  if (!submission) {
    return res.status(400).json({ error: "No completed submission found for this deal." });
  }

  if (submission.status !== "submitted") {
    return res.status(400).json({ error: "Submission must be completed before requesting bind." });
  }

  const lossHistory = await db
    .select({ id: lossHistoryDocumentsTable.id })
    .from(lossHistoryDocumentsTable)
    .where(eq(lossHistoryDocumentsTable.dealId, dealId));

  const hasLossHistory = lossHistory.length > 0;

  const [bindPackage] = await db
    .insert(bindDocumentPackagesTable)
    .values({
      dealId,
      quoteId,
      status: "generating",
      lossHistoryIncluded: hasLossHistory,
    })
    .returning();

  await db
    .update(dealsTable)
    .set({ submissionStatus: "bind_requested" })
    .where(eq(dealsTable.id, dealId));

  await db
    .update(submissionAnswersTable)
    .set({ status: "bind_requested" })
    .where(eq(submissionAnswersTable.id, submission.id));

  await db.insert(activityLogTable).values({
    dealId,
    entityType: "bind_package",
    entityId: bindPackage.id,
    eventType: "bind_requested",
    description: "Bind requested. Document package generation initiated.",
    metadata: { bind_package_id: bindPackage.id, loss_history_included: hasLossHistory },
  });

  return res.json({
    success: true,
    bindPackageId: bindPackage.id,
    message: "Bind request received. Document package is being generated.",
  });
});

router.post("/submit-for-approval", async (req, res) => {
  const {
    businessName, vertical, coverageType, businessState,
    totalPayroll, totalEmployees, experienceMod,
    premiumLow, premiumHigh, statesOfOperation,
    fein, entityType, contactName, contactEmail, contactPhone,
    coverageEffectiveDate,
    lossHistoryCount,
    cannabisApplicationAnswers,
    wcRatingBreakdown, workforceProfile,
  } = req.body;

  // Accept only a real YYYY-MM-DD calendar date; otherwise persist null.
  // Regex alone would let impossible dates (e.g. 2026-99-99) reach the DB, so we
  // round-trip through Date to confirm the day actually exists.
  const normalizedEffectiveDate = (() => {
    if (typeof coverageEffectiveDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(coverageEffectiveDate)) {
      return null;
    }
    const parsed = new Date(`${coverageEffectiveDate}T00:00:00Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === coverageEffectiveDate
      ? coverageEffectiveDate
      : null;
  })();

  // Validate cannabis application answers if supplied. The schema is permissive
  // (every field has a default) so partial drafts pass; we only reject malformed
  // shapes (e.g. wrong types).
  let parsedCannabisAnswers: ReturnType<typeof cannabisApplicationAnswersSchema.parse> | null = null;
  if (cannabisApplicationAnswers) {
    const parseResult = cannabisApplicationAnswersSchema.safeParse(cannabisApplicationAnswers);
    if (!parseResult.success) {
      return res.status(400).json({
        error: "Invalid cannabisApplicationAnswers",
        issues: parseResult.error.issues,
      });
    }
    parsedCannabisAnswers = parseResult.data;
  }

  const referenceCode = `DL-${Date.now().toString(36).toUpperCase()}`;

  // Every deal must belong to an account. Create one (or reuse a matching one)
  // from the submission payload before inserting the deal.
  const { account, created: accountCreated } = await findOrCreateAccount({
    businessName,
    fein,
    state: businessState,
    vertical,
    entityType,
    productType: coverageType,
    annualPayroll: totalPayroll,
    headcount: totalEmployees,
    emod: experienceMod,
    locations: workforceProfile?.locations ?? null,
    primaryContact: contactName,
    contactEmail,
    contactPhone,
  });

  const [deal] = await db
    .insert(dealsTable)
    .values({
      referenceCode,
      accountId: account.id,
      businessName: businessName || "Unnamed Business",
      vertical: vertical || "Cannabis",
      productType: coverageType || null,
      state: businessState || "",
      annualPayroll: String(totalPayroll || 0),
      employeeCountFt: totalEmployees || 0,
      stage: "SUBMISSION_REVIEW",
      submissionStatus: "submitted",
      verticalId: (vertical || "cannabis").toLowerCase(),
      fein: fein || null,
      entityType: entityType || null,
      statesOfOperation: statesOfOperation || [],
      coverageEffectiveDate: normalizedEffectiveDate,
      emod: experienceMod ? String(experienceMod) : null,
      estimatedPremium: premiumHigh ? String(premiumHigh) : null,
    })
    .returning();

  if (wcRatingBreakdown && workforceProfile) {
    const finalPremium = Number(wcRatingBreakdown.finalPremium ?? 0);
    await db.insert(quotesTable).values({
      dealId: deal.id,
      status: "SUBMITTED",
      state: businessState || workforceProfile.locations?.[0]?.state || null,
      annualPayroll: totalPayroll != null ? String(totalPayroll) : null,
      headcount: totalEmployees ?? null,
      eMod: experienceMod ? String(experienceMod) : "1.0",
      scheduleRating: workforceProfile.scheduleRating != null ? String(workforceProfile.scheduleRating) : "1.0",
      isPeo: !!workforceProfile.isPEO,
      wcPremium: String(finalPremium),
      wcFinalPremium: String(finalPremium),
      wcIndicationMin: premiumLow != null ? String(premiumLow) : null,
      wcIndicationMax: premiumHigh != null ? String(premiumHigh) : null,
      wcRatingBreakdown,
      workforceProfile,
      ratedAt: new Date(),
    });
  }

  const docRecords: Array<{
    dealId: string;
    name: string;
    documentType: string;
    metadata: Record<string, unknown>;
  }> = [
    {
      dealId: deal.id,
      name: `${businessName || "Business"} — WC Application Summary`,
      documentType: "application_summary",
      metadata: {
        vertical, coverageType, businessState,
        totalPayroll, totalEmployees, experienceMod,
        premiumLow, premiumHigh, statesOfOperation,
        fein, entityType, contactName, contactEmail, contactPhone,
        coverageEffectiveDate: normalizedEffectiveDate,
        generatedBy: "system",
      },
    },
    {
      dealId: deal.id,
      name: `Rate Indication — $${(premiumLow || 0).toLocaleString()} to $${(premiumHigh || 0).toLocaleString()}`,
      documentType: "rate_indication",
      metadata: {
        premiumLow, premiumHigh, experienceMod,
        totalPayroll, totalEmployees,
        generatedBy: "system",
        downloadPath: `/api/submission/applications/${deal.id}/indication-summary.pdf`,
      },
    },
    {
      dealId: deal.id,
      name: "Coverage Verification Summary",
      documentType: "coverage_verification",
      metadata: {
        coverageType, statesOfOperation, businessState,
        generatedBy: "system",
      },
    },
  ];

  if (lossHistoryCount > 0) {
    docRecords.push({
      dealId: deal.id,
      name: `Loss History Bundle (${lossHistoryCount} document${lossHistoryCount > 1 ? "s" : ""})`,
      documentType: "loss_history_bundle",
      metadata: {
        documentCount: lossHistoryCount,
        generatedBy: "system",
      },
    });
  }

  // If we received canonical cannabis WC application answers, persist them
  // (stateless: only JSON; PDFs are streamed on-demand from /applications/:dealId/*.pdf)
  // and register two extra deal_documents rows pointing at those endpoints.
  if (parsedCannabisAnswers) {
    await db.insert(submissionAnswersTable).values({
      dealId: deal.id,
      answers: parsedCannabisAnswers,
      status: "submitted",
      submittedAt: new Date(),
    });

    docRecords.push(
      {
        dealId: deal.id,
        name: "Axel Cannabis WC Application 2026",
        documentType: "axel_cannabis_application",
        metadata: {
          generatedBy: "system",
          downloadPath: `/api/submission/applications/${deal.id}/axel-cannabis-application.pdf`,
        },
      },
      {
        dealId: deal.id,
        name: "ACORD 130 — Workers' Compensation Application",
        documentType: "acord_130",
        metadata: {
          generatedBy: "system",
          downloadPath: `/api/submission/applications/${deal.id}/acord-130.pdf`,
        },
      },
      {
        dealId: deal.id,
        name: "Trean Cannabis Supplemental Application",
        documentType: "trean_cannabis_supp",
        metadata: {
          generatedBy: "system",
          downloadPath: `/api/submission/applications/${deal.id}/trean-supp.pdf`,
        },
      },
    );
  }

  await db.insert(dealDocumentsTable).values(docRecords);

  const actorUser = req.user;
  const actorName = actorUser
    ? [actorUser.firstName, actorUser.lastName].filter(Boolean).join(" ") || actorUser.email
    : null;
  await db.insert(activityLogTable).values({
    dealId: deal.id,
    entityType: "deal",
    entityId: deal.id,
    eventType: "submission_submitted",
    description: `Application submitted for underwriting review. ${docRecords.length} documents generated.`,
    metadata: {
      author: actorName ?? undefined,
      role: actorUser?.role ?? undefined,
      document_count: docRecords.length,
      loss_history_included: lossHistoryCount > 0,
      cannabis_application_persisted: !!parsedCannabisAnswers,
      summary: {
        businessName: businessName || null,
        vertical: vertical || null,
        state: businessState || null,
        employees: totalEmployees ?? null,
        annualPayroll: totalPayroll ?? null,
      },
    },
    createdBy: actorUser?.id,
  });

  await db.insert(activityLogTable).values({
    entityType: "account",
    entityId: account.id,
    eventType: accountCreated ? "account_created" : "deal_linked",
    description: accountCreated
      ? `Account created from submission "${businessName || "Unnamed Business"}".`
      : `New submission "${businessName || "Unnamed Business"}" linked to this account.`,
    metadata: { deal_id: deal.id, reference_code: referenceCode },
  });

  return res.json({
    success: true,
    dealId: deal.id,
    documentCount: docRecords.length,
    cannabisApplicationPersisted: !!parsedCannabisAnswers,
    message: "Submission received. Documents generated and attached to deal.",
  });
});

/** Return the canonical cannabis application answers + PDF download links for a deal. */
router.get("/applications/:dealId", async (req, res) => {
  const { dealId } = req.params;
  const [row] = await db
    .select()
    .from(submissionAnswersTable)
    .where(eq(submissionAnswersTable.dealId, dealId))
    .orderBy(desc(submissionAnswersTable.createdAt))
    .limit(1);
  if (!row) return res.status(404).json({ error: "No submission answers found for deal" });
  const parsed = cannabisApplicationAnswersSchema.safeParse(row.answers ?? {});
  return res.json({
    dealId,
    submissionId: row.id,
    answers: parsed.success ? parsed.data : row.answers,
    status: row.status,
    submittedAt: row.submittedAt,
    pdfs: [
      { documentType: "axel_cannabis_application", label: "Axel Cannabis WC Application 2026", path: `/api/submission/applications/${dealId}/axel-cannabis-application.pdf` },
      { documentType: "acord_130", label: "ACORD 130", path: `/api/submission/applications/${dealId}/acord-130.pdf` },
      { documentType: "trean_cannabis_supp", label: "Trean Cannabis Supp", path: `/api/submission/applications/${dealId}/trean-supp.pdf` },
    ],
  });
});

router.get("/applications/:dealId/axel-cannabis-application.pdf", async (req, res) => {
  const { dealId } = req.params;
  const [row] = await db
    .select()
    .from(submissionAnswersTable)
    .where(eq(submissionAnswersTable.dealId, dealId))
    .orderBy(desc(submissionAnswersTable.createdAt))
    .limit(1);
  if (!row) return res.status(404).json({ error: "No submission answers found for deal" });
  try {
    const pdfBytes = await fillAxelCannabisApplication(row.answers ?? {});
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="axel-cannabis-application-${dealId}.pdf"`);
    return res.send(Buffer.from(pdfBytes));
  } catch (err) {
    req.log.error({ err, dealId }, "fillAxelCannabisApplication failed");
    return res.status(500).json({ error: "Failed to generate Axel Cannabis WC Application PDF" });
  }
});

router.get("/applications/:dealId/acord-130.pdf", async (req, res) => {
  const { dealId } = req.params;
  const [row] = await db
    .select()
    .from(submissionAnswersTable)
    .where(eq(submissionAnswersTable.dealId, dealId))
    .orderBy(desc(submissionAnswersTable.createdAt))
    .limit(1);
  if (!row) return res.status(404).json({ error: "No submission answers found for deal" });
  try {
    const pdfBytes = await fillAcord130(row.answers ?? {});
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="acord-130-${dealId}.pdf"`);
    return res.send(Buffer.from(pdfBytes));
  } catch (err) {
    req.log.error({ err, dealId }, "fillAcord130 failed");
    return res.status(500).json({ error: "Failed to generate ACORD 130 PDF" });
  }
});

router.get("/applications/:dealId/trean-supp.pdf", async (req, res) => {
  const { dealId } = req.params;
  const [row] = await db
    .select()
    .from(submissionAnswersTable)
    .where(eq(submissionAnswersTable.dealId, dealId))
    .orderBy(desc(submissionAnswersTable.createdAt))
    .limit(1);
  if (!row) return res.status(404).json({ error: "No submission answers found for deal" });
  try {
    const pdfBytes = await fillTreanSupp(row.answers ?? {});
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="trean-cannabis-supp-${dealId}.pdf"`);
    return res.send(Buffer.from(pdfBytes));
  } catch (err) {
    req.log.error({ err, dealId }, "fillTreanSupp failed");
    return res.status(500).json({ error: "Failed to generate Trean Cannabis Supp PDF" });
  }
});

/**
 * Indication Summary PDF — drawn on demand from the deal row + latest quote
 * snapshot so it always reflects the current indication (including re-rates).
 */
router.get("/applications/:dealId/indication-summary.pdf", async (req, res) => {
  const { dealId } = req.params;
  const [deal] = await db.select().from(dealsTable).where(eq(dealsTable.id, dealId));
  if (!deal) return res.status(404).json({ error: "Deal not found" });

  const [quote] = await db
    .select()
    .from(quotesTable)
    .where(eq(quotesTable.dealId, dealId))
    .orderBy(desc(quotesTable.createdAt))
    .limit(1);

  if (!quote || (quote.wcIndicationMin == null && quote.wcIndicationMax == null)) {
    return res.status(404).json({ error: "No rate indication exists for this deal yet." });
  }

  try {
    const pdfBytes = await buildIndicationSummaryPdf({
      businessName: deal.businessName ?? "Unnamed Business",
      referenceCode: deal.referenceCode,
      state: deal.state,
      fein: deal.fein,
      entityType: deal.entityType,
      vertical: deal.vertical,
      productType: deal.productType,
      coverageEffectiveDate: deal.coverageEffectiveDate ? String(deal.coverageEffectiveDate) : null,
      premiumLow: quote.wcIndicationMin != null ? Number(quote.wcIndicationMin) : null,
      premiumHigh: quote.wcIndicationMax != null ? Number(quote.wcIndicationMax) : null,
      eMod: quote.eMod != null ? Number(quote.eMod) : null,
      scheduleRating: quote.scheduleRating != null ? Number(quote.scheduleRating) : null,
      isPeo: !!quote.isPeo,
      annualPayroll: quote.annualPayroll != null ? Number(quote.annualPayroll) : null,
      headcount: quote.headcount ?? null,
      ratedAt: quote.ratedAt ? String(quote.ratedAt) : null,
      breakdown: (quote.wcRatingBreakdown as never) ?? null,
    });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="indication-summary-${dealId}.pdf"`);
    return res.send(Buffer.from(pdfBytes));
  } catch (err) {
    req.log.error({ err, dealId }, "buildIndicationSummaryPdf failed");
    return res.status(500).json({ error: "Failed to generate Indication Summary PDF" });
  }
});

// Rename a generated deal document (Documents tab inline rename).
router.patch("/deal-documents/doc/:docId", async (req, res) => {
  const name = String(req.body?.name || "").trim().slice(0, 200);
  if (!name) return res.status(400).json({ error: "A non-empty name is required." });
  const [doc] = await db
    .update(dealDocumentsTable)
    .set({ name })
    .where(eq(dealDocumentsTable.id, req.params.docId))
    .returning();
  if (!doc) return res.status(404).json({ error: "Document not found." });
  return res.json({ success: true, document: doc });
});

router.get("/deal-documents/:dealId", async (req, res) => {
  const { dealId } = req.params;
  const docs = await db
    .select()
    .from(dealDocumentsTable)
    .where(eq(dealDocumentsTable.dealId, dealId))
    .orderBy(desc(dealDocumentsTable.generatedAt));
  res.json({ documents: docs });
});

export default router;
