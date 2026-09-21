---
name: Appointment demo uses real tools
description: Demo acceptance requires actual integrations and transitions; only test data and missing documents may be fictional.
---

Appointment demos must use real SignWell, Calendly, Resend, persistence,
approval, countersigning, test-account activation and credential/login behavior.
Fictional applicant/business data and clearly labeled mocks for documents not
supplied are acceptable; simulated milestones are not acceptance.

**Why:** The user explicitly rejected a simulated walkthrough because the demo
must establish that the actual workflow works. Earlier permission for a demo
must not be interpreted as permission to bypass unfinished integrations.

**How to apply:** Use supplied documents, controlled test identities/inboxes,
actual provider actions and verified outcomes. Report missing code or provider
capabilities as blockers. Keep test-client API acceptance separate from real
website integration and synthetic-event tests separate from provider acceptance.
Preserve security and lifecycle gates; defer only unnecessary production/content
work, not core functioning behavior.