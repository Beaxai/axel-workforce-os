# Website → Producer Registration Connection Handoff

## Current boundary

The existing website should call these relative API paths from its **backend**:

- `POST /api/public/producer-registrations/connection-test`
- `POST /api/public/producer-registrations`

Use the Axel API's confirmed staging origin for testing, and its confirmed
published origin for production. Set that origin, without a trailing slash or
`/api` suffix, as `AXEL_API_ORIGIN` on the website backend. These paths are
implemented on the local development branch; they are not claimed to be
available at the published origin until that branch has been released.

The connection test proves only that authentication and routing work. It does
not submit an application, write to the database, or send email. The real
receiver currently authenticates valid JSON and returns
`503 {"error":"application_contract_pending"}` because the exact website field
contract is not yet available. This is intentionally not acceptance.

No existing legacy registration route or flow was changed. Closing the legacy
bypass remains a later launch gate.

## Signature contract

1. Serialize the JSON body once.
2. Do not compress the request.
3. Compute HMAC-SHA256 over the **exact UTF-8 bytes sent on the wire**, using
   `WEBSITE_WEBHOOK_SECRET`.
4. Encode the digest as 64 lowercase hexadecimal characters.
5. Send it as `X-Axel-Signature`. The explicitly supported optional form is
   `sha256=<lowercase hex digest>`.

The secret must be stored only in each service's secure environment/secret
manager. Never expose it to browser JavaScript, include it in a frontend build,
put it in a URL, log it, or send it in support messages.

Compressed request bodies are rejected so a sender and receiver cannot
disagree about whether compressed or decompressed bytes were signed. Raw bodies
are capped at 256KB.

## Backend Node example

```js
import { createHmac } from "node:crypto";

const reference = "AXR-20260131-A1B2C3"; // synthetic; not an applicant
const body = JSON.stringify({ reference, test: true });
const signature = createHmac(
  "sha256",
  process.env.WEBSITE_WEBHOOK_SECRET,
).update(Buffer.from(body, "utf8")).digest("hex");

const response = await fetch(
  `${process.env.AXEL_API_ORIGIN}/api/public/producer-registrations/connection-test`,
  {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-axel-signature": signature,
      "x-axel-idempotency-key": reference,
    },
    body,
  },
);
```

The only permitted connection-test body is:

```json
{"reference":"AXR-20260131-A1B2C3","test":true}
```

Its idempotency header must exactly equal the reference. Success is:

```json
{"connected":true,"reference":"AXR-20260131-A1B2C3","persisted":false}
```

Unknown fields are rejected. Do not use this endpoint with real applicant data.

## Outcomes

- `200`: synthetic connection test passed; `persisted` is always `false`.
- `401`: signature is missing, malformed, or invalid.
- `413`: raw body exceeds 256KB.
- `415`: a compressed/content-encoded body was supplied.
- `422`: authenticated JSON or connection-test fields are invalid.
- `429`: more than 10 requests/minute from one socket client address.
- `503 connection_not_configured`: receiver secret is unavailable.
- `503 application_contract_pending`: authenticated real endpoint remains
  deliberately disabled and persisted nothing.

The in-memory limiter is bounded and process-local. A multi-process or
multi-instance deployment must also enforce a shared/edge limit; this local cap
alone is not globally cumulative. The app does not trust arbitrary
`X-Forwarded-For` values for this limiter.
Behind a reverse proxy, the socket address may represent the proxy rather
than the original caller, so several callers can share this cap. Before launch,
configure a trusted edge/shared per-client limit; do not solve this by blindly
trusting forwarded headers.

## Secure enable steps

1. Generate one high-entropy shared secret through the approved secret
   management process; do not place its value in source, docs, tickets, or chat.
2. Configure it separately as `WEBSITE_WEBHOOK_SECRET` in the Axel API runtime
   and the existing website backend runtime.
3. Deploy/restart through the normal controlled process.
4. Run only the synthetic connection test above and confirm the `200` response.
5. Keep the real endpoint disabled until the mapping contract is reviewed.

## Input needed for the later application adapter

Provide the website's exact field keys, types, required/optional rules, legal
question semantics, owner structure, document metadata/URL rules, and one fully
fictional sample payload. Once approved, implement that contract in **one
explicit adapter** from the website model to the registration model. Do not add
a guessed canonical payload or a configurable/generic mapping engine.