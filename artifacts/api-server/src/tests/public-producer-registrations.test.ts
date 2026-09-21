import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { createServer, type Server } from "node:http";
import { afterEach, describe, it } from "node:test";
import express from "express";
import { createProducerRegistrationsRouter } from "../routes/public-producer-registrations.js";

const secret = "unit-test-website-secret";
const servers: Server[] = [];

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve, reject) =>
          server.close((error) => (error ? reject(error) : resolve())),
        ),
    ),
  );
});

async function start(getSecret: () => string | undefined = () => secret) {
  const app = express();
  app.set("trust proxy", false);
  app.use(
    "/api/public/producer-registrations",
    createProducerRegistrationsRouter({ getSecret }),
  );
  const server = createServer(app);
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert(address && typeof address !== "string");
  return `http://127.0.0.1:${address.port}/api/public/producer-registrations`;
}

function signature(body: string | Buffer, prefix = false): string {
  const digest = createHmac("sha256", secret).update(body).digest("hex");
  return prefix ? `sha256=${digest}` : digest;
}

function post(
  url: string,
  body: string | Buffer,
  headers: Record<string, string> = {},
): Promise<Response> {
  return fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-axel-signature": signature(body),
      ...headers,
    },
    body,
  });
}

describe("public producer registration connection", () => {
  it("authenticates the exact raw bytes, including whitespace and UTF-8", async () => {
    const url = await start();
    const body = Buffer.from('{ "label": "café", "nested": { "ok": true } }', "utf8");

    const response = await post(url, body, {
      "x-axel-signature": signature(body, true),
    });

    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: "application_contract_pending" });
  });

  it("rejects tampering and missing or malformed signatures", async () => {
    const url = await start();
    const original = '{"test":true}';

    const tampered = await post(url, '{"test":false}', {
      "x-axel-signature": signature(original),
    });
    assert.equal(tampered.status, 401);

    const missing = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: original,
    });
    assert.equal(missing.status, 401);

    const malformed = await post(url, original, { "x-axel-signature": "SHA256=abcd" });
    assert.equal(malformed.status, 401);
  });

  it("returns a generic unavailable response when configuration is absent", async () => {
    const url = await start(() => undefined);
    const response = await fetch(url, { method: "POST", body: "{}" });
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: "connection_not_configured" });
  });

  it("reports authenticated malformed JSON safely", async () => {
    const url = await start();
    const response = await post(url, '{"broken":');
    assert.equal(response.status, 422);
    assert.deepEqual(await response.json(), {
      error: "validation_failed",
      fields: { body: "Must be valid JSON." },
    });
  });

  it("rejects compressed content rather than signing decompressed bytes", async () => {
    const url = await start();
    const body = "{}";
    const response = await post(url, body, { "content-encoding": "gzip" });
    assert.equal(response.status, 415);
  });

  it("limits a client to ten requests per minute and ignores X-Forwarded-For", async () => {
    const url = await start();
    for (let index = 0; index < 10; index += 1) {
      const body = JSON.stringify({ attempt: index });
      const response = await post(url, body, {
        "x-forwarded-for": `203.0.113.${index}`,
      });
      assert.equal(response.status, 503);
    }
    const limitedBody = '{"attempt":10}';
    const limited = await post(url, limitedBody, {
      "x-forwarded-for": "198.51.100.25",
    });
    assert.equal(limited.status, 429);
  });

  it("enforces the 256KB raw-body limit", async () => {
    const url = await start();
    const body = Buffer.alloc(256 * 1024 + 1, 0x20);
    const response = await post(url, body);
    assert.equal(response.status, 413);
  });

  it("accepts only the synthetic test shape with matching idempotency key", async () => {
    const url = await start();
    const payload = JSON.stringify({
      reference: "AXR-20260131-A1B2C3",
      test: true,
    });
    const response = await post(`${url}/connection-test`, payload, {
      "x-axel-idempotency-key": "AXR-20260131-A1B2C3",
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      connected: true,
      reference: "AXR-20260131-A1B2C3",
      persisted: false,
    });
  });

  it("rejects unknown test fields, real-looking data, and a wrong idempotency key", async () => {
    const url = await start();
    const payload = JSON.stringify({
      reference: "AXR-20260131-A1B2C3",
      test: true,
      applicantName: "Must not be sent",
    });
    const response = await post(`${url}/connection-test`, payload, {
      "x-axel-idempotency-key": "AXR-20260131-OTHER1",
    });
    assert.equal(response.status, 422);
    const result = (await response.json()) as { fields: Record<string, string> };
    assert.equal(result.fields.body, "Only reference and test fields are permitted.");
    assert.equal(result.fields.applicantName, undefined);
    assert.equal(result.fields["X-Axel-Idempotency-Key"], "Must exactly match reference.");
  });
});