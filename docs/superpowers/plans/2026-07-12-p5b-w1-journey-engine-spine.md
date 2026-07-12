# P5b · W1 — Journey Engine Spine — Implementation Plan

> **For agentic workers:** this plan is executed via **gated Replit build-prompts** (one task at a time,
> STOP + acceptance check + review before the next), the same protocol used for P4/P4.1 — not in-session
> subagents. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the shared backend + contract "spine" for the admin-configurable Journey engine, so the
three UI leaves (W2 admin editor, W3 internal work UI, W4 client onboarding) can be built against a stable
interface.

**Architecture:** New **template** tables (journey_templates → phases → tasks) define reusable playbooks;
the existing `implementation_*` tables are reused as generic **journey instances**; the fixed
`onboarding_checklist` is retired. When a deal enters **BOUND**, the (P4.1) atomic trigger instantiates a
journey per matching active template. All access is through OpenAPI-generated hooks; a shared `JourneyView`
component renders any journey for both audiences.

**Tech Stack:** Drizzle ORM + Postgres · Express 5 · OpenAPI → Orval/Zod codegen · React 19 + Vite ·
`@workspace/pipeline`-style shared lib patterns.

## Global Constraints

- **Branch:** `p5b-journey-engine` only. Never `main` / `awf-os-brendy-sprint-1`.
- **No test runner.** Correctness gate = `pnpm typecheck` (zero new vs baseline) + curl/DB/Playwright
  acceptance per task. Verify every UI surface in **light AND dark**.
- **Schema via `drizzle-kit push`** (works since P4's drift fix). Inspect the push plan; the only
  destructive op permitted in W1 is **dropping `onboarding_checklist`** (empty). Anything else → STOP.
- **API contract:** edit `lib/api-spec/openapi.yaml`, then `pnpm --filter @workspace/api-spec codegen`.
  **Never hand-edit `generated/`.**
- **Auth:** every new `/api/*` route declares `requireRoles(...)`. Templates = ADMIN. Journeys = role-scoped.
- **Design system:** tokens only; the single-gradient rule is under revision (Gershom) — for W1's one
  component, use existing tokens; no new hardcoded accent hex.
- **Zod:** `lib/db` schema files import from `zod/v4`; match the surrounding file.

**owner_type vocabulary:** `INTERNAL_SPECIALIST | CLIENT | AGENT | CARRIER`. **journey type:**
`IMPLEMENTATION | ONBOARDING`. **product_type:** `WC | PEO | ASO | ANY`. **task/phase status:**
`PENDING | IN_PROGRESS | COMPLETE` (task) · `PENDING | IN_PROGRESS | COMPLETE` (phase) · tracker status
`IN_PROGRESS | COMPLETE`.

---

## File structure

- **Create** `lib/db/src/schema/journey-templates.ts` — the 3 template tables + insert schemas + types.
- **Modify** `lib/db/src/schema/implementation.ts` — add `type` + `templateId` to `implementation_trackers`.
- **Modify** `lib/db/src/schema/index.ts` — export journey-templates; remove the onboarding export.
- **Delete** `lib/db/src/schema/onboarding.ts` — retire the fixed checklist.
- **Modify** `lib/api-spec/openapi.yaml` — template + journey schemas & endpoints; regenerate.
- **Create** `artifacts/api-server/src/routes/journey-templates.ts` — admin CRUD.
- **Create** `artifacts/api-server/src/routes/journeys.ts` — instance list/detail + task update (subsumes
  the thin `implementation.ts` route).
- **Create** `artifacts/api-server/src/lib/journey-instantiate.ts` — the Bound instantiation logic.
- **Modify** `artifacts/api-server/src/routes/deals.ts` — call the instantiator from the Bound trigger.
- **Modify** `artifacts/api-server/src/routes/index.ts` — mount the two new routers with role gates.
- **Create** `artifacts/axel-workforce-os/src/components/journey/JourneyView.tsx` — shared renderer.

---

## Task 1 — Schema: template tables + tracker columns + retire onboarding_checklist

**Files:**
- Create: `lib/db/src/schema/journey-templates.ts`
- Modify: `lib/db/src/schema/implementation.ts`, `lib/db/src/schema/index.ts`
- Delete: `lib/db/src/schema/onboarding.ts`

**Interfaces — Produces:** tables `journey_templates`, `journey_template_phases`,
`journey_template_tasks`; `implementation_trackers.type` + `.template_id`. Exports `journeyTemplatesTable`,
`journeyTemplatePhasesTable`, `journeyTemplateTasksTable`, their insert schemas + row types.

- [ ] **Step 1: Create `journey-templates.ts`**

```ts
import { pgTable, uuid, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sql } from "drizzle-orm";

export const journeyTemplatesTable = pgTable("journey_templates", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type").notNull(),               // IMPLEMENTATION | ONBOARDING
  productType: text("product_type").notNull(), // WC | PEO | ASO | ANY
  isActive: boolean("is_active").notNull().default(true),
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql`now()`),
});

export const journeyTemplatePhasesTable = pgTable("journey_template_phases", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  templateId: uuid("template_id").notNull().references(() => journeyTemplatesTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull(),
  targetOffsetDays: integer("target_offset_days").notNull().default(0),
});

export const journeyTemplateTasksTable = pgTable("journey_template_tasks", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  templateId: uuid("template_id").notNull().references(() => journeyTemplatesTable.id, { onDelete: "cascade" }),
  phaseId: uuid("phase_id").notNull().references(() => journeyTemplatePhasesTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  taskType: text("task_type").notNull().default("TASK"),
  ownerType: text("owner_type").notNull(),     // INTERNAL_SPECIALIST | CLIENT | AGENT | CARRIER
  isMilestone: boolean("is_milestone").notNull().default(false),
  offsetDays: integer("offset_days").notNull().default(0),
  sortOrder: integer("sort_order").notNull(),
});

export const insertJourneyTemplateSchema = createInsertSchema(journeyTemplatesTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertJourneyTemplatePhaseSchema = createInsertSchema(journeyTemplatePhasesTable).omit({ id: true });
export const insertJourneyTemplateTaskSchema = createInsertSchema(journeyTemplateTasksTable).omit({ id: true });
export type JourneyTemplate = typeof journeyTemplatesTable.$inferSelect;
export type JourneyTemplatePhase = typeof journeyTemplatePhasesTable.$inferSelect;
export type JourneyTemplateTask = typeof journeyTemplateTasksTable.$inferSelect;
```

- [ ] **Step 2: Add columns to `implementation.ts`**

In `implementationTrackersTable`, add (import `journeyTemplatesTable` from `./journey-templates`):
```ts
  type: text("type").notNull().default("IMPLEMENTATION"), // IMPLEMENTATION | ONBOARDING
  templateId: uuid("template_id").references(() => journeyTemplatesTable.id),
```

- [ ] **Step 3: Update `index.ts`** — add `export * from "./journey-templates";`; **remove** the
  `export * from "./onboarding";` line. Delete `onboarding.ts`.

- [ ] **Step 4: Push + verify (acceptance)**

Run: `pnpm --filter @workspace/db run push` — inspect the plan first.
Expected: creates the 3 template tables + 2 tracker columns; the **only** destructive op is
`DROP TABLE onboarding_checklist` (empty). If anything else is destructive → STOP.
Then: `pnpm typecheck` → zero new. DB check: the 3 tables exist; `implementation_trackers` has `type` +
`template_id`; `onboarding_checklist` is gone.

- [ ] **Step 5: Commit** — `git commit -m "feat(p5b-w1): journey template tables + tracker columns; retire onboarding_checklist"`

---

## Task 2 — OpenAPI contract + codegen

**Files:** Modify `lib/api-spec/openapi.yaml`; regenerate.

**Interfaces — Produces (generated hooks + Zod):** schemas `JourneyTemplate`, `JourneyTemplatePhase`,
`JourneyTemplateTask`, `JourneyTemplateDetail` (template + phases + tasks), `Journey` (tracker),
`JourneyPhase`, `JourneyTask`, `JourneyDetail` (journey + phases + tasks). Endpoints listed in Tasks 3–4.

- [ ] **Step 1: Add the schemas** to `openapi.yaml` components — mirror the DB shapes above; `type`,
  `productType`, `ownerType`, statuses as string enums with the vocabularies from Global Constraints.

- [ ] **Step 2: Add the endpoints** (paths only; handlers land in Tasks 3–4):
  - `GET /journey-templates` · `POST /journey-templates` · `GET/PATCH/DELETE /journey-templates/{id}`
    (detail = template + phases + tasks)
  - `POST /journey-templates/{id}/phases` · `PATCH/DELETE /journey-template-phases/{phaseId}`
  - `POST /journey-templates/{id}/tasks` · `PATCH/DELETE /journey-template-tasks/{taskId}`
  - `GET /journeys?dealId=&type=` · `GET /journeys/{id}` (journey + phases + tasks)
  - `PATCH /journeys/{id}/tasks/{taskId}` (body: `{ status }`)

- [ ] **Step 3: Regenerate** — `pnpm --filter @workspace/api-spec codegen`.

- [ ] **Step 4: Verify (acceptance)** — codegen clean; the generated Zod + hooks include the new schemas;
  `pnpm typecheck` zero new; `git diff` shows only `openapi.yaml` hand-edited (everything under
  `generated/` is regenerated output).

- [ ] **Step 5: Commit** — `git commit -m "feat(p5b-w1): journey template + instance API contract"`

---

## Task 3 — Backend: journey-templates routes (admin CRUD)

**Files:** Create `artifacts/api-server/src/routes/journey-templates.ts`; mount in `routes/index.ts` with
`requireRoles("ADMIN")`.

**Interfaces — Consumes:** `journeyTemplatesTable` etc. (Task 1), generated Zod (Task 2).
**Produces:** the template CRUD endpoints (Task 2 list).

- [ ] **Step 1: Implement the router** — standard Drizzle CRUD:
  - `GET /` → list templates (optionally filter `?type=&productType=&isActive=`).
  - `GET /:id` → template + its phases (ordered by `sortOrder`) + tasks (ordered) nested.
  - `POST /` → insert template (validate with `insertJourneyTemplateSchema`).
  - `PATCH /:id` → update template fields; bump `updatedAt`.
  - `DELETE /:id` → delete (cascade removes phases/tasks).
  - `POST /:id/phases`, `PATCH /journey-template-phases/:phaseId` (mounted appropriately),
    `DELETE …`; same for tasks. Reject unknown ids with 404.

- [ ] **Step 2: Mount** in `routes/index.ts`: `router.use("/journey-templates", requireRoles("ADMIN"), journeyTemplatesRouter);`

- [ ] **Step 3: Verify (acceptance — curl, ADMIN session)**
  - Create a template + a phase + 2 tasks → 200; `GET /:id` returns them nested & ordered.
  - PATCH a task's name → reflected. DELETE the template → phases/tasks gone (cascade).
  - Non-ADMIN session (e.g. AGENT) → 403 on any of these.
  - `pnpm typecheck` zero new.

- [ ] **Step 4: Commit** — `git commit -m "feat(p5b-w1): admin journey-template CRUD routes"`

---

## Task 4 — Backend: journey instances + task update + progress

**Files:** Create `artifacts/api-server/src/routes/journeys.ts`; mount in `routes/index.ts`; remove/redirect
the thin `implementation.ts` route.

**Interfaces — Consumes:** `implementation_trackers/phases/tasks` (existing), the new tracker columns.
**Produces:** `GET /journeys`, `GET /journeys/:id`, `PATCH /journeys/:id/tasks/:taskId`; helper
`recomputeProgress(trackerId, dbc): Promise<number>`.

- [ ] **Step 1: Implement `recomputeProgress`** — `overall_progress = round(100 * completeTasks / totalTasks)`
  for the tracker; write it to `implementation_trackers.overall_progress`; set tracker `status = COMPLETE`
  when all tasks complete, else `IN_PROGRESS`. Also roll a phase to `COMPLETE` when all its tasks are complete.

- [ ] **Step 2: Implement the routes**
  - `GET /journeys?dealId=&type=` → trackers filtered; role-scoped (EMPLOYER: only own deal's journeys;
    ADMIN/CSA: all; assigned specialist: theirs).
  - `GET /journeys/:id` → tracker + phases (ordered) + tasks (ordered), with access check.
  - `PATCH /journeys/:id/tasks/:taskId` `{ status }` → update task status (+ `completedAt`/`completedBy`
    when COMPLETE); then `recomputeProgress`. **Server-enforced ownership:** a CLIENT/EMPLOYER may only
    complete tasks whose `owner_type = CLIENT` on their own deal; internal roles may complete internal tasks.

- [ ] **Step 3: Mount + retire old route** — mount `journeysRouter` at `/journeys` with `requireAuth`;
  point the old `/implementation` path at it (or remove `implementation.ts` and update `routes/index.ts`).

- [ ] **Step 4: Verify (acceptance — curl)** — with a tracker that has tasks (seed via Task 5's flow or a
  manual insert): completing a task updates status + recomputes `overall_progress`; completing all →
  tracker `COMPLETE`; an EMPLOYER completing an internal task → 403; EMPLOYER on another deal's journey →
  403. `pnpm typecheck` zero new.

- [ ] **Step 5: Commit** — `git commit -m "feat(p5b-w1): journey instance routes + progress recompute"`

---

## Task 5 — Bound instantiation (extend the P4.1 trigger)

**Files:** Create `artifacts/api-server/src/lib/journey-instantiate.ts`; modify `deals.ts`
(`fireImplementationTrigger` → call the instantiator inside the existing atomic Bound transaction).

**Interfaces — Consumes:** template tables, instance tables, `DbOrTx`.
**Produces:** `instantiateJourneysForDeal(deal, dbc): Promise<{ created: string[]; skipped: string[]; noTemplate: boolean }>`.

- [ ] **Step 1: Implement `instantiateJourneysForDeal`**

```
1. Find active templates: journey_templates WHERE is_active = true
     AND (product_type = deal.productType OR product_type = 'ANY').
2. For each template:
   - If a tracker already exists for (deal.id, template.type, template.productType) → skip (idempotent).
   - Else create implementation_trackers row: { dealId, type: template.type, templateId: template.id,
       productType: template.productType, goLiveDate: today, status: 'IN_PROGRESS', overallProgress: 0 }.
   - Copy template phases → implementation_phases (targetDate = goLiveDate + targetOffsetDays).
   - Copy template tasks → implementation_tasks (dueDate = goLiveDate + offsetDays, ownerType, status:'PENDING',
       isMilestone, sortOrder; link phaseId to the newly-created phase).
3. If NO active template matched → create nothing; return noTemplate:true (caller logs it to activity_log).
```
All inside the passed `dbc` (the Bound transaction).

- [ ] **Step 2: Wire into the Bound trigger** — in `deals.ts`, replace the current hollow-shell
  `fireImplementationTrigger` body with a call to `instantiateJourneysForDeal(row, tx)`; on `noTemplate`,
  write an `activity_log` entry ("Bound — no active journey template for product X; no journey created").
  Keep it inside the existing `FOR UPDATE` transaction. Keep idempotency.

- [ ] **Step 3: Verify (acceptance — curl)** — using a template created via Task 3:
  - Bind a matching deal → a journey instantiates: phases + tasks copied, `due_date` = go-live + offset,
    statuses PENDING; tracker `IN_PROGRESS`, progress 0.
  - Re-enter Bound → **no duplicate** journey (idempotent).
  - Bind a deal whose product has **no active template** → no journey + an activity_log "no template" entry.
  - The Bound bind-readiness gate + atomicity from P4.1 still hold. `pnpm typecheck` zero new.

- [ ] **Step 4: Commit** — `git commit -m "feat(p5b-w1): instantiate journeys from templates on Bound"`

---

## Task 6 — Shared `JourneyView` component

**Files:** Create `artifacts/axel-workforce-os/src/components/journey/JourneyView.tsx` (+ small
`PhaseGroup`/`TaskRow` in the same folder).

**Interfaces — Produces:**
```ts
type JourneyViewProps = {
  journey: JourneyDetail;              // from the generated GET /journeys/:id type
  audience: "INTERNAL" | "CLIENT";
  onCompleteTask: (taskId: string) => void;
  canCompleteTask: (task: JourneyTask) => boolean; // ownership/role gate supplied by the parent leaf
};
```

- [ ] **Step 1: Implement `JourneyView`** — render: a header with the progress bar
  (`journey.overallProgress`), then each phase (ordered) as a `PhaseGroup` with its tasks (ordered) as
  `TaskRow`s. A `TaskRow` shows name, owner badge, due date, a milestone marker when `isMilestone`, and a
  status control (checkbox/complete button) that is **disabled unless `canCompleteTask(task)`**; clicking
  calls `onCompleteTask(task.id)`. Overdue (due < today && not complete) styled with the semantic red token.
  Tokens only; no data fetching inside the component (parent passes data + callbacks).

- [ ] **Step 2: Verify (acceptance)** — render on a temporary throwaway route or story with mock
  `JourneyDetail` data for both `audience` values; confirm phases/tasks/progress render, the complete
  control respects `canCompleteTask`, and it's legible in **light + dark**. `pnpm typecheck` zero new.
  Remove the throwaway route before commit.

- [ ] **Step 3: Commit** — `git commit -m "feat(p5b-w1): shared JourneyView component"`

---

## W1 completion gate
- [ ] All 6 tasks' acceptance checks pass; `pnpm typecheck` zero new across packages.
- [ ] `drizzle-kit push` clean; only `onboarding_checklist` dropped.
- [ ] Contract (OpenAPI + generated hooks + `JourneyView`) is stable — the three leaves (W2/W3/W4) can now
  be built against it independently.
- [ ] Write `docs/build-prompts/p5b-w1-report.md` (per-task pass/fail, migration notes, the Curtis
  sign-off items: template matching rule + starter content).

## Curtis sign-off items (carry into the report)
- Template **matching rule** (`is_active` + product_type / `ANY`).
- **Starter content** — seed default playbooks, or ship empty for him to author in the W2 editor.
- Confirm **onboarding-as-journey-instance** (fixed 6-step table retired) — restate for the record.
