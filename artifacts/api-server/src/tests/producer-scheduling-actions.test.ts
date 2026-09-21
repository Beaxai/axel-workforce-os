/**
 * Development-DB regression coverage for scheduling actions. All notification rows
 * created here remain blocked (DELIVERY_NOT_ENABLED); this test never invokes a
 * delivery provider.
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import { after, before, describe, it } from "node:test";
import {
  db,
  orgMembersTable,
  organizationsTable,
  producerNotificationsTable,
  producerRegistrationActivityTable,
  producerRegistrationsTable,
  sessionsTable,
  trustedAxelOrganizationsTable,
  usersTable,
} from "@workspace/db";
import { and, eq, inArray } from "drizzle-orm";
import app from "../app.js";
import { createSession } from "../lib/auth.js";

const suffix = randomUUID().replaceAll("-", "").slice(0, 12);
const fixtureReference = (day: string) =>
  `AXR-202610${day}-${suffix.slice(0, 6).toUpperCase()}`;

let baseUrl = "";
let closeServer: (() => Promise<void>) | null = null;
let trustedOrgId = "";
let externalOrgId = "";
let adminId = "";
let csaId = "";
let externalAdminId = "";
let adminCookie = "";
let csaCookie = "";
let externalAdminCookie = "";
let registrationId = "";
let foreignRegistrationId = "";
let declinedRegistrationId = "";
let recipientMissingRegistrationId = "";

async function createUser(emailPrefix: string, role: string, orgId: string) {
  const [user] = await db
    .insert(usersTable)
    .values({
      email: `${emailPrefix}-${suffix}@example.test`,
      firstName: emailPrefix,
      lastName: "SchedulingActionFixture",
      status: "active",
    })
    .returning();
  await db.insert(orgMembersTable).values({
    userId: user.id,
    orgId,
    role,
    isPrimaryOrg: true,
  });
  const session = await createSession(user.id);
  return { id: user.id, cookie: `axel_session=${session.token}` };
}

async function post(
  id: string,
  cookie: string,
  body: unknown,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const response = await fetch(
    `${baseUrl}/api/producer-registrations/${id}/send-scheduling-link`,
    {
      method: "POST",
      headers: {
        Cookie: cookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );
  return {
    status: response.status,
    body: (await response.json()) as Record<string, unknown>,
  };
}

async function schedulingRows(id: string) {
  const [notifications, activity] = await Promise.all([
    db
      .select()
      .from(producerNotificationsTable)
      .where(
        and(
          eq(producerNotificationsTable.registrationId, id),
          eq(producerNotificationsTable.event, "scheduling_link"),
        ),
      ),
    db
      .select()
      .from(producerRegistrationActivityTable)
      .where(
        and(
          eq(producerRegistrationActivityTable.registrationId, id),
          eq(
            producerRegistrationActivityTable.action,
            "SCHEDULING_LINK_DELIVERY_BLOCKED",
          ),
        ),
      ),
  ]);
  return { notifications, activity };
}

describe("producer scheduling action idempotency", {
  skip: process.env.RUN_PRODUCER_SCHEDULING_AUDIT !== "1"
    ? "set RUN_PRODUCER_SCHEDULING_AUDIT=1 explicitly"
    : false,
}, () => {
  before(async () => {
    assert.ok(
      process.env.NODE_ENV === "development" &&
      !process.env.REPLIT_DEPLOYMENT &&
      !process.env.REPLIT_DEPLOYMENT_ID,
      "producer scheduling regression fixtures require Development",
    );

    const server = app.listen(0);
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
    closeServer = () =>
      new Promise((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );

    const [trustedOrg, externalOrg] = await db
      .insert(organizationsTable)
      .values([
        {
          name: `Scheduling Action Axel Fixture ${suffix}`,
          type: "Agency",
          status: "ACTIVE",
        },
        {
          name: `Scheduling Action External Fixture ${suffix}`,
          type: "Agency",
          status: "ACTIVE",
        },
      ])
      .returning();
    trustedOrgId = trustedOrg.id;
    externalOrgId = externalOrg.id;
    await db.insert(trustedAxelOrganizationsTable).values({
      orgId: trustedOrgId,
      note: "Task 100 regression fixture",
    });

    ({ id: adminId, cookie: adminCookie } = await createUser(
      "scheduling-admin",
      "ADMIN",
      trustedOrgId,
    ));
    ({ id: csaId, cookie: csaCookie } = await createUser(
      "scheduling-csa",
      "CSA",
      trustedOrgId,
    ));
    ({ id: externalAdminId, cookie: externalAdminCookie } = await createUser(
      "scheduling-external-admin",
      "ADMIN",
      externalOrgId,
    ));

    const [registration, foreign, declined, recipientMissing] = await db
      .insert(producerRegistrationsTable)
      .values([
        {
          orgId: trustedOrgId,
          reference: fixtureReference("01"),
          source: "task-100-test",
          payload: { principal: { email: `applicant-${suffix}@example.test` } },
          submittedAt: new Date(),
        },
        {
          orgId: externalOrgId,
          reference: fixtureReference("02"),
          source: "task-100-test",
          payload: { principal: { email: `foreign-${suffix}@example.test` } },
          submittedAt: new Date(),
        },
        {
          orgId: trustedOrgId,
          reference: fixtureReference("03"),
          source: "task-100-test",
          payload: { principal: { email: `declined-${suffix}@example.test` } },
          submittedAt: new Date(),
          decision: "declined",
          decidedAt: new Date(),
          decidedBy: adminId,
          declineReason: "Fictional regression fixture",
        },
        {
          orgId: trustedOrgId,
          reference: fixtureReference("04"),
          source: "task-100-test",
          payload: { principal: { email: "not-an-email" } },
          submittedAt: new Date(),
        },
      ])
      .returning();
    registrationId = registration.id;
    foreignRegistrationId = foreign.id;
    declinedRegistrationId = declined.id;
    recipientMissingRegistrationId = recipientMissing.id;
  });

  after(async () => {
    if (closeServer) await closeServer();

    const registrationIds = [
      registrationId,
      foreignRegistrationId,
      declinedRegistrationId,
      recipientMissingRegistrationId,
    ].filter(Boolean);
    if (registrationIds.length) {
      await db
        .delete(producerRegistrationActivityTable)
        .where(
          inArray(
            producerRegistrationActivityTable.registrationId,
            registrationIds,
          ),
        );
      await db
        .delete(producerNotificationsTable)
        .where(inArray(producerNotificationsTable.registrationId, registrationIds));
      await db
        .delete(producerRegistrationsTable)
        .where(inArray(producerRegistrationsTable.id, registrationIds));
    }

    const userIds = [adminId, csaId, externalAdminId].filter(Boolean);
    if (userIds.length) {
      await db.delete(sessionsTable).where(inArray(sessionsTable.userId, userIds));
      await db
        .delete(orgMembersTable)
        .where(inArray(orgMembersTable.userId, userIds));
      await db.delete(usersTable).where(inArray(usersTable.id, userIds));
    }
    if (trustedOrgId) {
      await db
        .delete(trustedAxelOrganizationsTable)
        .where(eq(trustedAxelOrganizationsTable.orgId, trustedOrgId));
    }
    const orgIds = [trustedOrgId, externalOrgId].filter(Boolean);
    if (orgIds.length) {
      await db
        .delete(organizationsTable)
        .where(inArray(organizationsTable.id, orgIds));
    }
  });

  it("rejects non-strict bodies before creating an outbox or audit row", async () => {
    const validActionId = randomUUID();
    const invalidBodies: unknown[] = [
      {},
      { actionId: "not-a-uuid", intent: "send" },
      { actionId: validActionId, intent: "retry" },
      { actionId: validActionId, intent: "send", extra: true },
      { actionId: validActionId },
      { intent: "send" },
      [],
    ];

    for (const body of invalidBodies) {
      const result = await post(registrationId, adminCookie, body);
      assert.equal(result.status, 400);
      assert.equal(result.body.error, "invalid_scheduling_action");
    }
    const rows = await schedulingRows(registrationId);
    assert.equal(rows.notifications.length, 0);
    assert.equal(rows.activity.length, 0);
  });

  it("enforces role, trust, lifecycle, recipient, and organization gates", async () => {
    const body = { actionId: randomUUID(), intent: "send" };

    assert.equal((await post(registrationId, csaCookie, body)).status, 403);
    assert.equal(
      (await post(registrationId, externalAdminCookie, body)).status,
      403,
    );
    assert.deepEqual(
      await post(foreignRegistrationId, adminCookie, body),
      { status: 404, body: { error: "not_found" } },
    );
    assert.equal(
      (await post(declinedRegistrationId, adminCookie, body)).body.error,
      "registration_declined",
    );
    assert.equal(
      (await post(recipientMissingRegistrationId, adminCookie, body)).body.error,
      "notification_recipient_missing",
    );

    for (const id of [
      registrationId,
      foreignRegistrationId,
      declinedRegistrationId,
      recipientMissingRegistrationId,
    ]) {
      const rows = await schedulingRows(id);
      assert.equal(rows.notifications.length, 0);
      assert.equal(rows.activity.length, 0);
    }
  });

  it("replays one action without duplicating its blocked row or audit", async () => {
    const actionId = randomUUID();
    const request = { actionId, intent: "send" };
    const first = await post(registrationId, adminCookie, request);
    const replay = await post(registrationId, adminCookie, request);

    assert.equal(first.status, 202);
    assert.equal(first.body.replayed, false);
    assert.equal(replay.status, 202);
    assert.equal(replay.body.replayed, true);
    assert.equal(replay.body.notificationId, first.body.notificationId);

    const rows = await schedulingRows(registrationId);
    assert.equal(rows.notifications.length, 1);
    assert.equal(rows.notifications[0]?.status, "blocked");
    assert.equal(rows.notifications[0]?.failureCode, "DELIVERY_NOT_ENABLED");
    assert.equal(rows.notifications[0]?.attemptCount, 0);
    assert.equal(rows.activity.length, 1);
    assert.deepEqual(rows.activity[0]?.after, {
      actionId,
      intent: "send",
      notificationId: rows.notifications[0]?.id,
      status: "blocked",
    });

    const conflictResult = await post(registrationId, adminCookie, {
      actionId,
      intent: "resend",
    });
    assert.equal(conflictResult.status, 409);
    assert.equal(conflictResult.body.error, "idempotency_conflict");
    const afterConflict = await schedulingRows(registrationId);
    assert.equal(afterConflict.notifications.length, 1);
    assert.equal(afterConflict.activity.length, 1);
  });

  it("serializes concurrent retries and creates one new row for a resend action", async () => {
    const actionId = randomUUID();
    const results = await Promise.all(
      Array.from({ length: 8 }, () =>
        post(registrationId, adminCookie, { actionId, intent: "resend" }),
      ),
    );

    assert.ok(results.every((result) => result.status === 202));
    assert.equal(
      results.filter((result) => result.body.replayed === false).length,
      1,
    );
    assert.equal(
      results.filter((result) => result.body.replayed === true).length,
      7,
    );
    assert.equal(
      new Set(results.map((result) => result.body.notificationId)).size,
      1,
    );

    const rows = await schedulingRows(registrationId);
    assert.equal(rows.notifications.length, 2);
    assert.equal(rows.activity.length, 2);
    const resendAudit = rows.activity.find(
      (entry) =>
        (entry.after as Record<string, unknown> | null)?.actionId === actionId,
    );
    assert.deepEqual(resendAudit?.after, {
      actionId,
      intent: "resend",
      notificationId: results[0]?.body.notificationId,
      status: "blocked",
    });
  });
});