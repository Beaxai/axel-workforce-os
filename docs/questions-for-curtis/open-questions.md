# Open Questions for Curtis

One running list. Newest at the top. Each question has a suggested answer so you can
just reply "1: agree, 2: agree, 3: no — do X instead."

Context for all of it: **the app has no real users yet.** Nothing here is urgent or
breaking — these are design decisions we want settled correctly before launch.

---

## Added 2026-08-02 — from the security build (SEC-1)

We finished the multi-tenant security work: each login now sees only its own deals.
Agents see the deals they sold, a broker sees their whole agency's deals, a client
company sees its own deals, and Admin/CSA/Underwriter see everything. It's on a review
branch, fully tested, not merged until you approve.

### 1. Old deals aren't tagged with who sold them

The security rules work by tagging every deal with the agent who sold it. New deals get
tagged automatically from now on. The deals already in the system (the demo data) were
created before tagging existed, so when you log in *as an agent*, the pipeline looks
empty. Admin logins see everything, so demos as Admin are unaffected.

**Question:** For the existing demo deals, is it fine to just tag them all to the demo
agent so agent-view demos work?
**Suggested answer:** Yes — one-time script, demo data only.

### 2. What exactly is a "broker"?

We modeled it as: an agency is a company in the system, its agents belong to it, and one
or more members are marked "broker" — those members see every deal the agency sold. The
alternative was making Broker a whole new user type next to the existing eight
(Admin, Underwriter, CSA, Agent, Employer, Carrier, PEO, Vendor).

**Question:** Is "broker = a marked member of an agency" the right model?
**Suggested answer:** Yes, keep as built — no ninth user type.

### 3. Selling a deal vs. being assigned to it

An agent can be *assigned* to a deal (as its internal owner) without being the one who
*sold* it. Old code let assigned agents see those accounts. The new rule is stricter:
only the selling agent (and their broker) sees a deal.

**Question:** Should being assigned to a deal also grant visibility, or is
selling-it the only thing that counts?
**Suggested answer:** Selling only (as built). We can widen later if assignment
turns out to matter.

### 4. Carriers, PEO partners, and vendors see nothing right now

Their access was never defined, so we locked them out of everything rather than guess.
The PEO partner will need access when we build PEO onboarding (they update
employee-onboarding progress per the State Doc).

**Question:** OK to leave them at zero access until each one gets its own spec?
**Suggested answer:** Yes — spec PEO partner access as part of the P5 PEO build.

---

## Standing items (carried from the meeting list — still open)

### 5. Deal listener email domain

The State Doc says deal emails look like `[clientname][ID]@card.axelworkforce.com`, but
the code currently uses `listener.axel.io`. We need the real domain before building
email receiving (WC-5), because it affects DNS setup.

**Question:** Which domain should deal emails use?

### 6. HelloSign (Dropbox Sign) live API key

E-signatures are stubbed. A real bind flow (signing the checklist documents) needs a
live key. No rush until we're ready to test real signing.

**Question:** Can you create/provide the HelloSign account + API key when P5 signing work starts?

### 7. File storage provider

Uploaded files (binders, policies, loss runs) currently land on the app server's own
disk, which gets wiped on redeploys — fine for demos, not for launch. The State Doc
lists S3 or Cloudflare R2 as the future home.

**Question:** S3 or Cloudflare R2? (Either is a small monthly cost; R2 is usually cheaper.)

### 8. How does a client get a login?

We have no defined path for a client company getting platform access (a login linked to
their company) after their deal binds — needed for "My Program" to be real.

**Question:** When and how should clients get logins — invited by CSA at bind? Self-serve?

### 9. Deal card right rail — the 4C ruling

Still awaiting your call from the screenshots: adopt the tabbed layout as satisfying the
4C requirements, merge (sections inside the tabs), or build the original six-section
spec.

**Question:** Which of the three?

### 10. New-deal stage placement looks backwards

Today a *complete* marketplace submission lands in "Submission Review," while a quick
partial save lands further along in "Indication." That seems inverted.

**Question:** Should complete submissions skip ahead (and partials sit in Submission
Review), or is the current behavior intentional?

### 11. Duplicate-deal warning

Nothing stops two deals being created for the same business today.

**Question:** Want a warning when a new submission matches an existing account/FEIN?
**Suggested answer:** Yes, warn but allow override.

### 12. Master State Doc still says the pipeline has 10 stages

The build corrected the pipeline to 8 operational stages (Phase 4.1), and v2.4 §8 still
lists 10. Just a doc fix so the master matches reality.

**Question:** Update the master doc's pipeline entry to the 8-stage list?
**Suggested answer:** Yes.
