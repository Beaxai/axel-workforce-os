---
name: SignWell integration invariants
description: Trust model and gotchas for the real SignWell e-sign flow (bind packages)
---
- Legacy naming is intentional: the service/columns keep `hellosign*` names but store SignWell document ids; a `stub_` prefix means keyless-dev stub. No real HelloSign ids ever existed (old service was always a stub), so any non-stub id is SignWell.
- **Webhook trust model:** `/api/webhooks/signwell` treats every event as a hint — it re-fetches the live document from SignWell and derives all transitions from `live.status`; finalization requires `live.status === "completed"`. Never trust payload hashes/recipient claims.
- **Why:** forged webhooks could otherwise mark deals bound/declined; server-to-server confirmation makes forgery harmless.
- Completion is claimed atomically (conditional UPDATE status≠signed RETURNING); `signed` is terminal and never downgraded. Send path holds a row lock on the bind package to prevent duplicate envelopes.
- Signed-PDF path is only persisted when the file is actually on disk under `uploads/signed-documents/...`; download failure logs a `signed_pdf_download_failed` activity but does not block the bind.
- Only ACORD_130 + SUPPLEMENTAL_APP subjectivities auto-satisfy on completion; everything else stays human-confirmed.
- Gotcha: SignWell API returns 401 "verify your email" until the SignWell *account* email is verified — key can authenticate yet be unable to create documents. `test_mode` is used outside production; drafts (`draft:true`) send no emails, good for smoke tests.
