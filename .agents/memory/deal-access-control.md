---
name: Deal access control (external parties)
description: How deal-card read access must be scoped for external (non-internal) roles.
---

External-party deal reads must FAIL CLOSED.

**Rule:** For CARRIER / PEO / VENDOR, a deal is only readable when both the deal AND
the actor have a non-null org and the two match. An unscoped (null-org) deal is never
readable by an external party. EMPLOYER is scoped to ownership (own deal only).
INTERNAL roles (ADMIN/UNDERWRITER/CSA/AGENT per INTERNAL_ROLES) see all.

**Why:** `deals.org_id` is nullable, so a permissive `!deal.orgId || deal.orgId === actor.orgId`
fallback makes every unscoped deal world-readable to external roles — a real data-exposure
hole caught in code review. Fail open on a nullable scoping column = leak.

**How to apply:** Whenever you add a read/list endpoint that external roles can hit, scope it
with an explicit non-null-and-equal check (or an explicit relationship allowlist), never a
`!scope || scope === actor.scope` shortcut. The pattern lives in `canViewDeal` in
`artifacts/api-server/src/routes/deal-card.ts`.
