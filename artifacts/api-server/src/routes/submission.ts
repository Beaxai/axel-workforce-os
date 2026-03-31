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
  } = req.body;

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

  const docRecords = [
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

  await db.insert(dealDocumentsTable).values(docRecords);

  await db.insert(activityLogTable).values({
    dealId: deal.id,
    entityType: "deal",
    entityId: deal.id,
    eventType: "submission_submitted",
    description: `Application submitted for underwriting review. ${docRecords.length} documents generated.`,
    metadata: { document_count: docRecords.length, loss_history_included: lossHistoryCount > 0 },
  });

  res.json({
    success: true,
    dealId: deal.id,
    documentCount: docRecords.length,
    message: "Submission received. Documents generated and attached to deal.",
  });
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
