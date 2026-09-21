import { Router, type IRouter, type Request, type Response } from "express";
import {
  db,
  producerRegistrationActivityTable,
  producerRegistrationDocumentsTable,
  producerRegistrationOwnersTable,
  producerRegistrationsTable,
  producerCalendlyBookingsTable,
  producerCalendlyEventsTable,
  producerNotificationsTable,
} from "@workspace/db";
import { and, desc, eq, sql } from "drizzle-orm";
import {
  requireRoles,
  requireTrustedAxelAdmin,
  requireTrustedAxelCorrespondenceStaff,
} from "../middleware/require-auth";
import {
  appointmentAvailability,
  blockingReasons,
  documentProjection,
  iso,
  ownerProjection,
  permissions,
  safeApplicantRecipientEmails,
  toListRow,
} from "../services/producer-appointment/review";
import { enqueueProducerNotification } from "../services/producer-appointment/notifications";

const router: IRouter = Router();
const NOTE_MIN_LENGTH = 3;
const NOTE_MAX_LENGTH = 2_000;
const REASON_MIN_LENGTH = 3;
const REASON_MAX_LENGTH = 2_000;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

router.use(
  requireRoles("ADMIN", "CSA"),
  requireTrustedAxelCorrespondenceStaff,
);

for (const parameter of ["id", "documentId"]) {
  router.param(parameter, (req, res, next, value) => {
    if (!UUID_PATTERN.test(value)) {
      res.status(400).json({ error: `invalid_${parameter}` });
      return;
    }
    next();
  });
}

function conflict(res: Response, error: string, message: string) {
  return res.status(409).json({ error, message });
}

function boundedText(
  value: unknown,
  minimum: number,
  maximum: number,
): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length >= minimum && normalized.length <= maximum
    ? normalized
    : null;
}

async function loadScopedRegistration(id: string, orgId: string) {
  const [registration] = await db
    .select()
    .from(producerRegistrationsTable)
    .where(
      and(
        eq(producerRegistrationsTable.id, id),
        eq(producerRegistrationsTable.orgId, orgId),
      ),
    )
    .limit(1);
  return registration;
}

async function detailResponse(id: string, orgId: string, role: "ADMIN" | "CSA") {
  const registration = await loadScopedRegistration(id, orgId);
  if (!registration) return null;

  const [owners, documents, activity, bookings, notificationRequests] =
    await Promise.all([
    db
      .select({ owner: producerRegistrationOwnersTable })
      .from(producerRegistrationOwnersTable)
      .innerJoin(
        producerRegistrationsTable,
        eq(
          producerRegistrationsTable.id,
          producerRegistrationOwnersTable.registrationId,
        ),
      )
      .where(
        and(
          eq(producerRegistrationOwnersTable.registrationId, id),
          eq(producerRegistrationsTable.orgId, orgId),
        ),
      ),
    db
      .select({ document: producerRegistrationDocumentsTable })
      .from(producerRegistrationDocumentsTable)
      .innerJoin(
        producerRegistrationsTable,
        eq(
          producerRegistrationsTable.id,
          producerRegistrationDocumentsTable.registrationId,
        ),
      )
      .where(
        and(
          eq(producerRegistrationDocumentsTable.registrationId, id),
          eq(producerRegistrationsTable.orgId, orgId),
        ),
      ),
    db
      .select({
        id: producerRegistrationActivityTable.id,
        action: producerRegistrationActivityTable.action,
        createdAt: producerRegistrationActivityTable.createdAt,
        actorId: producerRegistrationActivityTable.actorId,
      })
      .from(producerRegistrationActivityTable)
      .innerJoin(
        producerRegistrationsTable,
        eq(
          producerRegistrationsTable.id,
          producerRegistrationActivityTable.registrationId,
        ),
      )
      .where(
        and(
          eq(producerRegistrationActivityTable.registrationId, id),
          eq(producerRegistrationActivityTable.orgId, orgId),
          eq(producerRegistrationsTable.orgId, orgId),
        ),
      )
      .orderBy(desc(producerRegistrationActivityTable.createdAt)),
    db
      .select({ meetingUrl: producerCalendlyBookingsTable.meetingUrl })
      .from(producerCalendlyBookingsTable)
      .innerJoin(
        producerRegistrationsTable,
        eq(
          producerRegistrationsTable.id,
          producerCalendlyBookingsTable.registrationId,
        ),
      )
      .where(
        and(
          eq(producerCalendlyBookingsTable.registrationId, id),
          eq(producerCalendlyBookingsTable.orgId, orgId),
          eq(producerCalendlyBookingsTable.active, true),
          eq(producerRegistrationsTable.orgId, orgId),
        ),
      )
      .limit(1),
    db
      .select({
        id: producerNotificationsTable.id,
        event: producerNotificationsTable.event,
        status: producerNotificationsTable.status,
        failureCode: producerNotificationsTable.failureCode,
        createdAt: producerNotificationsTable.createdAt,
      })
      .from(producerNotificationsTable)
      .innerJoin(
        producerRegistrationsTable,
        eq(
          producerRegistrationsTable.id,
          producerNotificationsTable.registrationId,
        ),
      )
      .where(
        and(
          eq(producerNotificationsTable.registrationId, id),
          eq(producerNotificationsTable.orgId, orgId),
          eq(producerRegistrationsTable.orgId, orgId),
        ),
      )
      .orderBy(desc(producerNotificationsTable.createdAt)),
  ]);

  return {
    ...toListRow(registration),
    packetSentAt: iso(registration.packetSentAt),
    packetSignedAt: iso(registration.packetSignedAt),
    callCompletedAt: iso(registration.callCompletedAt),
    callNotes: role === "ADMIN" ? registration.callNotes : null,
    countersignedAt: iso(registration.countersignedAt),
    credentialsIssuedAt: iso(registration.credentialsIssuedAt),
    meetingUrl: bookings[0]?.meetingUrl ?? null,
    payload: role === "ADMIN" ? registration.payload : null,
    owners: owners.map(({ owner }) => ownerProjection(owner)),
    documents: documents.flatMap(({ document }) => {
      const projected = documentProjection(document, role);
      return projected ? [projected] : [];
    }),
    activity: activity.map((entry) => ({
      ...entry,
      createdAt: entry.createdAt.toISOString(),
    })),
    notificationRequests: notificationRequests.map((entry) => ({
      ...entry,
      createdAt: entry.createdAt.toISOString(),
    })),
    blockingReasons: blockingReasons(registration),
    permissions: permissions(registration, role),
    availability: appointmentAvailability,
  };
}

async function sendDetail(req: Request<{ id: string }>, res: Response) {
  const detail = await detailResponse(
    req.params.id,
    req.user!.orgId!,
    req.user!.role as "ADMIN" | "CSA",
  );
  if (!detail) return res.status(404).json({ error: "not_found" });
  return res.json(detail);
}

router.get("/scheduling-events", async (req, res) => {
  const rows = await db
    .select({
      id: producerCalendlyEventsTable.id,
      eventType: producerCalendlyEventsTable.eventName,
      sanitizedData: producerCalendlyEventsTable.sanitizedData,
      createdAt: producerCalendlyEventsTable.createdAt,
    })
    .from(producerCalendlyEventsTable)
    .where(
      and(
        eq(producerCalendlyEventsTable.orgId, req.user!.orgId!),
        eq(producerCalendlyEventsTable.staffNeedsReview, true),
      ),
    )
    .orderBy(desc(producerCalendlyEventsTable.createdAt))
    .limit(100);

  return res.json(
    rows.map((row) => {
      const safe =
        row.sanitizedData &&
        typeof row.sanitizedData === "object" &&
        !Array.isArray(row.sanitizedData)
          ? (row.sanitizedData as Record<string, unknown>)
          : {};
      return {
        id: row.id,
        eventType: row.eventType,
        reference:
          typeof safe.reference === "string" ? safe.reference : null,
        inviteeEmail:
          typeof safe.inviteeEmail === "string" ? safe.inviteeEmail : null,
        reviewReason:
          typeof safe.reviewReason === "string" ? safe.reviewReason : null,
        createdAt: row.createdAt.toISOString(),
      };
    }),
  );
});

router.get("/", async (req, res) => {
  const rows = await db
    .select()
    .from(producerRegistrationsTable)
    .where(eq(producerRegistrationsTable.orgId, req.user!.orgId!))
    .orderBy(
      sql`CASE WHEN ${producerRegistrationsTable.decision} = 'pending'
        AND ${producerRegistrationsTable.packetSignedAt} IS NOT NULL
        AND ${producerRegistrationsTable.callCompletedAt} IS NOT NULL
        THEN 0 ELSE 1 END`,
      desc(producerRegistrationsTable.submittedAt),
    );
  return res.json(rows.map(toListRow));
});

router.get("/:id", sendDetail);

router.post(
  "/:id/call-complete",
  async (req: Request<{ id: string }>, res: Response) => {
    const notes = boundedText(req.body?.notes, NOTE_MIN_LENGTH, NOTE_MAX_LENGTH);
    if (!notes) {
      return res.status(400).json({
        error: "invalid_call_notes",
        message: `notes must be ${NOTE_MIN_LENGTH}-${NOTE_MAX_LENGTH} characters`,
      });
    }

    const result = await db.transaction(async (tx) => {
      const [registration] = await tx
        .select()
        .from(producerRegistrationsTable)
        .where(
          and(
            eq(producerRegistrationsTable.id, req.params.id),
            eq(producerRegistrationsTable.orgId, req.user!.orgId!),
          ),
        )
        .for("update");
      if (!registration) return "not_found" as const;
      if (registration.decision === "declined") return "declined" as const;
      if (registration.callCompletedAt) return "existing" as const;

      const completedAt = new Date();
      await tx
        .update(producerRegistrationsTable)
        .set({ callCompletedAt: completedAt, callNotes: notes })
        .where(
          and(
            eq(producerRegistrationsTable.id, registration.id),
            eq(producerRegistrationsTable.orgId, req.user!.orgId!),
          ),
        );
      await tx.insert(producerRegistrationActivityTable).values({
        orgId: req.user!.orgId!,
        registrationId: registration.id,
        actorId: req.user!.id,
        action: "CALL_COMPLETED",
        before: { callCompletedAt: null },
        after: { callCompletedAt: completedAt.toISOString() },
      });
      if (registration.packetSignedAt) {
        await enqueueProducerNotification(tx, {
          orgId: req.user!.orgId!,
          registrationId: registration.id,
          event: "ready_for_decision",
          dedupeKey: `ready-for-decision:${registration.id}`,
          recipientEmails: [req.user!.email],
          data: { reference: registration.reference },
        });
      }
      return "completed" as const;
    });

    if (result === "not_found") {
      return res.status(404).json({ error: "not_found" });
    }
    if (result === "declined") {
      return conflict(
        res,
        "registration_declined",
        "A declined application cannot have its call completed.",
      );
    }
    return sendDetail(req, res);
  },
);

router.post(
  "/:id/approve",
  requireTrustedAxelAdmin,
  async (req: Request<{ id: string }>, res: Response) => {
    const registration = await loadScopedRegistration(
      req.params.id,
      req.user!.orgId!,
    );
    if (!registration) return res.status(404).json({ error: "not_found" });
    if (
      registration.decision !== "pending" ||
      !registration.packetSignedAt ||
      !registration.callCompletedAt
    ) {
      return conflict(
        res,
        "not_ready_for_decision",
        "Approval requires a signed packet, a completed call, and a pending decision.",
      );
    }
    return conflict(
      res,
      appointmentAvailability.approve.code,
      appointmentAvailability.approve.reason,
    );
  },
);

router.post("/:id/decline", requireTrustedAxelAdmin, async (
  req: Request<{ id: string }>,
  res: Response,
) => {
  const reason = boundedText(
    req.body?.reason,
    REASON_MIN_LENGTH,
    REASON_MAX_LENGTH,
  );
  if (!reason) {
    return res.status(400).json({
      error: "invalid_decline_reason",
      message: `reason must be ${REASON_MIN_LENGTH}-${REASON_MAX_LENGTH} characters`,
    });
  }

  const result = await db.transaction(async (tx) => {
    const [registration] = await tx
      .select()
      .from(producerRegistrationsTable)
      .where(
        and(
          eq(producerRegistrationsTable.id, req.params.id),
          eq(producerRegistrationsTable.orgId, req.user!.orgId!),
        ),
      )
      .for("update");
    if (!registration) return "not_found" as const;
    if (registration.decision === "declined") return "existing" as const;
    if (registration.decision !== "pending") return "already_decided" as const;
    if (!registration.packetSignedAt || !registration.callCompletedAt) {
      return "not_ready" as const;
    }
    if (registration.signwellEnvelopeId) return "void_unavailable" as const;
    const recipients = safeApplicantRecipientEmails(registration.payload);
    if (recipients.length === 0) return "recipient_missing" as const;

    const decidedAt = new Date();
    await tx
      .update(producerRegistrationsTable)
      .set({
        decision: "declined",
        declineReason: reason,
        decidedAt,
        decidedBy: req.user!.id,
      })
      .where(
        and(
          eq(producerRegistrationsTable.id, registration.id),
          eq(producerRegistrationsTable.orgId, req.user!.orgId!),
        ),
      );
    await tx.insert(producerRegistrationActivityTable).values({
      orgId: req.user!.orgId!,
      registrationId: registration.id,
      actorId: req.user!.id,
      action: "DECLINED",
      before: { decision: "pending", decidedAt: null },
      after: { decision: "declined", decidedAt: decidedAt.toISOString() },
    });
    await enqueueProducerNotification(tx, {
      orgId: req.user!.orgId!,
      registrationId: registration.id,
      event: "declined",
      dedupeKey: `declined:${registration.id}`,
      recipientEmails: recipients,
      data: { reference: registration.reference },
    });
    return "declined" as const;
  });

  if (result === "not_found") {
    return res.status(404).json({ error: "not_found" });
  }
  if (result === "not_ready" || result === "already_decided") {
    return conflict(
      res,
      "not_ready_for_decision",
      "Decline requires a signed packet, a completed call, and a pending decision.",
    );
  }
  if (result === "void_unavailable") {
    return conflict(
      res,
      "packet_void_not_configured",
      "Decline is blocked because the existing provider packet cannot yet be safely voided.",
    );
  }
  if (result === "recipient_missing") {
    return conflict(
      res,
      "notification_recipient_missing",
      "Decline is blocked because no validated applicant notification email is available.",
    );
  }
  return sendDetail(req, res);
});

router.post(
  "/:id/send-scheduling-link",
  requireTrustedAxelAdmin,
  async (req: Request<{ id: string }>, res: Response) => {
    const result = await db.transaction(async (tx) => {
      const [registration] = await tx
        .select()
        .from(producerRegistrationsTable)
        .where(
          and(
            eq(producerRegistrationsTable.id, req.params.id),
            eq(producerRegistrationsTable.orgId, req.user!.orgId!),
          ),
        )
        .for("update");
      if (!registration) return "not_found" as const;
      if (registration.decision === "declined") return "declined" as const;

      const recipientEmails = safeApplicantRecipientEmails(
        registration.payload,
      );
      if (recipientEmails.length === 0) return "recipient_missing" as const;

      await enqueueProducerNotification(tx, {
        orgId: req.user!.orgId!,
        registrationId: registration.id,
        event: "scheduling_link",
        dedupeKey: `scheduling-link:${registration.id}`,
        recipientEmails,
        data: {
          reference: registration.reference,
          schedulingUrl: `https://calendly.com/axelworkforcesolutions/30min?utm_content=${encodeURIComponent(registration.reference)}`,
        },
      });
      await tx.insert(producerRegistrationActivityTable).values({
        orgId: req.user!.orgId!,
        registrationId: registration.id,
        actorId: req.user!.id,
        action: "SCHEDULING_LINK_DELIVERY_BLOCKED",
        before: null,
        after: null,
      });
      return "blocked" as const;
    });

    if (result === "not_found") {
      return res.status(404).json({ error: "not_found" });
    }
    if (result === "declined") {
      return conflict(
        res,
        "registration_declined",
        "Scheduling links are not available for declined applications.",
      );
    }
    if (result === "recipient_missing") {
      return conflict(
        res,
        "notification_recipient_missing",
        "No validated applicant email is available for the scheduling link.",
      );
    }
    return res
      .status(202)
      .json({ status: "blocked", reason: "DELIVERY_NOT_ENABLED" });
  },
);

router.post(
  "/:id/issue-credentials",
  requireTrustedAxelAdmin,
  async (req: Request<{ id: string }>, res: Response) => {
    const registration = await loadScopedRegistration(
      req.params.id,
      req.user!.orgId!,
    );
    if (!registration) return res.status(404).json({ error: "not_found" });
    if (
      registration.decision !== "approved" ||
      !registration.callCompletedAt ||
      !registration.countersignedAt
    ) {
      return conflict(
        res,
        "credentials_not_ready",
        "Credentials require approval, a completed call, and verified countersignature.",
      );
    }
    return conflict(
      res,
      appointmentAvailability.issueCredentials.code,
      appointmentAvailability.issueCredentials.reason,
    );
  },
);

router.get("/:id/documents/:documentId/access", async (
  req: Request<{ id: string; documentId: string }>,
  res: Response,
) => {
  const [row] = await db
    .select({ document: producerRegistrationDocumentsTable })
    .from(producerRegistrationDocumentsTable)
    .innerJoin(
      producerRegistrationsTable,
      eq(
        producerRegistrationsTable.id,
        producerRegistrationDocumentsTable.registrationId,
      ),
    )
    .where(
      and(
        eq(producerRegistrationsTable.id, req.params.id),
        eq(producerRegistrationsTable.orgId, req.user!.orgId!),
        eq(producerRegistrationDocumentsTable.id, req.params.documentId),
      ),
    )
    .limit(1);
  if (!row) return res.status(404).json({ error: "not_found" });
  if (
    req.user!.role === "CSA" &&
    ["w9", "ach_authorization", "executed_packet"].includes(
      row.document.docType,
    )
  ) {
    return res.status(403).json({ error: "restricted_document" });
  }
  if (
    row.document.ingestionStatus !== "completed" ||
    !row.document.storageKey
  ) {
    return conflict(
      res,
      "document_not_available",
      "The private document has not completed ingestion.",
    );
  }
  return conflict(
    res,
    appointmentAvailability.documentAccess.code,
    appointmentAvailability.documentAccess.reason,
  );
});

export default router;