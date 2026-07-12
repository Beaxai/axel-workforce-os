# P5b — Implementations & Onboarding: the admin-configurable Journey engine — Design Spec

_Date: 2026-07-12 · Author: Brendan · Owner sign-off: Curtis Prince_
_Depends on: P4.1 (the 8-stage board + the atomic Bound trigger) · Branch: builds on `p4-pipeline-stages` after P4/P4.1 merges (or stacks on it)_

> **Authority note.** The State Document v2.1 governs. State-Doc **P5 = "Policies/AMS + Implementations/
> Onboarding."** This spec covers **only the Implementations & Onboarding half (P5b)**; Policies/AMS is a
> separate later piece (P5a). Items marked **[Curtis sign-off]** are owner decisions.

---

## 0. In plain terms — "playbooks"

Curtis's team writes reusable checklists ("playbooks") once — an **internal** playbook (what your team
does to stand up a client) and a **client** playbook (the employer's onboarding). The moment a deal hits
**Bound**, the system stamps out a **live copy** of the matching playbook(s) for that specific client,
with real due dates and every step "not started." Your specialist works the internal copy; the client
works theirs in "My Program"; progress bars fill as steps complete. Editing a playbook affects deals bound
*after* the change — that's why the steps live as editable **data**, not hardcoded.

---

## 1. Purpose & scope

Turn the empty Implementation/Onboarding tables into a working, **admin-configurable journey engine**:
at Bound, instantiate journeys from admin-defined templates, and provide the UIs to configure and work
them.

**Built in gated sub-phases** (contract-first, then leaves):
- **W1 — the spine (build first, gated):** template data model, all backend routes, OpenAPI + generated
  hooks, the Bound instantiation, retiring `onboarding_checklist`, and the **shared `JourneyView`
  component**. Everything the leaves share.
- **W2 — Admin playbook editor** (frontend leaf).
- **W3 — Internal work UI** on the Implementations page (frontend leaf).
- **W4 — Client work UI** in "My Program" (frontend leaf).

**Parallelization:** the leaves are frontend-only, touch different pages, and consume W1's generated hooks
+ shared component, so they integrate cleanly regardless of order. On **Replit Core** (1 background task at
a time) they run **sequentially**; the contract-first design makes sequential vs. parallel a wall-clock
difference only. (Pro would allow the three as concurrent tasks.)

## 2. Non-goals
- **Policies/AMS** record creation + admin (that's P5a).
- **Commissions / billing** (P7).
- **Live email / e-sign** of onboarding documents (P6) — a playbook step may *reference* a document or
  signature task, but actually sending is P6.
- Notifications/reminders delivery — the schema supports `reminder_sent_at`, but wiring reminders is P6.

## 3. Data model

### New — template layer (`lib/db/src/schema/journey-templates.ts`)
- **`journey_templates`** — `id`, `name`, `type` (`IMPLEMENTATION` | `ONBOARDING`), `product_type`
  (`WC` | `PEO` | `ASO` | `ANY`), `is_active` (bool), `version` (int), `created_at/updated_at`.
- **`journey_template_phases`** — `id`, `template_id` (FK, cascade), `name`, `sort_order`,
  `target_offset_days` (int, days from go-live).
- **`journey_template_tasks`** — `id`, `template_id` (FK), `phase_id` (FK), `name`, `task_type`,
  `owner_type` (`INTERNAL_SPECIALIST` | `CLIENT` | `AGENT` | `CARRIER` | …), `is_milestone` (bool),
  `offset_days` (int), `sort_order`.

### Reuse — instance layer (existing `implementation_*` tables)
`implementation_trackers / implementation_phases / implementation_tasks` become the generic **journey
instance** for *both* audiences (tasks already carry `owner_type`, `is_milestone`, `due_date`,
`blocked_since`, `reminder_sent_at`). Add to **`implementation_trackers`**: `type`
(`IMPLEMENTATION` | `ONBOARDING`) and `template_id` (FK, the template it came from).

A **client onboarding is just a journey instance** with `type = ONBOARDING` whose tasks have
`owner_type = CLIENT`.

### Retire
- **`onboarding_checklist`** (the fixed `step_1…step_6` table) — **empty (0 rows)**, so drop it cleanly
  and repoint `ClientOnboarding.tsx` / "My Program" at the onboarding journey instance.

### Computed
- `implementation_trackers.overall_progress` = completed ÷ total tasks, kept fresh as tasks complete.

## 4. Bound instantiation (extends the P4.1 trigger)

Replaces P4's hollow-shell trigger. Runs **inside the existing atomic Bound transaction** (FOR-UPDATE).

When a deal enters `BOUND`:
1. Find all `journey_templates` where `is_active = true` AND (`product_type = deal.productType` OR
   `product_type = 'ANY'`). **[Curtis sign-off: matching rule]**
2. For each, instantiate a journey: create the tracker (`type`, `template_id`, `product_type`,
   `go_live_date = today`, `status = IN_PROGRESS`, `overall_progress = 0`); copy template phases →
   `implementation_phases` (`target_date = go_live_date + target_offset_days`); copy template tasks →
   `implementation_tasks` (`due_date = anchor + offset_days`, `owner_type`, `status = PENDING`,
   `sort_order`).
3. **Idempotent** (kept from P4): skip any (type, product) a tracker already exists for on this deal.
4. **No matching active template → instantiate nothing + log it** (admin must define a playbook first).
   *(Behavior change from P4's always-make-a-WC-shell — flagged.)*

## 5. Shared component — `JourneyView` (the contract seam)

One component renders a journey (phases → tasks) for **both** audiences, parameterized by `audience`
(`INTERNAL` | `CLIENT`) and permissions. W3 and W4 both consume it — built in W1 so the two leaves can't
diverge. Renders: phase groups, task rows (name, owner, due date, milestone flag, status), a progress bar,
and a "complete task" affordance gated by whether the viewer owns the task.

## 6. Admin playbook editor (W2) — frontend

New admin-only page (`/admin/journeys`). CRUD over templates: create a template (name, type, product,
active), add/reorder phases, add/edit tasks under a phase (name, owner type, milestone, day-offset).
Optionally seed task names from the existing `task_library` catalog. Save = writes the template via W1's
API. Duplicate/version + activate/deactivate. Admin/role-gated.

## 7. Internal work UI (W3) — frontend

Rework the **Implementations page** (`Implementations.tsx` / `ImplementationPage.tsx`): a specialist sees
their `type = IMPLEMENTATION` journeys, opens one (the shared `JourneyView`), and works tasks — mark
complete, see progress + milestones + overdue. Dual-tab per the State-Doc "WC Bind Journey / PEO-ASO
Onboarding" — but the tabs are now just journeys filtered by product/type. Role: ADMIN/CSA (+ assigned
specialist).

## 8. Client work UI (W4) — frontend

Rework **"My Program"** (`MyProgram.tsx` / `ClientOnboarding.tsx`): the employer sees their
`type = ONBOARDING` journey (shared `JourneyView`, `audience = CLIENT`), and completes their own
`owner_type = CLIENT` tasks. Read-only on non-client tasks. Role: EMPLOYER (own deal only).

## 9. API contract (OpenAPI — W1 owns all of it)

- **Templates (admin):** `GET/POST /api/journey-templates`, `GET/PATCH/DELETE /api/journey-templates/:id`
  (detail includes phases + tasks); nested create/update/delete for phases and tasks.
- **Instances:** `GET /api/journeys?dealId=&type=` (list), `GET /api/journeys/:id` (phases + tasks),
  `PATCH /api/journeys/:id/tasks/:taskId` (complete/update a task — recomputes progress server-side).
- The thin existing `/api/implementation` route is **subsumed** into `/api/journeys`.
- All changes: edit `openapi.yaml` → regenerate Orval/Zod (never hand-edit `generated/`).

## 10. Migration

- Schema via **`drizzle-kit push`** (works since P4's drift fix): add the 3 template tables + the 2
  `implementation_trackers` columns; **drop `onboarding_checklist`** (empty — clean drop).
- **Seed** at least one starter template per product so Bound produces a visible journey in demos
  **[Curtis sign-off: starter content]** — or leave empty and rely on the admin editor.

## 11. Build plan (the parallel/sequential strategy)

1. **W1 — spine (gated, one step at a time):** schema push → OpenAPI + hooks → Bound instantiation
   (extend the trigger, atomic) → retire `onboarding_checklist` → shared `JourneyView` component. This is
   the contract every leaf honors.
2. **W2 / W3 / W4 — leaves:** three independent, contract-isolated frontend build-prompts. On Core, run
   them **sequentially** (any order); each is reviewed + applied before the next. *(Claude drafts all
   three leaf prompts in parallel once W1 lands, so there's no wait between them.)*
3. **Integration:** wire the three nav entries + one end-to-end test (bind → journeys instantiate →
   specialist completes internal tasks → client completes onboarding → progress rolls up).

## 12. Acceptance tests
1. Admin creates a template (phases + tasks) and activates it; it persists and reloads correctly.
2. Binding a deal with a matching active template instantiates the journey(s): phases + tasks copied,
   due dates = go-live + offsets, statuses PENDING; idempotent on re-bind (no duplicates).
3. Binding with **no** matching active template creates no journey and logs it.
4. A WC deal spins up the internal + onboarding journeys; a PEO deal additionally picks up the PEO one —
   purely from active templates.
5. Specialist completes an internal task → status + progress update; milestone/overdue reflected.
6. Client (EMPLOYER) completes an onboarding task on their own deal; cannot touch internal tasks or
   another deal's journey (server-enforced).
7. `onboarding_checklist` dropped; "My Program" reads the onboarding journey.
8. `drizzle-kit push` clean; OpenAPI regenerated (no hand-edited `generated/`); typecheck zero new;
   every new/changed surface verified light + dark.

## 13. Open items for Curtis
- The template **matching rule** (active + product_type / ANY).
- **Starter content** — should we seed default playbooks, or ship empty for him to author?
- Confirm **client onboarding as a journey instance** (retiring the fixed 6-step table) — already agreed
  in design, restate for the record.
- The `owner_type` vocabulary (INTERNAL_SPECIALIST / CLIENT / AGENT / CARRIER …).

## 14. Risks
- **Scope** — this is the largest remaining subsystem; the W1-spine / contract-isolated-leaves split keeps
  each increment small and reviewable.
- **Over-generalization** — one engine for two audiences is powerful but must stay simple; YAGNI on
  template features (no conditional branching, no per-task dependencies in v1 — linear phases/tasks only).
- **No automated tests** — `tsc` + the curl/Playwright acceptance matrix remain the gates.
- **Depends on P4/P4.1** being in place (the atomic Bound trigger it extends).
