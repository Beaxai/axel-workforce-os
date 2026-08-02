# SEC-1 — Multi-Tenant Data Scoping: Isolation Report

**Branch:** `sec1-multi-tenant-scoping` (cut from `p5b-journey-engine` @ `3a66a41`) — **NOT merged**, per plan.
**Date:** 2026-08-02 · **Plan:** `docs/superpowers/plans/2026-07-20-sec1-multi-tenant-data-scoping.md` (incl. the 2026-08-02 post-merge coverage amendment)
**Harness:** `artifacts/api-server/src/scripts/verify-scope.ts` — rollback-only, safe on any environment.

## What SEC-1 closed

Before this branch, **every list endpoint ignored the caller**: any AGENT login could read
every agency's deals, contacts, quotes, policies, and accounts, could open any deal card by
id (including approve/decline), and global search returned all tenants' rows. After this
branch, one shared module — `artifacts/api-server/src/lib/scope.ts` — is the single source
of truth for row visibility, applied to every read path:

| Surface | Scoped by | Out-of-scope detail |
|---|---|---|
| `/deals` list + `/:id` | `visibleDealCondition` | 404 (no existence leak) |
| `/contacts` list + `/:id` (+ patch/delete) | org match OR parent deal | 404 |
| `/quotes` list, by-deal, `/:id`, patch | parent deal | 404 |
| `/policies` list, `/:id`, patch, commissions, documents | parent deal | 404 |
| `/proposals` all five routes | parent deal (via proposal where needed) | 404 |
| `/documents/bind-package/:dealId` | parent deal | 404 |
| `/accounts` list, `/:id`, all sub-resources | ≥1 visible deal | 404 (was 403) |
| `/deal-card/*` — all 16 routes incl. mutations | AGENT middleware via scope.ts | 404 |
| `/search` | deal + account scope composed | rows filtered |

**The visibility matrix (enforced fail-closed — ambiguity always under-shows):**

| Actor | Sees |
|---|---|
| ADMIN / CSA / UNDERWRITER | everything |
| AGENT (org_members role AGENT) | deals where `producing_agent_id` = self |
| BROKER (org_members role BROKER) | deals produced by any AGENT/BROKER in their org(s) |
| EMPLOYER | deals where `org_id` ∈ their orgs |
| CARRIER / PEO / VENDOR / unknown | nothing (pending their own access specs) |

**Task 6:** new deals are stamped at creation — AGENT submitters set `producing_agent_id`,
EMPLOYER submitters set `org_id` (dormant path until client access ships), internal
creators stamp nothing (explicit payload fields win, so ADMIN/CSA can create on an
agent's behalf).

## Isolation matrix — verified on Replit, all rollback-only

`verify-scope.ts`: **32/32 PASS** (run 2026-08-02 against the live DB, all rows rolled
back). Covers: the full role matrix incl. fail-closed cases (no-org employer, carrier,
unknown role, null-dealId child rows), list composition with the archived filter,
contact/quote/account child scoping, `canSeeDeal`/`canSeeAccount` guards, ownership
stamping, and end-to-end created-deal visibility.
`verify-p5b.ts`: **46/46 PASS** after every task — journey engine unaffected.
`pnpm --filter @workspace/api-server typecheck`: clean after every task.

## FLAGS FOR CURTIS — decisions encoded, awaiting confirmation

1. **D1 — `deals.org_id` means the CLIENT/employer org** (who the deal is *for*);
   `producing_agent_id` is who *sold* it. Matches what `journeys.ts` already assumed.
2. **D2 — BROKER is modeled as an `org_members.role` value**, not a 9th party type. A
   BROKER member sees their whole agency's book. **Confirm: org-membership role, or a
   party type?**
3. **D3 — existing deals have NULL `org_id`/`producing_agent_id`.** Scoping is live and
   fail-closed, so agent/employer logins see NOTHING until a backfill runs. A backfill is
   deliberately a separate, reviewed script (who produced the 37 archived + 3 demo deals?).
   **Decide: backfill rules.**
4. **CARRIER / PEO / VENDOR currently see zero rows** everywhere pending their own specs.
5. **Dropped: `ownerId`-based account visibility for agents** (old behavior let an agent see
   accounts on deals they *own* but didn't produce). The plan matrix is producing-agent
   only. **Confirm or re-widen.**
6. **No account→org linkage exists in the schema**, so `org_id` cannot be derived from the
   account at submission time. Blocked on the client-access design (how a client gets a
   login + org after binding — already on your open-questions list).
7. **`journeys.ts` still treats AGENT as internal see-all.** Left as-is: the journeys view
   is temporary scaffolding slated for removal; its EMPLOYER scoping is correct. If removal
   slips past go-live, it needs the same AGENT alignment as deal-card.
8. **Deals CRUD is not in `openapi.yaml`** (predates the contract) — so no contract change
   was possible for the new create fields. Worth adding when the API surface is next revised.
9. **Partners and resources search results are unscoped by design** (shared reference data).

## Not in scope of SEC-1 (unchanged)

Role gating (`requireRoles`) semantics; write-path authorization beyond the guards noted;
`quote-view.ts` internal-roles set (client-visibility gate within a deal, not tenant
scoping); employer-facing routes (`/deal-card` external-role ownership checks were already
correct and are untouched).
