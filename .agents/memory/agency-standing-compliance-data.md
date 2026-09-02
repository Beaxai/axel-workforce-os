---
name: Agency standing compliance data
description: Data ownership rule for agency E&O and executed-agreement facts across direct appointment, import, and registration intake.
---

Standing E&O policy details and executed-agreement facts belong on the agency record. Registration is an intake workflow, not the canonical owner of those ongoing facts.

Registration approval copies E&O and agreement values into empty agency fields but never replaces populated agency values.

**Why:** Agencies appointed directly or through bulk import may never have registration records, while registration-only workflow fields such as envelope, sent-at, and Zoom state do not describe standing agency facts.

**How to apply:** Read agency cards and operational agency views from agency-level E&O/agreement fields. Use linked registration only as a fallback for in-progress agreement status.