# Open Questions for Curtis

Decisions we need from you, in plain English. Each one has a suggested answer — you
can reply as briefly as "1: agree, 7: Cloudflare, 13: SignWell."

The small note under each question shows where it comes from in your own documents
(State Doc = the Project State Document v2.4, with the line number), so you can see
exactly what you're ruling on. A few have no document source — those are new ideas
being proposed, and they say so.

Nothing here is urgent — the app has no real users yet. These are decisions we want
settled correctly before launch. Newest at the top.

---

## Added 2026-08-02 (later) — from today's meeting

### 13. SignWell or HelloSign for signatures?

Your State Doc names **HelloSign** as our e-signature service; in today's meeting you
mentioned **SignWell**. We haven't built on either yet, so switching is free — but we
need one name before any signing work starts.

**Question:** SignWell or HelloSign?
**Suggested answer:** Your call — one word settles it.
*(Your doc: §2 line 62 and §6F line 238 say HelloSign.)*

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

### 16. What must be filled in before an agent can request a proposal?

You said the Request Proposal button should only work once "the necessary requirements
are completed." The system can enforce that — we just need your list of what's
necessary at this stage (which is earlier and lighter than what's needed to bind).

**Question:** What must be complete before Request Proposal lights up?
**Suggested answer:** Business info, workforce/payroll, loss history, and a generated
price — the rest can be finished before bind. Correct this list as needed.
*(From today's meeting — your rule, we just need the specifics.)*

### 17. Update your master State Document with today's decisions

Your own ground rule: *"if it's not in the doc, it didn't happen."* Today's meeting
produced real direction (proposal workflow, SignWell, pay-to-bind, carrier email on
the deal card) that isn't in the doc yet — so it isn't official yet.

**Question:** Will you put out an updated State Document with today's outcomes?
**Suggested answer:** Yes — we'll draft the new/changed sections for you so it's a
10-minute review, not a rewrite.
*(Your instructions doc: "How work flows," step 5.)*

---

## Added 2026-08-02 — from the security work (SEC-1)

We finished the security work: **each login now sees only its own deals.** Agents see
the deals they sold, a broker sees their whole agency's deals, a client company sees
its own deals, and your internal team (Admin/CSA/Underwriter) sees everything. It's
fully tested and waiting on your answers below before we switch it on.

*(Your doc: §4 line 122 — "AGENT edit own deals," now enforced everywhere.)*

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

---

## Standing items (still open)

### 5. What's the email address domain for deals?

Every deal gets its own email address for carrier correspondence. Your doc says
`...@card.axelworkforce.com`; the code currently uses a placeholder. We need the real
domain before building email receiving, because it affects domain setup (DNS).

**Question:** Which domain should deal emails use?
*(Your doc: §8 line 293.)*

### 6. HelloSign account + key — *on hold; see question 13 first*

If HelloSign wins question 13, we'll need you to create the account and provide the
key when signing work starts. If SignWell wins, same request, different company.

### 7. Where do uploaded files live — Amazon or Cloudflare?

Binders, policies, and loss runs currently sit on the app server's own disk, which
gets wiped on redeploys — fine for demos, a real problem at launch. Your doc lists two
homes: Amazon S3 or Cloudflare R2. Both are reliable and cost a few dollars a month;
Cloudflare is usually cheaper.

**Question:** Amazon S3 or Cloudflare R2?
**Suggested answer:** Cloudflare R2.
*(Your doc: §2 line 68.)*

### 8. How does a client company get a login?

Your doc has clients signing documents and tracking onboarding in "My Program" — which
means they need a login, and we've never defined how they get one.

**Question:** How do clients get logins — invited by our CSA when their deal binds?
Self-serve signup? Something else?
*(Your doc: §6B line 208.)*

### 9. The deal card right rail — your pending ruling

You've been reviewing screenshots of the rebuilt deal card. Three options on the
table: accept it as-is, blend (your required sections inside the new tab layout), or
build the original spec exactly.

**Question:** Which of the three?
*(Your doc: §4 lines 116–122.)*

### 10. New deals may be landing in the wrong column

Today a *complete* submission lands in "Submission Review," while a quick partial save
lands further along in "Indication." That looks backwards to us.

**Question:** Should complete submissions start further along (and partial saves start
at the beginning), or is this intentional?
*(No document source — something we noticed while building.)*

### 11. Warn about duplicate deals?

Nothing stops two deals being created for the same business today.

**Question:** Want a warning when a new submission matches an existing company?
**Suggested answer:** Yes — warn, but allow override.
*(No document source — our suggestion.)*

### 12. Small fix needed in your master doc: pipeline stage count

Your doc still says the pipeline has 10 stages; the build corrected it to 8 (a
decision you accepted in Phase 4.1). Just a doc fix so the master matches reality —
can ride along with question 17.

**Question:** Update the doc's pipeline entry to 8 stages?
**Suggested answer:** Yes.
*(Your doc: §8 line 291.)*
