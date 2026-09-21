import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ProducerRegistration } from "@workspace/db";
import {
  matchRegistration,
  parseCalendlyWebhook,
  shouldApplyBookingCancellation,
  shouldApplyBookingCreate,
  verifyCalendlySignature,
} from "../services/producer-appointment/calendly.js";
import {
  enqueueProducerNotification,
  renderProducerNotification,
  type EnqueueProducerNotificationInput,
  type ProducerNotificationTransaction,
} from "../services/producer-appointment/notifications.js";
import {
  permissions,
  safeApplicantRecipientEmails,
  safeRegistrationNames,
} from "../services/producer-appointment/review.js";

const orgId = "11111111-1111-4111-8111-111111111111";
const registrationId = "22222222-2222-4222-8222-222222222222";

function registration(
  overrides: Partial<ProducerRegistration> = {},
): ProducerRegistration {
  return {
    id: registrationId,
    orgId,
    legacyRegistrationId: null,
    reference: "AXR-20260912-ABC123",
    source: "website",
    payload: {},
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

function calendlyPayload(overrides: Record<string, unknown> = {}) {
  return {
    event: "invitee.created",
    created_at: "2026-09-12T12:00:00.000Z",
    payload: {
      uri: "https://api.calendly.com/scheduled_events/EVENT/invitees/INVITEE",
      email: " Producer@Example.com ",
      tracking: { utm_content: " axr-20260912-abc123 " },
      scheduled_event: {
        uri: "https://api.calendly.com/scheduled_events/EVENT",
        event_type: "https://api.calendly.com/event_types/TYPE",
        start_time: "2026-09-13T12:00:00.000Z",
        location: { join_url: "https://meet.example.com/room" },
      },
    },
    ...overrides,
  };
}

function notificationInput(
  overrides: Partial<EnqueueProducerNotificationInput> = {},
): EnqueueProducerNotificationInput {
  return {
    orgId,
    registrationId,
    event: "scheduling_link",
    dedupeKey: "audit:scheduling-link",
    recipientEmails: [" Producer@Example.com ", "producer@example.com"],
    data: {
      reference: "AXR-20260912-ABC123",
      schedulingUrl:
        "https://calendly.com/axelworkforcesolutions/30min?utm_content=AXR-20260912-ABC123",
    },
    ...overrides,
  };
}

function captureTransaction() {
  const rows: Record<string, unknown>[] = [];
  const tx = {
    insert() {
      return {
        values(value: Record<string, unknown>) {
          rows.push(value);
          return {
            onConflictDoNothing() {
              return { returning: async () => [{ id: "audit-notification" }] };
            },
          };
        },
      };
    },
  } as unknown as ProducerNotificationTransaction;
  return { tx, rows };
}

describe("producer appointment audit regressions", () => {
  it("fails closed on malformed Calendly structures and unsafe optional URLs", () => {
    assert.throws(() => parseCalendlyWebhook([]), /invalid_body/);
    assert.throws(
      () =>
        parseCalendlyWebhook(
          calendlyPayload({ created_at: "not-a-timestamp" }),
        ),
      /invalid_created_at/,
    );

    const payload = calendlyPayload();
    const rootPayload = payload.payload as Record<string, unknown>;
    const parsed = parseCalendlyWebhook({
      ...payload,
      payload: {
        ...rootPayload,
        scheduled_event: {
          ...(rootPayload.scheduled_event as Record<string, unknown>),
          location: { join_url: "https://user:password@example.com/secret" },
        },
      },
    });
    assert.equal(parsed.meetingUrl, null);
    assert.equal(parsed.reference, "axr-20260912-abc123");
  });

  it("rejects ambiguous correlation and preserves exact replay ordering boundaries", () => {
    const candidate = {
      id: registrationId,
      orgId,
      reference: "AXR-20260912-ABC123",
    };
    assert.deepEqual(
      matchRegistration({
        reference: null,
        email: "producer@example.com",
        byReference: [],
        byEmail: [candidate, candidate],
      }),
      { kind: "matched", registration: candidate, method: "email" },
    );

    const at = new Date("2026-09-12T12:00:00.000Z");
    assert.equal(
      shouldApplyBookingCreate({
        incomingSourceEventAt: at,
        currentSourceEventAt: at,
        canceledAtOrAfterIncoming: false,
      }),
      false,
    );
    assert.equal(
      shouldApplyBookingCancellation({
        incomingInviteeUri: "invitee",
        incomingSourceEventAt: at,
        current: { inviteeUri: "invitee", sourceEventAt: at, active: true },
      }),
      true,
    );
  });

  it("rejects duplicate signature timestamps rather than choosing one", () => {
    assert.equal(
      verifyCalendlySignature({
        rawBody: Buffer.from("{}"),
        header: `t=1700000000,t=1700000000,v1=${"a".repeat(64)}`,
        secret: "secret",
        nowMs: 1_700_000_000_000,
      }),
      false,
    );
  });

  it("extracts safe display and recipient data from hostile payload shapes", () => {
    const payload = {
      agency: ["not", "an", "object"],
      principal: {
        firstName: "<script>",
        lastName: " Producer ",
        email: " Producer@Example.com ",
      },
      contact: { email: "producer@example.com" },
      email: "invalid",
      bankEmail: "bank@example.com",
    };
    assert.deepEqual(safeRegistrationNames(payload), {
      agencyName: "",
      principalName: "<script>  Producer",
    });
    assert.deepEqual(safeApplicantRecipientEmails(payload), [
      "producer@example.com",
    ]);
  });

  it("normalizes notification recipients and persists only blocked status", async () => {
    const { tx, rows } = captureTransaction();
    await enqueueProducerNotification(tx, notificationInput());
    assert.equal(rows.length, 1);
    assert.deepEqual(rows[0]?.recipientEmails, ["producer@example.com"]);
    assert.equal(rows[0]?.status, "blocked");
    assert.equal(rows[0]?.failureCode, "DELIVERY_NOT_ENABLED");
    assert.equal(rows[0]?.attemptCount, 0);
    assert.equal(rows[0]?.sentAt, undefined);
  });

  it("rejects URL query smuggling and sensitive notification fields", () => {
    assert.throws(() =>
      renderProducerNotification("scheduling_link", {
        reference: "AXR-20260912-ABC123",
        schedulingUrl:
          "https://calendly.com/axelworkforcesolutions/30min?utm_content=AXR-20260912-ABC123&redirect=https://evil.example",
      }),
    );
    assert.throws(() =>
      renderProducerNotification("declined", {
        reference: "AXR-20260912-ABC123",
        declineReason: "internal-only",
      } as never),
    );
  });

  it("does not advertise scheduling actions for a declined registration", () => {
    const declined = registration({
      decision: "declined",
      decidedAt: new Date("2026-09-12T13:00:00.000Z"),
      decidedBy: "33333333-3333-4333-8333-333333333333",
      declineReason: "Not eligible",
    });
    assert.equal(permissions(declined, "ADMIN").canCompleteCall, false);
    assert.equal(permissions(declined, "ADMIN").canSendSchedulingLink, false);
  });
});