# Phase 4C — replacement text for State Document §8 (Stitch layout)

_To: Curtis · From: Brendan · Date: 2026-06-22 · Action: paste the block below over §8 in the State
Document v2.1, then re-upload so the doc matches the build._

## Why

You chose to build the deal card to **your Stitch design** (`stitch_workforce_os_submission_workspace`).
The Stitch's **layout** differs from §8's current wording ("six section buttons in the right rail"):
the Stitch puts **pricing + Approve/Decline in the rail**, the **six sections on a Submission tab**, a
**collaboration hub** (messages/RFI/AI) on Overview, and a **6-phase macro tracker** in the header.
§8's *functional* requirements are unchanged — they just move to the Submission tab. Two rulings you
made on 2026-06-22 are folded in: (1) the 6-phase tracker is **display-only** and does **not** replace
the binding 10-stage pipeline; (2) the hub ships **UI now, AI/RFI logic in P6**.

---

## Paste-ready replacement for §8

> **8. QUEUED WORK ORDER — PHASE 4C: DEAL CARD COLLABORATION HUB (STITCH LAYOUT)**
> The deal card is the platform's communication hub, built to the approved Stitch design. Runs after 4A.
>
> **1. Layout (Stitch, in Axel tokens).** Left sub-nav: Overview · Submission · Documents · Tasks ·
> Quote · Policy. Header: company + badges (vertical, product, license, effective date) + deal-team
> avatars. **Macro lifecycle tracker** (header band): Submission Pending → Indication → U/W Review →
> Approved/Declined → Binding → Implementation — **display-only, mapped from the binding 10-stage
> pipeline (§11), which is unchanged.** KPI strip: Locations · Employees · Annual Payroll · ExMod.
>
> **2. Overview = Collaboration Hub.** Day-grouped activity/message timeline + sticky composer. The
> activity feed and a working composer ship now; the **AI quote-variation engine and RFI
> blocking/countdown logic are deferred to P6** (static placeholders until then).
>
> **3. Right rail.** WC Pricing (Total Est. Premium from `rating_breakdown` + Modify) · WFS Pricing
> (amount + per-employee + Modify) · **Submission Actions: Approve / Decline** (role-gated
> UNDERWRITER/ADMIN; Approve advances the deal per the pipeline; Decline records a reason; both logged).
>
> **4. Submission tab = the six sections** (Business Info · Locations · Workforce · Operations · Loss
> History · Coverage/Program), full-width. Fields derive from the existing submission schema
> (`submission_questions`/`answers` + `lib/cannabis-application`); every field maps to exactly one
> section. Per-section completeness (complete / N missing / not started) + aggregate, **computed
> server-side**. Click → heavy-glass editor overlay, inline Edit, **Zod validation** (FEIN format; class
> codes must exist in `wc_rates` for the state); saves write to the same records the rating engine and
> account profile read. **Re-rate flag:** rating-relevant edits set `rating_stale` on the deal +
> persistent "re-rate required" banner that clears on re-rate; non-rating edits don't. Every save logs a
> field-level activity diff and syncs company-level fields to the linked account (4A rules).
>
> **5. Role-aware access (server-enforced).** ADMIN/CSA edit all; UNDERWRITER view all, edit none
> (Request Info); AGENT edit all on own deals; EMPLOYER edit Business Info/Locations/Workforce/Operations
> on own deal, Loss History view-only, internal notes never rendered; CARRIER/PEO view-only. Approve/
> Decline = UNDERWRITER/ADMIN only.
>
> **6. API + acceptance tests.** GET sectioned payload + completeness; PATCH per section (role +
> field-level validation); Approve/Decline endpoints; OpenAPI/Orval/Zod regenerated. Tests: no orphaned
> fields; payroll edit → KPI + stale banner + activity diff + account sync + re-rate clears; non-rating
> edit no banner; completeness states correct; UNDERWRITER PATCH 403 and AGENT Approve/Decline 403;
> EMPLOYER section permissions enforced; Approve advances per pipeline + logs, Decline logs; macro
> tracker display-only with the 10-stage pipeline intact; hub feed + composer work, AI/RFI deferred;
> layout matches the Stitch re-skinned to tokens; heavy-glass + tokens in light and dark; typecheck clean.

---

## Also update §11 (decisions log) — one line

Replace the "Deal card right rail" row with:

> **Deal card (4C)** — Collaboration Hub built to the approved Stitch layout (June 2026): left sub-nav;
> Overview comms hub; rail = WC/WFS pricing + Approve/Decline; **Submission tab** holds the 6 sections
> (completeness, heavy-glass editors, re-rate stale flag, account sync). Header **6-phase macro tracker
> is display-only and does not change the binding 10-stage pipeline.** AI quote-variation + RFI logic
> deferred to P6.
