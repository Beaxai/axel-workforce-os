# Producer appointment email delivery

The producer appointment notification outbox and templates are implemented, but delivery is intentionally blocked. Every newly enqueued request is persisted with `status = blocked` and `failure_code = DELIVERY_NOT_ENABLED`.

Operational work required before enabling sends:

- Verify the production Resend account, API key, approved sender/domain, and sender identity. The repository contains real generic Resend integration, but that does not prove this producer workflow or production delivery is ready.
- Approve and configure the producer and staff recipient policies, including the staff distribution list.
- Confirm the authenticated production application origin used for executed-document access. The template boundary currently accepts only the explicit `https://app.axelworkforce.com/api/producer-registrations/{registrationId}/documents/{documentId}/access` shape and rejects raw storage URLs.
- Implement and review an outbox worker with atomic claiming, bounded retries, safe failure codes, monitoring, and operator retry controls.
- Define the controlled transition that unblocks rows only after verified delivery configuration. Do not reinterpret currently blocked rows as sent.
- Confirm whether SignWell notifications are disabled before enabling `packet_sent`.
- Confirm the Calendly reminder setting before enabling `call_reminder`; application reminders are allowed only when Calendly reminders are explicitly disabled.
- Complete controlled staging delivery tests and verify receipt for every applicant and staff template without sensitive values in provider payloads.
- Record production acceptance evidence, support ownership, alerting, and recovery procedures before go-live.

No provider calls, provider configuration changes, migration application, or background worker startup were performed as part of this implementation.