# Axel-controlled correspondence API contract

All endpoints below require the normal session authentication.  **Market**
endpoints additionally require an active `ADMIN` or `CSA` membership in the
explicitly configured trusted Axel organization and a deal whose `orgId` equals
that organization.  This requirement is evaluated by the API, not by the UI.

## Required development provisioning

The application deliberately starts fail-closed: no organization is treated as
Axel based on a seed ID, organization name, type, or role. A privileged
development database operator must explicitly insert the intended organization
into `trusted_axel_organizations`, ensure the staff user's *selected primary*
`org_members` row has role `ADMIN` or `CSA`, and ensure both `users.status` and
`organizations.status` are `active`/`ACTIVE`. The deal must have the same
non-null `orgId`. There is intentionally no HTTP endpoint to add a trusted
organization. Legacy null-org deals remain available to their existing
operational routes but cannot use controlled correspondence until an
authorized data migration assigns their organization.

## Held inbound review

`GET /api/deal-card/correspondence/capabilities` returns
`{ "canReviewHeld": boolean }` for every authenticated caller. The value is true
only for an explicitly trusted active Axel ADMIN/CSA; external users (including
users named ADMIN or CSA in an external organization) receive `false`.

`GET /api/deal-card/correspondence/held?filter=all&limit=50&offset=0` is
available only to an
explicitly trusted active Axel ADMIN/CSA. It is a global staff review queue so
that unmatched messages without a resolvable deal can still be reviewed.
Inbound messages expose their separately persisted `to`, `cc`, `heldReason`,
and provider-delivered sender-authentication evidence to this queue only.
Market and broker thread feeds never include `HELD` messages.

Both the global route and the deal-scoped held route accept `filter` (`all`,
`matched`, or `unmatched`, default `all`), `limit` (integer 1–100, default 50),
and `offset` (non-negative integer, default 0). Invalid query values return 400.
The global query applies current-organization scope in SQL before filtering and
pagination: it includes held rows for the trusted actor's own-organization
deals plus null-deal unmatched rows, and never another organization's rows.

`POST /api/deal-card/correspondence/held/:messageId/release` accepts the strict
body `{ "channel": "MARKET" | "BROKER", "senderConfirmed": true }`. It is an
audited ADMIN/CSA classification only; it sends and forwards nothing. Release
is refused for mixed/unknown recipients, header contradictions, changed
listeners, cross-channel candidates, or an address that no longer matches the
persisted contact/participant. Staff confirmation is required because sender
authentication evidence is informational under the limitation above.

Unmatched association is a separate two-step action and never releases mail.
`POST /api/deal-card/correspondence/held/:messageId/match-preview` accepts only
the strict empty body `{}`. It independently retrieves the original received
email from Resend and requires its provider ID and sender/recipient identities
to exactly match the stored original. The provider-returned RFC Message-ID is
also bound into the confirmation; for legacy RFC-keyed rows it must exactly
equal the stored message ID. Exactly one To and no CC or BCC are permitted.
Provider BCC must be absent, null, or an empty array; non-empty or malformed
BCC is rejected. The complete recipient evidence is bound into confirmation
and checked again on a fresh provider retrieval. The
recipient must resolve to exactly one persisted listener/thread/deal association
in the actor's organization, and every known reply reference must agree with
that deal, thread, market, and channel. It returns:

```ts
{
  candidate: {
    dealId: string;
    dealName: string;
    dealMarketId: string | null;
    threadId: string;
    channel: "MARKET" | "BROKER";
    listenerEmail: string;
    senderEmail: string;
    providerReceivedEmailId: string;
    evidenceSummary: string[];
    confirmationToken: string; // signed, actor-bound, and short-lived
  }
}
```

`POST /api/deal-card/correspondence/held/:messageId/match` accepts only
`{ "confirmationToken": string, "destinationConfirmed": true }`. The API
re-fetches provider evidence, re-derives and locks the destination and tenant
records in a serializable transaction, and atomically associates the
still-unmatched row. Listener claims are checked case-insensitively across
thread, market, and deal-level listener tables; conflicting identities fail as
ambiguous. Serialization conflicts return 409 and require a fresh preview.
Concurrent or
replayed confirmations produce only one success and one private audit record.
Success is `{ "associated": true, "messageId": string, "dealId": string,
"channel": "HELD" }`. The message body and identities are unchanged, the row
remains HELD with sender review required, and existing release policy remains a
separate action. Subject and Authentication-Results never authorize matching.
Provider unavailability, no candidate, ambiguity, evidence changes, known
cross-thread/cross-channel contradictions, and cross-organization candidates
fail explicitly. For both matching endpoints, missing provider provenance and
provider unavailability return `PROVIDER_UNAVAILABLE`.

The reusable Development browser fixture
`src/scripts/browser-correspondence-fixture.ts setup|cleanup` includes a
fictional unmatched held message with no provider ID. It intentionally
exercises the real-server `PROVIDER_UNAVAILABLE` state without a production
fixture or trust bypass. Successful matching is covered by the isolated API
integration test, which mocks only the authenticated provider GET and never
sends mail.

### Sender-authentication limitation

The signed Resend webhook proves that Resend delivered the event; it does **not**
make a sender-controlled `From` header cryptographically trustworthy. The
system stores Resend-delivered `Authentication-Results` only as informational
review evidence. It is still message-header material, not independently
authenticated structured sender evidence. Consequently the API currently
fails closed: external inbound messages remain `HELD` even when their `From`
equals a persisted market/broker address. Until Resend exposes a
provider-attested DMARC/SPF result with a documented trust anchor, the API
does not claim cryptographic `From` authentication or deliver a same-address
spoof into a private thread.

## Types

```ts
type CorrespondenceChannel = "MARKET" | "BROKER";
// These are serialized verbatim from the durable outbound row. UI clients
// must not collapse PENDING or DELIVERY_UNKNOWN into a generic failure.
type DeliveryState =
  | "PENDING"           // accepted durably; provider outcome is not yet known
  | "sent"              // provider accepted
  | "dev_logged"        // development-only, no provider delivery
  | "failed"            // provider explicitly rejected/failed the request
  | "DELIVERY_UNKNOWN"; // network/provider ambiguity; manual review required

type CorrespondenceMessage = {
  id: string;
  channel: CorrespondenceChannel;
  direction: "INBOUND" | "OUTBOUND";
  threadId: string;
  dealId: string | null;
  dealMarketId: string | null;       // present only for MARKET
  subject: string | null;
  from: { name: string | null; email: string };
  to: string[];
  cc: string[];
  bodyText: string | null;
  bodyHtml: string | null;           // sanitized; no active/external content
  receivedAt: string | null;
  sentAt: string | null;
  deliveryState: DeliveryState | null;
  enrichment: "COMPLETE" | "PENDING" | "FAILED" | null;
};

type HeldCorrespondenceMessage = CorrespondenceMessage & {
  dealId: string | null;
  dealName: string | null;
  marketName: string | null;
  threadLabel: string | null;
  candidate:
    | { channel: "MARKET"; dealMarketId?: string; marketName?: string; contactName?: string | null; contactEmail?: string | null }
    | { channel: "BROKER" }
    | null;
  isReleasable: boolean;
  releasableTarget: {
    channel: CorrespondenceChannel;
    threadId: string;
    listenerEmail: string;
    senderEmail: string;
  } | null;
};

type HeldQueueResponse = {
  messages: HeldCorrespondenceMessage[];
  total: number; // count after filter, before pagination
  counts: {
    all: number;
    matched: number;
    unmatched: number;
  }; // authorized scope before filter and pagination
};

type CorrespondenceCapabilities = {
  market: { canRead: boolean; canSend: boolean; canReviewHeld: boolean };
  broker: {
    canRead: boolean;
    canSend: boolean;       // trusted staff can compose to a participant
    canReply: boolean;      // participant can post only to their own thread
    eligibleRecipients: Array<{ userId: string; name: string; email: string }>;
  };
};
```

## `GET /api/deal-card/:dealId/correspondence/market/:dealMarketId`

Returns the complete private MARKET thread for one market.

* `200` — `{ market: { dealMarketId, marketName, contact: { name, email },
  threadId }, messages: CorrespondenceMessage[] }`
* `400` — malformed UUID
* `401` — no session
* `403` — caller is not an active trusted Axel `ADMIN`/`CSA`, is not in the
  deal organization, or attempts a cross-deal market ID
* `404` — deal or selected market does not exist

## `GET /api/deal-card/:dealId/correspondence`

Capability discovery for rendering. It contains no MARKET messages, contacts,
addresses, or held content.

* `200` — `CorrespondenceCapabilities`
* `401` — no session
* `403` — caller is neither trusted Axel staff for the deal nor an authorized
  deal-associated broker/agent
* `404` — deal not found

## `POST /api/deal-card/:dealId/correspondence/market/:dealMarketId`

Sends one manual MARKET message.  The server resolves the single approved
market contact; client recipient, CC, BCC, Reply-To, From, headers, and thread
identifiers are never accepted.

```ts
type MarketSendRequest = {
  subject: string;
  text: string;
  html?: string;
  // Optional UUID generated once per Compose click and reused only if that
  // same request is retried after a lost response. The API maps it to its
  // internal provider idempotency key; it is not an email routing field.
  requestId?: string;
};
```

* `201` — `{ message: CorrespondenceMessage }`
* `400` — invalid body
* `401`, `403`, `404` — as above
* `409` — the market is not active/correspondable or has no approved contact
* `422` — recipient/channel policy rejection
* `502` — provider failure. A `DELIVERY_UNKNOWN` thread row must be reviewed
  before any further send and is never automatically resent. A known `failed`
  row may be retried only as a new compose action with a new `requestId`.
  When an outbound row was durably created, the response is
  `{ error, outboundId, deliveryState }`; `deliveryState` is the raw
  `PENDING` or `DELIVERY_UNKNOWN` value and clients must retain the current
  compose `requestId` rather than automatically creating a new send.

## `GET /api/deal-card/:dealId/correspondence/broker`

Returns BROKER-channel messages visible to the caller. Trusted Axel `ADMIN`/
`CSA` staff see all deal broker threads. A deal-associated broker/agent sees
only their own thread. MARKET content is never included.

* `200` — `{ messages: CorrespondenceMessage[] }`
* `401` — no session
* `403` — caller cannot access the deal or is not a deal participant
* `404` — deal not found

## `POST /api/deal-card/:dealId/correspondence/broker`

Sends a staff-authored BROKER-channel message to exactly one authorized
deal-associated broker/agent. The server derives the recipient from
`recipientUserId`; market addresses and caller supplied routing fields are not
accepted.

```ts
type BrokerSendRequest = {
  recipientUserId: string; // UUID of an authorized deal-associated AGENT
  subject: string;
  text: string;
  html?: string;
  requestId?: string; // optional UUID; same retry semantics as MARKET
};
```

* `201` — `{ message: CorrespondenceMessage }`
* `400` — invalid body
* `401` — no session
* `403` — caller is not trusted Axel `ADMIN`/`CSA`, recipient is not an
  authorized participant, or deal access fails
* `404` — deal or recipient does not exist
* `422` — recipient/channel policy rejection
* `502` — provider failure; `DELIVERY_UNKNOWN` is manual-review only, while a
  known `failed` row requires a new compose `requestId` for an explicit retry
  (durable outbound failures return `{ error, outboundId, deliveryState }`
  with the raw state).

## `POST /api/deal-card/:dealId/correspondence/broker/reply`

An authorized deal-associated broker/agent posts a reply to **only their own**
persisted BROKER thread. This creates a thread message; it does not forward,
address, or send mail to a market.

```ts
type BrokerReplyRequest = { subject: string; text: string; html?: string };
```

* `201` — `{ message: CorrespondenceMessage }`
* `400` — invalid body
* `401`, `403`, `404` — as above

## `POST /api/deal-card/:dealId/correspondence/inbound/:messageId/retry-body`

Requests a body-only GET from Resend for an already persisted inbound message.
It never sends mail and updates the existing row idempotently.

* `200` — `{ message: CorrespondenceMessage, enriched: boolean }`
* `401`, `403`, `404` — as above; only trusted Axel `ADMIN`/`CSA` may retry
* `409` — Resend retrieval is not configured or the message is not a held/
  inbound correspondence message
* `502` — provider retrieval failed; row remains retryable with
  `enrichment: "FAILED"`

## `GET /api/deal-card/:dealId/correspondence/held`

Trusted staff review queue for unauthorized, mixed-audience, ambiguous, or
otherwise unclassifiable inbound mail. Held messages are not displayed by
either normal channel or any general activity endpoint.

The query parameters and response shape are the same as the global held queue.
This route is always constrained to `:dealId`; it never returns null-deal or
unrelated-deal rows. Therefore `filter=unmatched` returns an empty page and
zero filtered `total`, while `counts` still describes the authorized deal
scope.

* `200` — `HeldQueueResponse`
* `401`, `403`, `404` — as above; only trusted Axel `ADMIN`/`CSA` may read
