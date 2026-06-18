---
name: Account subresource authorization
description: Owner-scope authz must be repeated on every account subresource route, not just the parent.
---

In the api-server, `GET /accounts/:id` enforces AGENT ownership via `agentAccountIds`,
but the subresource routes (`/:id/deals`, `/:id/policies`, `/:id/activity`) and the
mutating routes (`PATCH`/`DELETE /:id`) originally skipped that check — an IDOR letting
any AGENT read/modify another account's data by ID.

**Rule:** when a parent resource route is owner-scoped, every subresource and mutation
route under the same `:id` must repeat the same scope check (a shared helper like
`agentMayAccess(req, accountId)` is the clean way).

**Why:** broken access control found in code review; the parent-only check gives a false
sense of security.

**How to apply:** whenever adding a new `/accounts/:id/...` (or any owner-scoped entity)
route, gate it with the same ownership helper before returning data.
