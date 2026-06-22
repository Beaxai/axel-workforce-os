# Phase Build Loop — standing process

The repeatable loop for every phase of Axel Workforce OS. It exists to satisfy the engineering
instructions Curtis issued (Brendan_Claude_Project_Instructions) and the State Document workflow.
Run every phase this way; don't re-derive it each time.

## Why this shape
Curtis's loop closes when **he updates the State Document** — his only shared memory ("if it's not
in the doc, it didn't happen"). Chat history is **not** shared between accounts. So every phase must
end in **doc-ready, self-contained artifacts** Curtis can fold straight into the State Document.
Secrets/API keys never appear in any artifact — referenced by name only, values stay in Replit env.

## The loop

1. **Prompt** — write a self-contained build prompt in `docs/build-prompts/phase-N-*.md`. It must:
   - reference the confirmed stack (React 19.1 + Vite + TS, Express 5, Drizzle) and the design tokens
     explicitly (pink primary / purple support / single `--gradient-cta`; tokens only);
   - include the phase's **acceptance tests** (the State Doc §-numbered set);
   - **flag any change that touches a binding decision** before building;
   - restate guardrails: schema via **SQL DDL not blanket `drizzle-kit push`**; update
     `openapi.yaml` → regenerate Orval hooks + Zod on any API change; **never merge/PR/push to
     `main`** (work stays on `awf-os-brendy-sprint-1`); no Supabase.

2. **Build** — Replit builds in Build mode on the sprint branch and pushes. (Replit is the builder;
   there is no connector — GitHub is the bus.)

3. **Review (read-only)** — audit the diff (`<baseline>..origin/awf-os-brendy-sprint-1`) against the
   acceptance tests + binding decisions before accepting. **Audit actual files, never agent memory.**
   Flag binding violations, hardcoded accent hex literals, hand-edited `generated/`, anything on main.

4. **Report** — Replit runs the acceptance suite and (a) prints a structured report in chat to paste
   back, and (b) commits `docs/build-prompts/phase-N-report.md` with: pass/fail per test, backfill/
   data counts, **typecheck two ways** (zero *new* errors from this phase; pre-existing repo-wide
   count listed separately — never "fix" pre-existing errors as part of the phase), the decision as
   actually built, new/changed API surface. **Screenshots stay in chat — do NOT commit images.**

5. **Verify** — check the report against the acceptance checklist; a phase is not done until all
   tests pass.

6. **Hand off** — package the doc-ready summary (decision made, pass/fail, new API surface, light+
   dark screenshots) for Curtis to fold into the State Document; open/append the phase's GitHub issue.

7. **Next phase unblocks.** Build order: 3.5 → 4A → 4C → 4B → P4 → P5 → P6 → P7.

## Acceptance gate (every phase)
- All acceptance tests pass.
- `pnpm typecheck`: zero new errors from the phase; pre-existing count reported, untouched.
- Every new view/component verified in BOTH light and dark.
- OpenAPI + Orval/Zod regenerated if the API surface changed; nothing under `generated/` hand-edited.
- Nothing merged to `main`; no secrets in any artifact.
