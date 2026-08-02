---
name: Deal task status casing
description: Deal tasks table has mixed status casing; compare case-insensitively.
---
The deal tasks table stores `status` as free text: schema default is `"OPEN"`, but the UI has historically written lowercase `"completed"`. Other journey tasks use `"COMPLETE"`.

**Why:** A code review caught the deal-card task drawer misclassifying tasks by comparing `status === "completed"` strictly — real data contains multiple casings.

**How to apply:** Anywhere task done-ness is computed, normalize (`status.toLowerCase()` and accept `completed`/`complete`). Don't "fix" the data casually — existing rows and code paths rely on both spellings.
