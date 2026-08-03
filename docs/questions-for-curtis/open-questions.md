# Open Questions for Curtis

One running list. Newest at the top. Each question has a suggested answer so you can
just reply "1: agree, 2: agree, 3: no — do X instead."

Every question names the document section it comes from (State Doc =
`docs/STATE_DOCUMENT_v2.4.md`, with line numbers), so you can see exactly what you're
ruling on. Questions with no document source say so — those are new-scope proposals.

Context for all of it: **the app has no real users yet.** Nothing here is urgent or
breaking — these are design decisions we want settled correctly before launch.

---

## Added 2026-08-02 (later) — follow-ups needing your decision (from the meeting + audit)

### 15. Which email service sends our outbound email — SendGrid or Resend?

*From: State Doc §2, line 66 — Email is "Absent — not wired," and §5 line 163 puts
"email sending" in P6. The meeting's proposal-request flow (template email to carriers)
needs a real sending service, so this decision moves up.*

The two candidates, in plain terms:

- **SendGrid** (owned by Twilio) — the long-established, enterprise-grade choice.
  Strong deliverability tooling (dedicated IPs, detailed analytics, bounce/spam
  management). More setup friction: create an account, verify a sender domain, provide
  an API key. Better fit if you already use it or expect high volume to many carriers.
- **Resend** — modern and simpler, faster to integrate, available as a managed Replit
  integration (credentials handled for us). A clean fit for transactional email like
  "proposal request sent to carrier X." Less enterprise tooling, but plenty for this
  use case.

Either works for sending proposal requests; the practical difference is setup effort
vs. mature deliverability controls. Note this pairs with question 5 (the listener
email domain) — sender-domain verification will use whatever domain you pick there.

**Question A:** SendGrid or Resend?
**Suggested answer:** Resend, unless you already have a SendGrid account — quicker
path, and we can switch later if volume demands it.

**Question B:** Should the carrier email fire automatically when the agent clicks
Request Proposal, or be a separate manual "send to carrier" action?
**Suggested answer:** Fires on Request Proposal, but only after the requirements gate
passes (per the meeting: the button only activates when everything needed is complete).

### 16. What must be complete before "Request Proposal" activates?

*From: the meeting — "only after the necessary requirements are completed." The system
already measures submission completeness section by section (it's how the bind gate
works); we need your list of which sections/fields are required at the proposal stage,
which is earlier and lighter than binding.*

**Question:** Which parts of the submission must be complete before an agent can
request a proposal?
**Suggested answer:** Business info, workforce/payroll, loss history, and a generated
indication price — with the rest allowed to finish before bind. Correct this list as
needed.

### 17. Fold the meeting outcomes into the next State Document version

*From: Instructions, "How work flows" step 5 — "the doc is the only shared memory. If
it's not in the doc, it didn't happen."*

Today's decisions and directions aren't real until the master doc carries them. The
audit (meeting log, 2026-08-02) lists the sections to amend: §2 e-signature row (if
SignWell — Q13), §6C correspondence scope (proposal-stage, two-way), a new
proposal-workflow section (Request Proposal flow, OCR standardization, pay-to-bind —
Q14), §4 off-plan list (wizard save-guard), plus the §8 pipeline count fix (Q12).

**Question:** Will you issue a v2.5 State Document with these, so we can cut work
orders against it?
**Suggested answer:** Yes — we can draft the amended sections for your review to make
it a 10-minute edit instead of a rewrite.

## Added 2026-08-02 — from the future-direction meeting (see docs/meetings/meeting-log.md)

### 13. SignWell or HelloSign?

*From: State Doc §2, lines 62–63 — the CONFIRMED TECH STACK (BINDING) table says
"HelloSign / Dropbox Sign", and §6F line 238 says "HelloSign LIVE API key required for
P5." Today's meeting notes name SignWell for the proposal signing package.*

These point at different vendors, and e-signature is in the binding stack table — so a
switch needs your explicit ruling (and a State Doc update). If SignWell it is, question
6 changes from "provide a HelloSign key" to "provide a SignWell account/key," and the
existing HelloSign stub code gets swapped when signing work starts.

**Question:** SignWell or HelloSign?
**Suggested answer:** Whichever you pick — one word settles it; nothing is built on
either yet beyond a stub.

### 14. Pay-to-bind: what exactly is the client paying?

*From: the meeting's "prompted to pay to bind" idea vs State Doc §6A item 3 (line 184):
the carrier deposit is "paid by client DIRECTLY to carrier," and §6E (line 233): the
deposit "NEVER gates Active Client conversion." But §6A item 10 (line 205) says the
ideal broker-fee flow is "sign-and-pay in one workflow when possible."*

If pay-to-bind collects the **Axel broker fee**, it matches the doc's ideal exactly.
If it collects the **carrier deposit or premium**, it contradicts the doc (client pays
the carrier directly, and payment never gates). This also decides whether we need a
payment processor (Stripe or similar) — nothing in the stack takes money today.

**Question:** Is the pay-to-bind payment the Axel broker fee only?
**Suggested answer:** Yes — broker fee only, carrier money keeps flowing direct to
carrier per the doc. (If you want more collected at bind, the doc's deposit rules need
rewriting first.)

## Added 2026-08-02 — from the security build (SEC-1)

We finished the multi-tenant security work: each login now sees only its own deals.
Agents see the deals they sold, a broker sees their whole agency's deals, a client
company sees its own deals, and Admin/CSA/Underwriter see everything. It's on a review
branch, fully tested, not merged until you approve.

*Overall source: State Doc §4, line 122 — "Server-enforced role access: ADMIN/CSA edit
all; UNDERWRITER view-only; AGENT edit own deals; EMPLOYER edit business sections
only… CARRIER/PEO view-only relevant sections." SEC-1 applies that rule to every list
and read in the app, not just the deal card. Decision detail:
`docs/decisions/build-decisions-log.md`.*

### 1. Old deals aren't tagged with who sold them

*From: State Doc §4, line 122 ("AGENT edit own deals") — enforcing it means every deal
must record which agent sold it.*

The security rules work by tagging every deal with the agent who sold it. New deals get
tagged automatically from now on. The deals already in the system (the demo data) were
created before tagging existed, so when you log in *as an agent*, the pipeline looks
empty. Admin logins see everything, so demos as Admin are unaffected.

**Question:** For the existing demo deals, is it fine to just tag them all to the demo
agent so agent-view demos work?
**Suggested answer:** Yes — one-time script, demo data only.

### 2. What exactly is a "broker"?

*From: State Doc §4, line 122 lists the roles — Broker is not one of them, but agencies
with a principal who oversees their agents' deals exist in your operating process.*

We modeled it as: an agency is a company in the system, its agents belong to it, and one
or more members are marked "broker" — those members see every deal the agency sold. The
alternative was making Broker a whole new user type next to the existing eight
(Admin, Underwriter, CSA, Agent, Employer, Carrier, PEO, Vendor).

**Question:** Is "broker = a marked member of an agency" the right model?
**Suggested answer:** Yes, keep as built — no ninth user type.

### 3. Selling a deal vs. being assigned to it

*From: State Doc §4, line 122 says "AGENT edit own deals" — but "own" can mean sold-it
or assigned-to-it, and the doc doesn't say which.*

An agent can be *assigned* to a deal (as its internal owner) without being the one who
*sold* it. Old code let assigned agents see those accounts. The new rule is stricter:
only the selling agent (and their broker) sees a deal.

**Question:** Should being assigned to a deal also grant visibility, or is
selling-it the only thing that counts?
**Suggested answer:** Selling only (as built). We can widen later if assignment
turns out to matter.

### 4. Carriers, PEO partners, and vendors see nothing right now

*From: State Doc §4, line 122 — "CARRIER/PEO view-only relevant sections." The doc
defines their deal-card access but not which deals/lists they may see, so we locked
lists to zero rather than guess. §6G (line 261) says the PEO partner will need access
to update onboarding progress.*

**Question:** OK to leave them at zero access until each one gets its own spec?
**Suggested answer:** Yes — spec PEO partner access as part of the P5 PEO build.

---

## Standing items (carried from the meeting list — still open)

### 5. Deal listener email domain

*From: State Doc §8, line 293 — "[clientname][ID]@card.axelworkforce.com". The code
currently uses `listener.axel.io` instead.*

We need the real domain before building email receiving (WC-5), because it affects DNS
setup.

**Question:** Which domain should deal emails use — `card.axelworkforce.com` as the doc
says, or something else?

### 6. HelloSign (Dropbox Sign) live API key — *may be superseded by question 13 (SignWell)*

*From: State Doc §2, lines 62–63 ("HelloSign / Dropbox Sign — Stubbed (no API key)")
and §6F, line 238 — "HelloSign LIVE API key required for P5 — the stub cannot run a
real bind."*

**Question:** Can you create/provide the HelloSign account + API key when P5 signing
work starts?

### 7. File storage provider

*From: State Doc §2, line 68 — "File storage (future): S3 or Cloudflare R2 — Not
built." Uploads currently land on the app server's own disk, which gets wiped on
redeploys — fine for demos, not for launch.*

**Question:** S3 or Cloudflare R2? (Either is a small monthly cost; R2 is usually
cheaper.)

### 8. How does a client get a login?

*From: State Doc §6B, line 208 — "Direct-submitted deal: client self-serves —
checklist surfaces in My Program with per-item sign-now actions." That requires the
client to HAVE a login linked to their company, and the doc doesn't define how they
get one.*

**Question:** When and how should clients get logins — invited by CSA at bind?
Self-serve?

### 9. Deal card right rail — the 4C ruling

*From: State Doc §4, lines 116–122 — 4C is "DIVERGED — UNDER CURTIS REVIEW: Curtis is
reviewing screenshots before ruling: adopt-as-satisfying, merge (sections within tab
structure), or implement spec."*

**Question:** Which of the three?

### 10. New-deal stage placement looks backwards

*No document source — this is an observed-behavior question from the build.*

Today a *complete* marketplace submission lands in "Submission Review," while a quick
partial save lands further along in "Indication." That seems inverted.

**Question:** Should complete submissions skip ahead (and partials sit in Submission
Review), or is the current behavior intentional?

### 11. Duplicate-deal warning

*No document source — new-scope proposal from the build.*

Nothing stops two deals being created for the same business today.

**Question:** Want a warning when a new submission matches an existing account/FEIN?
**Suggested answer:** Yes, warn but allow override.

### 12. Master State Doc still says the pipeline has 10 stages

*From: State Doc §8, line 291 — "10 stages, New Lead → Client" vs. the accepted Phase
4.1 correction to 8 operational stages (recorded in the repo's CLAUDE.md and the Phase
4.1 report).*

Just a doc fix so the master matches reality.

**Question:** Update the master doc's pipeline entry to the 8-stage list?
**Suggested answer:** Yes.
