import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type {
  ProducerRegistration,
  ProducerRegistrationDocument,
} from "@workspace/db";
import {
  blockingReasons,
  documentProjection,
  permissions,
  safeApplicantRecipientEmails,
  safeRegistrationNames,
  toListRow,
} from "../services/producer-appointment/review.js";

function registration(
  overrides: Partial<ProducerRegistration> = {},
): ProducerRegistration {
  return {
    id: "10000000-0000-4000-8000-000000000001",
    orgId: "10000000-0000-4000-8000-000000000002",
    legacyRegistrationId: null,
    reference: "AXR-20260912-ABC123",
    source: "website",
    payload: {
      agency: { legalName: "Safe Agency", ein: "never-project-this" },
      principal: {
        firstName: "Pat",
        lastName: "Producer",
        email: "PAT@example.com",
      },
      bankAccount: "never-project-this",
    },
    agencyId: null,
    principalPartnerId: null,
    signwellEnvelopeId: null,
    calendlyEventUri: null,
    calendlyInviteeUri: null,
    submittedAt: new Date("2026-09-12T12:00:00.000Z"),
    packetSentAt: null,
    packetSignedAt: null,
    callScheduledFor: null,
    callCompletedAt: null,
    callNotes: null,
    decision: "pending",
    decidedAt: null,
    decidedBy: null,
    countersignedAt: null,
    credentialsIssuedAt: null,
    declineReason: null,
    flags: [],
    createdBy: null,
    createdAt: new Date("2026-09-12T12:00:00.000Z"),
    updatedAt: new Date("2026-09-12T12:00:00.000Z"),
    ...overrides,
  };
}

function document(
  docType: ProducerRegistrationDocument["docType"],
): ProducerRegistrationDocument {
  return {
    id: "20000000-0000-4000-8000-000000000001",
    registrationId: "10000000-0000-4000-8000-000000000001",
    docType,
    storageKey: "private/producer/opaque",
    filename: "document.pdf",
    contentType: "application/pdf",
    size: 10,
    sha256: "a".repeat(64),
    uploadedAt: new Date("2026-09-12T12:00:00.000Z"),
    source: "signwell",
    ingestionStatus: "completed",
    ingestionErrorCode: null,
    createdAt: new Date("2026-09-12T12:00:00.000Z"),
    updatedAt: new Date("2026-09-12T12:00:00.000Z"),
  };
}

describe("producer application review projections", () => {
  it("projects list allowlist without payload, notes, or storage data", () => {
    const row = toListRow(registration({ callNotes: "private notes" }));
    assert.deepEqual(safeRegistrationNames(registration().payload), {
      agencyName: "Safe Agency",
      principalName: "Pat Producer",
    });
    assert.equal("payload" in row, false);
    assert.equal("callNotes" in row, false);
    assert.equal(JSON.stringify(row).includes("never-project-this"), false);
  });

  it("restricts W-9, ACH, and combined executed packets from CSA", () => {
    for (const type of ["w9", "ach_authorization", "executed_packet"] as const) {
      const projected = documentProjection(document(type), "CSA");
      assert.equal(projected, null);
      const adminProjection = documentProjection(document(type), "ADMIN");
      assert.ok(adminProjection);
      assert.equal("storageKey" in adminProjection, false);
    }
    assert.equal(
      documentProjection(document("agency_license"), "CSA")?.canAccess,
      true,
    );
  });

  it("gates decision and credentials by role and milestones", () => {
    const ready = registration({
      packetSignedAt: new Date(),
      callCompletedAt: new Date(),
    });
    assert.equal(permissions(ready, "ADMIN").canDecide, true);
    assert.equal(permissions(ready, "CSA").canDecide, false);
    assert.equal(permissions(ready, "CSA").canCompleteCall, false);
    assert.deepEqual(blockingReasons(ready), [
      "NOT_APPROVED",
      "NOT_COUNTERSIGNED",
    ]);

    const approved = registration({
      decision: "approved",
      packetSignedAt: new Date(),
      callCompletedAt: new Date(),
      countersignedAt: new Date(),
      decidedAt: new Date(),
      decidedBy: "30000000-0000-4000-8000-000000000001",
    });
    assert.equal(permissions(approved, "ADMIN").canIssueCredentials, true);
    assert.equal(permissions(approved, "CSA").canIssueCredentials, false);
  });

  it("extracts only normalized applicant email addresses", () => {
    assert.deepEqual(safeApplicantRecipientEmails(registration().payload), [
      "pat@example.com",
    ]);
    assert.deepEqual(
      safeApplicantRecipientEmails({
        principal: { email: "not-an-email" },
        bankEmail: "bank@example.com",
      }),
      [],
    );
  });
});