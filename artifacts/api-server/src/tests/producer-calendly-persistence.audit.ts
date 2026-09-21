import assert from "node:assert/strict";
import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { createServer, type Server } from "node:http";
import { test } from "node:test";
import express from "express";
import { pool } from "@workspace/db";
import { createProducerCalendlyRouter } from "../routes/producer-calendly.js";

const optIn = process.env.RUN_PRODUCER_CALENDLY_PERSISTENCE_AUDIT === "1";
const developmentOnly =
  process.env.NODE_ENV === "development" &&
  !process.env.REPLIT_DEPLOYMENT &&
  !process.env.REPLIT_DEPLOYMENT_ID;

if (optIn && !developmentOnly) {
  throw new Error(
    "producer Calendly persistence audit is restricted to the Development environment",
  );
}

type EventInput = {
  event: "invitee.created" | "invitee.canceled";
  createdAt: string;
  inviteeUri: string;
  scheduledEventUri: string;
  reference?: string;
  email: string;
  scheduledFor?: string;
};

type AuditEventRow = {
  id: string;
  event_name: string;
  outcome: string;
  staff_needs_review: boolean;
  registration_id: string | null;
  scheduled_event_uri: string;
};

const signingNowMs = Date.UTC(2030, 0, 1, 0, 0, 0);
const signingTimestamp = String(signingNowMs / 1000);

function closeServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
}

test(
  "Development opt-in: signed Calendly deliveries persist transactionally",
  { skip: !optIn ? "set RUN_PRODUCER_CALENDLY_PERSISTENCE_AUDIT=1 explicitly" : false },
  async () => {
    const secret = randomBytes(32).toString("hex");
    const runId = randomUUID();
    const eventTypeUri = `https://api.calendly.com/event_types/audit-${runId}`;
    const registrationIds: string[] = [];
    const eventUris: string[] = [];
    const fixtureOrgId = randomUUID();
    let fixtureOrgCreated = false;
    let server: Server | undefined;
    let endpoint = "";
    let createdEventCount = 0;
    let createdNotificationCount = 0;
    let cancellationResponseStatus: number | undefined;
    let cancellationResponseError: string | undefined;
    let replacementResponseStatus: number | undefined;
    let oldCancellationResponseStatus: number | undefined;
    const results: Record<string, string> = {};
    const cleanup = {
      events: 0,
      registrations: 0,
      notifications: 0,
      trustedOrganizations: 0,
      organizations: 0,
      residue: 0,
    };

    const reference = () =>
      `AXR-20300101-${randomBytes(3).toString("hex").toUpperCase()}`;
    const uri = (kind: "event" | "invitee") =>
      `https://api.calendly.com/${kind === "event" ? "scheduled_events" : "scheduled_events/audit/invitees"}/${randomUUID()}`;

    const rawPayload = (input: EventInput): string => JSON.stringify({
      event: input.event,
      created_at: input.createdAt,
      payload: {
        uri: input.inviteeUri,
        email: input.email,
        tracking: input.reference === undefined
          ? {}
          : { utm_content: input.reference },
        scheduled_event: {
          uri: input.scheduledEventUri,
          event_type: eventTypeUri,
          start_time: input.scheduledFor ?? "2030-01-02T15:00:00.000Z",
          location: { join_url: "https://meet.example.test/audit" },
        },
      },
    });

    const send = async (input: EventInput) => {
      const body = rawPayload(input);
      const digest = createHmac("sha256", secret)
        .update(signingTimestamp)
        .update(".")
        .update(body)
        .digest("hex");
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "calendly-webhook-signature":
            `t=${signingTimestamp},v1=${digest}`,
        },
        body,
      });
      const responseBody = await response.json() as {
        accepted?: boolean;
        duplicate?: boolean;
        error?: string;
      };
      return { status: response.status, body: responseBody };
    };

    const post = async (input: EventInput) => {
      const response = await send(input);
      assert.equal(
        response.status,
        202,
        `synthetic ${input.event} delivery failed: ${JSON.stringify(response.body)}`,
      );
      assert.equal(response.body.accepted, true, "webhook was not acknowledged");
      return response.body;
    };

    const insertRegistration = async (input: {
      reference: string;
      email: string;
      decision?: "pending" | "declined";
      decidedBy?: string;
    }) => {
      const declined = input.decision === "declined";
      const inserted = await pool.query<{ id: string }>(
        `INSERT INTO producer_registrations (
           org_id, reference, source, payload, submitted_at, decision,
           decided_at, decided_by, decline_reason
         ) VALUES (
           $1, $2, 'appointment_calendly_audit', $3::jsonb, now(), $4,
           $5, $6, $7
         )
         RETURNING id`,
        [
          orgId,
          input.reference,
          JSON.stringify({
            contact: { email: input.email },
            principal: { email: input.email },
          }),
          input.decision ?? "pending",
          declined ? new Date() : null,
          declined ? input.decidedBy : null,
          declined ? "Fictional audit registration" : null,
        ],
      );
      const id = inserted.rows[0]?.id;
      assert.ok(id, "audit registration insert returned no id");
      registrationIds.push(id);
      return id;
    };

    let orgId = "";
    try {
      assert.equal(
        developmentOnly,
        true,
        "audit writes require NODE_ENV=development outside a deployment",
      );

      const existingTrusted = await pool.query<{ org_id: string }>(
        `SELECT org_id
         FROM trusted_axel_organizations
         ORDER BY configured_at
         LIMIT 1`,
      );
      const legacyOrgId = existingTrusted.rows[0]?.org_id ?? "";
      assert.ok(legacyOrgId, "Development DB has no existing trusted organization");
      assert.doesNotMatch(
        legacyOrgId,
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        "expected the existing legacy trusted-org UUID to reproduce router rejection",
      );

      const legacyApp = express();
      legacyApp.use("/audit/calendly", createProducerCalendlyRouter({
        getSigningKey: () => secret,
        getEventUri: () => eventTypeUri,
        getOrgId: () => legacyOrgId,
        now: () => signingNowMs,
      }));
      server = createServer(legacyApp);
      await new Promise<void>((resolve) => server?.listen(0, "127.0.0.1", resolve));
      let address = server.address();
      assert.ok(address && typeof address !== "string", "legacy evidence server did not bind");
      endpoint = `http://127.0.0.1:${address.port}/audit/calendly`;
      const evidenceInput: EventInput = {
        event: "invitee.created",
        createdAt: "2030-01-01T09:00:00.000Z",
        inviteeUri: uri("invitee"),
        scheduledEventUri: uri("event"),
        reference: reference(),
        email: `calendly-legacy-evidence-${runId}@example.test`,
      };
      const evidenceBody = rawPayload(evidenceInput);
      const evidenceDigest = createHmac("sha256", secret)
        .update(signingTimestamp)
        .update(".")
        .update(evidenceBody)
        .digest("hex");
      const evidenceResponse = await fetch(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "calendly-webhook-signature":
            `t=${signingTimestamp},v1=${evidenceDigest}`,
        },
        body: evidenceBody,
      });
      assert.equal(
        evidenceResponse.status,
        503,
        "existing legacy trusted-org UUID no longer reproduces router rejection",
      );
      assert.deepEqual(await evidenceResponse.json(), {
        error: "calendly_not_configured",
      });
      results.legacyTrustedOrg = "existing trusted-org UUID reproducibly rejected with 503";
      await closeServer(server);
      server = undefined;

      await pool.query(
        `INSERT INTO organizations (id, name, type, status, metadata)
         VALUES ($1, $2, 'audit_fixture', 'ACTIVE', $3::jsonb)`,
        [
          fixtureOrgId,
          `Calendly persistence audit ${runId}`,
          JSON.stringify({ source: "appointment_calendly_audit", runId }),
        ],
      );
      fixtureOrgCreated = true;
      await pool.query(
        `INSERT INTO trusted_axel_organizations (org_id, note)
         VALUES ($1, 'Disposable producer Calendly persistence audit fixture')`,
        [fixtureOrgId],
      );
      orgId = fixtureOrgId;

      const user = await pool.query<{ id: string }>(
        "SELECT id FROM users ORDER BY created_at LIMIT 1",
      );
      const decidedBy = user.rows[0]?.id;
      assert.ok(decidedBy, "Development DB has no existing user for declined fixture");

      const mainReference = reference();
      const canceledFirstReference = reference();
      const ambiguousOneReference = reference();
      const ambiguousTwoReference = reference();
      const declinedReference = reference();
      const mainEmail = `calendly-main-${runId}@example.test`;
      const ambiguousEmail = `calendly-ambiguous-${runId}@example.test`;

      const mainId = await insertRegistration({
        reference: mainReference,
        email: mainEmail,
      });
      const canceledFirstId = await insertRegistration({
        reference: canceledFirstReference,
        email: `calendly-cancel-first-${runId}@example.test`,
      });
      await insertRegistration({
        reference: ambiguousOneReference,
        email: ambiguousEmail,
      });
      await insertRegistration({
        reference: ambiguousTwoReference,
        email: ambiguousEmail,
      });
      const declinedId = await insertRegistration({
        reference: declinedReference,
        email: `calendly-declined-${runId}@example.test`,
        decision: "declined",
        decidedBy,
      });

      const app = express();
      app.use("/audit/calendly", createProducerCalendlyRouter({
        getSigningKey: () => secret,
        getEventUri: () => eventTypeUri,
        getOrgId: () => orgId,
        now: () => signingNowMs,
      }));
      server = createServer(app);
      await new Promise<void>((resolve) => server?.listen(0, "127.0.0.1", resolve));
      address = server.address();
      assert.ok(address && typeof address !== "string", "ephemeral server did not bind");
      endpoint = `http://127.0.0.1:${address.port}/audit/calendly`;

      const firstEventUri = uri("event");
      const firstInviteeUri = uri("invitee");
      eventUris.push(firstEventUri);
      const firstCreate: EventInput = {
        event: "invitee.created",
        createdAt: "2030-01-01T10:00:00.000Z",
        inviteeUri: firstInviteeUri,
        scheduledEventUri: firstEventUri,
        reference: mainReference,
        email: mainEmail,
        scheduledFor: "2030-01-02T15:30:00.000Z",
      };
      const duplicateResponses = await Promise.all([
        post(firstCreate),
        post(firstCreate),
      ]);
      assert.equal(
        duplicateResponses.filter((response) => response.duplicate === true).length,
        1,
        "concurrent identical deliveries did not report exactly one duplicate",
      );

      const canonical = await pool.query<{
        call_scheduled_for: Date;
        calendly_event_uri: string;
        calendly_invitee_uri: string;
        event_uri: string;
        invitee_uri: string;
        scheduled_for: Date;
        active: boolean;
      }>(
        `SELECT r.call_scheduled_for, r.calendly_event_uri,
                r.calendly_invitee_uri, b.event_uri, b.invitee_uri,
                b.scheduled_for, b.active
         FROM producer_registrations r
         JOIN producer_calendly_bookings b ON b.registration_id = r.id
         WHERE r.id = $1`,
        [mainId],
      );
      assert.equal(canonical.rows.length, 1, "canonical booking row was not persisted");
      assert.equal(
        canonical.rows[0]?.call_scheduled_for.toISOString(),
        "2030-01-02T15:30:00.000Z",
        "registration canonical scheduled time differs from signed payload",
      );
      assert.equal(canonical.rows[0]?.scheduled_for.toISOString(), "2030-01-02T15:30:00.000Z");
      assert.equal(canonical.rows[0]?.calendly_event_uri, firstEventUri);
      assert.equal(canonical.rows[0]?.event_uri, firstEventUri);
      assert.equal(canonical.rows[0]?.calendly_invitee_uri, firstInviteeUri);
      assert.equal(canonical.rows[0]?.invitee_uri, firstInviteeUri);
      assert.equal(canonical.rows[0]?.active, true);
      const duplicateCount = await pool.query<{ count: string }>(
        "SELECT count(*)::text AS count FROM producer_calendly_events WHERE scheduled_event_uri = $1",
        [firstEventUri],
      );
      assert.equal(duplicateCount.rows[0]?.count, "1", "duplicate delivery persisted multiple events");
      results.concurrentIdentical = "one event and one canonical active booking";

      const cancelEventUri = uri("event");
      eventUris.push(cancelEventUri);
      const cancellationResponse = await send({
        event: "invitee.canceled",
        createdAt: "2030-01-01T10:10:00.000Z",
        inviteeUri: firstInviteeUri,
        scheduledEventUri: cancelEventUri,
        reference: mainReference,
        email: mainEmail,
      });
      cancellationResponseStatus = cancellationResponse.status;
      cancellationResponseError = cancellationResponse.body.error;
      if (cancellationResponse.status === 202) {
        const canceled = await pool.query<{
        call_scheduled_for: Date | null;
        calendly_event_uri: string | null;
        calendly_invitee_uri: string | null;
        active: boolean;
        status: string;
        failure_code: string | null;
        attempt_count: number;
        sent_at: Date | null;
        }>(
          `SELECT r.call_scheduled_for, r.calendly_event_uri,
                r.calendly_invitee_uri, b.active, n.status,
                n.failure_code, n.attempt_count, n.sent_at
         FROM producer_registrations r
         JOIN producer_calendly_bookings b ON b.registration_id = r.id
         JOIN producer_notifications n ON n.registration_id = r.id
           AND n.event = 'booking_canceled'
         WHERE r.id = $1`,
          [mainId],
        );
        assert.equal(canceled.rows.length, 1, "cancellation did not create one blocked notification");
        assert.equal(canceled.rows[0]?.call_scheduled_for, null);
        assert.equal(canceled.rows[0]?.calendly_event_uri, null);
        assert.equal(canceled.rows[0]?.calendly_invitee_uri, null);
        assert.equal(canceled.rows[0]?.active, false);
        assert.equal(canceled.rows[0]?.status, "blocked", "cancel notification was not blocked");
        assert.equal(canceled.rows[0]?.failure_code, "DELIVERY_NOT_ENABLED");
        assert.equal(canceled.rows[0]?.attempt_count, 0);
        assert.equal(canceled.rows[0]?.sent_at, null);
        results.cancellation = "canonical booking cleared; notification blocked";
      } else {
        results.cancellation =
          `FAILED status=${cancellationResponse.status} error=${cancellationResponse.body.error ?? "unknown"}`;
      }

      const newEventUri = uri("event");
      const newInviteeUri = uri("invitee");
      eventUris.push(newEventUri);
      const replacementResponse = await send({
        event: "invitee.created",
        createdAt: "2030-01-01T10:30:00.000Z",
        inviteeUri: newInviteeUri,
        scheduledEventUri: newEventUri,
        reference: mainReference,
        email: mainEmail,
        scheduledFor: "2030-01-03T16:00:00.000Z",
      });
      replacementResponseStatus = replacementResponse.status;
      const oldCancelEventUri = uri("event");
      eventUris.push(oldCancelEventUri);
      const oldCancellationResponse = await send({
        event: "invitee.canceled",
        createdAt: "2030-01-01T10:40:00.000Z",
        inviteeUri: firstInviteeUri,
        scheduledEventUri: oldCancelEventUri,
        reference: mainReference,
        email: mainEmail,
      });
      oldCancellationResponseStatus = oldCancellationResponse.status;
      if (replacementResponse.status === 202 && oldCancellationResponse.status === 202) {
        const afterOldCancellation = await pool.query<{
          calendly_invitee_uri: string;
          call_scheduled_for: Date;
          active: boolean;
        }>(
          `SELECT r.calendly_invitee_uri, r.call_scheduled_for, b.active
           FROM producer_registrations r
           JOIN producer_calendly_bookings b ON b.registration_id = r.id
           WHERE r.id = $1`,
          [mainId],
        );
        assert.equal(afterOldCancellation.rows[0]?.calendly_invitee_uri, newInviteeUri);
        assert.equal(afterOldCancellation.rows[0]?.call_scheduled_for.toISOString(), "2030-01-03T16:00:00.000Z");
        assert.equal(afterOldCancellation.rows[0]?.active, true);
        results.oldCancellation = "newer booking remained active";
      } else {
        results.oldCancellation =
          `FAILED replacement=${replacementResponse.status} oldCancel=${oldCancellationResponse.status}`;
      }

      const cancelFirstEventUri = uri("event");
      const cancelFirstInviteeUri = uri("invitee");
      eventUris.push(cancelFirstEventUri);
      await post({
        event: "invitee.canceled",
        createdAt: "2030-01-01T11:10:00.000Z",
        inviteeUri: cancelFirstInviteeUri,
        scheduledEventUri: cancelFirstEventUri,
        reference: canceledFirstReference,
        email: `calendly-cancel-first-${runId}@example.test`,
      });
      const staleCreateEventUri = uri("event");
      eventUris.push(staleCreateEventUri);
      await post({
        event: "invitee.created",
        createdAt: "2030-01-01T11:00:00.000Z",
        inviteeUri: cancelFirstInviteeUri,
        scheduledEventUri: staleCreateEventUri,
        reference: canceledFirstReference,
        email: `calendly-cancel-first-${runId}@example.test`,
        scheduledFor: "2030-01-04T17:00:00.000Z",
      });
      const canceledFirst = await pool.query<{
        call_scheduled_for: Date | null;
        booking_count: string;
      }>(
        `SELECT r.call_scheduled_for,
                (SELECT count(*)::text FROM producer_calendly_bookings b
                 WHERE b.registration_id = r.id) AS booking_count
         FROM producer_registrations r
         WHERE r.id = $1`,
        [canceledFirstId],
      );
      assert.equal(canceledFirst.rows[0]?.call_scheduled_for, null);
      assert.equal(canceledFirst.rows[0]?.booking_count, "0");
      results.cancelBeforeCreate = "stale create did not resurrect booking";

      const unmatchedEventUri = uri("event");
      eventUris.push(unmatchedEventUri);
      await post({
        event: "invitee.created",
        createdAt: "2030-01-01T12:00:00.000Z",
        inviteeUri: uri("invitee"),
        scheduledEventUri: unmatchedEventUri,
        reference: reference(),
        email: `calendly-unmatched-${runId}@example.test`,
      });
      const ambiguousEventUri = uri("event");
      eventUris.push(ambiguousEventUri);
      await post({
        event: "invitee.created",
        createdAt: "2030-01-01T12:10:00.000Z",
        inviteeUri: uri("invitee"),
        scheduledEventUri: ambiguousEventUri,
        email: ambiguousEmail,
      });
      const declinedEventUri = uri("event");
      eventUris.push(declinedEventUri);
      await post({
        event: "invitee.created",
        createdAt: "2030-01-01T12:20:00.000Z",
        inviteeUri: uri("invitee"),
        scheduledEventUri: declinedEventUri,
        reference: declinedReference,
        email: `calendly-declined-${runId}@example.test`,
      });

      const reviewed = await pool.query<AuditEventRow>(
        `SELECT id, event_name, outcome, staff_needs_review,
                registration_id, scheduled_event_uri
         FROM producer_calendly_events
         WHERE scheduled_event_uri = ANY($1::text[])`,
        [[unmatchedEventUri, ambiguousEventUri, declinedEventUri]],
      );
      const byUri = new Map(reviewed.rows.map((row) => [row.scheduled_event_uri, row]));
      assert.equal(byUri.get(unmatchedEventUri)?.outcome, "unmatched");
      assert.equal(byUri.get(unmatchedEventUri)?.staff_needs_review, true);
      assert.equal(byUri.get(ambiguousEventUri)?.outcome, "ambiguous");
      assert.equal(byUri.get(ambiguousEventUri)?.staff_needs_review, true);
      assert.equal(byUri.get(declinedEventUri)?.outcome, "unmatched");
      assert.equal(byUri.get(declinedEventUri)?.staff_needs_review, true);
      assert.equal(byUri.get(declinedEventUri)?.registration_id, null);
      const declinedState = await pool.query<{
        decision: string;
        call_scheduled_for: Date | null;
        booking_count: string;
      }>(
        `SELECT r.decision, r.call_scheduled_for,
                (SELECT count(*)::text FROM producer_calendly_bookings b
                 WHERE b.registration_id = r.id) AS booking_count
         FROM producer_registrations r
         WHERE r.id = $1`,
        [declinedId],
      );
      assert.equal(declinedState.rows[0]?.decision, "declined");
      assert.equal(declinedState.rows[0]?.call_scheduled_for, null);
      assert.equal(declinedState.rows[0]?.booking_count, "0");
      results.review = "unmatched, ambiguous, and declined events require staff review";

      const allEvents = await pool.query<AuditEventRow>(
        `SELECT id, event_name, outcome, staff_needs_review,
                registration_id, scheduled_event_uri
         FROM producer_calendly_events
         WHERE scheduled_event_uri = ANY($1::text[])`,
        [eventUris],
      );
      createdEventCount = allEvents.rows.length;
      createdNotificationCount = Number((await pool.query<{ count: string }>(
        `SELECT count(*)::text AS count
         FROM producer_notifications
         WHERE registration_id = ANY($1::uuid[])`,
        [registrationIds],
      )).rows[0]?.count ?? "0");
      if (replacementResponse.status === 202 && oldCancellationResponse.status === 202) {
        assert.deepEqual(
          allEvents.rows
            .filter((row) => row.scheduled_event_uri === oldCancelEventUri)
            .map((row) => row.outcome),
          ["ignored_noncurrent_cancellation"],
        );
      }
      assert.deepEqual(
        allEvents.rows
          .filter((row) => row.scheduled_event_uri === staleCreateEventUri)
          .map((row) => row.outcome),
        ["ignored_stale"],
      );
    } finally {
      if (server) await closeServer(server);

      if (registrationIds.length > 0) {
        const removedNotifications = await pool.query(
          `DELETE FROM producer_notifications
           WHERE registration_id = ANY($1::uuid[])`,
          [registrationIds],
        );
        cleanup.notifications = removedNotifications.rowCount ?? 0;
      }
      if (eventUris.length > 0) {
        const removedEvents = await pool.query(
          `DELETE FROM producer_calendly_events
           WHERE scheduled_event_uri = ANY($1::text[])`,
          [eventUris],
        );
        cleanup.events = removedEvents.rowCount ?? 0;
      }
      if (registrationIds.length > 0) {
        const removedRegistrations = await pool.query(
          `DELETE FROM producer_registrations
           WHERE id = ANY($1::uuid[])
             AND reference LIKE 'AXR-20300101-%'
             AND source = 'appointment_calendly_audit'`,
          [registrationIds],
        );
        cleanup.registrations = removedRegistrations.rowCount ?? 0;
      }
      if (fixtureOrgCreated) {
        const removedTrust = await pool.query(
          `DELETE FROM trusted_axel_organizations WHERE org_id = $1`,
          [fixtureOrgId],
        );
        cleanup.trustedOrganizations = removedTrust.rowCount ?? 0;
        const removedOrg = await pool.query(
          `DELETE FROM organizations
           WHERE id = $1
             AND type = 'audit_fixture'
             AND metadata->>'source' = 'appointment_calendly_audit'`,
          [fixtureOrgId],
        );
        cleanup.organizations = removedOrg.rowCount ?? 0;
      }

      const residue = await pool.query<{ count: string }>(
        `SELECT (
           (SELECT count(*) FROM producer_registrations
            WHERE id = ANY($1::uuid[]))
           + (SELECT count(*) FROM producer_calendly_events
              WHERE scheduled_event_uri = ANY($2::text[]))
           + (SELECT count(*) FROM producer_notifications
              WHERE registration_id = ANY($1::uuid[]))
           + (SELECT count(*) FROM trusted_axel_organizations
              WHERE org_id = $3)
           + (SELECT count(*) FROM organizations WHERE id = $3)
         )::text AS count`,
        [registrationIds, eventUris, fixtureOrgId],
      );
      cleanup.residue = Number(residue.rows[0]?.count ?? "0");
      assert.equal(cleanup.residue, 0, "exact disposable audit fixture residue remains");

      console.log(JSON.stringify({
        audit: "producer_calendly_persistence",
        results,
        counts: {
          registrations: registrationIds.length,
          events: createdEventCount,
          notifications: createdNotificationCount,
        },
        cleanup,
      }));
    }

    assert.equal(cleanup.registrations, registrationIds.length, "not all exact audit registrations were cleaned");
    assert.equal(cleanup.events, createdEventCount, "not all exact synthetic events were cleaned");
    assert.equal(cleanup.notifications, createdNotificationCount, "not all exact audit notifications were cleaned");
    assert.equal(cleanup.trustedOrganizations, 1, "disposable trusted-org row was not cleaned");
    assert.equal(cleanup.organizations, 1, "disposable organization row was not cleaned");
    assert.deepEqual(
      {
        cancellation: cancellationResponseStatus,
        replacement: replacementResponseStatus,
        oldCancellation: oldCancellationResponseStatus,
      },
      { cancellation: 202, replacement: 202, oldCancellation: 202 },
      `booked-registration transitions failed; cancellation error: ${cancellationResponseError ?? "unknown error"}`,
    );
  },
);