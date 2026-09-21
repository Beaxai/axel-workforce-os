import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  deliverSchedulingNotification,
  schedulingDeliveryGate,
  schedulingNotificationIdempotencyKey,
} from "../services/producer-appointment/scheduling-delivery.js";

const notification = {
  id: "10000000-0000-4000-8000-000000000001",
  recipientEmails: ["producer@example.test"],
  subject: "Schedule",
  html: "<p>Schedule</p>",
  text: "Schedule",
};

const config = {
  enabled: true as const,
  apiKey: "test-key",
  from: "appointments@example.test",
  recipients: ["producer@example.test"],
};

function response(status: number, body: unknown = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("producer scheduling delivery gate", () => {
  it("fails closed when disabled or provider configuration is missing", () => {
    assert.deepEqual(
      schedulingDeliveryGate(["producer@example.test"], {}),
      { enabled: false, failureCode: "DELIVERY_NOT_ENABLED" },
    );
    assert.deepEqual(
      schedulingDeliveryGate(["producer@example.test"], {
        PRODUCER_SCHEDULING_DELIVERY_ENABLED: "true",
        PRODUCER_SCHEDULING_TEST_RECIPIENTS: "producer@example.test",
      }),
      { enabled: false, failureCode: "DELIVERY_CONFIG_MISSING" },
    );
  });

  it("normalizes and requires every recipient to be allowlisted", () => {
    const env = {
      PRODUCER_SCHEDULING_DELIVERY_ENABLED: "true",
      PRODUCER_SCHEDULING_TEST_RECIPIENTS:
        " Producer@Example.Test, owner@example.test ",
      RESEND_API_KEY: "key",
      OUTBOUND_EMAIL_FROM: "appointments@example.test",
    };
    assert.equal(
      schedulingDeliveryGate(
        ["PRODUCER@example.test", "other@example.test"],
        env,
      ).enabled,
      false,
    );
    assert.deepEqual(
      schedulingDeliveryGate(["PRODUCER@example.test"], env),
      {
        enabled: true,
        apiKey: "key",
        from: "appointments@example.test",
        recipients: ["producer@example.test"],
      },
    );
  });
});

describe("producer scheduling Resend boundary", () => {
  it("uses one stable notification identity key across attempts", async () => {
    const keys: string[] = [];
    const fetchMock: typeof fetch = async (_input, init) => {
      keys.push(new Headers(init?.headers).get("Idempotency-Key") ?? "");
      return response(500);
    };
    await deliverSchedulingNotification(notification, config, fetchMock);
    await deliverSchedulingNotification(notification, config, fetchMock);
    assert.deepEqual(keys, [
      schedulingNotificationIdempotencyKey(notification.id),
      schedulingNotificationIdempotencyKey(notification.id),
    ]);
  });

  it("maps provider acceptance, throttling, transient, and permanent responses", async () => {
    assert.deepEqual(
      await deliverSchedulingNotification(
        notification,
        config,
        async () => response(200, { id: "provider-id" }),
      ),
      { kind: "sent", providerMessageId: "provider-id" },
    );
    assert.deepEqual(
      await deliverSchedulingNotification(
        notification,
        config,
        async () => response(429),
      ),
      { kind: "retry", failureCode: "PROVIDER_RATE_LIMITED" },
    );
    assert.deepEqual(
      await deliverSchedulingNotification(
        notification,
        config,
        async () => response(503),
      ),
      { kind: "retry", failureCode: "PROVIDER_UNAVAILABLE" },
    );
    assert.deepEqual(
      await deliverSchedulingNotification(
        notification,
        config,
        async () => response(422),
      ),
      { kind: "failed", failureCode: "PROVIDER_REJECTED" },
    );
  });

  it("treats network and timeout-shaped failures as delivery unknown", async () => {
    for (const error of [
      new TypeError("network unavailable"),
      new DOMException("timed out", "TimeoutError"),
    ]) {
      assert.deepEqual(
        await deliverSchedulingNotification(notification, config, async () => {
          throw error;
        }),
        { kind: "failed", failureCode: "DELIVERY_UNKNOWN" },
      );
    }
  });
});