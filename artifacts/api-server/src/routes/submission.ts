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
} from "@workspace/db";
import { eq, and, desc, asc } from "drizzle-orm";
import { cannabisApplicationAnswersSchema } from "@workspace/cannabis-application";
import { fillAcord130, fillTreanSupp, fillAxelCannabisApplication } from "../services/applicationPdfService";

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

  res.json({ questionSet, questions });
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

  res.json({
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
    lossHistoryCount,
    cannabisApplicationAnswers,
  } = req.body;

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

  const [deal] = await db
    .insert(dealsTable)
    .values({
      referenceCode,
      businessName: businessName || "Unnamed Business",
      vertical: vertical || "Cannabis",
      productType: coverageType || "Workers' Compensation",
      state: businessState || "",
      annualPayroll: String(totalPayroll || 0),
      employeeCountFt: totalEmployees || 0,
      stage: "SUBMISSION_REVIEW",
      submissionStatus: "submitted",
      verticalId: (vertical || "cannabis").toLowerCase(),
      fein: fein || null,
      entityType: entityType || null,
      statesOfOperation: statesOfOperation || [],
      emod: experienceMod ? String(experienceMod) : null,
      estimatedPremium: premiumHigh ? String(premiumHigh) : null,
    })
    .returning();

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

  await db.insert(activityLogTable).values({
    dealId: deal.id,
    entityType: "deal",
    entityId: deal.id,
    eventType: "submission_submitted",
    description: `Application submitted for underwriting review. ${docRecords.length} documents generated.`,
    metadata: {
      document_count: docRecords.length,
      loss_history_included: lossHistoryCount > 0,
      cannabis_application_persisted: !!parsedCannabisAnswers,
    },
  });

  res.json({
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
  res.json({
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
    res.send(Buffer.from(pdfBytes));
  } catch (err) {
    req.log.error({ err, dealId }, "fillAxelCannabisApplication failed");
    res.status(500).json({ error: "Failed to generate Axel Cannabis WC Application PDF" });
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
    res.send(Buffer.from(pdfBytes));
  } catch (err) {
    req.log.error({ err, dealId }, "fillAcord130 failed");
    res.status(500).json({ error: "Failed to generate ACORD 130 PDF" });
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
    res.send(Buffer.from(pdfBytes));
  } catch (err) {
    req.log.error({ err, dealId }, "fillTreanSupp failed");
    res.status(500).json({ error: "Failed to generate Trean Cannabis Supp PDF" });
  }
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
