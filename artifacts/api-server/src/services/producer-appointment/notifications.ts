import { producerNotificationsTable } from "@workspace/db/schema";
import type { db } from "@workspace/db";
import { z } from "zod/v4";

export const PRODUCER_NOTIFICATION_EVENTS = [
  "registration_received",
  "packet_sent",
  "exhibit_a_request",
  "call_reminder",
  "scheduling_nudge",
  "approved_countersigned",
  "credentials_issued",
  "declined",
  "new_registration",
  "ready_for_decision",
  "packet_declined_or_expired",
  "unmatched_booking",
  "countersign_needed",
  "scheduling_link",
  "booking_canceled",
] as const;

export type ProducerNotificationEvent =
  (typeof PRODUCER_NOTIFICATION_EVENTS)[number];

const eventSchema = z.enum(PRODUCER_NOTIFICATION_EVENTS);
const referenceSchema = z
  .string()
  .regex(/^AXR-[0-9]{8}-[A-Za-z0-9]{6}$/)
  .max(40);

function isApprovedSchedulingUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.username === "" &&
      url.password === "" &&
      url.hostname === "calendly.com" &&
      url.pathname.replace(/\/$/, "") ===
        "/axelworkforcesolutions/30min" &&
      url.hash === "" &&
      [...url.searchParams.keys()].every((key) => key === "utm_content")
    );
  } catch {
    return false;
  }
}

function isApprovedDocumentAccessUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.username === "" &&
      url.password === "" &&
      url.hostname === "app.axelworkforce.com" &&
      /^\/api\/producer-registrations\/[0-9a-f-]{36}\/documents\/[0-9a-f-]{36}\/access$/.test(
        url.pathname,
      ) &&
      url.search === "" &&
      url.hash === ""
    );
  } catch {
    return false;
  }
}

const notificationDataSchema = z
  .object({
    reference: referenceSchema.optional(),
    recipientName: z.string().trim().min(1).max(120).optional(),
    schedulingUrl: z
      .string()
      .refine(isApprovedSchedulingUrl, "UNAPPROVED_SCHEDULING_URL")
      .optional(),
    documentAccessUrl: z
      .string()
      .refine(isApprovedDocumentAccessUrl, "UNAPPROVED_DOCUMENT_ACCESS_URL")
      .optional(),
  })
  .strict();

export type ProducerNotificationData = z.infer<typeof notificationDataSchema>;

export type EnqueueProducerNotificationInput = {
  orgId: string;
  registrationId?: string | null;
  event: ProducerNotificationEvent;
  dedupeKey: string;
  recipientEmails: string[];
  data: ProducerNotificationData;
};

/** The insert capability shared by the Drizzle database and its transactions. */
export type ProducerNotificationTransaction = Pick<typeof db, "insert">;

const enqueueInputSchema = z
  .object({
    // PostgreSQL accepts legacy UUID values without RFC version/variant bits,
    // including the seeded Axel organization ID. Syntax is not authorization:
    // tenant membership and registration scope are enforced separately.
    orgId: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
    registrationId: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i).nullable().optional(),
    event: eventSchema,
    dedupeKey: z.string().trim().min(1).max(200),
    recipientEmails: z.array(z.email()).min(1).max(25),
    data: notificationDataSchema,
  })
  .strict();

export type RenderedProducerNotification = {
  subject: string;
  html: string;
  text: string;
};

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character]!,
  );
}

function copyFor(
  event: ProducerNotificationEvent,
  data: ProducerNotificationData,
): { subject: string; heading: string; paragraphs: string[]; action?: string } {
  const reference = data.reference ? ` Reference: ${data.reference}.` : "";
  const copies: Record<
    ProducerNotificationEvent,
    { subject: string; heading: string; paragraphs: string[]; action?: string }
  > = {
    registration_received: {
      subject: "We received your Axel producer registration",
      heading: "Registration received",
      paragraphs: [
        `Thank you for registering with Axel Workforce Insurance Solutions.${reference}`,
        "Your appointment packet includes the appointment application, National Producer Agreement, applicable Exhibit A disclosures, the FCRA rights summary, W-9, and ACH authorization.",
        "Credentials are issued only after the required review, onboarding call, approval, and countersignature are complete.",
      ],
      action: data.schedulingUrl,
    },
    packet_sent: {
      subject: "Your Axel appointment packet is ready",
      heading: "Appointment packet sent",
      paragraphs: [
        `Your producer appointment packet is ready for review and signature.${reference}`,
        "Please use the secure signing request sent separately by our signing provider.",
      ],
      action: data.schedulingUrl,
    },
    exhibit_a_request: {
      subject: "Action requested: Axel Exhibit A",
      heading: "Exhibit A signature requested",
      paragraphs: [
        `Please review and sign your standalone Exhibit A disclosure.${reference}`,
        "This request is limited to the disclosure assigned to you. Use the secure signing request sent separately.",
      ],
    },
    call_reminder: {
      subject: "Reminder: your Axel onboarding call",
      heading: "Your onboarding call is coming up",
      paragraphs: [
        `This is a reminder that your scheduled Axel onboarding call is within 24 hours.${reference}`,
        "Please use the meeting details in your calendar invitation.",
      ],
      action: data.schedulingUrl,
    },
    scheduling_nudge: {
      subject: "Schedule your Axel onboarding call",
      heading: "Choose an onboarding time",
      paragraphs: [
        `We are ready for you to schedule your producer onboarding call.${reference}`,
        "Signing and scheduling are independent, so you may choose a time while your packet is still in progress.",
      ],
      action: data.schedulingUrl,
    },
    approved_countersigned: {
      subject: "Your Axel appointment is approved and countersigned",
      heading: "Appointment countersigned",
      paragraphs: [
        `Your producer appointment has been approved and countersigned.${reference}`,
        "Credential delivery follows the completion of our activation process.",
      ],
      action: data.documentAccessUrl,
    },
    credentials_issued: {
      subject: "Your Axel credentials have been issued",
      heading: "Credentials issued",
      paragraphs: [
        `Your Axel Workforce Insurance Solutions credentials have been issued.${reference}`,
        "Please follow the secure credential delivery instructions sent to you.",
      ],
    },
    declined: {
      subject: "Update on your Axel producer registration",
      heading: "Registration update",
      paragraphs: [
        `We are unable to move forward with your producer registration at this time.${reference}`,
        "If you have questions, please call (888) 997-2935.",
      ],
    },
    new_registration: {
      subject: "New producer registration received",
      heading: "New producer registration",
      paragraphs: [
        `A new producer registration is ready for initial processing.${reference}`,
      ],
    },
    ready_for_decision: {
      subject: "Producer registration ready for decision",
      heading: "Ready for decision",
      paragraphs: [
        `The producer packet and onboarding call are complete.${reference}`,
        "An authorized Admin can now review the application and record a decision.",
      ],
    },
    packet_declined_or_expired: {
      subject: "Producer packet needs attention",
      heading: "Packet declined or expired",
      paragraphs: [
        `A producer appointment packet was declined or expired.${reference}`,
        "Review the application and signing-provider status before taking action.",
      ],
    },
    unmatched_booking: {
      subject: "Unmatched producer onboarding booking",
      heading: "Booking needs review",
      paragraphs: [
        "A producer onboarding booking could not be matched unambiguously.",
        "Review the booking and registration records before associating them.",
      ],
    },
    countersign_needed: {
      subject: "Producer appointment countersignature needed",
      heading: "Countersignature requested",
      paragraphs: [
        `An approved producer appointment is ready for the authorized countersignature.${reference}`,
        "Use the secure signing-provider request to complete the National Producer Agreement.",
      ],
    },
    scheduling_link: {
      subject: "Schedule your Axel onboarding call",
      heading: "Schedule your onboarding call",
      paragraphs: [
        `Please choose a time for your Axel producer onboarding call.${reference}`,
      ],
      action: data.schedulingUrl,
    },
    booking_canceled: {
      subject: "Reschedule your Axel onboarding call",
      heading: "Onboarding call canceled",
      paragraphs: [
        `Your onboarding call booking was canceled.${reference}`,
        "Please select another available time.",
      ],
      action: data.schedulingUrl,
    },
  };
  return copies[event];
}

export function renderProducerNotification(
  event: ProducerNotificationEvent,
  untrustedData: ProducerNotificationData,
): RenderedProducerNotification {
  const parsedEvent = eventSchema.parse(event);
  const data = notificationDataSchema.parse(untrustedData);
  const copy = copyFor(parsedEvent, data);
  const greeting = data.recipientName
    ? `<p style="margin:0 0 18px">Hello ${escapeHtml(data.recipientName)},</p>`
    : "";
  const paragraphs = copy.paragraphs
    .map((paragraph) => `<p style="margin:0 0 18px">${escapeHtml(paragraph)}</p>`)
    .join("");
  const action = copy.action
    ? `<p style="margin:28px 0"><a href="${escapeHtml(copy.action)}" style="display:inline-block;background:#E91E8C;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:6px;font-weight:700">Open secure link</a></p>`
    : "";
  const text = [
    data.recipientName ? `Hello ${data.recipientName},` : undefined,
    copy.heading,
    ...copy.paragraphs,
    copy.action ? `Secure link: ${copy.action}` : undefined,
    "Axel Workforce Insurance Solutions",
  ]
    .filter((part): part is string => Boolean(part))
    .join("\n\n");

  return {
    subject: copy.subject,
    html: `<!doctype html><html><body style="margin:0;background:#060608;color:#ffffff;font-family:Inter,Arial,sans-serif"><div style="max-width:640px;margin:0 auto;padding:40px 24px"><div style="color:#E91E8C;font-size:14px;font-weight:800;letter-spacing:.08em;text-transform:uppercase">Axel Workforce Insurance Solutions</div><h1 style="font-size:28px;line-height:1.2;margin:14px 0 24px">${escapeHtml(copy.heading)}</h1>${greeting}${paragraphs}${action}<p style="margin:32px 0 0;color:#b9b9c0;font-size:13px">Axel Workforce Insurance Solutions</p></div></body></html>`,
    text,
  };
}

export async function enqueueProducerNotification(
  tx: ProducerNotificationTransaction,
  input: EnqueueProducerNotificationInput,
): Promise<void> {
  const parsed = enqueueInputSchema.parse(input);
  const recipientEmails = [
    ...new Set(parsed.recipientEmails.map((email) => email.trim().toLowerCase())),
  ];
  const rendered = renderProducerNotification(parsed.event, parsed.data);

  await tx
    .insert(producerNotificationsTable)
    .values({
      orgId: parsed.orgId,
      registrationId: parsed.registrationId ?? null,
      event: parsed.event,
      dedupeKey: parsed.dedupeKey,
      recipientEmails,
      templateData: parsed.data,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      status: "blocked",
      failureCode: "DELIVERY_NOT_ENABLED",
      attemptCount: 0,
    })
    .onConflictDoNothing({
      target: [
        producerNotificationsTable.orgId,
        producerNotificationsTable.dedupeKey,
      ],
    });
}

export type SchedulingNotificationDueInput =
  | {
      event: "scheduling_nudge";
      now: Date;
      packetSentAt: Date | null;
      callScheduledFor: Date | null;
    }
  | {
      event: "call_reminder";
      now: Date;
      callScheduledFor: Date | null;
      calendlyRemindersDisabled: boolean | null | undefined;
    };

export function isSchedulingNotificationDue(
  input: SchedulingNotificationDueInput,
): boolean {
  if (input.event === "scheduling_nudge") {
    return (
      input.packetSentAt !== null &&
      input.callScheduledFor === null &&
      input.now.getTime() - input.packetSentAt.getTime() >= 48 * 60 * 60 * 1000
    );
  }

  if (
    input.calendlyRemindersDisabled !== true ||
    input.callScheduledFor === null
  ) {
    return false;
  }
  const untilCall = input.callScheduledFor.getTime() - input.now.getTime();
  return untilCall >= 0 && untilCall <= 24 * 60 * 60 * 1000;
}