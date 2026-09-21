# Calendly appointment setup — items for completion

- Configure `CALENDLY_SIGNING_KEY` through the approved secret-management process; do not record the value here.
- Configure `CALENDLY_EVENT_URI` with the Calendly API **event type URI**, not the human scheduling URL.
- Configure `PRODUCER_CALENDLY_ORG_ID` with a UUID present in `trusted_axel_organizations`.
- Create and verify the Calendly webhook subscription for only the configured event type.
- Confirm whether Calendly reminders are disabled before implementing Axel's 24-hour reminder.
- Implement and approve the 48-hour scheduling-nudge policy and worker.
- Completed: raw-body router mounted before the global JSON parser; schema tables exported.
- Wire the durable producer-notification outbox helper and resolve approved staff/applicant recipients. Until then, `staff_needs_review` is the persistent alert for unmatched or ambiguous events.
- Completed in Development: migration applied and independently verified. This is not production migration evidence.
- Complete live acceptance: booking visibility within one minute, duplicate delivery, cancellation, reschedule, out-of-order delivery, unmatched/ambiguous review, and meeting-link visibility.

`https://calendly.com/axelworkforcesolutions/30min` is a human scheduling link. It is not an API event type URI. The directive describes the meeting as 45 minutes despite that slug; account owners must resolve and approve that provider configuration.

The receiver intentionally rejects authenticated booking payloads that omit `payload.scheduled_event.event_type`. Fetching the event type from Calendly would require a provider API call, which is outside this implementation authorization; it does not guess from the public scheduling URL.