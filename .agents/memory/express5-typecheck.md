---
name: Express 5 route typing & noImplicitReturns
description: Why api-server route handlers throw TS2769/TS2345/TS7030 under Express 5 + strict TS, and the behavior-preserving fixes.
---

# Express 5 route handler type errors (api-server)

## TS2769 / TS2345 — route param types
Under the Express 5 `@types`, `req.params` values are typed `string | string[]`
(not `string`). Passing `req.params.id` straight into something expecting a
plain `string` (e.g. a Drizzle `eq(col, id)` or a `string`-typed helper) fails.

**Fix:** annotate the handler with the param generic so the param narrows to
`string`, e.g. `async (req: Request<{ id: string }>, res: Response) => {`.
This is the canonical, type-only fix — do NOT reach for `as any` / casts.

## TS7030 — noImplicitReturns
This repo enables `noImplicitReturns`. A handler that has ANY early
`return res.status(...).json(...)` guard but then ends with a bare
`res.json(...)` / `res.send(...)` (no `return`) has inconsistent return paths →
TS7030.

**Fix:** add `return` to the *terminal* response statement of every branch:
- terminal `res.json(...)` / `res.status(...).json(...)` / `res.send(...)` → prefix `return`
- middleware terminal `next();` → `return next();`
- in try/catch handlers, BOTH the try's terminal response AND the catch's
  terminal `res.status(...)` need `return`.

**Why it's safe:** these statements were already the last reachable statement in
their branch, so adding `return` is behavior-preserving (control flow unchanged).

**How to apply / scope it:** handlers with NO early `return` (e.g. a list GET
that only ever falls through to one `res.json(rows)`) do NOT error — leave them
untouched to keep the diff minimal. Only the handlers with mixed return paths
need the change.

## Typecheck gate
`bash scripts/typecheck-baseline.sh` gates regressions via `API_BASELINE` /
`WEB_BASELINE` ceilings — when you fix errors, lower the ceilings so the gain is
locked in. `pnpm run typecheck` is the canonical repo-wide check (libs + all
artifacts) and must be 0.
