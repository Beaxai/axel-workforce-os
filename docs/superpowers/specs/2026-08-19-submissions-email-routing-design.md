# Submissions Email Routing Migration

**Date:** August 19, 2026  
**Scope:** Email identity and reply routing only. App routes, database entity names, and user-facing “Deals” terminology are unchanged.

## Goal

Partner-facing messages should use a professional Axel sender while replies continue to land on the correct deal card:

- **From:** `submissions@axelins.com`
- **Reply-To:** `<company-slug>-<file-id>@submissions.axelins.com`

The root `axelins.com` MX records must remain assigned to Microsoft 365. Resend receives only mail addressed to the dedicated `submissions.axelins.com` subdomain.

## Domain Architecture

### Sending

Keep the existing verified Resend domain `axelins.com` configured for sending only. Its verified DKIM, SPF, and custom return-path records remain unchanged. The application changes only the local part of the visible sender from `deals` to `submissions`.

`submissions@axelins.com` should be created as a Microsoft 365 shared mailbox or alias. Resend can send from the address without a mailbox, but the mailbox/alias prevents manually composed messages to that address from bouncing.

### Receiving

Create `submissions.axelins.com` as a separate receiving-only Resend domain. Add the exact MX record supplied by Resend to SiteGround at the `submissions` host. Do not add or replace an MX record at the root `@` host.

Keep `deals.axelins.com` enabled during validation. Remove it only after the new subdomain is verified and the live round-trip test succeeds.

## Application Configuration

Set the following production/shared configuration:

```text
OUTBOUND_EMAIL_FROM=submissions@axelins.com
LISTENER_EMAIL_DOMAIN=submissions.axelins.com
```

Configure `RESEND_WEBHOOK_SECRET` through Replit Secrets after creating the production `email.received` webhook. The webhook endpoint remains:

```text
https://workforce-management-system.replit.app/api/webhooks/resend-inbound
```

Republish after changing production configuration.

## Existing Test Listener Addresses

Production currently contains test-data listener-address rows on the obsolete `listener.axel.io` domain. They are outside this migration’s scope and remain unchanged. The `submissions.axelins.com` configuration applies to newly created deal listener addresses and future live correspondence only.

## Partner Experience

Partners see:

- A visible sender of `submissions@axelins.com`
- A subject containing the existing `[AXL-<file-id>]` routing token
- A unique Reply-To address under `submissions.axelins.com`

When a partner replies, Resend posts the message to the webhook. The application routes it using the recipient address, subject token, or message-thread headers and stores it on the associated deal card. No conventional mailbox on the receiving subdomain is required.

## Error Handling and Safety

- Do not modify the Microsoft 365 root MX records.
- Do not disable `deals.axelins.com` until the replacement passes live validation.
- Reject or visibly log webhook signature failures once `RESEND_WEBHOOK_SECRET` is configured.
- Preserve inbound idempotency so Resend retries cannot create duplicate messages.

## Validation

1. Confirm `axelins.com` remains verified for sending in Resend.
2. Confirm the authoritative SiteGround DNS response for `submissions.axelins.com` matches Resend’s expected MX target and priority.
3. Confirm Resend marks the receiving MX as verified.
4. Confirm a newly created deal listener address uses `submissions.axelins.com`.
5. Send a production message and confirm:
   - From is `submissions@axelins.com`
   - Reply-To uses the deal-specific `submissions.axelins.com` address
   - SPF, DKIM, and DMARC pass in the delivered message headers
6. Reply from an external partner mailbox and confirm the message appears once on the correct deal card.
7. Confirm the webhook reports no signature or routing errors.
8. After successful validation, remove the unused `deals.axelins.com` Resend domain and its SiteGround MX record.