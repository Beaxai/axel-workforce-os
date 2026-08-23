---
name: Inbound email routing
description: How deal email reply-routing works and the webhook/raw-body pitfalls
---
Three routing layers, in order: (1) recipient = deal listener address, (2) `[AXL-{fileId}]` subject token, (3) In-Reply-To/References vs stored outbound rfc_message_id (best-effort — provider may rewrite Message-ID; layers 1–2 are the reliable ones).

**Why/gotchas:**
- External webhooks are only reachable via `/api/webhooks/*` (port-80 proxy forwards only `/api`); the root `/webhooks` mount works only on :8080 direct. Webhooks router is mounted publicly inside the /api router BEFORE requireAuth.
- Svix signature verification must use the exact signed bytes: app.ts express.json has a `verify` hook stashing `req.rawBody`; never HMAC a re-serialized body. Verification enforced only when RESEND_WEBHOOK_SECRET is set (dev skips → simulated payloads testable).
- Inbound idempotency is DB-enforced (unique message_id + ON CONFLICT DO NOTHING); select-then-insert races under webhook retries.
- No RESEND_API_KEY → sends stored as `dev_logged`, never hit the provider; live sending flips on with the key + `OUTBOUND_EMAIL_FROM`/`LISTENER_EMAIL_DOMAIN` env vars (inbound also needs MX on the listener domain).
- drizzle push prompts interactively for new unique constraints on non-empty tables and aborts silently on piped stdin — apply `ALTER TABLE ... ADD CONSTRAINT` via a db.execute script instead.

**How to apply:** any new outbound email path must go through `sendDealEmail` (Reply-To + subject token + Message-ID recording) or replies won't route.

## Partner-facing domain architecture
Use `submissions@axelins.com` as the visible sender and `submissions.axelins.com` as the receiving-only listener domain. Keep the root MX assigned to Microsoft 365.

**Why:** A recognizable root-domain sender helps partner trust, while the dedicated receiving subdomain lets Resend route replies to deal cards without interfering with normal company email.

**How to apply:** New live correspondence uses the submissions domain. Legacy listener rows belong to test data and are intentionally not migrated.

## Resend receiving-domain gotcha
Resend's Receiving MX check always targets the ROOT of the domain entry (`name: ""`). A domain entry `example.com` can never verify receiving on a subdomain. To receive on `deals.example.com` while the root MX serves real company mail, add `deals.example.com` as its own separate Resend domain entry (same region); its receiving check then targets the subdomain itself. Diagnose via `GET https://api.resend.com/domains/:id` — the `records[]` array shows expected name/value/status directly (no dashboard screenshots needed).
