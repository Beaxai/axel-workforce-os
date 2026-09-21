# Producer Applications API contract

Status: canonical staff contract; implementation blockers are returned explicitly
and are not represented as completed work.

All routes require an authenticated, active ADMIN or CSA membership in a trusted
Axel organization. Every read is scoped to that current organization. Decision,
scheduling, and credential actions require ADMIN. Call completion is allowed for
ADMIN and CSA because it records the staff-run onboarding call; it does not make
a decision or activate an identity.

## Responses

`GET /api/producer-registrations` returns rows:

```ts
{
  id: string;
  reference: string;
  agencyName: string;
  principalName: string;
  displayStatus: string;
  decision: "pending" | "approved" | "declined";
  flags: string[];
  submittedAt: string;
  callScheduledFor: string | null;
}[]
```

`GET /api/producer-registrations/:id` extends a row with:

```ts
{
  packetSentAt: string | null;
  packetSignedAt: string | null;
  callCompletedAt: string | null;
  callNotes: string | null; // ADMIN only; null for CSA
  countersignedAt: string | null;
  credentialsIssuedAt: string | null;
  meetingUrl: string | null;
  payload: object | null; // immutable full payload for ADMIN only
  owners: Array<{
    id: string; name: string; title: string | null;
    ownershipPct: string; email: string; exhibitASignedAt: string | null;
  }>;
  documents: Array<{
    id: string; docType: string; filename: string | null;
    ingestionStatus: string; uploadedAt: string | null; canAccess: boolean;
  }>;
  activity: Array<{
    id: string; action: string; createdAt: string; actorId: string | null;
  }>;
  notificationRequests: Array<{
    id: string; event: string; status: string;
    failureCode: string | null; createdAt: string;
  }>;
  blockingReasons: string[];
  permissions: {
    canDecide: boolean; canCompleteCall: boolean;
    canSendSchedulingLink: boolean; canIssueCredentials: boolean;
  };
}
```

Lists never include payloads. CSA detail is an allowlisted projection. W-9, ACH,
and full executed packets are ADMIN-only even when a packet combines document
types. API responses never contain storage keys or source/signed storage URLs.

`GET /api/producer-registrations/scheduling-events` must be declared before
`/:id` in server and client routing. It returns at most 100 newest unresolved
safe inbox rows:

```ts
Array<{
  id: string;
  eventType: string;
  reference: string | null;
  inviteeEmail: string | null;
  reviewReason: string | null;
  createdAt: string;
}>
```

The endpoint exposes only sanitized fields, never the provider payload.
Frontend Applications work should show these records as a staff attention
queue and show `notificationRequests` on application detail so blocked delivery
is visible rather than assumed sent.

## Mutations

- `POST /:id/call-complete { notes }` — ADMIN/CSA; trimmed 3–2000 characters.
  Locks the row, rejects declined records, preserves the original completion
  timestamp and notes on retries, and returns refreshed detail.
- `POST /:id/approve {}` — ADMIN; requires signed packet and completed call.
  Currently returns `409 appointment_activation_not_configured`.
- `POST /:id/decline { reason }` — ADMIN; requires Ready for Decision. If a
  provider envelope exists it returns `409 packet_void_not_configured`; without
  an envelope it records the decline and a blocked notification request.
- `POST /:id/send-scheduling-link {}` — ADMIN; records a blocked durable outbox
  request and returns `202 {status:"blocked",reason:"DELIVERY_NOT_ENABLED"}`.
- `POST /:id/issue-credentials {}` — ADMIN; validates approved + call complete +
  countersigned, then returns `409 credential_handoff_not_configured`.
- `GET /:id/documents/:documentId/access` — authorized and tenant-scoped. Until
  a bounded private producer-document namespace and signing implementation are
  configured, returns `409 document_access_not_configured`, never a fake link.

There is no generic PATCH route.