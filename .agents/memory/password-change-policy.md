---
name: Password-change self-verification rule
description: Who must supply the current password on PATCH /api/users/:id/password, and why admin-self is not a reset.
---

On `PATCH /api/users/:id/password`, anyone changing their OWN account must supply and pass the current
password — this includes an ADMIN editing their own id. Only an ADMIN changing ANOTHER user's password
may skip the current-password check (true admin reset).

**Why:** A fresh-code-review rejected the earlier logic that gated current-password on `!isAdmin`, which
let an ADMIN silently change their own password without proving the current one — a credential-control gap.
The correct gate is `isAdminReset = isAdmin && !isSelf`; require current password whenever `!isAdminReset`.

**How to apply:** Keep self-vs-reset semantics split by `viewer.id === targetId`, not by role alone. If you
touch this route or its OpenAPI summary, preserve the distinction (own account always verifies; admin reset
of another user does not).
