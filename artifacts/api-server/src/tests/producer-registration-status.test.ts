import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { deriveProducerRegistrationDisplayStatus } from "@workspace/db/producer-registration-status";

const at = "2026-09-11T12:00:00.000Z";

describe("deriveProducerRegistrationDisplayStatus", () => {
  it("covers every milestone status", () => {
    const cases = [
      [{ decision: "pending" }, "Submitted"],
      [{ decision: "pending", packetSentAt: at }, "Packet Sent"],
      [{ decision: "pending", callScheduledFor: at }, "Call Scheduled"],
      [{ decision: "pending", packetSignedAt: at }, "Packet Signed – Call Pending"],
      [{ decision: "pending", callCompletedAt: at }, "Call Complete – Packet Pending"],
      [
        { decision: "pending", packetSignedAt: at, callCompletedAt: at },
        "Ready for Decision",
      ],
      [
        { decision: "approved", packetSignedAt: at, callCompletedAt: at },
        "Approved – Countersign Pending",
      ],
      [
        {
          decision: "approved",
          packetSignedAt: at,
          callCompletedAt: at,
          countersignedAt: at,
        },
        "Approved – Credentials Pending",
      ],
      [
        {
          decision: "approved",
          packetSignedAt: at,
          callCompletedAt: at,
          countersignedAt: at,
          credentialsIssuedAt: at,
        },
        "Active",
      ],
    ] as const;

    for (const [input, expected] of cases) {
      assert.equal(deriveProducerRegistrationDisplayStatus(input), expected);
    }
  });

  it("treats signature and booking/call completion as independent orders", () => {
    assert.equal(
      deriveProducerRegistrationDisplayStatus({
        decision: "pending",
        packetSignedAt: at,
        callScheduledFor: at,
      }),
      "Packet Signed – Call Pending",
    );
    assert.equal(
      deriveProducerRegistrationDisplayStatus({
        decision: "pending",
        packetSentAt: at,
        callScheduledFor: at,
        callCompletedAt: at,
      }),
      "Call Complete – Packet Pending",
    );
  });

  it("uses exact priority for out-of-order and conflicting milestone input", () => {
    assert.equal(
      deriveProducerRegistrationDisplayStatus({
        decision: "declined",
        credentialsIssuedAt: at,
        countersignedAt: at,
      }),
      "Declined",
    );
    assert.equal(
      deriveProducerRegistrationDisplayStatus({
        decision: "pending",
        credentialsIssuedAt: at,
        packetSignedAt: at,
        callCompletedAt: at,
      }),
      "Active",
    );
    assert.equal(
      deriveProducerRegistrationDisplayStatus({
        decision: "approved",
        countersignedAt: at,
        callScheduledFor: at,
      }),
      "Approved – Credentials Pending",
    );
    assert.equal(
      deriveProducerRegistrationDisplayStatus({
        decision: "pending",
        packetSentAt: at,
        callScheduledFor: at,
        packetSignedAt: at,
        callCompletedAt: at,
      }),
      "Ready for Decision",
    );
  });
});