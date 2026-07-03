---
name: Long wizard e2e runs
description: How to e2e-test the multi-phase quote wizard without hitting the 10-min runTest cap
---

**Rule:** The runTest sandbox hard-caps at ~10 minutes; a full quote-wizard submission (Phase 1 workforce widget + Phase 2) does not fit in one run. Split it into resume-based runs using the draft autosave: Run 1 through Phase 1, then resume from the Pipeline "In-Progress Submissions" card in later runs. If a run times out, the draft still holds progress — inspect/patch `quote_drafts.state` (the full store snapshot, `locations[].classCodes[]` with `fullTimeEmployees`/`annualPayroll`) directly via the API or SQL instead of re-driving the UI.

**Why:** Two full-flow attempts timed out; the test agent is also unreliable at the workforce widget's data entry (wrong locations, missing counts) — server-side patching of the draft is faster and deterministic.

**How to apply:** Any e2e covering more than one wizard phase → plan multiple runs with explicit "STOP here" boundaries; verify/repair the draft between runs.

Also: the BIC rate table has 46 states but NOT NY — NY class codes rate to $0 with per-class "No rate found" errors (flow still completes). Don't treat NY $0 premiums as a bug.
