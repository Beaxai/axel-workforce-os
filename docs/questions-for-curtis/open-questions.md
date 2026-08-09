# Open Questions for Curtis

Decisions we need from you, in plain English. Each one has a suggested answer — you
can reply as briefly as "1: agree, 7: Cloudflare, 13: SignWell."

The small note under each question shows where it comes from in your own documents
(State Doc = the Project State Document — questions written before 2026-08-09 cite
v2.4 line numbers; the current master is now v2.7). A few have no document source —
those are new ideas being proposed, and they say so.

Nothing here is urgent — the app has no real users yet. These are decisions we want
settled correctly before launch. Newest at the top.

---

## Updated 2026-08-09 (evening) — keys & domain unblocked 🔓

Movement on three of the still-waiting items, from today's exchange:

- **Question 5 (deal email domain): resolved in practice.** The domain is already
  owned, and Curtis handed over the credentials — Brendan is doing the setup this
  evening. Config plan: verify the domain in Resend, add MX records for the listener
  subdomain, then set `LISTENER_EMAIL_DOMAIN`, `OUTBOUND_EMAIL_FROM`, and
  `RESEND_WEBHOOK_SECRET` (webhook → `/api/webhooks/resend-inbound`). The routing
  code is already built and live-tested — this is DNS + keys only, no code changes.
- **Question 6 (SignWell key): unblocking tonight.** Same credentials handoff —
  `SIGNWELL_API_KEY` goes in this evening and the existing signing service picks it
  up automatically.
- **Question 14 residual (payment processor for the broker-fee link): ✅ Stripe.**
  Already chosen — no longer an open pick. Broker-fee dunning ships today with a
  stubbed payment link; wiring the real Stripe link is the one remaining code change
  once the Stripe keys are added (they ride along with tonight's setup).

Still genuinely waiting on Curtis after tonight: 1–3 (security switch-on),
7 (file storage: S3 vs R2), 9 (deal card right rail), 15B (auto-send vs. button),
and the residual field-list trim on 16.

---

## Updated 2026-08-09 — State Document v2.7 received ✅

Your v2.7 arrived and is checked into the repo (`docs/STATE_DOCUMENT_v2.7.md`). It
settles a good share of this list. Scorecard:

| Status | Questions |
|---|---|
| ✅ Answered | 8 (client logins), 10 (stage placement), 11 (duplicate deals), 12 + 17 (doc updated, 8 stages), 13 (SignWell), 14 (broker fee, non-blocking), 15A (Resend) |
| 🟡 Partly answered | 4 (carriers stay out; PEO partner confirmed), 16 (proposal-request rule, no field list) |
| ⏳ Still waiting on you | 1–3 (security switch-on), 5 (deal email domain), 6 (now: SignWell account + key), 7 (file storage), 9 (deal card right rail), 15B (auto-send vs. button) |

Each question below carries its own status note. The still-waiting items are what
blocks the next builds.

---

## Added 2026-08-02 (later) — from today's meeting

### 13. SignWell or HelloSign for signatures?

Your State Doc names **HelloSign** as our e-signature service; in today's meeting you
mentioned **SignWell**. We haven't built on either yet, so switching is free — but we
need one name before any signing work starts.

**Question:** SignWell or HelloSign?
**Suggested answer:** Your call — one word settles it.
*(Your doc: §2 line 62 and §6F line 238 say HelloSign.)*

> ✅ **Answered by v2.7:** SignWell, platform-wide (v2.7 §2 Tech Stack, §9 Decisions
> Log — "SignWell replaces HelloSign platform-wide, June 2026"). New account +
> integration required; embedded signing plan needed. See question 6 for the key.

### 14. "Pay to bind" — what exactly is the client paying?

You want clients prompted to pay before finishing their signing package. The key
question is what that payment is:

- If it's **our broker fee** → perfect, that matches your doc's "sign and pay in one
  workflow" goal.
- If it's **the carrier's deposit or premium** → that contradicts your own rule that
  clients pay the carrier directly and that payment never holds up their onboarding.

This also decides whether we need to add a payment processor (like Stripe) — nothing
in the platform takes money today.

**Question:** Is the pay-to-bind payment our broker fee only?
**Suggested answer:** Yes — broker fee only; carrier money keeps going straight to the
carrier as your doc says.
*(Your doc: §6A item 10 line 205 — the sign-and-pay goal; §6A item 3 line 184 — client
pays carrier directly; §6E line 233 — deposit never blocks onboarding.)*

> ✅ **Answered by v2.7:** broker fee only, and it never blocks — "if unpaid at bind,
> automation notifies client AND agent with a payment link. Never blocks submission
> or binding" (v2.7 §7A). Carrier deposit stays direct-to-carrier, due 30 days
> post-bind. No true "pay gate" appears anywhere in v2.7 — so we'll build fee dunning
> with a payment link, not a payment wall. (A payment processor for that link is
> still an open pick — flagging it now so it doesn't surprise us later.)

### 15. Which service sends our emails — SendGrid or Resend?

To email proposal requests to carriers, we need an email-sending service. Two good
options:

- **SendGrid** — the big, established name. More controls and reporting, but more
  setup on your end (account, domain verification).
- **Resend** — newer and simpler. Fastest to get running, and plenty for what we need.

Either works. If you don't already have a SendGrid account, Resend is the quicker path
and we can switch later if volume ever demands it.

**Question A:** SendGrid or Resend?
**Suggested answer:** Resend (unless you already have SendGrid).

**Question B:** When an agent clicks "Request Proposal," should the carrier email go
out automatically, or should there be a separate "send to carrier" button?
**Suggested answer:** Automatically — but only once all the required info is complete
(see question 16).
*(Your doc: §2 line 66 — email not built yet; §5 line 163 — planned for a later phase;
today's meeting moves it up. Pairs with question 5 — the email domain.)*

> ✅ **A answered by v2.7:** Resend (v2.7 §6B, PC1 — real email "can no longer be
> deferred"). We still need the account/key when email work starts.
> ⏳ **B still open:** v2.7 doesn't say whether the carrier email fires automatically
> on Request Proposal or behind a separate send button.

### 16. What must be filled in before an agent can request a proposal?

You said the Request Proposal button should only work once "the necessary requirements
are completed." The system can enforce that — we just need your list of what's
necessary at this stage (which is earlier and lighter than what's needed to bind).

**Question:** What must be complete before Request Proposal lights up?
**Suggested answer:** Business info, workforce/payroll, loss history, and a generated
price — the rest can be finished before bind. Correct this list as needed.
*(From today's meeting — your rule, we just need the specifics.)*

> 🟡 **Partly answered by v2.7:** the rule is now clear — the two-part filter means a
> proposal request requires the **full submission (Part 2) complete** (v2.7 §6
> Segment 2: "full journey complete → U/W Review"). What v2.7 doesn't give is an
> itemized field list; we'll treat "every step of the full submission" as the list
> unless you trim it.

### 17. Update your master State Document with today's decisions

Your own ground rule: *"if it's not in the doc, it didn't happen."* Today's meeting
produced real direction (proposal workflow, SignWell, pay-to-bind, carrier email on
the deal card) that isn't in the doc yet — so it isn't official yet.

**Question:** Will you put out an updated State Document with today's outcomes?
**Suggested answer:** Yes — we'll draft the new/changed sections for you so it's a
10-minute review, not a rewrite.
*(Your instructions doc: "How work flows," step 5.)*

> ✅ **Done — v2.7 received 2026-08-09** and checked in as
> `docs/STATE_DOCUMENT_v2.7.md`. It covers the meeting outcomes (SignWell, proposal
> workflow, carrier-PDF handling) and locks segments 1–6 of the end-to-end process.
> Doc-chain note: v2.2, v2.5, and v2.6 were never received; the repo chain is
> v2.1 → v2.4 → v2.7.

---

## Added 2026-08-02 — from the security work (SEC-1)

We finished the security work: **each login now sees only its own deals.** Agents see
the deals they sold, a broker sees their whole agency's deals, a client company sees
its own deals, and your internal team (Admin/CSA/Underwriter) sees everything. It's
fully tested and waiting on your answers below before we switch it on.

*(Your doc: §4 line 122 — "AGENT edit own deals," now enforced everywhere.)*

> ⏳ **v2.7 doesn't touch questions 1–3** — the security work still waits on your
> answers below before we switch it on. (Question 4 got partial answers; see its
> note.)

### 1. Old demo deals aren't tagged with who sold them

The security rules work by tagging every deal with its selling agent. New deals get
tagged automatically. The existing demo deals were created before tagging existed —
so an agent login currently sees an empty pipeline. (Admin logins see everything, so
demos as Admin are unaffected.)

**Question:** OK to tag all the existing demo deals to the demo agent so agent-view
demos work?
**Suggested answer:** Yes — one-time cleanup, demo data only.

### 2. What is a "broker" in the system?

We built it as: an agency is a company, its agents belong to it, and members marked
"broker" see every deal the agency sold. The alternative was making Broker a whole new
user type alongside the existing eight.

**Question:** Is "broker = a marked member of an agency" right?
**Suggested answer:** Yes, keep as built.

### 3. Selling a deal vs. being assigned to one

An agent can be *assigned* to help on a deal without being the one who *sold* it.
The new rule is strict: only the selling agent (and their broker) can see a deal.

**Question:** Should being assigned to a deal also let an agent see it, or does only
selling it count?
**Suggested answer:** Selling only. Easy to widen later if needed.

### 4. Carriers, PEO partners, and vendors currently see nothing

Their access was never defined, so we locked them out entirely rather than guess. The
PEO partner will need access when we build PEO onboarding.

**Question:** OK to leave them at zero access until each gets its own definition?
**Suggested answer:** Yes — define PEO partner access with the PEO onboarding build.

> 🟡 **Partly answered by v2.7:** carriers confirmed as email-only — "carrier
> underwriters do NOT work in the platform" (v2.7 §7C), so zero platform access is
> correct, permanently. And the PEO partner role does get platform access: it updates
> employee-onboarding counts during implementation (v2.7 §7G phase 3) — matching our
> suggestion to define it with the PEO build (P5-PEO). Vendors remain undefined.

---

## Standing items (still open)

### 5. What's the email address domain for deals?

Every deal gets its own email address for carrier correspondence. Your doc says
`...@card.axelworkforce.com`; the code currently uses a placeholder. We need the real
domain before building email receiving, because it affects domain setup (DNS).

**Question:** Which domain should deal emails use?
*(Your doc: §8 line 293.)*

> ⏳ **Still open after v2.7** — and now more urgent: v2.7 makes the deal listener
> address load-bearing for proposal generation, not just bind communication (v2.7 §6
> Segment 3, "elevated dependency"), but names no domain.

### 6. HelloSign account + key — *on hold; see question 13 first*

If HelloSign wins question 13, we'll need you to create the account and provide the
key when signing work starts. If SignWell wins, same request, different company.

> 🔁 **Reshaped by v2.7:** SignWell won (question 13), so this becomes: **we need the
> SignWell account created and a live API key** before any signing build starts.
> v2.7 §2 lists the live SignWell key as deferred/pending and says "new account +
> integration required."

### 7. Where do uploaded files live — Amazon or Cloudflare?

Binders, policies, and loss runs currently sit on the app server's own disk, which
gets wiped on redeploys — fine for demos, a real problem at launch. Your doc lists two
homes: Amazon S3 or Cloudflare R2. Both are reliable and cost a few dollars a month;
Cloudflare is usually cheaper.

**Question:** Amazon S3 or Cloudflare R2?
**Suggested answer:** Cloudflare R2.
*(Your doc: §2 line 68.)*

> ⏳ **Still open after v2.7** — storage stays "deferred/pending" (v2.7 §2) and the
> document vault sits in P7 (§4 roadmap). Reminder of why this can't slip to launch
> week: uploads currently live on the app server's own disk and vanish on redeploy.

### 8. How does a client company get a login?

Your doc has clients signing documents and tracking onboarding in "My Program" — which
means they need a login, and we've never defined how they get one.

**Question:** How do clients get logins — invited by our CSA when their deal binds?
Self-serve signup? Something else?
*(Your doc: §6B line 208.)*

> ✅ **Answered by v2.7:** direct prospects **self-register at submission via email
> verification**, which provisions their My Program login (v2.7 §6 Segment 6 +
> §6B PC1 — a net-new public registration path, flagged as the hard dependency for
> the whole client-facing side; needs Resend). One residual to confirm when PC1 is
> scoped: the exact provisioning moment for clients on *agent-sold* deals, where no
> client ever touched the submission form.

### 9. The deal card right rail — your pending ruling

You've been reviewing screenshots of the rebuilt deal card. Three options on the
table: accept it as-is, blend (your required sections inside the new tab layout), or
build the original spec exactly.

**Question:** Which of the three?
*(Your doc: §4 lines 116–122.)*

> ⏳ **Still open after v2.7** — the doc itself records it as "UNDER REVIEW: Curtis
> reviewing screenshots; 4C requirements remain binding" (v2.7 §4). Ball's in your
> court.

### 10. New deals may be landing in the wrong column

Today a *complete* submission lands in "Submission Review," while a quick partial save
lands further along in "Indication." That looks backwards to us.

**Question:** Should complete submissions start further along (and partial saves start
at the beginning), or is this intentional?
*(No document source — something we noticed while building.)*

> ✅ **Answered by v2.7** — our instinct was right, and it's now written down:
> "Submission lands in the stage matching its progress: abandon before indication →
> Submission Review; indication but no proposal request → Indication; full journey
> complete → U/W Review" (v2.7 §6 Segment 2). **The current code does the opposite
> for complete submissions — this is now a build item, not a question.**

### 11. Warn about duplicate deals?

Nothing stops two deals being created for the same business today.

**Question:** Want a warning when a new submission matches an existing company?
**Suggested answer:** Yes — warn, but allow override.
*(No document source — our suggestion.)*

> ✅ **Answered by v2.7 — and stronger than we suggested:** "Blocked by prior
> submission → automated response, agent cannot enter" (v2.7 §6 Segment 2, coded
> exception b). So: hard block with an automated response, not a warn-with-override.
> Pairs with the existing dedupe-by-FEIN from 4A. A build item now.

### 12. Small fix needed in your master doc: pipeline stage count

Your doc still says the pipeline has 10 stages; the build corrected it to 8 (a
decision you accepted in Phase 4.1). Just a doc fix so the master matches reality —
can ride along with question 17.

**Question:** Update the doc's pipeline entry to 8 stages?
**Suggested answer:** Yes.
*(Your doc: §8 line 291.)*

> ✅ **Done in v2.7:** the 8-stage model is now canonical, with its own section
> (v2.7 §5) and a decisions-log entry — "Lost is deal-terminal, never touches the
> account." Nothing further needed.
