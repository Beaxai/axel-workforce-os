---
name: Producing-Agent attachment eligibility
description: Business rule for authorization, status, and compliance checks when associating a producing Agent with a deal.
---

Registration approval is the compliance checkpoint. Do not gate producing-Agent attachment on NPN, license-state, or E&O completeness.

New attachments require both the Agent and their agency to be Active. Suspended, terminated, or otherwise non-active records are blocked. Existing associations remain intact after later status changes.

Only ADMIN, CSA, and UNDERWRITER may set or change `producingAgentId`; enforce this whenever the field is supplied, including unchanged and null values.

**Why:** Approved agencies and their Agents are cleared to submit business, so attachment-time licensing checks duplicate the registration decision and block legitimate work.

**How to apply:** Keep authorization and active-status checks consistent across create, generic update, and dedicated assignment paths. Treat registration and E&O details as informational agency-level UI only.