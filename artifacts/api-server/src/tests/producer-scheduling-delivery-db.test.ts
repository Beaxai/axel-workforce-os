import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, it } from "node:test";
import {
  db,
  organizationsTable,
  producerNotificationsTable,
  producerRegistrationActivityTable,
  producerRegistrationsTable,
} from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { enqueueProducerNotification } from "../services/producer-appointment/notifications.js";
import {
  runProducerSchedulingDeliverySweep,
  schedulingNotificationIdempotencyKey,
} from "../services/producer-appointment/scheduling-delivery.js";

const suffix = randomUUID().replaceAll("-", "").slice(0, 6).toUpperCase();
let orgId = "";
let registrationId = "";

const env = {
  PRODUCER_SCHEDULING_DELIVERY_ENABLED: "true",
  PRODUCER_SCHEDULING_TEST_RECIPIENTS: "producer@example.test",
  RESEND_API_KEY: "test-key",
  OUTBOUND_EMAIL_FROM: "appointments@example.test",
};

async function createNotification(
  dedupeKey: string,
  status: "pending" | "blocked" = "pending",
) {
  const row = await enqueueProducerNotification(db, {
    orgId,
    registrationId,
    event: "scheduling_link",
    dedupeKey,
    recipientEmails: ["producer@example.test"],
    data: {
      reference: `AXR-20261001-${suffix}`,
      schedulingUrl:
        "https://calendly.com/axelworkforcesolutions/30min?utm_content=test",
    },
    manualSchedulingDelivery: {
      status,
      failureCode: status === "blocked" ? "DELIVERY_NOT_ENABLED" : null,
    },
  });
  assert.ok(row);
  return row.id;
}

describe("producer scheduling delivery database worker", {
  skip:
    process.env.RUN_PRODUCER_SCHEDULING_DELIVERY_DB !== "1"
      ? "set RUN_PRODUCER_SCHEDULING_DELIVERY_DB=1 explicitly"
      : false,
}, () => {
  before(async () => {
    assert.equal(process.env.NODE_ENV, "development");
    const [org] = await db
      .insert(organizationsTable)
      .values({
        name: `Scheduling Delivery DB Fixture ${suffix}`,
        type: "Agency",
        status: "ACTIVE",
      })
      .returning();
    orgId = org.id;
    const [registration] = await db
      .insert(producerRegistrationsTable)
      .values({
        orgId,
        reference: `AXR-20261001-${suffix}`,
        source: "scheduling-delivery-db-test",
        payload: { principal: { email: "producer@example.test" } },
        submittedAt: new Date(),
      })
      .returning();
    registrationId = registration.id;
  });

  after(async () => {
    if (registrationId) {
      await db
        .delete(producerNotificationsTable)
        .where(eq(producerNotificationsTable.registrationId, registrationId));
      await db
        .delete(producerRegistrationsTable)
        .where(eq(producerRegistrationsTable.id, registrationId));
    }
    if (orgId) {
      await db
        .delete(organizationsTable)
        .where(eq(organizationsTable.id, orgId));
    }
  });

  it("claims once under concurrency and persists the provider receipt", async () => {
    const id = await createNotification(`db-concurrency:${suffix}`);
    let calls = 0;
    const fetchMock: typeof fetch = async (_input, init) => {
      calls += 1;
      assert.equal(
        new Headers(init?.headers).get("Idempotency-Key"),
        schedulingNotificationIdempotencyKey(id),
      );
      return new Response(JSON.stringify({ id: "provider-receipt-example" }), {
        status: 200,
      });
    };
    const results = await Promise.all([
      runProducerSchedulingDeliverySweep({
        notificationId: id,
        fetchImpl: fetchMock,
        env,
      }),
      runProducerSchedulingDeliverySweep({
        notificationId: id,
        fetchImpl: fetchMock,
        env,
      }),
    ]);
    assert.equal(calls, 1);
    assert.deepEqual(results.sort(), [0, 1]);
    const [row] = await db
      .select()
      .from(producerNotificationsTable)
      .where(eq(producerNotificationsTable.id, id));
    assert.equal(row.status, "sent");
    assert.equal(row.attemptCount, 1);
    const [receipt] = await db
      .select()
      .from(producerRegistrationActivityTable)
      .where(
        and(
          eq(producerRegistrationActivityTable.registrationId, registrationId),
          eq(
            producerRegistrationActivityTable.action,
            "SCHEDULING_LINK_PROVIDER_ACCEPTED",
          ),
        ),
      );
    assert.deepEqual(receipt.after, {
      notificationId: id,
      providerMessageId: "provider-receipt-example",
    });
  });

  it("retries a known 5xx with the same key and leaves historical blocked rows untouched", async () => {
    const id = await createNotification(`db-retry:${suffix}`);
    const blockedId = await createNotification(
      `db-historical-blocked:${suffix}`,
      "blocked",
    );
    const keys: string[] = [];
    let status = 503;
    const fetchMock: typeof fetch = async (_input, init) => {
      keys.push(new Headers(init?.headers).get("Idempotency-Key") ?? "");
      return new Response(
        JSON.stringify(status === 200 ? { id: "provider-retry-example" } : {}),
        { status },
      );
    };
    const firstNow = new Date();
    await runProducerSchedulingDeliverySweep({
      notificationId: id,
      fetchImpl: fetchMock,
      env,
      now: firstNow,
    });
    status = 200;
    await runProducerSchedulingDeliverySweep({
      notificationId: id,
      fetchImpl: fetchMock,
      env,
      now: new Date(firstNow.getTime() + 31_000),
    });
    assert.deepEqual(keys, [
      schedulingNotificationIdempotencyKey(id),
      schedulingNotificationIdempotencyKey(id),
    ]);
    const [retried, blocked] = await Promise.all([
      db
        .select()
        .from(producerNotificationsTable)
        .where(eq(producerNotificationsTable.id, id))
        .then((rows) => rows[0]),
      db
        .select()
        .from(producerNotificationsTable)
        .where(eq(producerNotificationsTable.id, blockedId))
        .then((rows) => rows[0]),
    ]);
    assert.equal(retried.status, "sent");
    assert.equal(retried.attemptCount, 2);
    assert.equal(blocked.status, "blocked");
    assert.equal(blocked.attemptCount, 0);
  });

  it("marks a stale sending claim unknown without calling the provider", async () => {
    const id = await createNotification(`db-stale:${suffix}`);
    await db
      .update(producerNotificationsTable)
      .set({
        status: "sending",
        attemptCount: 1,
        sendingStartedAt: new Date(Date.now() - 5 * 60_000),
      })
      .where(eq(producerNotificationsTable.id, id));
    let calls = 0;
    await runProducerSchedulingDeliverySweep({
      notificationId: id,
      fetchImpl: async () => {
        calls += 1;
        return new Response(null, { status: 200 });
      },
      env,
    });
    const [row] = await db
      .select()
      .from(producerNotificationsTable)
      .where(eq(producerNotificationsTable.id, id));
    assert.equal(calls, 0);
    assert.equal(row.status, "failed");
    assert.equal(row.failureCode, "DELIVERY_UNKNOWN");
  });
});