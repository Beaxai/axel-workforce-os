import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildProducerAppointmentPacketPlan,
  checkPacketReadiness,
  REQUIRED_PACKET_ASSET_TYPES,
  type PacketPlanInput,
  type PacketReadinessInput,
} from "../services/producer-appointment/packet-plan.js";

const readyMetadata: PacketReadinessInput = {
  sourceAssets: REQUIRED_PACKET_ASSET_TYPES.map((type) => ({
    type,
    approvedRevision: "legal-approved-2026-09",
    storageKey: `private/producer-appointment/${type}.pdf`,
  })),
  providerConfirmations: {
    ownerDocumentVisibility: true,
    externalApprovalHold: true,
    reminderEveryThreeDays: true,
  },
  authorizedTestRecipients: {
    principal: true,
    additionalOwner: true,
    countersigner: true,
  },
};

function input(overrides: Partial<PacketPlanInput> = {}): PacketPlanInput {
  return {
    principal: {
      id: "principal-1",
      name: "Pat Principal",
      email: "pat@example.com",
    },
    owners: [
      {
        id: "owner-principal",
        name: "Pat Principal",
        email: "pat@example.com",
        ownershipPct: 60,
      },
      {
        id: "owner-2",
        name: "Olivia Owner",
        email: "olivia@example.com",
        ownershipPct: 30,
      },
      {
        id: "owner-under-threshold",
        name: "Sam Small",
        email: "sam@example.com",
        ownershipPct: 9.99,
      },
    ],
    countersigner: {
      id: "curtis",
      name: "Curtis Prince",
      email: "curtis@example.com",
    },
    decision: "pending",
    packetSignedAt: null,
    callCompletedAt: null,
    ...overrides,
  };
}

describe("producer appointment packet planner", () => {
  it("orders 5 + qualifying-owner documents and applies the 10% threshold", () => {
    const plan = buildProducerAppointmentPacketPlan(input(), readyMetadata);
    assert.equal(plan.documents.length, 7);
    assert.deepEqual(
      plan.documents.map((document) => document.type),
      [
        "appointment_application",
        "national_producer_agreement",
        "exhibit_a",
        "exhibit_a",
        "cfpb_summary",
        "w9",
        "ach_authorization",
      ],
    );
    assert.deepEqual(
      plan.documents
        .filter((document) => document.type === "exhibit_a")
        .map((document) => document.ownerId),
      ["owner-principal", "owner-2"],
    );
    assert.equal(plan.dispatchEnabled, false);
    assert.equal(plan.policyKind, "desired_policy_only");
  });

  it("deduplicates a principal owner using normalized email and keeps the owner exhibit ref", () => {
    const base = input();
    const plan = buildProducerAppointmentPacketPlan(
      {
        ...base,
        principal: { ...base.principal, email: " Pat@Example.COM " },
      },
      readyMetadata,
    );
    assert.equal(
      plan.recipients.filter((recipient) => recipient.email === "pat@example.com")
        .length,
      1,
    );
    const exhibit = plan.documents.find(
      (document) => document.ownerId === "owner-principal",
    );
    assert.deepEqual(exhibit?.signRecipientRefs, ["recipient:principal"]);
    assert.equal(exhibit?.ref, "document:exhibit_a:owner-principal");
  });

  it("isolates each owner to their exhibit plus the read-only rights summary", () => {
    const plan = buildProducerAppointmentPacketPlan(input(), readyMetadata);
    const ownerRef = "recipient:owner:owner-2";
    const accessible = plan.documents.filter((document) =>
      document.readRecipientRefs.includes(ownerRef),
    );
    assert.deepEqual(
      accessible.map((document) => document.ref),
      ["document:exhibit_a:owner-2", "document:cfpb_summary"],
    );
    assert.equal(accessible[1]?.readOnly, true);

    const curtisAccessible = plan.documents
      .filter((document) =>
        document.readRecipientRefs.includes("recipient:countersigner"),
      )
      .map((document) => document.type);
    assert.deepEqual(curtisAccessible, [
      "national_producer_agreement",
      "cfpb_summary",
    ]);
  });

  it("does not release Curtis while pending, even after producer signing", () => {
    const plan = buildProducerAppointmentPacketPlan(
      input({
        packetSignedAt: new Date(),
        callCompletedAt: new Date(),
      }),
      readyMetadata,
    );
    assert.equal(plan.countersignerRelease.eligible, false);
    assert.deepEqual(plan.countersignerRelease.reasons, ["decision_pending"]);
  });

  it("requires approval, producer signing, and call completion", () => {
    const noCall = buildProducerAppointmentPacketPlan(
      input({ decision: "approved", packetSignedAt: new Date() }),
      readyMetadata,
    );
    assert.deepEqual(noCall.countersignerRelease.reasons, ["call_incomplete"]);

    const eligible = buildProducerAppointmentPacketPlan(
      input({
        decision: "approved",
        packetSignedAt: new Date(),
        callCompletedAt: new Date(),
      }),
      readyMetadata,
    );
    assert.equal(eligible.countersignerRelease.eligible, true);
    assert.equal(eligible.dispatchEnabled, false);
  });

  it("blocks a declined packet regardless of completed milestones", () => {
    const plan = buildProducerAppointmentPacketPlan(
      input({
        decision: "declined",
        packetSignedAt: new Date(),
        callCompletedAt: new Date(),
      }),
      readyMetadata,
    );
    assert.deepEqual(plan.countersignerRelease.reasons, ["decision_declined"]);
  });

  it("reports missing assets, unverified capabilities, and test recipients", () => {
    const readiness = checkPacketReadiness({
      sourceAssets: readyMetadata.sourceAssets.slice(0, -1),
      providerConfirmations: {
        ownerDocumentVisibility: false,
        externalApprovalHold: false,
        reminderEveryThreeDays: false,
      },
      authorizedTestRecipients: {
        principal: true,
        additionalOwner: false,
        countersigner: false,
      },
    });
    assert.equal(readiness.ready, false);
    assert.deepEqual(readiness.reasons, [
      "missing_asset:ach_authorization",
      "owner_visibility_unverified",
      "external_approval_hold_unverified",
      "reminder_frequency_unverified",
      "authorized_test_recipients_missing",
    ]);
  });

  it("rejects duplicate or invalid owners and countersigner overlap", () => {
    const base = input();
    assert.throws(() =>
      buildProducerAppointmentPacketPlan(
        {
          ...base,
          owners: [
            base.owners[0]!,
            { ...base.owners[1]!, id: base.owners[0]!.id },
          ],
        },
        readyMetadata,
      ),
    );
    assert.throws(() =>
      buildProducerAppointmentPacketPlan(
        {
          ...base,
          owners: [
            base.owners[0]!,
            { ...base.owners[1]!, email: " PAT@example.com " },
          ],
        },
        readyMetadata,
      ),
    );
    assert.throws(() =>
      buildProducerAppointmentPacketPlan(
        {
          ...base,
          owners: [{ ...base.owners[0]!, ownershipPct: Number.NaN }],
        },
        readyMetadata,
      ),
    );
    assert.throws(() =>
      buildProducerAppointmentPacketPlan(
        {
          ...base,
          owners: [{ ...base.owners[0]!, ownershipPct: 101 }],
        },
        readyMetadata,
      ),
    );
    assert.throws(() =>
      buildProducerAppointmentPacketPlan(
        {
          ...base,
          owners: [
            { ...base.owners[0]!, ownershipPct: 60 },
            { ...base.owners[1]!, ownershipPct: 50 },
          ],
        },
        readyMetadata,
      ),
    );
    assert.throws(() =>
      buildProducerAppointmentPacketPlan(
        {
          ...base,
          countersigner: {
            ...base.countersigner,
            email: "OLIVIA@example.com",
          },
        },
        readyMetadata,
      ),
    );
  });

  it("rejects sensitive or otherwise unknown input instead of propagating it", () => {
    const unsafe = {
      ...input(),
      ein: "12-3456789",
      bankAccount: "000123456789",
    };
    assert.throws(() =>
      buildProducerAppointmentPacketPlan(unsafe as PacketPlanInput, readyMetadata),
    );
  });

  it("rejects public asset URLs", () => {
    assert.throws(() =>
      checkPacketReadiness({
        ...readyMetadata,
        sourceAssets: readyMetadata.sourceAssets.map((asset, index) =>
          index === 0
            ? { ...asset, storageKey: "https://public.example/legal.pdf" }
            : asset,
        ),
      }),
    );
  });
});