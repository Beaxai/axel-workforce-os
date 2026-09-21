---
name: Website appointment integration boundary
description: The external producer website is already built; integrate it rather than recreating the form.
---

Treat the external website as an existing system. Provide the receiving API and a backend-to-backend handoff, not a replacement website or form.

**Why:** The user explicitly clarified that the website is already built and needs instructions and a way to connect. Its exact payload contract was unavailable, so transport readiness must not be represented as acceptance of real applications.

**How to apply:** Keep connectivity testing synthetic and separate from real registration acceptance. When the website contract arrives, adapt its existing field keys instead of requiring a new form. Keep the shared webhook secret on the two backends, never in browser code.