---
name: Raw SQL timestamp types
description: Drizzle raw SQL results in this environment return timestamps as strings rather than Dates.
---

Normalize timestamps from raw SQL results before passing them into helpers that
expect JavaScript Dates. A TypeScript result annotation does not convert them.

**Why:** Appointment persistence integration tests exposed cancellation and
replacement failures despite passing pure ordering tests. The pure tests used
Dates, but actual raw SQL returned strings and `.getTime()` threw.

**How to apply:** At every raw-SQL timestamp boundary, validate and convert the
value explicitly or use a mapped query with verified runtime conversion. Cover
existing-row transitions using the real Development driver, not only Date-based
mock objects.