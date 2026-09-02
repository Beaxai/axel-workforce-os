---
name: Secure App Storage image transforms
description: Replit-sidecar constraint and safe upload pattern when user images must be transformed before persistent storage.
---

Replit App Storage sidecar credentials can read and write objects but do not expose the `client_email` needed by the Google client library to generate V4 signed POST policies locally.

**Why:** A signed POST attempt fails at runtime with a signing error even though ordinary bucket access works. A signed PUT from the sidecar cannot enforce a pre-storage content-length policy, which is insufficient when raw user images must be bounded and re-encoded server-side.

**How to apply:** For small images that require server-side validation/transformation, accept authenticated multipart input through memory storage with strict file size, file count, field count, part count, rate, concurrency, and abort-release limits. Validate magic bytes, decode, resize, and re-encode before writing only normalized bytes to App Storage. Never fall back to deployment-local disk.