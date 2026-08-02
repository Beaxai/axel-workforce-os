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

- **Proposal request workflow (agent-driven) — the target flow, end to end:**
  Agent/broker contacts the client → asks the questions to fill out the indication →
  gets a price → pitches the price → if the client likes it, moves to proposal
  (similar to disclosing in mortgage, but usually goes straight into underwriting with
  limited processing) → agent/broker clicks **Request Proposal** — this button is
  needed in the card view.

  - *Sidenote (card fixes):* the deal card should show **both the WC price and the PEO
    price**, and the **per-employee figure is not populating** — it should sit right
    next to the WC quote. (The agent/broker is the one filling out info.)

- **Ideas around that flow (to plan/discuss, not yet specced):**
  - "Request for proposal" leads back to the quote wizard screen; in general,
    **anywhere you interact with the price/quote should lead back to the wizard.**
  - Once everything required is complete, the agent can send the proposal request —
    an email goes to the carriers using a **standard template with the pertinent
    info**. The button is available **only after the necessary requirements are
    completed**.
  - The underwriter may respond with a proposal, clarifying questions, or requests —
    **all visible on the deal card**. Agents/brokers see the entire email
    correspondence with the carrier/underwriter on the card and can **reply directly
    from the card**. How to make this work effectively needs a planning discussion.
  - If approved, the reply may include a **PDF proposal**. We want to extract its
    contents (OCR or similar) so the client-facing output can be **standardized in our
    look and feel**. If this is hard, we need to know the constraints.
  - After the proposal comes back: a new **Request to Bind** action button.
  - At bind time, **both proposals — the standardized one and the carrier's original —
    go out as one package for client signature via SignWell**. Before the client can
    complete the proposal they are **prompted to pay to bind** — possibly by embedding
    SignWell inside a container we control so we can direct the workflow.

  *Where this touches existing scope (for the follow-up discussion):*
  - Carrier email on the card = the §6C listener-email threading already specced
    (State Doc lines 210–212) and planned as WC-5 — this extends it from bind-stage to
    proposal-stage correspondence, and makes it two-way (reply from the card). Still
    blocked on the domain ruling (Q5).
  - **SignWell vs HelloSign:** the State Doc (§2 lines 62–63) and Q6 say
    HelloSign/Dropbox Sign. If SignWell is the direction now, Q6 changes from
    "provide a HelloSign key" to "confirm the switch to SignWell" — needs an explicit
    ruling.
  - **Pay-to-bind** introduces payment processing, which exists nowhere in the stack
    today — new scope, vendor decision needed (and it interacts with §6A item 10's
    "sign-and-pay in one workflow" ideal for the broker fee, line 205).
  - PDF proposal extraction (OCR) is a new capability — feasibility/constraints answer
    owed to Curtis.

Going in, the open items on the table are Q1–Q12 in
`docs/questions-for-curtis/open-questions.md`, and the build state is:
SEC-1 security done awaiting review (Q1–Q4), WC-3b deposit monitor tasks 1–2 built,
deposit-monitor UI (task 3) and broker fee (WC-2) next in line.
