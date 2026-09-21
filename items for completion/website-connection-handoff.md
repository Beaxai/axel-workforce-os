# Website Connection — Instructions and Completion Checklist

**Status:** Connection framework implemented; real application acceptance remains disabled.
**Branch:** `appointment/01-intake`.

The existing website is already built. This work connects its backend to Axel;
it does not replace the website or its form.

## Items for completion

- [ ] Confirm the Axel staging API origin and give it to Gershom.
- [ ] Configure the same high-entropy `WEBSITE_WEBHOOK_SECRET` securely on both backends. Never put its value in source, documentation, tickets, or chat.
- [ ] Release the receiving code to the intended testing environment.
- [ ] Add the signed request below to the website backend and pass the synthetic connection test.
- [ ] Obtain the website's exact field keys, types, required/optional rules, seven legal-question meanings, owner structure, document metadata/URL rules, and one fictional sample payload.
- [ ] Implement and validate one explicit adapter from the existing website payload to the registration model.
- [ ] Complete atomic registration/owner/document/job persistence, duplicate handling, warning flags, and private document ingestion.
- [ ] Protect the legacy registration paths so they cannot bypass signed intake or lifecycle controls.
- [ ] Configure trusted shared/edge per-client rate limiting before launch.
- [ ] Verify real intake acceptance: valid `201`, invalid signature `401`, replay `409`, invalid fields or missing required documents `422`, low-E&O warning, and concurrent duplicate prevention.
- [ ] Confirm the published API origin and authorize release before enabling real applications.

The synthetic test is not an application submission. Signing packets, applicant
emails, scheduling, and approval remain separate implementation milestones.

## Connection endpoints

Call these paths from the existing website's **backend**, not browser code:

- `POST /api/public/producer-registrations/connection-test`
- `POST /api/public/producer-registrations`

Set `AXEL_API_ORIGIN` on the website backend to the confirmed Axel API origin,
without a trailing slash or `/api` suffix. Use staging for testing and the
confirmed published origin for production. Local implementation does not mean
these endpoints are already available in production.

The real receiver currently authenticates valid JSON but returns:

```json
{"error":"application_contract_pending"}
```

That is HTTP `503`, not application acceptance. It persists nothing.
Without the shared secret configured, the receiver instead returns HTTP `503`
with `{"error":"connection_not_configured"}`.

## Signature contract

1. Serialize the JSON body once.
2. Do not compress the request.
3. Compute HMAC-SHA256 over the exact UTF-8 bytes sent, using `WEBSITE_WEBHOOK_SECRET`.
4. Encode the digest as 64 lowercase hexadecimal characters.
5. Send the digest in `X-Axel-Signature`. The optional form `sha256=<lowercase hex digest>` is also supported.
6. For the connection test, send `X-Axel-Idempotency-Key` equal to the synthetic reference.

Keep the shared secret on the two backends only. Never include it in browser
JavaScript, frontend builds, URLs, logs, or support messages.

## Backend Node example

```js
import { createHmac } from "node:crypto";

const reference = "AXR-20260131-A1B2C3"; // fictional, not an applicant
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

Success is HTTP `200`:

```json
{"connected":true,"reference":"AXR-20260131-A1B2C3","persisted":false}
```

Unknown fields are rejected. Do not send real applicant data to this test.
It creates no records and sends no emails or signing packets.

## Response codes and limits

| HTTP code | Meaning |
|---|---|
| `200` | Synthetic connection test passed; no data persisted |
| `401` | Missing, malformed, or invalid signature |
| `405` | Method other than POST |
| `413` | Body exceeds 256 KB |
| `415` | Compressed/content-encoded request body |
| `422` | Invalid authenticated JSON or synthetic test fields |
| `429` | More than 10 requests per minute from one socket client address |
| `503` | Shared secret missing, or real application contract still pending |

The current limiter is bounded and process-local. Behind a reverse proxy,
several callers may share the proxy's socket address. Multi-instance deployments
need a trusted edge/shared per-client limit; do not blindly trust forwarded
headers to resolve this.

## Existing implementation references

- [Original technical handoff](../docs/implementation/website-connection-handoff.md)
- [Part 1 progress and verification](../docs/implementation/appointment-part1-progress.md)
- [Full appointment scope](../docs/producer-registration-appointment-scope.md)

Keep these instructions aligned with the receiving API when the website adapter
is finalized. Do not treat the fictional test payload as the real form contract.