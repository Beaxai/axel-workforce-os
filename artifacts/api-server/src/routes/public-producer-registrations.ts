import { createHmac, timingSafeEqual } from "node:crypto";
import { Router, type IRouter, type Request, type Response } from "express";

const MAX_BODY_BYTES = 256 * 1024;
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;
const MAX_RATE_LIMIT_CLIENTS = 10_000;
const REFERENCE_PATTERN = /^AXR-\d{8}-[A-Z0-9]{6}$/;
const SIGNATURE_PATTERN = /^(?:sha256=)?([0-9a-f]{64})$/;

type RateEntry = { count: number; resetAt: number };

export type ProducerRegistrationRouterOptions = {
  getSecret?: () => string | undefined;
  now?: () => number;
};

function fieldError(res: Response, fields: Record<string, string>): void {
  res.status(422).json({ error: "validation_failed", fields });
}

/**
 * This limiter is deliberately process-local and bounded. Deployments with
 * multiple API processes need an edge/shared limiter in addition to this
 * defense-in-depth cap.
 */
function createRateLimiter(now: () => number) {
  const clients = new Map<string, RateEntry>();

  return (req: Request, res: Response, next: () => void): void => {
    const timestamp = now();
    const client = req.socket.remoteAddress ?? "unknown";
    let entry = clients.get(client);

    if (!entry || entry.resetAt <= timestamp) {
      entry = { count: 0, resetAt: timestamp + RATE_WINDOW_MS };
      clients.set(client, entry);
    }

    entry.count += 1;
    if (entry.count > RATE_LIMIT) {
      res.status(429).json({ error: "rate_limit_exceeded" });
      return;
    }

    if (clients.size > MAX_RATE_LIMIT_CLIENTS) {
      for (const [key, value] of clients) {
        if (value.resetAt <= timestamp || key !== client) {
          clients.delete(key);
          if (clients.size <= MAX_RATE_LIMIT_CLIENTS) break;
        }
      }
    }
    next();
  };
}

function authenticateRawBody(getSecret: () => string | undefined) {
  return (req: Request, res: Response, next: () => void): void => {
    const secret = getSecret();
    if (!secret) {
      res.status(503).json({ error: "connection_not_configured" });
      return;
    }

    const supplied = req.get("X-Axel-Signature") ?? "";
    const match = SIGNATURE_PATTERN.exec(supplied);
    if (!match) {
      res.status(401).json({ error: "invalid_signature" });
      return;
    }

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
    let finished = false;
    const hmac = createHmac("sha256", secret);

    req.on("data", (chunk: Buffer) => {
      if (finished) return;
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        finished = true;
        res.status(413).json({ error: "payload_too_large" });
        return;
      }
      chunks.push(chunk);
      hmac.update(chunk);
    });

    req.on("end", () => {
      if (finished) return;
      const expected = hmac.digest();
      const candidate = Buffer.from(match[1], "hex");
      if (!timingSafeEqual(expected, candidate)) {
        res.status(401).json({ error: "invalid_signature" });
        return;
      }

      (req as Request & { rawBody: Buffer }).rawBody = Buffer.concat(chunks, size);
      next();
    });

    req.on("error", next);
  };
}

function parseAuthenticatedJson(req: Request, res: Response, next: () => void): void {
  const rawBody = (req as Request & { rawBody: Buffer }).rawBody;
  try {
    req.body = JSON.parse(rawBody.toString("utf8"));
  } catch {
    fieldError(res, { body: "Must be valid JSON." });
    return;
  }
  next();
}

export function createProducerRegistrationsRouter(
  options: ProducerRegistrationRouterOptions = {},
): IRouter {
  const router = Router();
  const getSecret = options.getSecret ?? (() => process.env.WEBSITE_WEBHOOK_SECRET);
  const rateLimit = createRateLimiter(options.now ?? Date.now);

  router.use((req, res, next) => {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      res.status(405).json({ error: "method_not_allowed" });
      return;
    }
    const secret = getSecret();
    if (!secret) {
      res.status(503).json({ error: "connection_not_configured" });
      return;
    }
    rateLimit(req, res, next);
  });
  router.use(authenticateRawBody(getSecret));
  router.use(parseAuthenticatedJson);

  router.post("/connection-test", (req, res): void => {
    const fields: Record<string, string> = {};
    if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
      fieldError(res, { body: "Must be a JSON object." });
      return;
    }

    for (const key of Object.keys(req.body)) {
      if (key !== "reference" && key !== "test") {
        fields.body = "Only reference and test fields are permitted.";
      }
    }
    if (typeof req.body.reference !== "string" || !REFERENCE_PATTERN.test(req.body.reference)) {
      fields.reference = "Must match AXR-YYYYMMDD-XXXXXX.";
    }
    if (req.body.test !== true) {
      fields.test = "Must be true.";
    }
    const idempotencyKey = req.get("X-Axel-Idempotency-Key");
    if (typeof req.body.reference === "string" && idempotencyKey !== req.body.reference) {
      fields["X-Axel-Idempotency-Key"] = "Must exactly match reference.";
    }
    if (Object.keys(fields).length > 0) {
      fieldError(res, fields);
      return;
    }

    res.json({ connected: true, reference: req.body.reference, persisted: false });
  });

  router.post("/", (req, res): void => {
    if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
      fieldError(res, { body: "Must be a JSON object." });
      return;
    }
    res.status(503).json({ error: "application_contract_pending" });
  });

  return router;
}

export default createProducerRegistrationsRouter();