# Meeting Log

Running record of meetings and decision conversations about the platform's future.
Newest at the top, one dated section per conversation. Append-only — nothing here is
edited after the fact, so it stays a faithful record.

How each entry connects to the other running docs:
- A decision made here that answers an open question → mark that question ANSWERED in
  `docs/questions-for-curtis/open-questions.md` (with the date and the answer).
- A decision that changes WHAT we build → new entry in
  `docs/decisions/build-decisions-log.md` when the build starts.
- New undecided items surfaced here → appended to the questions doc with a document
  reference and a suggested answer.

Entry template:

```
## <date> — <topic> (<who attended>)

**Decisions made:** plain-English list; note which open question each one answers.
**New directions / future ideas:** things discussed but not yet decided or specced.
**Action items:** who does what next.
```

---

## 2026-08-02 — Future-direction meeting (Curtis / Brendan)

*(In progress — notes appended as they come; not immediate build plans.)*

**New directions / future ideas:**

- **Quote wizard — never lose a broker/agent's work.** Two behaviors wanted:
  1. If the user tries to leave the form mid-entry, prompt them to **save or cancel**
     before leaving — no silent loss of typed work.
  2. If they do navigate away, the wizard should let them **pick up exactly where they
     left off** when they come back.
  Context for whoever builds this later: partial groundwork already exists — the June
  off-plan work landed "quote wizard draft persistence / autosave / resume-from-
  Pipeline" (State Doc §4, line 125), and a `quote-drafts` API is live. This meeting
  item extends that to an explicit leave-guard prompt and a reliable resume from any
  navigation path, not just the Pipeline drafts dropdown. Future work order — not in
  the current build queue.

Going in, the open items on the table are Q1–Q12 in
`docs/questions-for-curtis/open-questions.md`, and the build state is:
SEC-1 security done awaiting review (Q1–Q4), WC-3b deposit monitor tasks 1–2 built,
deposit-monitor UI (task 3) and broker fee (WC-2) next in line.
