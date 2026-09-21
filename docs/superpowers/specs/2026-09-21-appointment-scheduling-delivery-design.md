# Real scheduling-link delivery

## Approved first milestone

Connect the existing manual scheduling-link action to actual Resend sending,
then verify a real Calendly booking when its integration is configured. The user
approved this sequence and supplied a controlled test inbox. That address is
runtime configuration, not source, documentation or memory content.

## Approach

Use the existing persistent appointment outbox and a bounded background sender.
Sending synchronously inside the staff action risks duplicate or ambiguous
requests; creating an unrelated mail system would duplicate existing patterns.
Preserve the transactional action-ID/intent contract and use a producer-specific
provider boundary without borrowing deal records.

New manual scheduling-link requests can become pending only with explicit
delivery enablement, valid sender/provider configuration and a test-recipient
allowlist. Other appointment events and historical blocked requests remain
blocked. Claims are atomic, provider retries use the same notification-level
idempotency identity, and uncertain outcomes require reconciliation rather than
blind duplicate sends. No database migration is expected.

## User-visible behavior

Show queued, sending, provider-accepted, blocked and failed status; do not claim
inbox delivery from provider acceptance. Preserve request identity through client
transport retries. Poll pending work so status changes appear without reopening.
An intentional resend creates a new request; a transport retry does not.

## Verification and limits

Test delivery classification, claim concurrency, stale claims, retry identity,
recipient/configuration gating, existing backlog protection and route roles.
Exercise the actual staff route against a clearly identified test registration,
send through Resend and check provider delivery evidence where available.
Retain the test registration for real Calendly matching; fixture creation is not
website-intake acceptance. Never modify existing accounts or claim a synthetic
Calendly event proves live booking.

Live Calendly acceptance additionally needs its account connection, event-type
URI, signing configuration and correct environment subscription. Missing pieces
must be reported, not replaced by simulated success.