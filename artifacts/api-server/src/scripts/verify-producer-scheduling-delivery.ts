/**
 * Explicit, Development-only acceptance harness for the real manual
 * producer-scheduling delivery path.
 *
 * This deliberately retains the fictional registration, its activity, and its
 * notification so that a human can subsequently make a REAL Calendly booking
 * using the printed reference. Creating this fixture is not proof of intake or
 * Calendly acceptance.
 *
 * Required invocation:
 *   NODE_ENV=development \
 *   RUN_PRODUCER_SCHEDULING_LIVE_TEST=1 \
 *   PRODUCER_SCHEDULING_LIVE_TEST_TOKEN=<stable-private-run-token> \
 *   PRODUCER_SCHEDULING_TEST_RECIPIENTS=<one-controlled-address> \
 *   PRODUCER_SCHEDULING_DELIVERY_ENABLED=true \
 *   pnpm tsx src/scripts/verify-producer-scheduling-delivery.ts
 *
 * RESEND_API_KEY and OUTBOUND_EMAIL_FROM must also be configured. Never put the
 * recipient or provider credentials on the command line in shared environments.
 */
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";

const TERMINAL_STATUSES = new Set(["sent", "failed"]);
const FIXTURE_SOURCE = "development-live-scheduling-acceptance";
const RESEND_TERMINAL_EVENTS = new Set([
  "delivered",
  "bounced",
  "complained",
  "canceled",
  "failed",
  "suppressed",
  "opened",
  "clicked",
]);
const RESEND_KNOWN_EVENTS = new Set([
  "queued",
  "scheduled",
  "sent",
  "delivery_delayed",
  ...RESEND_TERMINAL_EVENTS,
]);

function refuseUnsafeExecution(): void {
  assert.equal(
    process.env.NODE_ENV,
    "development",
    "This live-delivery harness is Development-only.",
  );
  assert.equal(
    process.env.RUN_PRODUCER_SCHEDULING_LIVE_TEST,
    "1",
    "Set RUN_PRODUCER_SCHEDULING_LIVE_TEST=1 to explicitly opt in.",
  );
  assert.ok(
    !process.env.REPLIT_DEPLOYMENT && !process.env.REPLIT_DEPLOYMENT_ID,
    "This live-delivery harness refuses deployment environments.",
  );
  assert.equal(
    process.env.PRODUCER_SCHEDULING_DELIVERY_ENABLED,
    "true",
    "Real scheduling delivery must be explicitly enabled.",
  );
  assert.ok(
    process.env.RESEND_API_KEY?.trim(),
    "RESEND_API_KEY must be configured.",
  );
  assert.ok(
    process.env.OUTBOUND_EMAIL_FROM?.trim(),
    "OUTBOUND_EMAIL_FROM must be configured.",
  );
}

function controlledRecipient(): string {
  const recipients = (process.env.PRODUCER_SCHEDULING_TEST_RECIPIENTS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  assert.equal(
    recipients.length,
    1,
    "PRODUCER_SCHEDULING_TEST_RECIPIENTS must contain exactly one address.",
  );
  assert.match(
    recipients[0]!,
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    "The controlled test recipient is not a valid email address.",
  );
  return recipients[0]!;
}

function stableFixtureIdentity(): {
  actionId: string;
  reference: string;
  marker: string;
} {
  const token = process.env.PRODUCER_SCHEDULING_LIVE_TEST_TOKEN?.trim();
  assert.ok(
    token && token.length >= 16 && token.length <= 200,
    "Set a stable PRODUCER_SCHEDULING_LIVE_TEST_TOKEN (16-200 characters). Reuse it to replay this fixture safely.",
  );
  const digest = createHash("sha256")
    .update(`producer-scheduling-live-v1:${token}`)
    .digest("hex");
  const uuidHex = `${digest.slice(0, 12)}4${digest.slice(13, 16)}a${digest.slice(17, 32)}`;
  const actionId = [
    uuidHex.slice(0, 8),
    uuidHex.slice(8, 12),
    uuidHex.slice(12, 16),
    uuidHex.slice(16, 20),
    uuidHex.slice(20),
  ].join("-");
  return {
    actionId,
    reference: `AXR-20991231-${digest.slice(0, 6).toUpperCase()}`,
    marker: digest.slice(0, 16),
  };
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  refuseUnsafeExecution();
  const recipient = controlledRecipient();
  const identity = stableFixtureIdentity();

  // Importing the application and database only after all destructive/live-send
  // guards have passed prevents accidental execution through module loading.
  const [
    dbModule,
    drizzle,
    authModule,
    appModule,
    deliveryModule,
  ] = await Promise.all([
    import("@workspace/db"),
    import("drizzle-orm"),
    import("../lib/auth.js"),
    import("../app.js"),
    import("../services/producer-appointment/scheduling-delivery.js"),
  ]);
  const {
    db,
    organizationsTable,
    orgMembersTable,
    producerNotificationsTable,
    producerRegistrationActivityTable,
    producerRegistrationsTable,
    sessionsTable,
    trustedAxelOrganizationsTable,
    usersTable,
  } = dbModule;
  const { and, asc, eq, sql } = drizzle;

  let actorId: string | null = null;
  let closeServer: (() => Promise<void>) | null = null;

  try {
    const [trustedOrg] = await db
      .select({
        id: organizationsTable.id,
      })
      .from(trustedAxelOrganizationsTable)
      .innerJoin(
        organizationsTable,
        eq(organizationsTable.id, trustedAxelOrganizationsTable.orgId),
      )
      .where(eq(organizationsTable.status, "ACTIVE"))
      .orderBy(asc(organizationsTable.id))
      .limit(1);
    assert.ok(
      trustedOrg,
      "No existing trusted active organization is available for the fixture.",
    );

    const existingRegistrations = await db
      .select()
      .from(producerRegistrationsTable)
      .where(eq(producerRegistrationsTable.reference, identity.reference))
      .limit(1);
    let registration = existingRegistrations[0];
    if (!registration) {
      [registration] = await db
        .insert(producerRegistrationsTable)
        .values({
          orgId: trustedOrg.id,
          reference: identity.reference,
          source: FIXTURE_SOURCE,
          payload: {
            principal: {
              email: recipient,
              firstName: "Fictional",
              lastName: `SchedulingFixture-${identity.marker}`,
            },
            acceptanceFixture: {
              fictional: true,
              marker: identity.marker,
            },
          },
          submittedAt: new Date(),
        })
        .returning();
    } else {
      assert.equal(
        registration.orgId,
        trustedOrg.id,
        "The stable fixture reference belongs to a different trusted organization.",
      );
      assert.equal(
        registration.source,
        FIXTURE_SOURCE,
        "The stable fixture reference already belongs to a non-harness registration.",
      );
      const payload = registration.payload as {
        principal?: { email?: unknown };
        acceptanceFixture?: { fictional?: unknown; marker?: unknown };
      };
      assert.equal(
        payload.acceptanceFixture?.fictional,
        true,
        "Existing registration is not an unmistakably fictional acceptance fixture.",
      );
      assert.equal(payload.acceptanceFixture?.marker, identity.marker);
      assert.equal(
        typeof payload.principal?.email === "string"
          ? payload.principal.email.trim().toLowerCase()
          : null,
        recipient,
        "The stable run token was previously used with a different controlled recipient.",
      );
    }
    assert.ok(registration, "Failed to create or recover the fixture registration.");

    const actorNonce = randomUUID();
    const [actor] = await db
      .insert(usersTable)
      .values({
        email: `fictional-scheduling-acceptance-${actorNonce}@example.test`,
        firstName: "Fictional",
        lastName: "SchedulingAcceptanceActor",
        status: "active",
      })
      .returning();
    actorId = actor.id;
    await db.insert(orgMembersTable).values({
      userId: actor.id,
      orgId: trustedOrg.id,
      role: "ADMIN",
      isPrimaryOrg: true,
    });
    const session = await authModule.createSession(actor.id, {
      userAgent: "producer-scheduling-live-acceptance-harness",
    });

    const server = appModule.default.listen(0);
    await new Promise<void>((resolve, reject) => {
      server.once("listening", resolve);
      server.once("error", reject);
    });
    closeServer = () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    const address = server.address() as AddressInfo;
    const endpoint =
      `http://127.0.0.1:${address.port}` +
      `/api/producer-registrations/${registration.id}/send-scheduling-link`;
    const requestBody = JSON.stringify({
      actionId: identity.actionId,
      intent: "send",
    });
    const request = async () => {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Cookie: `axel_session=${session.token}`,
          "Content-Type": "application/json",
        },
        body: requestBody,
      });
      const body = (await response.json()) as Record<string, unknown>;
      assert.equal(response.status, 202, `Scheduling route returned ${response.status}.`);
      return body;
    };

    const first = await request();
    const replay = await request();
    assert.equal(replay.replayed, true, "Second action request was not a replay.");
    assert.equal(replay.notificationId, first.notificationId);
    assert.equal(replay.actionId, identity.actionId);

    const dedupeKey = `scheduling-link:${registration.id}:${identity.actionId}`;
    const notifications = await db
      .select({
        id: producerNotificationsTable.id,
        status: producerNotificationsTable.status,
        failureCode: producerNotificationsTable.failureCode,
        attemptCount: producerNotificationsTable.attemptCount,
        sentAt: producerNotificationsTable.sentAt,
      })
      .from(producerNotificationsTable)
      .where(
        and(
          eq(producerNotificationsTable.registrationId, registration.id),
          eq(producerNotificationsTable.event, "scheduling_link"),
          eq(producerNotificationsTable.dedupeKey, dedupeKey),
        ),
      );
    assert.equal(
      notifications.length,
      1,
      "The stable action must have exactly one scheduling notification.",
    );
    assert.equal(notifications[0]!.id, first.notificationId);

    // A replay of a completed stable fixture must never trigger another send.
    // For new pending work, perform exactly one bounded worker sweep; retry timing
    // remains owned by the service/background worker, not this harness.
    if (notifications[0]!.status === "pending") {
      await deliveryModule.runProducerSchedulingDeliverySweep({
        notificationId: notifications[0]!.id,
      });
    }

    const timeoutMs = Math.min(
      Math.max(
        Number(process.env.PRODUCER_SCHEDULING_LIVE_TEST_TIMEOUT_MS ?? 60_000),
        5_000,
      ),
      300_000,
    );
    const deadline = Date.now() + timeoutMs;
    let final = notifications[0]!;
    while (!TERMINAL_STATUSES.has(final.status) && Date.now() < deadline) {
      await sleep(2_000);
      const [current] = await db
        .select({
          id: producerNotificationsTable.id,
          status: producerNotificationsTable.status,
          failureCode: producerNotificationsTable.failureCode,
          attemptCount: producerNotificationsTable.attemptCount,
          sentAt: producerNotificationsTable.sentAt,
        })
        .from(producerNotificationsTable)
        .where(eq(producerNotificationsTable.id, final.id))
        .limit(1);
      assert.ok(current, "Retained scheduling notification disappeared.");
      final = current;
    }
    assert.ok(
      TERMINAL_STATUSES.has(final.status),
      `Delivery did not reach sent/failed within ${timeoutMs}ms (state=${final.status}).`,
    );

    let providerMessageId: string | null = null;
    let resendLastEvent: string | null = null;
    let resendLookupState:
      | "not_applicable"
      | "poll_timeout"
      | "provider_terminal_event"
      | "provider_lookup_http_error"
      | "provider_lookup_transport_error" = "not_applicable";

    if (final.status === "sent") {
      const [receipt] = await db
        .select({ after: producerRegistrationActivityTable.after })
        .from(producerRegistrationActivityTable)
        .where(
          and(
            eq(
              producerRegistrationActivityTable.action,
              "SCHEDULING_LINK_PROVIDER_ACCEPTED",
            ),
            eq(
              producerRegistrationActivityTable.registrationId,
              registration.id,
            ),
            sql`${producerRegistrationActivityTable.after}->>'notificationId' = ${final.id}`,
          ),
        )
        .limit(1);
      const receiptAfter = receipt?.after as
        | { notificationId?: unknown; providerMessageId?: unknown }
        | undefined;
      assert.equal(receiptAfter?.notificationId, final.id);
      assert.ok(
        typeof receiptAfter?.providerMessageId === "string" &&
          receiptAfter.providerMessageId.length > 0,
        "Sent notification has no safe provider receipt.",
      );
      providerMessageId = receiptAfter.providerMessageId;

      const resendPollMs = Math.min(
        Math.max(
          Number(
            process.env.PRODUCER_SCHEDULING_RESEND_POLL_TIMEOUT_MS ?? 30_000,
          ),
          5_000,
        ),
        120_000,
      );
      const resendDeadline = Date.now() + resendPollMs;
      resendLookupState = "poll_timeout";
      while (Date.now() < resendDeadline) {
        try {
          const response = await fetch(
            `https://api.resend.com/emails/${encodeURIComponent(providerMessageId)}`,
            {
              headers: {
                Authorization: `Bearer ${process.env.RESEND_API_KEY!.trim()}`,
              },
              signal: AbortSignal.timeout(5_000),
            },
          );
          if (!response.ok) {
            resendLookupState = "provider_lookup_http_error";
            break;
          }
          const providerBody: unknown = await response.json().catch(() => ({}));
          const rawLastEvent =
            providerBody &&
            typeof providerBody === "object" &&
            typeof (providerBody as { last_event?: unknown }).last_event ===
              "string"
              ? (providerBody as { last_event: string }).last_event
              : null;
          // Never echo an arbitrary provider payload value. Only report the
          // documented, explicitly allowlisted delivery states.
          resendLastEvent =
            rawLastEvent && RESEND_KNOWN_EVENTS.has(rawLastEvent)
              ? rawLastEvent
              : "unknown";
          if (
            resendLastEvent === "unknown" ||
            RESEND_TERMINAL_EVENTS.has(resendLastEvent)
          ) {
            resendLookupState = "provider_terminal_event";
            break;
          }
        } catch {
          resendLookupState = "provider_lookup_transport_error";
          break;
        }
        await sleep(2_000);
      }
    }

    const deliveredVerified =
      resendLastEvent === "delivered" ||
      resendLastEvent === "opened" ||
      resendLastEvent === "clicked";
    console.log(
      JSON.stringify({
        fixture: {
          registrationId: registration.id,
          reference: registration.reference,
          notificationId: final.id,
        },
        request: {
          actionId: identity.actionId,
          replayed: replay.replayed,
          notificationCount: notifications.length,
        },
        delivery: {
          state: final.status,
          failureCode: final.failureCode,
          attemptCount: final.attemptCount,
          providerMessageId,
          resendLastEvent,
          resendLookupState,
          deliveredVerified,
        },
        calendly: {
          state: "blocked_missing_live_configuration_and_connection",
          fixtureRetainedForFutureRealBooking: true,
          syntheticIntakeAccepted: false,
        },
      }),
    );
  } finally {
    if (closeServer) await closeServer();
    if (actorId) {
      // The activity row is intentionally retained; its actor FK is ON DELETE
      // SET NULL, preserving the audit while safely removing temporary access.
      await db.delete(sessionsTable).where(eq(sessionsTable.userId, actorId));
      await db.delete(orgMembersTable).where(eq(orgMembersTable.userId, actorId));
      await db.delete(usersTable).where(eq(usersTable.id, actorId));
    }
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown acceptance harness error";
  console.error(`Producer scheduling acceptance failed: ${message}`);
  process.exitCode = 1;
});