---
name: api-server dev workflow rebuilds on restart
description: Why backend edits require an explicit workflow restart in this repo.
---

The `artifacts/api-server: API Server` dev workflow compiles `dist` on (re)start.

**Rule:** After editing any backend `src` file (routes, lib, schema) you MUST restart the
workflow `artifacts/api-server: API Server` before testing, or routes 404 / serve stale code.

**Why:** The dev command builds from source on boot rather than hot-reloading every change,
so curl/e2e against the old process silently tests pre-edit behavior.

**How to apply:** Edit → `restart_workflow("artifacts/api-server: API Server")` → then curl
through `localhost:80/api` (never the service port directly). Cookie jars per role under /tmp.
