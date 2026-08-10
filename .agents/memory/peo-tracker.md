---
name: PEO implementation tracker
description: §7G PEO journey invariants — WC sub-item key reuse, CSA-PEO anchoring, go-live gate
---

- PEO deals run the PEO tracker ONLY; WC deliverables are sub-items inside it that intentionally REUSE the WC task systemKeys, so binder/policy upload automation drives both products from one code path. **Why:** one tracker per deal (product type selects it at Bound); duplicating keys would fork the automation.
- CSA-PEO signing date anchors payroll start (+14 days, editable). Anchor from the subjectivity's `satisfiedAt`, never processing time — replayed webhooks/delayed hooks must not shift payroll. Defaults never clobber an edited payroll date (per-column IS NULL guards).
- CSA-PEO is usually signed pre-bind (it's a bind subjectivity), so no tracker exists when the hook fires; journey instantiation must catch up (complete phase 1 + anchor dates) for an already-SATISFIED CSA-PEO.
- Go-live (phase 5) gates on BOTH phase 3 (N-of-M onboarding counts) and phase 4 (payroll) — enforced with a 409 at the task-PATCH route; recomputeProgress carries an explicit PEO hook for future writers.
- The CSA-PEO document has no template/generator yet — it's signed off-platform and a CSA satisfies the checklist item manually, which still triggers all automation. Calendly (phase 2) and the PEO-partner counts mechanism are open Curtis questions (items F/G).
- **How to apply:** any new code that completes implementation tasks must respect PENDING-only updates and the go-live gate; any new signing path for CSA-PEO should satisfy the subjectivity (not touch tracker tasks directly).
