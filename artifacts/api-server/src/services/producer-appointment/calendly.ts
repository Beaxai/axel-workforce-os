import { createHmac, timingSafeEqual } from "node:crypto";

export const CALENDLY_SIGNATURE_TOLERANCE_SECONDS = 5 * 60;

export type CalendlyWebhook = {
  event: string;
  sourceEventAt: Date;
  eventTypeUri: string;
  inviteeUri: string;
  scheduledEventUri: string;
  scheduledFor: Date | null;
  meetingUrl: string | null;
  reference: string | null;
  inviteeEmail: string | null;
};

export type RegistrationMatch = {
  id: string;
  orgId: string;
  reference: string;
};

export type MatchResult =
  | { kind: "matched"; registration: RegistrationMatch; method: "reference" | "email" }
  | { kind: "unmatched"; reason: "unknown_reference" | "no_match" }
  | { kind: "ambiguous" };

export function normalizePersistedTimestamp(value: unknown, field: string): Date {
  const timestamp = value instanceof Date
    ? new Date(value.getTime())
    : typeof value === "string"
      ? new Date(value)
      : null;
  if (timestamp === null || !Number.isFinite(timestamp.getTime())) {
    throw new Error(`invalid_persisted_${field}`);
  }
  return timestamp;
}

export function shouldApplyBookingCreate(input: {
  incomingSourceEventAt: Date;
  currentSourceEventAt: Date | null;
  canceledAtOrAfterIncoming: boolean;
}): boolean {
  if (input.canceledAtOrAfterIncoming) return false;
  return input.currentSourceEventAt === null ||
    input.currentSourceEventAt.getTime() < input.incomingSourceEventAt.getTime();
}

export function shouldApplyBookingCancellation(input: {
  incomingInviteeUri: string;
  incomingSourceEventAt: Date;
  current: {
    inviteeUri: string;
    sourceEventAt: Date;
    active: boolean;
  } | null;
}): boolean {
  return input.current?.active === true &&
    input.current.inviteeUri === input.incomingInviteeUri &&
    input.current.sourceEventAt.getTime() <= input.incomingSourceEventAt.getTime();
}

export function verifyCalendlySignature(input: {
  rawBody: Buffer;
  header: string | undefined;
  secret: string;
  nowMs?: number;
}): boolean {
  const values = new Map<string, string[]>();
  for (const part of (input.header ?? "").split(",")) {
    const separator = part.indexOf("=");
    if (separator < 1) return false;
    const key = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (!key || !value) return false;
    values.set(key, [...(values.get(key) ?? []), value]);
  }

  const timestamps = values.get("t") ?? [];
  const timestampText = timestamps[0];
  const signatures = values.get("v1") ?? [];
  if (timestamps.length !== 1 ||
      !timestampText ||
      !/^\d+$/.test(timestampText) ||
      signatures.length === 0) return false;

  const timestamp = Number(timestampText);
  const nowSeconds = Math.floor((input.nowMs ?? Date.now()) / 1000);
  if (!Number.isSafeInteger(timestamp) ||
      Math.abs(nowSeconds - timestamp) > CALENDLY_SIGNATURE_TOLERANCE_SECONDS) {
    return false;
  }

  const expected = createHmac("sha256", input.secret)
    .update(timestampText)
    .update(".")
    .update(input.rawBody)
    .digest();

  return signatures.some((signature) => {
    if (!/^[0-9a-fA-F]{64}$/.test(signature)) return false;
    return timingSafeEqual(expected, Buffer.from(signature, "hex"));
  });
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`invalid_${field}`);
  }
  return value;
}

function optionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function optionalHttpUrl(value: unknown): string | null {
  const candidate = optionalString(value);
  if (candidate === null) return null;
  try {
    const parsed = new URL(candidate);
    return parsed.protocol === "https:" &&
      parsed.username === "" &&
      parsed.password === ""
      ? candidate
      : null;
  } catch {
    return null;
  }
}

function parseDate(value: unknown, field: string): Date {
  const raw = requiredString(value, field);
  const date = new Date(raw);
  if (!Number.isFinite(date.getTime())) throw new Error(`invalid_${field}`);
  return date;
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function normalizeReference(value: string): string {
  return value.trim().toUpperCase();
}

export function parseCalendlyWebhook(value: unknown): CalendlyWebhook {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid_body");
  const root = value as Record<string, unknown>;
  if (!root.payload || typeof root.payload !== "object" || Array.isArray(root.payload)) {
    throw new Error("invalid_payload");
  }
  const payload = root.payload as Record<string, unknown>;
  if (!payload.scheduled_event ||
      typeof payload.scheduled_event !== "object" ||
      Array.isArray(payload.scheduled_event)) {
    throw new Error("invalid_scheduled_event");
  }
  const scheduledEvent = payload.scheduled_event as Record<string, unknown>;
  const location = scheduledEvent.location && typeof scheduledEvent.location === "object"
    ? scheduledEvent.location as Record<string, unknown>
    : {};
  const tracking = payload.tracking && typeof payload.tracking === "object"
    ? payload.tracking as Record<string, unknown>
    : {};
  const event = requiredString(root.event, "event");
  const created = event === "invitee.created";

  return {
    event,
    sourceEventAt: parseDate(root.created_at, "created_at"),
    eventTypeUri: requiredString(scheduledEvent.event_type, "event_type"),
    inviteeUri: requiredString(payload.uri, "invitee_uri"),
    scheduledEventUri: requiredString(scheduledEvent.uri, "scheduled_event_uri"),
    scheduledFor: created ? parseDate(scheduledEvent.start_time, "start_time") : null,
    meetingUrl: optionalHttpUrl(location.join_url) ?? optionalHttpUrl(location.location),
    reference: optionalString(tracking.utm_content),
    inviteeEmail: optionalString(payload.email),
  };
}

export function matchRegistration(input: {
  reference: string | null;
  email: string | null;
  byReference: RegistrationMatch[];
  byEmail: RegistrationMatch[];
}): MatchResult {
  if (input.reference !== null) {
    const reference = normalizeReference(input.reference);
    const matches = input.byReference.filter(
      (registration) => normalizeReference(registration.reference) === reference,
    );
    if (matches.length === 1) {
      return { kind: "matched", registration: matches[0], method: "reference" };
    }
    if (matches.length > 1) return { kind: "ambiguous" };
    return { kind: "unmatched", reason: "unknown_reference" };
  }

  if (input.email === null) return { kind: "unmatched", reason: "no_match" };
  const unique = new Map(input.byEmail.map((registration) => [registration.id, registration]));
  if (unique.size === 1) {
    return { kind: "matched", registration: [...unique.values()][0], method: "email" };
  }
  return unique.size > 1 ? { kind: "ambiguous" } : { kind: "unmatched", reason: "no_match" };
}