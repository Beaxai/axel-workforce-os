---
name: Inbound email routing
description: How deal email reply-routing works and the webhook/raw-body pitfalls
---
## Production reuse decision

The user confirmed that the existing email keys and webhooks are intended for
production reuse. Do not turn appointment-email work into credential replacement
or webhook reconstruction.

**Why:** Existing email infrastructure is deliberately shared with the intended
production setup; the open gap is appointment integration, not obtaining new keys.

**How to apply:** Reuse the existing setup, preserve endpoint/signing-secret
pairing, and separately verify deployed routing and appointment delivery.
This is configuration intent, not evidence of a successful production test or
authorization to send live messages. The Development routing lesson below still
applies when testing Development-only fixtures.

Development reply tests need a separate Resend webhook targeting Development, with its own signing secret; keep the published endpoint and its secret unchanged.

**Why:** Replies to Development fixtures reached the published endpoint but could not resolve its market identities. Adding a Development endpoint then produced 401s until its separate signing secret was configured.

**How to apply:** Match webhook destination, signing secret, and fixture database before testing replies. A provider delivery success alone does not prove market routing.

Treat provider transport authentication separately from sender authentication. A signed Resend event or received-email GET does not make sender-supplied Authentication-Results trustworthy.

**Why:** Accepting a raw `dmarc=pass` header would allow an attacker to supply their own apparent verification. Subject tokens and quoted reply headers are also not authorization.

**How to apply:** Keep unverified external replies private for explicit staff verification and audited release to a server-derived candidate. Do not restore automatic routing based on a subject token or raw authentication header.

Provider fixtures must exercise the minimal documented response, not just enriched payloads with duplicate raw headers.

**Why:** Valid provider responses need not repeat canonical fields in raw headers, and recipient envelopes may include hidden BCC audiences. Over-enriched fixtures can conceal both compatibility and privacy failures.

**How to apply:** Test canonical-only payloads, contradictory optional copies, and every recipient field whenever provider evidence is used for authorization or matching. Do not weaken identity checks to compensate for an inaccurate fixture.

Access to unmatched mail does not authorize assigning it to an arbitrary deal.

**Why:** Seeing a message and proving its destination are separate actions. Staff association was approved only as a separate evidence-checked workflow, not unrestricted manual assignment.

**How to apply:** Keep association separate from release. A provider receipt and persisted listener/thread can establish destination but cannot establish sender legitimacy. Missing independent evidence means no association; do not add a deal-picker shortcut or weaken sender-confirmed release to make historical mail match.

**Why/gotchas:**
- External webhooks are only reachable via `/api/webhooks/*` (port-80 proxy forwards only `/api`); the root `/webhooks` mount works only on :8080 direct. Webhooks router is mounted publicly inside the /api router BEFORE requireAuth.
- Svix signature verification must use the exact signed bytes; never HMAC a re-serialized body or bypass verification to make a provider test pass.
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
