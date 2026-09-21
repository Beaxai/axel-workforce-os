import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PRODUCER_NOTIFICATION_EVENTS,
  enqueueProducerNotification,
  isSchedulingNotificationDue,
  renderProducerNotification,
  type EnqueueProducerNotificationInput,
  type ProducerNotificationTransaction,
} from "../services/producer-appointment/notifications.js";

const orgId = "11111111-1111-4111-8111-111111111111";
const registrationId = "22222222-2222-4222-8222-222222222222";
const safeData = {
  reference: "AXR-20260912-Ab12Cd",
  recipientName: "Taylor Producer",
  schedulingUrl:
    "https://calendly.com/axelworkforcesolutions/30min?utm_content=AXR-20260912-Ab12Cd",
  documentAccessUrl:
    "https://app.axelworkforce.com/api/producer-registrations/22222222-2222-4222-8222-222222222222/documents/33333333-3333-4333-8333-333333333333/access",
};

function input(
  overrides: Partial<EnqueueProducerNotificationInput> = {},
): EnqueueProducerNotificationInput {
  return {
    orgId,
    registrationId,
    event: "registration_received",
    dedupeKey: "registration-received:v1",
    recipientEmails: ["Producer@Example.com", "producer@example.com"],
    data: safeData,
    ...overrides,
  };
}

function mockTransaction() {
  const rows: Array<Record<string, unknown>> = [];
  const dedupe = new Set<string>();
  const tx = {
    insert() {
      return {
        values(value: Record<string, unknown>) {
          return {
            onConflictDoNothing() {
              const key = `${value.orgId}:${value.dedupeKey}`;
              if (!dedupe.has(key)) {
                dedupe.add(key);
                rows.push(value);
              }
              return Promise.resolve();
            },
          };
        },
      };
    },
  } as unknown as ProducerNotificationTransaction;
  return { tx, rows };
}

describe("producer appointment notification templates", () => {
  it("accepts PostgreSQL legacy organization UUIDs while rejecting malformed IDs", async () => {
    const { tx, rows } = mockTransaction();
    await enqueueProducerNotification(tx, input({
      orgId: "00000000-0000-0000-0000-000000000001",
    }));
    assert.equal(rows.length, 1);
    await assert.rejects(() => enqueueProducerNotification(tx, input({ orgId: "not-a-uuid" })));
  });

  it("renders a branded, non-empty template for every supported event", () => {
    for (const event of PRODUCER_NOTIFICATION_EVENTS) {
      const rendered = renderProducerNotification(event, safeData);
      assert.ok(rendered.subject.length > 0, event);
      assert.ok(rendered.text.length > 0, event);
      assert.match(rendered.html, /#060608/);
      assert.match(rendered.html, /#E91E8C/);
      assert.match(rendered.html, /Inter/);
    }
  });

  it("keeps decline wording neutral and excludes reason details", () => {
    const rendered = renderProducerNotification("declined", safeData);
    assert.match(rendered.text, /\(888\) 997-2935/);
    assert.doesNotMatch(rendered.text, /reason|legal|license|bank|EIN/i);
  });

  it("escapes HTML and rejects unknown or sensitive template fields", () => {
    const rendered = renderProducerNotification("new_registration", {
      ...safeData,
      recipientName: `<img src=x onerror="alert(1)">`,
    });
    assert.doesNotMatch(rendered.html, /<img/);
    assert.match(rendered.html, /&lt;img/);

    assert.throws(
      () =>
        renderProducerNotification("new_registration", {
          ...safeData,
          ein: "12-3456789",
          bankAccount: "123456789",
          legalAnswers: { bankruptcy: true },
        } as never),
      /unrecognized|key/i,
    );
  });

  it("allows only the approved Calendly target and authenticated Axel document route", () => {
    assert.throws(() =>
      renderProducerNotification("scheduling_link", {
        ...safeData,
        schedulingUrl: "https://calendly.com/another-team/30min",
      }),
    );
    assert.throws(() =>
      renderProducerNotification("approved_countersigned", {
        ...safeData,
        documentAccessUrl:
          "https://storage.googleapis.com/private-bucket/executed.pdf",
      }),
    );
  });
});

describe("producer appointment notification outbox", () => {
  it("normalizes before validation and deduplication, but rejects invalid recipients", async () => {
    const { tx, rows } = mockTransaction();
    await enqueueProducerNotification(tx, input({
      recipientEmails: ["  Producer@Example.com  ", "producer@example.com"],
    }));
    assert.deepEqual(rows[0]?.recipientEmails, ["producer@example.com"]);
    for (const recipient of ["   ", "not-an-email", "a@b.com\nBcc: other@example.com"]) {
      await assert.rejects(() =>
        enqueueProducerNotification(tx, input({ recipientEmails: [recipient] })),
      );
    }
    assert.equal(rows.length, 1);
  });

  it("persists a blocked operator request without calling a provider", async () => {
    const { tx, rows } = mockTransaction();
    await enqueueProducerNotification(tx, input());

    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.status, "blocked");
    assert.equal(rows[0]?.failureCode, "DELIVERY_NOT_ENABLED");
    assert.deepEqual(rows[0]?.recipientEmails, ["producer@example.com"]);
    assert.equal(rows[0]?.attemptCount, 0);
    assert.match(String(rows[0]?.html), /Registration received/);
  });

  it("models org-scoped idempotency with the same dedupe key", async () => {
    const { tx, rows } = mockTransaction();
    await enqueueProducerNotification(tx, input());
    await enqueueProducerNotification(tx, input());
    assert.equal(rows.length, 1);

    await enqueueProducerNotification(
      tx,
      input({
        orgId: "44444444-4444-4444-8444-444444444444",
      }),
    );
    assert.equal(rows.length, 2);
  });

  it("rejects unknown top-level and data fields before persistence", async () => {
    const { tx, rows } = mockTransaction();
    await assert.rejects(() =>
      enqueueProducerNotification(tx, {
        ...input(),
        declineReason: "Sensitive internal detail",
      } as never),
    );
    assert.equal(rows.length, 0);
  });
});

describe("producer scheduling notification due predicate", () => {
  const now = new Date("2026-09-12T12:00:00.000Z");

  it("makes the scheduling nudge due at 48 hours only without a booking", () => {
    assert.equal(
      isSchedulingNotificationDue({
        event: "scheduling_nudge",
        now,
        packetSentAt: new Date("2026-09-10T12:00:00.000Z"),
        callScheduledFor: null,
      }),
      true,
    );
    assert.equal(
      isSchedulingNotificationDue({
        event: "scheduling_nudge",
        now,
        packetSentAt: new Date("2026-09-10T11:00:00.000Z"),
        callScheduledFor: new Date("2026-09-15T12:00:00.000Z"),
      }),
      false,
    );
  });

  it("makes a 24-hour reminder due only when Calendly reminders are explicitly disabled", () => {
    const callScheduledFor = new Date("2026-09-13T10:00:00.000Z");
    assert.equal(
      isSchedulingNotificationDue({
        event: "call_reminder",
        now,
        callScheduledFor,
        calendlyRemindersDisabled: true,
      }),
      true,
    );
    for (const setting of [false, null, undefined]) {
      assert.equal(
        isSchedulingNotificationDue({
          event: "call_reminder",
          now,
          callScheduledFor,
          calendlyRemindersDisabled: setting,
        }),
        false,
      );
    }
  });
});