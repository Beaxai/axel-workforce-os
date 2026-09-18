---
name: Inbound email routing
description: How deal email reply-routing works and the webhook/raw-body pitfalls
---
Development reply tests need a separate Resend webhook targeting Development, with its own signing secret; keep the published endpoint and its secret unchanged.

**Why:** Replies to Development fixtures reached the published endpoint but could not resolve its market identities. Adding a Development endpoint then produced 401s until its separate signing secret was configured.

**How to apply:** Match webhook destination, signing secret, and fixture database before testing replies. A provider delivery success alone does not prove market routing.

Treat provider transport authentication separately from sender authentication. A signed Resend event or received-email GET does not make sender-supplied Authentication-Results trustworthy.

**Why:** Accepting a raw `dmarc=pass` header would allow an attacker to supply their own apparent verification. Subject tokens and quoted reply headers are also not authorization.

**How to apply:** Keep unverified external replies private for explicit staff verification and audited release to a server-derived candidate. Do not restore automatic routing based on a subject token or raw authentication header.

Access to unmatched mail does not authorize assigning it to an arbitrary deal.

**Why:** The owner approved separate deal-specific and staff-wide review queues while explicitly leaving manual matching outside that change. Seeing a message and proving its destination are separate actions.

**How to apply:** Preserve unmatched mail for staff review without adding a deal-picker shortcut. Any future matching workflow needs independent destination evidence, tenant checks, and an audit trail.

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
