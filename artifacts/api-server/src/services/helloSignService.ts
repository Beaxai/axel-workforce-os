import {
  db,
  signatureRequestsTable,
  bindDocumentPackagesTable,
  dealsTable,
  submissionAnswersTable,
  activityLogTable,
} from "@workspace/db";
import { eq, and, ne } from "drizzle-orm";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import {
  signwellConfigured,
  signwellTestMode,
  createSignwellDocument,
  downloadCompletedPdf,
  type SignwellFile,
} from "./signwellService";
import { fillAcord130, fillAxelCannabisApplication, fillTreanSupp } from "./applicationPdfService";
import { dealSubjectivitiesTable } from "@workspace/db";
import { SUBJ_KEYS } from "../lib/subjectivities";

// Legacy naming note: this module (and the hellosign_* DB columns) predate the
// v2.7 ruling that SignWell replaces HelloSign platform-wide. The external-ID
// column now stores the SignWell document id; when no SIGNWELL_API_KEY is
// present we fall back to the original stub flow so keyless dev keeps working.

const AXEL_SIGNER_EMAIL = process.env.SIGNATURES_EMAIL || "signatures@axelins.com";

/** Generate the actual PDFs for the signable docs in the package. */
async function buildSignatureFiles(docsToSign: any[], answers: Record<string, any>): Promise<SignwellFile[]> {
  const files: SignwellFile[] = [];
  const seen = new Set<string>();
  for (const doc of docsToSign) {
    const type = doc.document_type as string;
    if (seen.has(type)) continue;
    seen.add(type);
    try {
      let bytes: Uint8Array | null = null;
      let name = "";
      if (type === "acord_130") {
        bytes = await fillAcord130(answers);
        name = "ACORD-130.pdf";
      } else if (type === "axel_supplemental") {
        bytes = await fillAxelCannabisApplication(answers);
        name = "Axel-Supplemental-Application.pdf";
      } else if (type === "carrier_supplemental") {
        bytes = await fillTreanSupp(answers);
        name = "Carrier-Supplemental.pdf";
      }
      // bind_order and other types have no generator yet — they stay listed in
      // the package but aren't attached to the e-sign envelope.
      if (bytes && bytes.length > 0) files.push({ name, base64: Buffer.from(bytes).toString("base64") });
    } catch (err) {
      console.error(`[signwell] failed to generate ${type} PDF:`, err instanceof Error ? err.message : err);
    }
  }
  return files;
}

export async function sendBindPackageForSignature(bindPackageId: string) {
  const [bindPkg] = await db
    .select()
    .from(bindDocumentPackagesTable)
    .where(eq(bindDocumentPackagesTable.id, bindPackageId))
    .limit(1);

  if (!bindPkg) throw new Error("Bind package not found: " + bindPackageId);

  const docs = bindPkg.documents as any[];
  if (!docs || docs.length === 0) throw new Error("Bind package has no documents.");

  const [submission] = await db
    .select()
    .from(submissionAnswersTable)
    .where(eq(submissionAnswersTable.dealId, bindPkg.dealId!))
    .limit(1);

  const answers = (submission?.answers as Record<string, any>) || {};

  const [deal] = await db
    .select()
    .from(dealsTable)
    .where(eq(dealsTable.id, bindPkg.dealId!))
    .limit(1);

  const clientName = answers.primary_contact_name || deal?.businessName || "Client";
  const clientEmail = answers.primary_contact_email || deal?.dealEmailAddress || "";

  if (!clientEmail) throw new Error("Client email not found in submission answers. Cannot send for signature.");

  const signatureDocTypes = ["axel_supplemental", "acord_130", "carrier_supplemental", "bind_order"];
  const docsToSign = docs.filter((d: any) => signatureDocTypes.includes(d.document_type));

  if (docsToSign.length === 0) throw new Error("No signable documents found in bind package.");

  const clientSigId = `sig_client_${crypto.randomUUID().slice(0, 8)}`;
  const axelSigId = `sig_axel_${crypto.randomUUID().slice(0, 8)}`;

  // Generate PDFs before taking any lock (pure computation, no state).
  let files: SignwellFile[] = [];
  if (signwellConfigured()) {
    files = await buildSignatureFiles(docsToSign, answers);
    if (files.length === 0) throw new Error("Could not generate any PDFs for the signable documents.");
  }

  const signersPayload = [
    {
      role: "Client",
      name: clientName,
      email: clientEmail,
      signature_id: clientSigId,
      status: "awaiting_signature",
      signed_at: null,
    },
    {
      role: "Axel Authorized Signer",
      name: "Axel Insurance Services",
      email: AXEL_SIGNER_EMAIL,
      signature_id: axelSigId,
      status: "awaiting_signature",
      signed_at: null,
    },
  ];

  // Single-envelope guard: everything below runs with a row lock on the bind
  // package, so concurrent send requests serialize; the second sender sees an
  // active request and aborts before creating a duplicate envelope/emails.
  // (The provider call inside the tx is a deliberate tradeoff — it is one
  // short API call and the lock is a single row.)
  return await db.transaction(async (tx) => {
    const [lockedPkg] = await tx
      .select()
      .from(bindDocumentPackagesTable)
      .where(eq(bindDocumentPackagesTable.id, bindPackageId))
      .for("update")
      .limit(1);
    if (!lockedPkg) throw new Error("Bind package not found: " + bindPackageId);

    if (lockedPkg.signatureRequestId) {
      const [existing] = await tx
        .select()
        .from(signatureRequestsTable)
        .where(eq(signatureRequestsTable.id, lockedPkg.signatureRequestId))
        .limit(1);
      if (existing && ["awaiting_signature", "partially_signed", "signed"].includes(existing.status)) {
        throw new Error(
          existing.status === "signed"
            ? "This bind package has already been fully signed."
            : "A signature request is already out for this bind package. Use resend to remind signers.",
        );
      }
      // declined/expired/canceled → fall through and allow a fresh envelope.
    }

    let externalId = `stub_${crypto.randomUUID()}`;
    let provider: "SignWell" | "stub" = "stub";
    if (signwellConfigured()) {
      const swDoc = await createSignwellDocument({
        name: `Bind package — ${deal?.businessName || clientName}`,
        files,
        recipients: [
          { id: clientSigId, name: clientName, email: clientEmail },
          { id: axelSigId, name: "Axel Insurance Services", email: AXEL_SIGNER_EMAIL },
        ],
        metadata: { dealId: String(bindPkg.dealId), bindPackageId, purpose: "bind_package" },
      });
      externalId = swDoc.id;
      provider = "SignWell";
    }

    const [sigRecord] = await tx
      .insert(signatureRequestsTable)
      .values({
        bindPackageId,
        dealId: bindPkg.dealId,
        proposalId: null,
        hellosignSignatureRequestId: externalId,
        hellosignFilesUrl: null,
        signers: signersPayload,
        status: "awaiting_signature",
      })
      .returning();

    await tx
      .update(bindDocumentPackagesTable)
      .set({
        status: "pending_signature",
        hellosignSignatureRequestId: externalId,
        signatureRequestId: sigRecord.id,
        updatedAt: new Date(),
      })
      .where(eq(bindDocumentPackagesTable.id, bindPackageId));

    await tx
      .update(dealsTable)
      .set({ bindStatus: "sent_for_signature" })
      .where(eq(dealsTable.id, bindPkg.dealId!));

    if (bindPkg.dealId) {
      await tx.insert(activityLogTable).values({
        dealId: bindPkg.dealId,
        entityType: "deal",
        entityId: bindPkg.dealId,
        eventType: "signature_request_sent",
        description: `Bind documents sent for signature (${provider === "stub" ? "STUB MODE — no SIGNWELL_API_KEY" : signwellTestMode() ? "SignWell TEST MODE" : "SignWell"}). Awaiting signatures from: ${signersPayload.map((s) => s.name).join(", ")}.`,
        metadata: {
          hellosign_signature_request_id: externalId,
          signature_request_id: sigRecord.id,
          signers: signersPayload.map((s) => ({ name: s.name, email: s.email, role: s.role })),
          test_mode: signwellTestMode(),
          provider,
        },
      });
    }

    return { signatureRequestId: sigRecord.id, helloSignId: externalId };
  });
}

export async function retrieveAndStoreSignedDocuments(helloSignRequestId: string) {
  const [sigRecord] = await db
    .select()
    .from(signatureRequestsTable)
    .where(eq(signatureRequestsTable.hellosignSignatureRequestId, helloSignRequestId))
    .limit(1);

  if (!sigRecord) throw new Error("Signature request not found for HS ID: " + helloSignRequestId);

  // Atomic finalization claim: exactly one caller wins the OPEN→signed
  // transition; duplicate webhook deliveries (or a concurrent legacy handler)
  // match zero rows and stop here, so bind side effects and activity logs run
  // once. This also makes `signed` terminal — nothing below can be re-entered.
  const claimed = await db
    .update(signatureRequestsTable)
    .set({ status: "signed", signedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(signatureRequestsTable.id, sigRecord.id), ne(signatureRequestsTable.status, "signed")))
    .returning({ id: signatureRequestsTable.id });
  if (claimed.length === 0) return;

  // Download the completed (signed) PDF into uploads/ (same local-storage
  // home as loss-history and policy documents; durable storage is Q7).
  // Only a stub id (keyless dev) skips the download — every real external id
  // is SignWell, since the HelloSign-era service never made network calls.
  // The storage path is only persisted when the file actually exists on disk
  // (or in stub mode, where the synthetic path is the documented dev fiction);
  // if the download fails the bind still completes — signing DID happen per
  // the provider — but the path stays null and an explicit warning is logged,
  // so the PDF can be re-pulled from SignWell later.
  const isStub = helloSignRequestId.startsWith("stub_");
  const candidatePath = `signed-documents/${sigRecord.dealId}/${helloSignRequestId}/signed_bind_package.pdf`;
  let storagePath: string | null = isStub ? candidatePath : null;
  let downloadError: string | null = null;
  if (!isStub && signwellConfigured()) {
    try {
      const pdf = await downloadCompletedPdf(helloSignRequestId);
      if (pdf) {
        const abs = path.join(process.cwd(), "uploads", candidatePath);
        fs.mkdirSync(path.dirname(abs), { recursive: true });
        fs.writeFileSync(abs, pdf);
        storagePath = candidatePath;
      } else {
        downloadError = "SignWell returned no completed PDF yet";
      }
    } catch (err) {
      downloadError = err instanceof Error ? err.message : String(err);
      console.error(`[signwell] completed PDF download failed for ${helloSignRequestId}:`, downloadError);
    }
  }

  // Checklist tie-in: the signed bind package covers the ACORD 130 and the
  // supplemental application, so those subjectivities are auto-satisfied.
  // Other items (TRIA, fraud, notices, waivers…) remain human-confirmed.
  if (sigRecord.dealId) {
    await db
      .update(dealSubjectivitiesTable)
      .set({ status: "SATISFIED", satisfiedAt: new Date(), updatedAt: new Date(), autoFlagReason: "Signed via SignWell (bind package completed)" })
      .where(
        and(
          eq(dealSubjectivitiesTable.dealId, sigRecord.dealId),
          eq(dealSubjectivitiesTable.status, "OPEN"),
          eq(dealSubjectivitiesTable.systemKey, SUBJ_KEYS.ACORD_130),
        ),
      );
    await db
      .update(dealSubjectivitiesTable)
      .set({ status: "SATISFIED", satisfiedAt: new Date(), updatedAt: new Date(), autoFlagReason: "Signed via SignWell (bind package completed)" })
      .where(
        and(
          eq(dealSubjectivitiesTable.dealId, sigRecord.dealId),
          eq(dealSubjectivitiesTable.status, "OPEN"),
          eq(dealSubjectivitiesTable.systemKey, SUBJ_KEYS.SUPPLEMENTAL_APP),
        ),
      );
  }

  if (storagePath) {
    await db
      .update(signatureRequestsTable)
      .set({ signedDocumentsPath: storagePath, updatedAt: new Date() })
      .where(eq(signatureRequestsTable.id, sigRecord.id));
  }

  await db
    .update(bindDocumentPackagesTable)
    .set({
      status: "signed",
      updatedAt: new Date(),
    })
    .where(eq(bindDocumentPackagesTable.id, sigRecord.bindPackageId!));

  await db
    .update(dealsTable)
    .set({
      bindStatus: "signed",
      boundAt: new Date(),
      signedDocumentsPath: storagePath,
      submissionStatus: "bound",
    })
    .where(eq(dealsTable.id, sigRecord.dealId!));

  const signedLogDealId = sigRecord.dealId;
  if (signedLogDealId) {
    await db.insert(activityLogTable).values({
      dealId: signedLogDealId,
      entityType: "deal",
      entityId: signedLogDealId,
      eventType: "bind_documents_signed",
      description: "All bind documents have been signed by all parties. Deal is bound.",
      metadata: {
        hellosign_signature_request_id: helloSignRequestId,
        signed_documents_path: storagePath,
        signature_request_id: sigRecord.id,
      },
    });

    if (downloadError) {
      await db.insert(activityLogTable).values({
        dealId: signedLogDealId,
        entityType: "deal",
        entityId: signedLogDealId,
        eventType: "signed_pdf_download_failed",
        description: `Deal bound, but the signed PDF could not be downloaded from SignWell yet (${downloadError}). It remains available in SignWell.`,
        metadata: { hellosign_signature_request_id: helloSignRequestId, error: downloadError },
      });
    }
  }
}
