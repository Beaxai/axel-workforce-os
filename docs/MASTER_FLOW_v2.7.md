<!--
  Companion TEXT TRANSCRIPTION of the owner's master flowchart
  (docs/MASTER_FLOW_v2.7.svg — "Axel Workforce OS - End-to-End Process", owned by
  Curtis Prince / Beax.ai), checked into the repo on 2026-08-09. The SVG is the
  authoritative artifact; this file exists so agents and text tooling can read the
  flow without parsing SVG geometry. If they ever disagree, the SVG wins.
  DEVIATION LOG (the ONLY modification to the delivered artifact): the .svg as
  delivered labeled itself "v2.5" in its subtitle while its content matches State
  Document v2.7 §6 segments 1-6 exactly (SignWell, carrier-PDF triple-use, hard
  blocks, My Program split). On Brendan's instruction 2026-08-09 the subtitle
  label was changed "v2.5" -> "v2.7" so the pair cannot be mistaken for different
  versions. Verified: that one line is the only difference from the delivered
  file — no other content, geometry, or text was touched. Curtis should carry
  the v2.7 label into his master copy of the flowchart.
  v2.7 §6: "A master flowchart accompanies this document" — this is that
  flowchart. Governance: see CLAUDE.md -> "Source of truth".
-->

# Axel Workforce OS — End-to-End Process (Master Flow)

Registration → Submission → Proposal → Binding → Implementation → Client · v2.7

**Legend (node types by color in the SVG):**
- `[AUTO]` purple — Automated / system
- `[GATE]` teal — Human / gate
- `[BLOCK]` red — Terminal / block
- `[NOTE]` yellow — Note / parallel
- `[—]` gray — neutral / entry / display step

---

## 1 · Agent / Partner Registration

```
[—] Lands on axelins.com ("Become a partner")
  → [AUTO] Application (agency, licenses, E&O)
  → [AUTO] Agreement auto-sent (SignWell)
  → [AUTO] Schedule call (native scheduler)
  → [GATE] Partnership call (demo + qualify)
        ├─ not approved → [BLOCK] Not approved — agreement terminated
        └─ approved   → [GATE] Credentials + profile — active referral partner
```

⚠ `[NOTE]` Agreement must be effective-on-approval with a termination right
(D. Edwards) · approval gated on `agreement_signed`.

## 2 · Submission Intake — two-part filter

```
[—] Marketplace (WC / PEO / ASO)
  → [AUTO] Part 1: basic info (company + payroll)
  → [AUTO] Indication shown (stops here → Indication stage)
  → [AUTO] Part 2: full submission (locations, ops, loss hx)
  → [AUTO] Request proposal → U/W Review
```

- `[BLOCK]` Auto-block — ineligible / prior submission (standalone terminal,
  applies to intake).
- `[NOTE]` From Part 1 down: U/W package — referral flags annotated (flags do
  not block; the underwriting package carries the annotation).

## 3 · Proposal — dual internal / external

```
[AUTO] Internal product — Axel U/W approves in-system ──────────────┐
                                                                    ▼
[AUTO] External product — U/W emails approved PDF        [AUTO] Axel proposal generated (Stage 4)
  → [GATE] Email + PDF sync to hub ─────────────────────▶  one template · conditional sections ·
                                                           broker fee shown · carrier PDF bundled ·
[NOTE] Carrier PDF triple-use:                             versioned
       trigger · bundle · bind subjectivity                         │
                                                                    ▼
                                    [GATE] Accept = sign quote acceptance (SignWell)
                                           = subjectivity #1 · → Stage 5
```

## 4 · Binding

```
[NOTE] Bind Order (5) — subjectivities checklist fires
  → [AUTO] Signed via SignWell (CSA-driven or self-serve)
  → [AUTO] To carrier underwriter (listener email · replies thread in)
  → [NOTE] Binder OR policy — confirms bound · rep uploads
  → [GATE] Bound (Stage 6) — New Client · tracker fires
```

`[NOTE]` Parallel · non-gating: broker fee dunning (client + agent, pay link) ·
deposit 30-day monitor.

## 5 · Implementation → Active Client

```
[GATE] Bound → tracker by product type
  ├─ WC deal  → [AUTO] WC tracker — 4 phases
  │              1 · Carrier acceptance — auto on upload
  │              2 · Policy issuance — 24h–7d, day-5 nudge
  │              3 · Policy + claims kit delivery
  │              4 · Carrier billing setup
  │              (Direct policy completes phases 1+2 together)
  └─ PEO deal → [AUTO] PEO tracker — 5 phases
                 1 · CSA-PEO executed (auto)
                 2 · Implementation meeting (Calendly)
                 3 · Employee onboarding — N of M
                 4 · Payroll setup — start = sign + 14d
                 5 · Go-live — gates on 3 & 4
                 (WC deliverables ride as sub-items)
Both trackers
  → [GATE] All phases complete → Active Client (automated · onboarding tab removed)
  → [GATE] Client (Stage 7) → My Program (client self-service environment)
```

## 6 · My Program — client self-service

```
[AUTO] Prospect self-registers (email verify at submission)
  → [—] Progressive unlock (by client_stage)
  → [—] Onboarding: read-only (tracker status; implementation is external)

[GATE] Active Client — day-to-day home · one module, conditional sections
       (PEO adds payroll / roster / benefits)
  ├─ [GATE] Self-service · instant
  │         Standard COIs (self-generated) ·
  │         Policies · billing status · claims kit ·
  │         PEO: roster, payroll, benefits
  └─ [NOTE] Request-based · routed
            Policy changes · add locations ·
            Non-standard COIs · file a claim · renewals
            → task on the deal, worked in the hub
```

**Footer:** Launch: COIs, policies, billing, claims kit · Fast-follow:
file-a-claim, roster, renewals · Prospect self-registration is net-new auth work.
