import type {
  ProducerRegistration,
  ProducerRegistrationDocument,
  ProducerRegistrationOwner,
} from "@workspace/db";
import { deriveProducerRegistrationDisplayStatus } from "@workspace/db/producer-registration-status";
import { z } from "zod/v4";

type PayloadObject = Record<string, unknown>;
const applicantEmailSchema = z.email().max(254);

function object(value: unknown): PayloadObject {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as PayloadObject)
    : {};
}

function text(...values: unknown[]): string {
  const value = values.find(
    (candidate) => typeof candidate === "string" && candidate.trim().length > 0,
  );
  return typeof value === "string" ? value.trim() : "";
}

export function safeRegistrationNames(payload: unknown): {
  agencyName: string;
  principalName: string;
} {
  const root = object(payload);
  const agency = object(root.agency);
  const principal = object(root.principal);
  const agencyName = text(
    agency.legalName,
    agency.name,
    root.agencyName,
    root.legalBusinessName,
  );
  const principalName = text(
    principal.name,
    [principal.firstName, principal.lastName]
      .filter((part) => typeof part === "string")
      .join(" "),
    root.principalName,
    [root.firstName, root.lastName]
      .filter((part) => typeof part === "string")
      .join(" "),
  );
  return { agencyName, principalName };
}

export function safeApplicantRecipientEmails(payload: unknown): string[] {
  const root = object(payload);
  const principal = object(root.principal);
  const contact = object(root.contact);
  const candidates = [
    principal.email,
    contact.email,
    root.principalEmail,
    root.email,
  ];
  return [
    ...new Set(
      candidates
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim().toLowerCase())
        .filter((value) => applicantEmailSchema.safeParse(value).success),
    ),
  ];
}

export function toListRow(registration: ProducerRegistration) {
  const names = safeRegistrationNames(registration.payload);
  return {
    id: registration.id,
    reference: registration.reference,
    ...names,
    displayStatus: deriveProducerRegistrationDisplayStatus(registration),
    decision: registration.decision,
    flags: registration.flags,
    submittedAt: registration.submittedAt.toISOString(),
    callScheduledFor: registration.callScheduledFor?.toISOString() ?? null,
  };
}

export function ownerProjection(owner: ProducerRegistrationOwner) {
  return {
    id: owner.id,
    name: owner.name,
    title: owner.title,
    ownershipPct: owner.ownershipPct,
    email: owner.email,
    exhibitASignedAt: owner.exhibitASignedAt?.toISOString() ?? null,
  };
}

const CSA_RESTRICTED_DOCUMENTS = new Set([
  "w9",
  "ach_authorization",
  "executed_packet",
]);

export function documentProjection(
  document: ProducerRegistrationDocument,
  role: "ADMIN" | "CSA",
) {
  const roleAllowsAccess =
    role === "ADMIN" || !CSA_RESTRICTED_DOCUMENTS.has(document.docType);
  // Even filenames can disclose sensitive information. Do not expose metadata
  // for tax, banking, or combined executed documents to CSA users.
  if (!roleAllowsAccess) return null;
  return {
    id: document.id,
    docType: document.docType,
    filename: document.filename,
    ingestionStatus: document.ingestionStatus,
    uploadedAt: document.uploadedAt?.toISOString() ?? null,
    canAccess:
      roleAllowsAccess &&
      document.ingestionStatus === "completed" &&
      Boolean(document.storageKey),
  };
}

export function blockingReasons(registration: ProducerRegistration): string[] {
  const reasons: string[] = [];
  if (!registration.packetSignedAt) reasons.push("PACKET_NOT_SIGNED");
  if (!registration.callCompletedAt) reasons.push("CALL_NOT_COMPLETED");
  if (registration.decision !== "approved") reasons.push("NOT_APPROVED");
  if (!registration.countersignedAt) reasons.push("NOT_COUNTERSIGNED");
  return reasons;
}

export function permissions(
  registration: ProducerRegistration,
  role: "ADMIN" | "CSA",
) {
  return {
    canDecide:
      role === "ADMIN" &&
      registration.decision === "pending" &&
      Boolean(registration.packetSignedAt && registration.callCompletedAt),
    canCompleteCall:
      registration.decision !== "declined" && !registration.callCompletedAt,
    canSendSchedulingLink: role === "ADMIN",
    canIssueCredentials:
      role === "ADMIN" &&
      registration.decision === "approved" &&
      Boolean(registration.callCompletedAt && registration.countersignedAt) &&
      !registration.credentialsIssuedAt,
  };
}

export function iso(value: Date | null): string | null {
  return value?.toISOString() ?? null;
}