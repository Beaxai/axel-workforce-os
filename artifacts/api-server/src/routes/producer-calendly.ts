import { createHash } from "node:crypto";
import { Router, type IRouter, type Request, type Response } from "express";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  enqueueProducerNotification,
  type ProducerNotificationTransaction,
} from "../services/producer-appointment/notifications";
import { safeApplicantRecipientEmails } from "../services/producer-appointment/review";
import {
  matchRegistration,
  normalizeEmail,
  normalizeReference,
  parseCalendlyWebhook,
  shouldApplyBookingCancellation,
  shouldApplyBookingCreate,
  verifyCalendlySignature,
  type CalendlyWebhook,
  type RegistrationMatch,
} from "../services/producer-appointment/calendly";

const MAX_BODY_BYTES = 256 * 1024;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type QueryResult<T> = { rows: T[] };
type Transaction = {
  execute<T>(query: unknown): Promise<QueryResult<T>>;
};

export type ProducerNotificationInput = {
  orgId: string;
  registrationId: string;
  event: "booking_canceled" | "unmatched_booking";
  dedupeKey: string;
  recipientEmails: string[];
  data: { reference?: string; schedulingUrl?: string };
};

export type CalendlyProcessResult = {
  duplicate?: boolean;
  outcome: string;
};

export type ProducerCalendlyRouterOptions = {
  getSigningKey?: () => string | undefined;
  getEventUri?: () => string | undefined;
  getOrgId?: () => string | undefined;
  now?: () => number;
  processEvent?: (
    event: CalendlyWebhook,
    context: { orgId: string; payloadHash: string },
  ) => Promise<CalendlyProcessResult>;
};

class CalendlyConfigurationError extends Error {}

async function registrationCandidates(
  tx: Transaction,
  orgId: string,
  event: CalendlyWebhook,
): Promise<{ byReference: RegistrationMatch[]; byEmail: RegistrationMatch[] }> {
  const byReference = event.reference === null
    ? []
    : (await tx.execute<RegistrationMatch>(sql`
        SELECT id, org_id AS "orgId", reference
        FROM producer_registrations
        WHERE org_id = ${orgId}
          AND decision <> 'declined'
          AND upper(btrim(reference)) = ${normalizeReference(event.reference)}
      `)).rows;

  if (event.reference !== null || event.inviteeEmail === null) {
    return { byReference, byEmail: [] };
  }

  const email = normalizeEmail(event.inviteeEmail);
  const byEmail = (await tx.execute<RegistrationMatch>(sql`
    SELECT id, org_id AS "orgId", reference
    FROM producer_registrations
    WHERE org_id = ${orgId}
      AND decision <> 'declined'
      AND (
        lower(btrim(payload #>> '{contact,email}')) = ${email}
        OR lower(btrim(payload #>> '{principal,email}')) = ${email}
      )
  `)).rows;
  return { byReference, byEmail };
}

async function persistCalendlyEvent(
  event: CalendlyWebhook,
  context: { orgId: string; payloadHash: string },
  enqueueProducerNotification?: (
    tx: ProducerNotificationTransaction,
    input: ProducerNotificationInput,
  ) => Promise<void>,
): Promise<CalendlyProcessResult> {
  return db.transaction(async (databaseTx) => {
    const tx = databaseTx as unknown as Transaction;
    const trustedOrg = (await tx.execute<{ orgId: string }>(sql`
      SELECT org_id AS "orgId"
      FROM trusted_axel_organizations
      WHERE org_id = ${context.orgId}
      FOR SHARE
    `)).rows[0];
    if (!trustedOrg) throw new CalendlyConfigurationError("untrusted_calendly_org");

    const inserted = (await tx.execute<{ id: string }>(sql`
      INSERT INTO producer_calendly_events (
        org_id, event_name, payload_hash, invitee_uri, scheduled_event_uri,
        source_event_at, outcome, sanitized_data
      ) VALUES (
        ${context.orgId}, ${event.event}, ${context.payloadHash}, ${event.inviteeUri},
        ${event.scheduledEventUri}, ${event.sourceEventAt}, 'received',
        ${JSON.stringify({
          reference: event.reference,
          eventTypeUri: event.eventTypeUri,
          inviteeEmail: event.inviteeEmail,
        })}::jsonb
      )
      ON CONFLICT (payload_hash) DO NOTHING
      RETURNING id
    `)).rows[0];
    if (!inserted) return { duplicate: true, outcome: "duplicate" };

    const candidates = await registrationCandidates(tx, context.orgId, event);
    const match = matchRegistration({
      reference: event.reference,
      email: event.inviteeEmail,
      ...candidates,
    });
    if (match.kind !== "matched") {
      const outcome = match.kind === "ambiguous" ? "ambiguous" : "unmatched";
      const reviewReason = match.kind === "ambiguous"
        ? "Multiple active registrations matched the booking"
        : match.reason === "unknown_reference"
          ? "The supplied registration reference was not found"
          : "No active registration matched the booking";
      await tx.execute(sql`
        UPDATE producer_calendly_events
        SET outcome = ${outcome},
            staff_needs_review = true,
            sanitized_data = sanitized_data || ${JSON.stringify({ reviewReason })}::jsonb
        WHERE id = ${inserted.id}
      `);
      return { outcome };
    }

    const registration = match.registration;
    const lockedRegistration = (await tx.execute<{ payload: unknown }>(sql`
      SELECT payload FROM producer_registrations
      WHERE id = ${registration.id} AND org_id = ${context.orgId}
      FOR UPDATE
    `)).rows[0];
    if (!lockedRegistration) {
      throw new Error("matched_registration_outside_scope");
    }
    await tx.execute(sql`
      UPDATE producer_calendly_events
      SET registration_id = ${registration.id},
          outcome = 'matched',
          sanitized_data = sanitized_data || ${JSON.stringify({
            matchMethod: match.method,
            reference: registration.reference,
          })}::jsonb
      WHERE id = ${inserted.id}
    `);

    const current = (await tx.execute<{
      inviteeUri: string;
      sourceEventAt: Date;
      active: boolean;
    }>(sql`
      SELECT invitee_uri AS "inviteeUri", source_event_at AS "sourceEventAt", active
      FROM producer_calendly_bookings
      WHERE registration_id = ${registration.id}
      FOR UPDATE
    `)).rows[0];

    if (event.event === "invitee.created") {
      const laterCancellation = (await tx.execute<{ found: boolean }>(sql`
        SELECT true AS found
        FROM producer_calendly_events
        WHERE event_name = 'invitee.canceled'
          AND org_id = ${context.orgId}
          AND invitee_uri = ${event.inviteeUri}
          AND source_event_at >= ${event.sourceEventAt}
        LIMIT 1
      `)).rows[0];
      if (!shouldApplyBookingCreate({
        incomingSourceEventAt: event.sourceEventAt,
        currentSourceEventAt: current?.sourceEventAt ?? null,
        canceledAtOrAfterIncoming: Boolean(laterCancellation),
      })) {
        await tx.execute(sql`
          UPDATE producer_calendly_events SET outcome = 'ignored_stale'
          WHERE id = ${inserted.id}
        `);
        return { outcome: "ignored_stale" };
      }

      await tx.execute(sql`
        INSERT INTO producer_calendly_bookings (
          registration_id, org_id, event_uri, invitee_uri, scheduled_for,
          meeting_url, source_event_at, active, updated_at
        ) VALUES (
          ${registration.id}, ${context.orgId}, ${event.scheduledEventUri},
          ${event.inviteeUri}, ${event.scheduledFor}, ${event.meetingUrl},
          ${event.sourceEventAt}, true, now()
        )
        ON CONFLICT (registration_id) DO UPDATE SET
          org_id = EXCLUDED.org_id,
          event_uri = EXCLUDED.event_uri,
          invitee_uri = EXCLUDED.invitee_uri,
          scheduled_for = EXCLUDED.scheduled_for,
          meeting_url = EXCLUDED.meeting_url,
          source_event_at = EXCLUDED.source_event_at,
          active = true,
          updated_at = now()
      `);
      await tx.execute(sql`
        UPDATE producer_registrations
        SET call_scheduled_for = ${event.scheduledFor},
            calendly_event_uri = ${event.scheduledEventUri},
            calendly_invitee_uri = ${event.inviteeUri},
            updated_at = now()
        WHERE id = ${registration.id}
          AND org_id = ${context.orgId}
      `);
      await tx.execute(sql`
        UPDATE producer_calendly_events SET outcome = 'booking_updated'
        WHERE id = ${inserted.id}
      `);
      return { outcome: "booking_updated" };
    }

    const canCancel = shouldApplyBookingCancellation({
      incomingInviteeUri: event.inviteeUri,
      incomingSourceEventAt: event.sourceEventAt,
      current: current ?? null,
    });
    if (!canCancel) {
      await tx.execute(sql`
        UPDATE producer_calendly_events SET outcome = 'ignored_noncurrent_cancellation'
        WHERE id = ${inserted.id}
      `);
      return { outcome: "ignored_noncurrent_cancellation" };
    }

    await tx.execute(sql`
      UPDATE producer_calendly_bookings
      SET active = false, source_event_at = ${event.sourceEventAt}, updated_at = now()
      WHERE registration_id = ${registration.id}
    `);
    await tx.execute(sql`
      UPDATE producer_registrations
      SET call_scheduled_for = NULL,
          calendly_event_uri = NULL,
          calendly_invitee_uri = NULL,
          updated_at = now()
      WHERE id = ${registration.id}
        AND org_id = ${context.orgId}
        AND calendly_invitee_uri = ${event.inviteeUri}
    `);
    await tx.execute(sql`
      UPDATE producer_calendly_events SET outcome = 'booking_canceled'
      WHERE id = ${inserted.id}
    `);
    if (enqueueProducerNotification) {
      const recipientEmails = safeApplicantRecipientEmails(
        lockedRegistration.payload,
      );
      if (recipientEmails.length > 0) {
        await enqueueProducerNotification(databaseTx, {
          orgId: context.orgId,
          registrationId: registration.id,
          event: "booking_canceled",
          dedupeKey: `calendly-canceled:${context.payloadHash}`,
          recipientEmails,
          data: {
            reference: registration.reference,
            schedulingUrl: `https://calendly.com/axelworkforcesolutions/30min?utm_content=${encodeURIComponent(registration.reference)}`,
          },
        });
      } else {
        await tx.execute(sql`
          UPDATE producer_calendly_events
          SET staff_needs_review = true,
              sanitized_data = sanitized_data || '{"reviewReason":"No validated applicant notification email is available"}'::jsonb
          WHERE id = ${inserted.id}
        `);
      }
    }
    return { outcome: "booking_canceled" };
  });
}

function consumeRawBody(
  req: Request,
  res: Response,
  next: (error?: unknown) => void,
): void {
  if (req.get("Content-Encoding")) {
    res.status(415).json({ error: "content_encoding_not_supported" });
    return;
  }
  const declaredLength = Number(req.get("Content-Length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    res.status(413).json({ error: "payload_too_large" });
    return;
  }

  const chunks: Buffer[] = [];
  let size = 0;
  let responded = false;
  req.on("data", (chunk: Buffer) => {
    if (responded) return;
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      responded = true;
      res.status(413).json({ error: "payload_too_large" });
      return;
    }
    chunks.push(chunk);
  });
  req.on("end", () => {
    if (responded) return;
    (req as Request & { rawBody: Buffer }).rawBody = Buffer.concat(chunks, size);
    next();
  });
  req.on("error", next);
}

export function createProducerCalendlyRouter(
  options: ProducerCalendlyRouterOptions = {},
): IRouter {
  const router = Router();
  const getSigningKey = options.getSigningKey ?? (() => process.env.CALENDLY_SIGNING_KEY);
  const getEventUri = options.getEventUri ?? (() => process.env.CALENDLY_EVENT_URI);
  const getOrgId = options.getOrgId ?? (() => process.env.PRODUCER_CALENDLY_ORG_ID);
  const now = options.now ?? Date.now;
  const processEvent = options.processEvent ??
    ((event, context) =>
      persistCalendlyEvent(event, context, enqueueProducerNotification));

  router.post("/", consumeRawBody, async (req, res): Promise<void> => {
    const signingKey = getSigningKey();
    const configuredEventUri = getEventUri();
    const orgId = getOrgId();
    if (!signingKey || !configuredEventUri || !orgId || !UUID_PATTERN.test(orgId)) {
      res.status(503).json({ error: "calendly_not_configured" });
      return;
    }

    const rawBody = (req as Request & { rawBody: Buffer }).rawBody;
    if (!verifyCalendlySignature({
      rawBody,
      header: req.get("Calendly-Webhook-Signature"),
      secret: signingKey,
      nowMs: now(),
    })) {
      res.status(401).json({ error: "invalid_signature" });
      return;
    }

    let decoded: unknown;
    try {
      decoded = JSON.parse(rawBody.toString("utf8"));
    } catch {
      res.status(422).json({ error: "invalid_calendly_event" });
      return;
    }

    const eventName = decoded && typeof decoded === "object" && !Array.isArray(decoded)
      ? (decoded as Record<string, unknown>).event
      : undefined;
    if (typeof eventName === "string" &&
        eventName !== "invitee.created" &&
        eventName !== "invitee.canceled") {
      res.status(202).json({ accepted: true, ignored: "unsupported_event" });
      return;
    }

    let event: CalendlyWebhook;
    try {
      event = parseCalendlyWebhook(decoded);
    } catch {
      res.status(422).json({ error: "invalid_calendly_event" });
      return;
    }
    if (event.eventTypeUri !== configuredEventUri) {
      res.status(202).json({ accepted: true, ignored: "event_type_mismatch" });
      return;
    }

    const payloadHash = createHash("sha256").update(rawBody).digest("hex");
    try {
      const result = await processEvent(event, { orgId, payloadHash });
      res.status(202).json({ accepted: true, duplicate: result.duplicate === true });
    } catch (error) {
      if (error instanceof CalendlyConfigurationError) {
        res.status(503).json({ error: "calendly_not_configured" });
        return;
      }
      res.status(500).json({ error: "calendly_event_processing_failed" });
    }
  });

  return router;
}

export default createProducerCalendlyRouter();