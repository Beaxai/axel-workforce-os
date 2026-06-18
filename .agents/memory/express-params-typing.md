---
name: Express req.params typing gotcha
description: req.params.x can be typed string|string[] on routes with middleware; coerce for strict helpers.
---

In this api-server's TS setup, `req.params.id` is inferred as `string` on a bare
`router.get("/:id", handler)` but widens to `string | string[]` when the route includes
middleware (e.g. `router.patch("/:id", blockReadOnly, handler)`). Drizzle's `eq(...)`
accepts the wide type silently, but a helper with a strict `(id: string)` param triggers
TS2345.

**How to apply:** type such helpers to accept `string | string[]` and normalize with
`String(id)`, or coerce at the call site. Don't be surprised when only the
middleware-wrapped routes error while bare routes with identical code do not.
