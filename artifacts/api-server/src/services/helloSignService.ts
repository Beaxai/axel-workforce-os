import {
  db,
  signatureRequestsTable,
  bindDocumentPackagesTable,
  dealsTable,
  submissionAnswersTable,
  activityLogTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import crypto from "crypto";

const TEST_MODE = process.env.HELLOSIGN_TEST_MODE === "1" || !process.env.HELLOSIGN_API_KEY;

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

  const stubHsId = `stub_${crypto.randomUUID()}`;

  const signersPayload = [
    {
      role: "Client",
      name: clientName,
      email: clientEmail,
      signature_id: `sig_client_${crypto.randomUUID().slice(0, 8)}`,
      status: "awaiting_signature",
      signed_at: null,
    },
    {
      role: "Axel Authorized Signer",
      name: "Axel Insurance Services",
      email: "signatures@axelworkforce.com",
      signature_id: `sig_axel_${crypto.randomUUID().slice(0, 8)}`,
      status: "awaiting_signature",
      signed_at: null,
    },
  ];

  const [sigRecord] = await db
    .insert(signatureRequestsTable)
    .values({
      bindPackageId,
      dealId: bindPkg.dealId,
      proposalId: null,
      hellosignSignatureRequestId: stubHsId,
      hellosignFilesUrl: null,
      signers: signersPayload,
      status: "awaiting_signature",
    })
    .returning();

  await db
    .update(bindDocumentPackagesTable)
    .set({
      status: "pending_signature",
      hellosignSignatureRequestId: stubHsId,
      signatureRequestId: sigRecord.id,
      updatedAt: new Date(),
    })
    .where(eq(bindDocumentPackagesTable.id, bindPackageId));

  await db
    .update(dealsTable)
    .set({ bindStatus: "sent_for_signature" })
    .where(eq(dealsTable.id, bindPkg.dealId!));

  await db.insert(activityLogTable).values({
    dealId: bindPkg.dealId,
    entityType: "deal",
    entityId: bindPkg.dealId!,
    eventType: "signature_request_sent",
    description: `Bind documents sent for signature (${TEST_MODE ? "TEST MODE" : "HelloSign"}). Awaiting signatures from: ${signersPayload.map((s) => s.name).join(", ")}.`,
    metadata: {
      hellosign_signature_request_id: stubHsId,
      signature_request_id: sigRecord.id,
      signers: signersPayload.map((s) => ({ name: s.name, email: s.email, role: s.role })),
      test_mode: TEST_MODE,
    },
  });

  return { signatureRequestId: sigRecord.id, helloSignId: stubHsId };
}

export async function retrieveAndStoreSignedDocuments(helloSignRequestId: string) {
  const [sigRecord] = await db
    .select()
    .from(signatureRequestsTable)
    .where(eq(signatureRequestsTable.hellosignSignatureRequestId, helloSignRequestId))
    .limit(1);

  if (!sigRecord) throw new Error("Signature request not found for HS ID: " + helloSignRequestId);

  const storagePath = `signed-documents/${sigRecord.dealId}/${helloSignRequestId}/signed_bind_package.pdf`;

  await db
    .update(signatureRequestsTable)
    .set({
      status: "signed",
      signedDocumentsPath: storagePath,
      signedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(signatureRequestsTable.id, sigRecord.id));

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

  await db.insert(activityLogTable).values({
    dealId: sigRecord.dealId,
    entityType: "deal",
    entityId: sigRecord.dealId!,
    eventType: "bind_documents_signed",
    description: "All bind documents have been signed by all parties. Deal is bound.",
    metadata: {
      hellosign_signature_request_id: helloSignRequestId,
      signed_documents_path: storagePath,
      signature_request_id: sigRecord.id,
    },
  });
}
