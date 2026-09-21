import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { createServer, type Server } from "node:http";
import { afterEach, describe, it } from "node:test";
import express from "express";
import {
  matchRegistration,
  normalizePersistedTimestamp,
  parseCalendlyWebhook,
  shouldApplyBookingCancellation,
  shouldApplyBookingCreate,
  verifyCalendlySignature,
} from "../services/producer-appointment/calendly.js";
import { createProducerCalendlyRouter } from "../routes/producer-calendly.js";

const secret = "calendly-unit-test-secret";
const eventUri = "https://api.calendly.com/event_types/AAAAAAAAAAAAAAAA";
const orgId = "11111111-1111-4111-8111-111111111111";
const nowMs = 1_700_000_000_000;
const servers: Server[] = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>(
    (resolve, reject) => server.close((error) => error ? reject(error) : resolve()),
  )));
});

function payload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    event: "invitee.created",
    created_at: "2023-11-14T22:13:20.000Z",
    payload: {
      uri: "https://api.calendly.com/scheduled_events/EVENT/invitees/INVITEE",
      email: "Applicant@Example.com",
      tracking: { utm_content: "AXR-20231114-ABC123" },
      scheduled_event: {
        uri: "https://api.calendly.com/scheduled_events/EVENT",
        event_type: eventUri,
        start_time: "2023-11-15T15:00:00.000Z",
        location: { join_url: "https://zoom.us/j/123" },
      },
    },
    ...overrides,
  };
}

function signature(body: string | Buffer, timestamp = "1700000000"): string {
  const digest = createHmac("sha256", secret)
    .update(timestamp)
    .update(".")
    .update(body)
    .digest("hex");
  return `t=${timestamp},v1=${digest}`;
}

async function start(options: Parameters<typeof createProducerCalendlyRouter>[0] = {}) {
  const app = express();
  app.use("/api/webhooks/calendly", createProducerCalendlyRouter({
    getSigningKey: () => secret,
    getEventUri: () => eventUri,
    getOrgId: () => orgId,
    now: () => nowMs,
    processEvent: async () => ({ outcome: "booking_updated" }),
    ...options,
  }));
  const server = createServer(app);
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert(address && typeof address !== "string");
  return `http://127.0.0.1:${address.port}/api/webhooks/calendly`;
}

async function post(url: string, body: string | Buffer, header = signature(body)) {
  return fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "calendly-webhook-signature": header,
    },
    body,
  });
}

describe("Calendly pure service", () => {
  it("authenticates timestamp.raw-body exactly and enforces the five-minute window", () => {
    const rawBody = Buffer.from('{ "event": "invitee.created" }');
    assert.equal(verifyCalendlySignature({
      rawBody,
      header: signature(rawBody),
      secret,
      nowMs,
    }), true);
    assert.equal(verifyCalendlySignature({
      rawBody: Buffer.from('{"event":"invitee.created"}'),
      header: signature(rawBody),
      secret,
      nowMs,
    }), false);
    assert.equal(verifyCalendlySignature({
      rawBody,
      header: signature(rawBody, "1699999699"),
      secret,
      nowMs,
    }), false);
  });

  it("parses only explicit event-type identity and safe meeting URLs", () => {
    const parsed = parseCalendlyWebhook(payload());
    assert.equal(parsed.eventTypeUri, eventUri);
    assert.equal(parsed.meetingUrl, "https://zoom.us/j/123");
    assert.equal(parseCalendlyWebhook(payload({
      payload: {
        ...(payload().payload as Record<string, unknown>),
        scheduled_event: {
          ...((payload().payload as Record<string, unknown>).scheduled_event as object),
          location: { join_url: "http://example.com/meeting" },
        },
      },
    })).meetingUrl, null);
    assert.equal(parseCalendlyWebhook(payload({
      payload: {
        ...(payload().payload as Record<string, unknown>),
        scheduled_event: {
          ...((payload().payload as Record<string, unknown>).scheduled_event as object),
          location: { join_url: "javascript:alert(1)" },
        },
      },
    })).meetingUrl, null);
    assert.throws(() => parseCalendlyWebhook(payload({
      payload: {
        uri: "invitee",
        scheduled_event: { uri: "event", start_time: new Date().toISOString() },
      },
    })), /invalid_event_type/);
  });

  it("never falls back from an unknown supplied reference to an email", () => {
    const registration = {
      id: "registration-1",
      orgId,
      reference: "AXR-20231114-ABC123",
    };
    assert.deepEqual(matchRegistration({
      reference: "AXR-20231114-UNKNOWN",
      email: "applicant@example.com",
      byReference: [],
      byEmail: [registration],
    }), { kind: "unmatched", reason: "unknown_reference" });
  });

  it("requires email correlation to be unique", () => {
    const first = { id: "one", orgId, reference: "AXR-20231114-ABC123" };
    const second = { id: "two", orgId, reference: "AXR-20231114-DEF456" };
    assert.deepEqual(matchRegistration({
      reference: null,
      email: "same@example.com",
      byReference: [],
      byEmail: [first, second],
    }), { kind: "ambiguous" });
  });

  it("prevents duplicates and cancellation-before-create from resurrecting a booking", () => {
    const createdAt = new Date("2023-11-14T22:10:00Z");
    assert.equal(shouldApplyBookingCreate({
      incomingSourceEventAt: createdAt,
      currentSourceEventAt: createdAt,
      canceledAtOrAfterIncoming: false,
    }), false);
    assert.equal(shouldApplyBookingCreate({
      incomingSourceEventAt: createdAt,
      currentSourceEventAt: null,
      canceledAtOrAfterIncoming: true,
    }), false);
  });

  it("allows cancellation only for the active matching invitee and never an older event", () => {
    const current = {
      inviteeUri: "invitee-new",
      sourceEventAt: new Date("2023-11-14T22:10:00Z"),
      active: true,
    };
    assert.equal(shouldApplyBookingCancellation({
      incomingInviteeUri: "invitee-old",
      incomingSourceEventAt: new Date("2023-11-14T22:20:00Z"),
      current,
    }), false);
    assert.equal(shouldApplyBookingCancellation({
      incomingInviteeUri: "invitee-new",
      incomingSourceEventAt: new Date("2023-11-14T22:00:00Z"),
      current,
    }), false);
    assert.equal(shouldApplyBookingCancellation({
      incomingInviteeUri: "invitee-new",
      incomingSourceEventAt: new Date("2023-11-14T22:20:00Z"),
      current,
    }), true);
  });

  it("normalizes raw-SQL timestamp strings before booking ordering comparisons", () => {
    const normalized = normalizePersistedTimestamp(
      "2023-11-14 22:10:00+00",
      "booking_source_event_at",
    );
    assert.ok(normalized instanceof Date);
    assert.equal(normalized.toISOString(), "2023-11-14T22:10:00.000Z");
    assert.equal(shouldApplyBookingCreate({
      incomingSourceEventAt: new Date("2023-11-14T22:20:00Z"),
      currentSourceEventAt: normalized,
      canceledAtOrAfterIncoming: false,
    }), true);
    assert.throws(
      () => normalizePersistedTimestamp("not-a-timestamp", "booking_source_event_at"),
      /invalid_persisted_booking_source_event_at/,
    );
  });
});

describe("Calendly raw webhook route", () => {
  it("rejects tampering and accepts the exact signed bytes", async () => {
    const url = await start();
    const body = JSON.stringify(payload());
    assert.equal((await post(url, body)).status, 202);
    assert.equal((await post(url, `${body} `, signature(body))).status, 401);
  });

  it("is unavailable when the signing key is absent", async () => {
    const url = await start({ getSigningKey: () => undefined });
    const body = JSON.stringify(payload());
    assert.equal((await post(url, body)).status, 503);
  });

  it("accepts a PostgreSQL UUID without RFC version bits for trusted-org lookup", async () => {
    const legacyOrgId = "11111111-1111-0111-0111-111111111111";
    let processedOrgId: string | undefined;
    const url = await start({
      getOrgId: () => legacyOrgId,
      processEvent: async (_event, context) => {
        processedOrgId = context.orgId;
        return { outcome: "booking_updated" };
      },
    });
    const body = JSON.stringify(payload());
    assert.equal((await post(url, body)).status, 202);
    assert.equal(processedOrgId, legacyOrgId);
  });

  it("acknowledges unsupported events and configured event-type mismatches", async () => {
    const url = await start();
    const unsupportedBody = JSON.stringify({ event: "routing_form_submission.created" });
    const unsupported = await post(url, unsupportedBody);
    assert.equal(unsupported.status, 202);
    assert.equal((await unsupported.json() as { ignored: string }).ignored, "unsupported_event");

    const mismatchedBody = JSON.stringify(payload({
      payload: {
        ...(payload().payload as Record<string, unknown>),
        scheduled_event: {
          ...((payload().payload as Record<string, unknown>).scheduled_event as object),
          event_type: "https://api.calendly.com/event_types/OTHER",
        },
      },
    }));
    const mismatched = await post(url, mismatchedBody);
    assert.equal(mismatched.status, 202);
    assert.equal((await mismatched.json() as { ignored: string }).ignored, "event_type_mismatch");
  });

  it("rejects authenticated malformed data without echoing payload contents", async () => {
    const url = await start();
    const response = await post(url, '{"secret":"do-not-echo"');
    assert.equal(response.status, 422);
    assert.deepEqual(await response.json(), { error: "invalid_calendly_event" });
  });
});