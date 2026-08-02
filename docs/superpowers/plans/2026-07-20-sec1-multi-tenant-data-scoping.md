# SEC-1 — Multi-Tenant Data Scoping Implementation Plan

> **For agentic workers:** This repo builds via **gated Replit prompts** (one task → acceptance → STOP → review → next). Steps use checkbox (`- [ ]`) syntax. Do ONE task, run its acceptance, STOP, wait for review.

**Goal:** Every list/read endpoint returns only the rows the caller is entitled to see, enforced **server-side**, so an agent/employer/broker can never read another tenant's deals, contacts, quotes, or documents.

**Architecture:** Generalize the scoping pattern that already exists in `journeys.ts` (an `Actor` + a per-role visibility rule + a fail-closed default) into ONE shared helper, then apply it to every list endpoint. Scoping is **additive to** the existing `requireRoles(...)` gates — role gating says *who may call*, scoping says *which rows return*. Both are required.

> **Do not couple SEC-1 to the "journeys" feature.** The journeys *view* (the visual workflow-template authoring UI) is temporary scaffolding and will be **removed** — workflow *definitions* move into code (as `wc-tracker.ts` already does with `WC_PHASE_KEYS`/`WC_TASK_KEYS`). What SEC-1 borrows from `journeys.ts` is only its **server-side authorization logic** (`Actor`, per-role visibility, fail-closed). Task 1 *extracts* that logic into a standalone `scope.ts`, which **decouples** scoping from journeys so the view's removal never affects it. The source of truth for "who can see a deal" is **deal ownership** (`org_id` + `producing_agent_id`) — never a journey template. Scope deals, contacts, quotes, policies, proposals, documents, and accounts by deal ownership; do **not** route any scoping decision through the journey engine.

**Tech Stack:** TypeScript 5.9 · Drizzle ORM + Postgres · Express 5 · `zod/v4` (lib/db) · OpenAPI → Orval codegen · `tsx` scripts.

## Why this is security-critical (current state — verified 2026-07-20)

- `GET /api/deals` handler is `router.get("/", async (_req, res) => …)` — the underscore proves it **never reads the actor**. It returns *all* non-archived deals to anyone with an `INTERNAL_SALES` role (which includes **AGENT**). One agency's agent sees every other agency's book.
- `/contacts`, `/quotes`, `/policies` list handlers are the same (`_req`).
- `/accounts` reads `req` but only for `search`/`stage` filters — **no tenant scoping**.
- **Only `journeys.ts` scopes correctly** (ADMIN/CSA see all; assigned specialist sees theirs; EMPLOYER sees `deal.orgId === actor.orgId`). It is the reference implementation.

## Owner rules this plan implements (Brendan, 2026-07-20)

1. A person associated with an org sees **their org's deals and contacts**.
2. An **agent** sees **only the deals they are associated with** (`producing_agent_id`).
3. An agent **under a broker**: the **broker sees all deals under their org** and everything associated.
4. (Implicit) ADMIN / CSA / UNDERWRITER are internal and see everything.

## OPEN DESIGN DECISIONS — resolved here, flagged for Curtis

These are encoded as concrete defaults so the build can proceed; each is called out in the SEC-1 report for Curtis to confirm, because they touch access-control semantics and **v2.2 of the State Document was never received** (possible undocumented rules).

**D1 — What does `deals.org_id` mean?** DECISION: it is the **CLIENT/employer company org** (the account's org), matching what `journeys.ts` already assumes (`ownsDeal` compares `deal.orgId === actor.orgId` for EMPLOYER). The producer side is tracked separately by `producing_agent_id`. So `org_id` = who the deal is *for*, `producing_agent_id` = who *sold* it.

**D2 — How is "broker sees the whole org" modeled, given there is no BROKER role?** DECISION: reuse **`org_members.role`**. Within an agency org, a member whose `org_members.role = 'BROKER'` (or `is_primary_org = true` acting as principal) sees **all deals produced by any agent in that same org**; a member with `org_members.role = 'AGENT'` sees only deals where `producing_agent_id = self`. No new role on the users table, no org hierarchy needed — agents are members of the broker's org. **CONFIRM with Curtis: is BROKER an org-membership role, or should it be one of the 8 party types?**

**D3 — `deals.org_id` and `producing_agent_id` are currently NEVER populated.** DECISION: Task 6 populates them at deal creation (marketplace + pipeline paths). Until then, scoping is correct but employers/agents see nothing — which is the safe failure direction (fail closed).

## The scoping model (the whole design on one page)

| Actor role | Deals they see |
|---|---|
| ADMIN, CSA, UNDERWRITER | all |
| EMPLOYER | `deal.org_id` ∈ the actor's org memberships |
| AGENT (org_members.role = AGENT) | `deal.producing_agent_id = actor.id` |
| BROKER (org_members.role = BROKER) | `deal.producing_agent_id` ∈ (all agent user-ids in the broker's org) |
| CARRIER, PEO, VENDOR | none by default (fail closed) — widened later per their own specs |

The same actor→visibility resolution drives **contacts** (via `contact.org_id` / the contact's deal), **quotes/policies/proposals/documents** (via their parent deal), and **accounts** (via the account's deals). Compute the visible deal-id set once per request, reuse everywhere.

## File Structure

| File | Responsibility |
|---|---|
| `artifacts/api-server/src/lib/scope.ts` | **Create** — the single source of truth: `Actor`, `resolveActor(req)`, `visibleDealFilter(actor)`, `orgIdsForActor(actor)`, `agentIdsForBroker(actor)` |
| `artifacts/api-server/src/routes/deals.ts` | **Modify** — apply `visibleDealFilter` to the list |
| `artifacts/api-server/src/routes/contacts.ts` | **Modify** — scope by org/deal |
| `artifacts/api-server/src/routes/quotes.ts` | **Modify** — scope by parent deal |
| `artifacts/api-server/src/routes/policies.ts` | **Modify** — scope by parent deal |
| `artifacts/api-server/src/routes/proposals.ts` | **Modify** — scope by parent deal |
| `artifacts/api-server/src/routes/documents.ts` | **Modify** — scope by parent deal |
| `artifacts/api-server/src/routes/accounts.ts` | **Modify** — scope by the account's visible deals |
| `artifacts/api-server/src/routes/deals.ts` (create path) + `submission.ts` | **Modify** — populate `org_id` + `producing_agent_id` at creation |
| `artifacts/api-server/src/scripts/verify-scope.ts` | **Create** — the proof-of-isolation harness (rollback-only) |

## Global Constraints

- Branch: **new branch `sec1-multi-tenant-scoping`, cut from `p5b-journey-engine`** (do NOT build SEC-1 on top of in-flight WC work; keep it isolatable). NEVER `main` / `awf-os-brendy-sprint-1`. Do not merge.
- **Fail closed.** An unknown role, a null actor org, or any ambiguity returns **zero rows**, never all rows. A scoping bug must under-show, never over-show.
- Scoping is enforced **on every read path** — the list AND the `GET /:id` detail. A 404 (not 403) for a row outside the actor's scope, so existence isn't leaked.
- Schema via `drizzle-kit push`; if it proposes anything destructive → STOP. Judge by SQL listed, not the "Changes applied" line.
- API changes → `openapi.yaml` → codegen; never hand-edit `generated/`.
- `pnpm typecheck` zero new. No new raw hex. Existing harness `verify-p5b.ts` must stay green (46/46).

---

### Task 1: The shared scoping helper

**Files:**
- Create: `artifacts/api-server/src/lib/scope.ts`
- Test: `artifacts/api-server/src/scripts/verify-scope.ts` (created here, extended each task)

**Interfaces:**
- Produces:
  - `type Actor = { id: string; role: string; orgIds: string[] }`
  - `resolveActor(req): Promise<Actor>` — reads `req.user` + all `org_members` rows for the user
  - `isInternal(actor): boolean` — ADMIN | CSA | UNDERWRITER
  - `agentIdsForBroker(actor, dbc): Promise<string[]>` — every user id who is an `org_members` AGENT/BROKER in any of the actor's orgs (used only when the actor is a BROKER)
  - `visibleDealCondition(actor, dbc): Promise<SQL | null>` — the Drizzle `WHERE` fragment for the `deals` table; `null` means "see all" (internal); a condition that matches nothing when the actor should see nothing

**Design:** return a Drizzle SQL condition, not a filtered array, so every endpoint composes it into its own query (`where(and(existing, scope))`) without loading all rows first.

- [ ] **Step 1: Write the failing check**

Create `verify-scope.ts` with a rollback transaction that seeds: one broker org with a BROKER user + two AGENT users, a second unrelated agency, an employer org, and deals wired to each. Then assert `visibleDealCondition` produces the right row sets. First check:

```typescript
      // Internal sees everything → null condition.
      const adminActor = { id: adminId, role: "ADMIN", orgIds: [] };
      check("internal actor → null (see all) condition", (await visibleDealCondition(adminActor, tx)) === null);
```

Run: `pnpm --filter @workspace/api-server exec tsx src/scripts/verify-scope.ts`
Expected: FAIL — `visibleDealCondition` does not exist.

- [ ] **Step 2: Implement `scope.ts`**

```typescript
import { db, orgMembersTable, dealsTable } from "@workspace/db";
import { and, eq, inArray, or, sql, type SQL } from "drizzle-orm";
import type { Request } from "express";

export type Actor = { id: string; role: string; orgIds: string[] };

const INTERNAL = new Set(["ADMIN", "CSA", "UNDERWRITER"]);
export const isInternal = (a: Actor) => INTERNAL.has(a.role);

type Dbc = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Build the actor from the session + ALL of the user's org memberships. */
export async function resolveActor(req: Request, dbc: Dbc = db): Promise<Actor> {
  const u = req.user!;
  const memberships = await dbc
    .select({ orgId: orgMembersTable.orgId })
    .from(orgMembersTable)
    .where(eq(orgMembersTable.userId, u.id));
  return { id: u.id, role: u.role, orgIds: memberships.map((m) => m.orgId).filter((x): x is string => !!x) };
}

/** Every agent/broker user id inside the actor's orgs (broker sees their org's producers). */
export async function agentIdsForBroker(actor: Actor, dbc: Dbc = db): Promise<string[]> {
  if (actor.orgIds.length === 0) return [];
  const rows = await dbc
    .select({ userId: orgMembersTable.userId })
    .from(orgMembersTable)
    .where(and(inArray(orgMembersTable.orgId, actor.orgIds), inArray(orgMembersTable.role, ["AGENT", "BROKER"])));
  return rows.map((r) => r.userId).filter((x): x is string => !!x);
}

/** True when the actor is a broker (principal) in any of their orgs. */
async function isBroker(actor: Actor, dbc: Dbc = db): Promise<boolean> {
  if (actor.orgIds.length === 0) return false;
  const [row] = await dbc
    .select({ id: orgMembersTable.id })
    .from(orgMembersTable)
    .where(and(eq(orgMembersTable.userId, actor.id), eq(orgMembersTable.role, "BROKER")))
    .limit(1);
  return !!row;
}

/**
 * The WHERE fragment restricting `deals` to what this actor may see.
 * Returns null ONLY for internal actors (see all). For everyone else it returns
 * a condition — and a condition that matches nothing when the actor should see
 * nothing, so the failure direction is always "under-show".
 */
export async function visibleDealCondition(actor: Actor, dbc: Dbc = db): Promise<SQL | null> {
  if (isInternal(actor)) return null;

  const clauses: SQL[] = [];

  // Employer / any org member: deals FOR their org.
  if (actor.orgIds.length > 0) {
    clauses.push(inArray(dealsTable.orgId, actor.orgIds));
  }

  if (actor.role === "AGENT") {
    if (await isBroker(actor, dbc)) {
      const ids = await agentIdsForBroker(actor, dbc);
      if (ids.length > 0) clauses.push(inArray(dealsTable.producingAgentId, ids));
    } else {
      clauses.push(eq(dealsTable.producingAgentId, actor.id));
    }
  }

  // Nothing matched → fail closed (a condition that is always false).
  if (clauses.length === 0) return sql`false`;
  return clauses.length === 1 ? clauses[0]! : or(...clauses)!;
}
```

- [ ] **Step 3: Run to green.** Add the seed + the internal/agent/broker/employer/foreign assertions to `verify-scope.ts` (full seed code in this task's test file), run it, confirm ALL PASS and the run rolls back. Confirm `pnpm --filter @workspace/api-server exec tsx src/scripts/verify-p5b.ts` still 46/46.

- [ ] **Step 4: Typecheck + commit**

```bash
pnpm typecheck
git add artifacts/api-server/src/lib/scope.ts artifacts/api-server/src/scripts/verify-scope.ts
git commit -m "feat(sec1): shared multi-tenant scoping helper + isolation harness"
```

---

### Task 2: Scope the deals list AND detail

**Files:** Modify `artifacts/api-server/src/routes/deals.ts`. Test: `verify-scope.ts`.

**Interfaces:** Consumes `resolveActor`, `visibleDealCondition`.

- [ ] **Step 1: Failing check** — in `verify-scope.ts`, assert that the deals-list query composed with the scope condition returns exactly the foreign-agency deals for a foreign agent = 0, and the broker's own org deals = N. Run, confirm FAIL (list still unscoped).

- [ ] **Step 2: Apply to the list.** Replace `router.get("/", async (_req, res) => {` with a handler that resolves the actor and composes the condition:

```typescript
router.get("/", async (req, res) => {
  const actor = await resolveActor(req);
  const scope = await visibleDealCondition(actor);
  const where = scope ? and(isNull(dealsTable.archivedAt), scope) : isNull(dealsTable.archivedAt);
  const rows = await db.select().from(dealsTable).where(where).orderBy(desc(dealsTable.createdAt));
  // …existing KPI enrichment unchanged…
```

- [ ] **Step 3: Apply to the detail.** In `GET /:id`, after fetching the deal, verify it's within scope; if not, return **404** (not 403 — don't leak existence):

```typescript
  const actor = await resolveActor(req);
  const scope = await visibleDealCondition(actor);
  if (scope) {
    const [visible] = await db.select({ id: dealsTable.id }).from(dealsTable).where(and(eq(dealsTable.id, req.params.id), scope));
    if (!visible) return res.status(404).json({ error: "Not found" });
  }
```

- [ ] **Step 4:** Run `verify-scope.ts` → green; `verify-p5b.ts` → 46/46; typecheck zero new. Commit `feat(sec1): scope deals list + detail by actor`.

---

### Task 3: Scope contacts

**Files:** Modify `contacts.ts`. A contact is visible when its `org_id` is the actor's, OR its `deal_id` is a visible deal. Internal sees all. Same 404-on-detail rule. Test asserts a foreign agent sees none of another org's contacts. Commit `feat(sec1): scope contacts`.

---

### Task 4: Scope deal-derived resources (quotes, policies, proposals, documents)

**Files:** Modify `quotes.ts`, `policies.ts`, `proposals.ts`, `documents.ts`. Each row hangs off a `deal_id`; a row is visible iff its parent deal is visible. Implement one small helper in `scope.ts` — `visibleDealIds(actor, dbc): Promise<string[] | null>` (null = all) — and filter each list `where(inArray(table.dealId, ids))` when non-null. 404 on detail out of scope. One commit per file OR one combined `feat(sec1): scope quotes/policies/proposals/documents by parent deal` — reviewer's call; keep each file's change independently testable in `verify-scope.ts`.

---

### Task 5: Scope accounts

**Files:** Modify `accounts.ts`. An account is visible iff the actor can see at least one of its deals (join `deals.account_id`), plus internal-sees-all. Preserve the existing `search`/`stage`/`tab` filters — compose scope with `and`. Test: a foreign agent sees no accounts from another agency. Commit `feat(sec1): scope accounts by visible deals`.

---

### Task 6: Populate `org_id` + `producing_agent_id` at deal creation

**Files:** Modify `deals.ts` (POST) and `submission.ts` (marketplace insert).

**WHY:** Without this, scoping is correct but every employer/agent sees zero deals (fail-closed but useless). This closes the loop.

- Marketplace (`submission.ts`): set `producingAgentId = req.user?.id` when an agent is submitting; set `orgId` to the client account's org (create/lookup the employer org for the account if the account has one, else leave null and log — a self-serve prospect may have no org yet).
- Pipeline/API create (`deals.ts`): same.
- **Do NOT retro-fill existing deals here** — a separate, reviewed backfill script decides that (existing demo/archived deals). Flag it.
- Add `org_id`/`producing_agent_id` to the create request contract if not present → codegen.

Test: create a deal as an agent → `producing_agent_id` = that agent; that agent can now see it; a foreign agent cannot. Commit `feat(sec1): populate org_id + producing_agent_id on deal creation`.

---

### Task 7: Proof-of-isolation regression + report

**Files:** Finalize `verify-scope.ts`; create `docs/build-prompts/sec1-report.md`.

- [ ] **The isolation matrix** — `verify-scope.ts` must assert ALL of, in one rollback run:
  1. Foreign agent sees 0 of another agency's deals/contacts/quotes/policies/accounts.
  2. Agent sees exactly their own produced deals.
  3. Broker sees every deal produced by any agent in their org, and no others.
  4. Employer sees only deals where `org_id` = their org.
  5. Unknown/other role (CARRIER/PEO/VENDOR) sees 0 (fail closed).
  6. Internal (ADMIN/CSA/UW) sees all.
  7. Out-of-scope `GET /:id` returns 404, not the row.
- [ ] Run full gates: `verify-scope.ts` green, `verify-p5b.ts` 46/46, `pnpm typecheck` zero new, codegen clean.
- [ ] **Report** (`sec1-report.md`) — scope, the isolation matrix results verbatim, and FLAGS FOR CURTIS: **D1** (org_id = client org), **D2** (broker = org_members role — confirm vs a party type), **D3** (existing deals have null org_id/agent — decide on a backfill), and the note that **CARRIER/PEO/VENDOR currently see nothing** pending their own access specs.
- [ ] Commit `docs(sec1): multi-tenant isolation report` and push.

**Then STOP — do not merge.**

## Coverage amendment (2026-08-02 re-audit, post 87-commit merge `3a66a41`)

The route surface grew after this plan's 2026-07-20 audit. Re-audited findings:

- **`deal-card.ts` (and `quote-view.ts`, `journeys.ts`) treat AGENT as internal see-all** — each
  defines `INTERNAL_ROLES = {ADMIN, CSA, AGENT, UNDERWRITER}` and short-circuits `canViewDeal` for
  those roles. External roles (EMPLOYER/CARRIER/PEO) *are* ownership-checked, but any AGENT can read
  any deal's card by id. **Add to Task 4 scope:** replace the AGENT branch in these per-deal access
  checks with `scope.ts` logic (producing-agent / broker rules), keeping the EMPLOYER checks as-is.
  Prefer 404 over the current 403 for out-of-scope ids where the change is non-breaking to the UI.
- **`geo.ts`** (new) — Census geocoder proxy, no tenant data. No scoping needed. Audited, out of scope.
- **`search.ts`** is INTERNAL_SALES-gated (includes AGENT) and spans deals/accounts — verify in
  Task 7 that its results compose `visibleDealCondition`, or add it to Task 4's list.
- New `quotes` columns (`approved_snapshot`, `params_pending_review`) are a client-visibility gate
  *within* a deal — orthogonal to tenant scoping; no SEC-1 action.

## Self-review notes (author)

- **Every list endpoint in the audit is covered:** deals(2), contacts(3), quotes/policies/proposals/documents(4), accounts(5). Journeys already scopes — left as-is, referenced as the pattern.
- **Detail endpoints included** (404-on-out-of-scope), not just lists — a list-only fix would still leak via `GET /:id`.
- **Fail-closed is the default everywhere** — `sql\`false\`` for no-match, unknown roles get nothing.
- **Ordering matters:** Tasks 1–5 make reads safe *first*; Task 6 (populate the columns) comes after, so turning on scoping can't briefly expose or hide the wrong data mid-build.
- **Open decisions D1–D3 are encoded, not silently assumed**, and surfaced in the report because v2.2 is missing and these touch access-control semantics.
