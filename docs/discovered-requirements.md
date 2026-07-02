# Discovered Requirements — Wholesale / External-Underwriter Workflow

_Source: transcribed Curtis ⇄ Brendan ⇄ Gershom call (captured 2026-07-01). Recorded 2026-07-02._

> **Status: advance context, NOT a build spec.** This captures product direction surfaced in
> conversation so it isn't lost. **Curtis said he will document the submission workflow (external +
> internal) — that document, once written, governs, alongside the State Document v2.1.** Where anything
> here conflicts with those, they win. Nothing in this file is authorized to build yet; it exists to
> inform planning and to be reconciled against Curtis's forthcoming workflow doc.

---

## 1. The core business model (Phase 1, next ~6 months)

Axel is primarily a **wholesale / brokerage distribution platform**, not an in-house carrier:

- **~90% of submissions are wholesaled to EXTERNAL underwriters** — partners/competitors who have
  agreed to supply their **rates + appetite (underwriting logic)**. Axel routes the submission out; the
  external UW quotes it.
- **Cannabis is the exception** — it is assigned to **Axel's own internal underwriter** first (Axel's
  own product serves the cannabis vertical). Product/vertical decides internal vs. external.
- External underwriters **won't log into Axel out of the gate** — they live in **email**. The platform
  must run the correspondence *for* them: trigger email from inside the deal, capture their replies and
  attachments back onto the deal, and let an Axel rep communicate "on behalf of" that external UW.
- Axel's **competitive edge = instant price indication** out of the gate (already built), then, for
  PEO/human-capital, **"call underwriting"** — a live call with broker + client before the proposal, to
  raise conversion.

## 2. Discovered requirements

**R1 — External underwriter as a party + wholesale routing.**
Model an external underwriter and assign a deal to internal (cannabis) vs. an external UW by
vertical/product. Track which UW owns the deal.

**R2 — Deal-scoped email correspondence hub.**
Send email to the (external) UW from inside the deal card; capture replies + **attachments** back onto
that deal, threaded by a **unique quote/deal ID**. Proper Office-365 / SMTP send; inbound parse routes
replies to the right deal. (Curtis: the off-the-shelf CRM failed because it couldn't tie correspondence
to the right deal.) An Axel "sales rep" is the visible correspondent on behalf of the external UW.

**R3 — External physical proposal + OCR + price-delta.**
The external UW returns a **physical quote (PDF)** that may differ from the system indication. Ingest it,
**OCR the numbers**, map to fields, and **track the delta** vs. the original indication. Hand the final
proposal to the broker. (Test OCR standalone against real carrier PDFs first — Gershom to supply
samples. Prefer standardized docs; OCR is unreliable on complex layouts.)

**R4 — AI underwriting "ideal score" (underwriter-only).**
A **0–100 score** from deal size, **loss ratio**, **X-Mod**, years in business, loss history →
eligibility + a **pricing/credit recommendation** (e.g. "apply 50% credits to win this"). Surfaced to the
**internal underwriter at the Negotiation stage only**.

**R5 — Broker vs. underwriter visibility (binding rule).**
Brokers see **binary pricing only** ("here's the price — take it or leave it"). AI recommendations,
credit options, and scoring are **never shown to brokers** — underwriter/internal only. A **human
underwriter is still required** (carrier approval rules); no AI-only underwriting.

## 3. Current-state audit — does the app match the conversation?

Audited against live code on branch `p4-pipeline-stages` (2026-07-02).

| # | Requirement | Status | Evidence / notes |
|---|-------------|--------|------------------|
| — | **Unique quote/deal ID for threading** | ✅ Built | `deals` UUID + `reference_code`; `deal_email_addresses` per-deal listener + `file_id` |
| R2 | **Per-deal inbound email capture (+ AI summary)** | 🟡 Scaffolded — schema only, no code | `deal_inbound_emails` table has `ai_summary`/`ai_intent`/`ai_action_items`, but **no sender/parser exists** in `api-server` |
| R2 | **Outbound email to external UW** | 🟡 Scaffolded — schema only | `underwriting_packages.email_sent_to[]/email_sent_at/email_message_id` exist; **no send code** (proposals still hardcode `'sent'`; nodemailer/SMTP absent) |
| R2/R5 | **UW ⇄ broker Q&A loop** | ✅ Built (data + gate) | `deal_rfis` (blocking / internal / `due_at`); a blocking OPEN RFI **hard-blocks Approve** (`deal-card.ts`). Full RFI/email UI + AI = still P6 |
| R5 | **Hide internal content from brokers** | 🟢 Partial — mechanism exists | RFI `internal` flag + 4C role-aware activity/section visibility |
| — | **Attachments / documents on a deal** | ✅ Built | `deal_documents` + document routes (ACORD 130 / Trean fill) |
| R1 | **External underwriter as a party + wholesale assignment** | 🔴 Missing | 8 fixed roles (UNDERWRITER is internal; CARRIER ≠ external UW). No UW-assignment or internal/external routing field on `deals` |
| R1 | **Cannabis→internal / else→external routing** | 🔴 Missing | Vertical is captured on submission, but no UW-assignment/routing logic |
| R3 | **External proposal upload** | 🔴 Missing | `proposals` is system-generated only (`proposal_pdf_path` exists but no external-quote ingest) |
| R3 | **OCR external quote + map fields** | 🔴 Missing | none |
| R3 | **Price-delta (indication vs. external quote)** | 🔴 Missing | none — proposals store system numbers, no variance vs. an external quote |
| R4 | **AI underwriting "ideal score" (0–100)** | 🔴 Missing | only the AI **Class Code** Advisor (`ai.ts`) + a deferred quote-variation helper (`quoteVariations.ts`); no scoring engine |
| R4 | **AI pricing/credit recommendation (UW-only, Negotiation)** | 🔴 Missing | no scoring/rec; role-gating mechanism exists to hang it on |
| R5 | **Binary pricing to brokers (no options)** | 🟡 Partial / undefined | general role gating present; not explicitly enforced for pricing options |

### Headline
- **The email/RFI correspondence hub is well-scaffolded** — the per-deal listener email, an inbound-email
  table *with AI-summary fields already designed in*, UW-package email fields, and a working blocking-RFI
  gate. The **data model anticipates this workflow**; what's absent is the **wiring** (actual send/receive
  + UI) — squarely the **P6** build, but now clearly the *centerpiece* of Phase 1, not a late add-on.
- **Genuinely missing** (net-new builds): the **external-underwriter party + wholesale routing (R1)**, the
  **external-proposal upload → OCR → price-delta (R3)**, and the **AI ideal-score + UW-only recommendation
  (R4)**. R1 is the biggest *structural* gap (it reshapes assignment + the deal model).

## 4. Open questions for Curtis (reconcile with his workflow doc)

1. **External underwriter modeling** — a new role/party type, or an extension of CARRIER? How is a deal
   assigned to a specific external UW, and how is their appetite/rates represented per-UW?
2. **Routing rules** — exactly which verticals/products go internal vs. external (cannabis = internal
   confirmed; what about the rest)?
3. **Email delivery** — Office 365 (Graph API) vs. SMTP for outbound; what's the inbound-parse mechanism
   (the `@card.axelworkforce.com` listener) and provider?
4. **Ideal-score formula** — exact variables and weights (size, loss ratio, X-Mod, tenure, loss history)
   and the approve threshold (he floated ~75).
5. **External quote/OCR** — sample carrier PDFs to test against (Gershom to supply); which fields must be
   captured; how price-deltas are surfaced.

## 5. Roadmap implication

The State Document sequences P5 (policies/onboarding) → P6 (comms) → P7 (billing). This conversation
suggests the **external-UW email hub (R2) and possibly R1/R3/R4 are the actual near-term priority** ("the
bulk of phase one in the next six months"), i.e. **P6-flavored work may need to move up or interleave with
P5.** This is a prioritization decision for Curtis — flagged, not assumed.

## 6. Alignment notes

- **P4 is validated by Curtis** in this call ("the pipeline cards… this new flow is great, I went right
  off your design"); he asked for functionality first, design later (Gershom owns design).
- The **UW-lock / role-visibility follow-up we deferred out of P4** now has concrete requirements (R5 +
  the UW-only ideal score) — this is where that work connects.
- Brendan's stated workflow in the call — *author prompts in Claude, push to Replit one step at a time so
  it can't overreach* — is exactly the gated process used to build P4.
