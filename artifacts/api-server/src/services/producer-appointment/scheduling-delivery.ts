import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "../../lib/logger";

const MAX_ATTEMPTS = 4;
const CLAIM_LIMIT = 10;
const REQUEST_TIMEOUT_MS = 10_000;
const STALE_CLAIM_MS = 2 * 60_000;
// Resend currently retains idempotency keys for 24 hours. Stop short of that
// boundary rather than risk a late retry being interpreted as a fresh send.
const IDEMPOTENCY_RETRY_WINDOW_MS = 23 * 60 * 60_000;
const RETRY_DELAYS_MS = [30_000, 2 * 60_000, 10 * 60_000] as const;

export type SchedulingDeliveryGate =
  | { enabled: true; apiKey: string; from: string; recipients: string[] }
  | {
      enabled: false;
      failureCode:
        | "DELIVERY_NOT_ENABLED"
        | "DELIVERY_CONFIG_MISSING"
        | "RECIPIENT_NOT_ALLOWLISTED";
    };

export function normalizeSchedulingRecipient(value: string): string {
  return value.trim().toLowerCase();
}

export function schedulingDeliveryGate(
  recipientEmails: string[],
  env: NodeJS.ProcessEnv = process.env,
): SchedulingDeliveryGate {
  if (env.PRODUCER_SCHEDULING_DELIVERY_ENABLED !== "true") {
    return { enabled: false, failureCode: "DELIVERY_NOT_ENABLED" };
  }
  const apiKey = env.RESEND_API_KEY?.trim();
  const from = env.OUTBOUND_EMAIL_FROM?.trim();
  const allowed = new Set(
    (env.PRODUCER_SCHEDULING_TEST_RECIPIENTS ?? "")
      .split(",")
      .map(normalizeSchedulingRecipient)
      .filter(Boolean),
  );
  if (!apiKey || !from || allowed.size === 0) {
    return { enabled: false, failureCode: "DELIVERY_CONFIG_MISSING" };
  }
  const recipients = [...new Set(recipientEmails.map(normalizeSchedulingRecipient))];
  if (
    recipients.length === 0 ||
    recipients.some((recipient) => !allowed.has(recipient))
  ) {
    return { enabled: false, failureCode: "RECIPIENT_NOT_ALLOWLISTED" };
  }
  return { enabled: true, apiKey, from, recipients };
}

export function schedulingNotificationIdempotencyKey(id: string): string {
  return `producer-scheduling-${id}`;
}

type ClaimedNotification = {
  id: string;
  registrationId: string;
  recipientEmails: string[];
  subject: string;
  html: string;
  text: string;
  attemptCount: number;
  // node-postgres may return raw SQL timestamptz values as strings depending
  // on parser configuration; never assume Drizzle's column decoder ran here.
  createdAt: Date | string;
};

type ProviderResult =
  | { kind: "sent"; providerMessageId: string | null }
  | { kind: "retry"; failureCode: "PROVIDER_RATE_LIMITED" | "PROVIDER_UNAVAILABLE" }
  | { kind: "failed"; failureCode: "PROVIDER_REJECTED" | "DELIVERY_UNKNOWN" };

export async function deliverSchedulingNotification(
  notification: Pick<
    ClaimedNotification,
    "id" | "recipientEmails" | "subject" | "html" | "text"
  >,
  config: Extract<SchedulingDeliveryGate, { enabled: true }>,
  fetchImpl: typeof fetch = fetch,
): Promise<ProviderResult> {
  try {
    const response = await fetchImpl("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": schedulingNotificationIdempotencyKey(notification.id),
      },
      body: JSON.stringify({
        from: config.from,
        to: notification.recipientEmails,
        subject: notification.subject,
        html: notification.html,
        text: notification.text,
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const data: unknown = await response.json().catch(() => ({}));
    if (response.ok) {
      const id =
        data && typeof data === "object" && typeof (data as { id?: unknown }).id === "string"
          ? (data as { id: string }).id
          : null;
      return { kind: "sent", providerMessageId: id };
    }
    if (response.status === 429) {
      return { kind: "retry", failureCode: "PROVIDER_RATE_LIMITED" };
    }
    if (response.status === 408 || response.status >= 500) {
      return { kind: "retry", failureCode: "PROVIDER_UNAVAILABLE" };
    }
    return { kind: "failed", failureCode: "PROVIDER_REJECTED" };
  } catch {
    // The request may have reached Resend. Never automatically retry an
    // ambiguous transport result, even though the provider key is stable.
    return { kind: "failed", failureCode: "DELIVERY_UNKNOWN" };
  }
}

async function expireStaleClaims(
  now: Date,
  notificationId?: string,
): Promise<void> {
  const staleBefore = new Date(now.getTime() - STALE_CLAIM_MS);
  await db.execute(sql`
    UPDATE producer_notifications
    SET status = ${"failed"},
        failure_code = ${"DELIVERY_UNKNOWN"},
        sending_started_at = NULL,
        next_retry_at = NULL,
        updated_at = ${now}
    WHERE event = ${"scheduling_link"}
      AND status = ${"sending"}
      AND sending_started_at < ${staleBefore}
      ${notificationId ? sql`AND id = ${notificationId}` : sql``}
  `);
}

async function claimNotifications(
  now: Date,
  notificationId?: string,
): Promise<ClaimedNotification[]> {
  const result = await db.execute(sql`
    WITH candidates AS (
      SELECT id
      FROM producer_notifications
      WHERE event = ${"scheduling_link"}
        AND status = ${"pending"}
        AND available_at <= ${now}
        AND (next_retry_at IS NULL OR next_retry_at <= ${now})
        AND attempt_count < ${MAX_ATTEMPTS}
        ${notificationId ? sql`AND id = ${notificationId}` : sql``}
      ORDER BY available_at, created_at
      FOR UPDATE SKIP LOCKED
      LIMIT ${CLAIM_LIMIT}
    )
    UPDATE producer_notifications AS notification
    SET status = ${"sending"},
        attempt_count = notification.attempt_count + 1,
        sending_started_at = ${now},
        failure_code = NULL,
        updated_at = ${now}
    FROM candidates
    WHERE notification.id = candidates.id
    RETURNING notification.id,
      notification.registration_id AS "registrationId",
      notification.recipient_emails AS "recipientEmails",
      notification.subject,
      notification.html,
      notification.text,
      notification.attempt_count AS "attemptCount",
      notification.created_at AS "createdAt"
  `);
  return (result as unknown as { rows: ClaimedNotification[] }).rows;
}

async function registrationIsDeclined(registrationId: string): Promise<boolean> {
  const result = await db.execute(sql`
    SELECT decision
    FROM producer_registrations
    WHERE id = ${registrationId}
    LIMIT 1
  `);
  return (result as unknown as { rows: Array<{ decision: string }> }).rows[0]?.decision === "declined";
}

async function finish(
  notification: ClaimedNotification,
  result: ProviderResult,
  now: Date,
): Promise<void> {
  if (result.kind === "sent") {
    await db.transaction(async (tx) => {
      if (result.providerMessageId) {
        // Persist the provider receipt in the existing appointment audit table,
        // not template data. If stale-claim reconciliation raced the response,
        // the receipt remains durable while conservative state stays untouched.
        await tx.execute(sql`
          INSERT INTO producer_registration_activity (
            org_id, registration_id, actor_id, action, before, after
          )
          SELECT
            org_id,
            registration_id,
            NULL,
            ${"SCHEDULING_LINK_PROVIDER_ACCEPTED"},
            NULL,
            jsonb_build_object(
              'notificationId', id::text,
              'providerMessageId', ${result.providerMessageId}::text
            )
          FROM producer_notifications
          WHERE id = ${notification.id}
            AND NOT EXISTS (
              SELECT 1
              FROM producer_registration_activity
              WHERE action = ${"SCHEDULING_LINK_PROVIDER_ACCEPTED"}
                AND after->>'notificationId' = ${notification.id}
            )
        `);
      }
      await tx.execute(sql`
        UPDATE producer_notifications
        SET status = ${"sent"}, sent_at = ${now}, sending_started_at = NULL,
            next_retry_at = NULL, failure_code = NULL, updated_at = ${now}
        WHERE id = ${notification.id}
          AND status = ${"sending"}
          AND attempt_count = ${notification.attemptCount}
      `);
    });
    return;
  }
  const canRetry =
    result.kind === "retry" && notification.attemptCount < MAX_ATTEMPTS;
  const retryAt = canRetry
    ? new Date(
        now.getTime() +
          RETRY_DELAYS_MS[Math.min(notification.attemptCount - 1, RETRY_DELAYS_MS.length - 1)],
      )
    : null;
  await db.execute(sql`
    UPDATE producer_notifications
    SET status = ${canRetry ? "pending" : "failed"},
        failure_code = ${result.failureCode},
        sending_started_at = NULL,
        next_retry_at = ${retryAt},
        updated_at = ${now}
    WHERE id = ${notification.id}
      AND status = ${"sending"}
      AND attempt_count = ${notification.attemptCount}
  `);
}

function rawTimestamp(value: Date | string): Date {
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("INVALID_NOTIFICATION_TIMESTAMP");
  }
  return parsed;
}

export async function processProducerSchedulingDeliveries(options: {
  fetchImpl?: typeof fetch;
  now?: Date;
  env?: NodeJS.ProcessEnv;
  /** Test/repair scope; production sweeps intentionally omit it. */
  notificationId?: string;
} = {}): Promise<number> {
  const now = options.now ?? new Date();
  await expireStaleClaims(now, options.notificationId);
  const claimed = await claimNotifications(now, options.notificationId);
  for (const notification of claimed) {
    try {
      const createdAt = rawTimestamp(notification.createdAt);
      if (
        notification.attemptCount > 1 &&
        now.getTime() - createdAt.getTime() > IDEMPOTENCY_RETRY_WINDOW_MS
      ) {
        await db.execute(sql`
          UPDATE producer_notifications
          SET status = ${"failed"},
              failure_code = ${"PROVIDER_IDEMPOTENCY_WINDOW_EXPIRED"},
              sending_started_at = NULL, next_retry_at = NULL,
              updated_at = ${new Date()}
          WHERE id = ${notification.id}
            AND status = ${"sending"}
            AND attempt_count = ${notification.attemptCount}
        `);
        continue;
      }
      if (await registrationIsDeclined(notification.registrationId)) {
        await db.execute(sql`
          UPDATE producer_notifications
          SET status = ${"failed"}, failure_code = ${"REGISTRATION_DECLINED"},
              sending_started_at = NULL, next_retry_at = NULL,
              updated_at = ${new Date()}
          WHERE id = ${notification.id}
            AND status = ${"sending"}
            AND attempt_count = ${notification.attemptCount}
        `);
        continue;
      }
      const gate = schedulingDeliveryGate(
        notification.recipientEmails,
        options.env,
      );
      if (!gate.enabled) {
        await db.execute(sql`
          UPDATE producer_notifications
          SET status = ${"failed"}, failure_code = ${gate.failureCode},
              sending_started_at = NULL, next_retry_at = NULL, updated_at = ${new Date()}
          WHERE id = ${notification.id}
            AND status = ${"sending"}
            AND attempt_count = ${notification.attemptCount}
        `);
        continue;
      }
      const result = await deliverSchedulingNotification(
        notification,
        gate,
        options.fetchImpl,
      );
      await finish(notification, result, new Date());
      if (result.kind !== "failed") continue;
      logger.warn(
        { notificationId: notification.id, failureCode: result.failureCode },
        "Producer scheduling notification delivery failed",
      );
    } catch (error) {
      logger.error(
        { notificationId: notification.id, error },
        "Producer scheduling notification processing failed",
      );
      // Isolate poison rows so one malformed record cannot strand the rest of
      // the claimed batch. This fenced update cannot overwrite a newer claim.
      await db.execute(sql`
        UPDATE producer_notifications
        SET status = ${"failed"}, failure_code = ${"DELIVERY_PROCESSING_ERROR"},
            sending_started_at = NULL, next_retry_at = NULL, updated_at = ${new Date()}
        WHERE id = ${notification.id}
          AND status = ${"sending"}
          AND attempt_count = ${notification.attemptCount}
      `);
    }
  }
  return claimed.length;
}

/** Explicit single-sweep entry point for operational and live-test harnesses. */
export const runProducerSchedulingDeliverySweep =
  processProducerSchedulingDeliveries;