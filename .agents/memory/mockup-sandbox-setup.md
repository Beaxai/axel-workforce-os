---
name: Mockup sandbox availability
description: Don't assume the mockup sandbox is pre-installed; how to detect and recover when /__mockup falls through to the main app.
---
The mockup-sandbox skill claims the sandbox artifact is pre-installed, but it may not be. When absent, `/__mockup/*` requests fall through to the main web app's SPA and render its 404 page, and restarting the (nonexistent) preview workflow still reports success — both signals are misleading.

**Why:** Path-based routing only reaches the preview server if the artifact (previewPath `/__mockup/`) is registered and its dev server is bound.

**How to apply:** If a `/__mockup/preview/...` iframe or screenshot shows the main app's 404, verify the sandbox scaffold exists (e.g. its `package.json`) before debugging components. If missing, create it with the artifacts flow using artifact type `mockup-sandbox` — the target directory must be empty first — then reinstall deps and restart its workflow.
