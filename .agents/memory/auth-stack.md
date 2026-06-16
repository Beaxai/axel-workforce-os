---
name: Auth stack choice
description: Why Axel Workforce OS uses a hand-rolled session auth layer instead of better-auth, and the cross-origin/cookie constraints of the Replit preview.
---

# Auth stack: hand-rolled sessions, not better-auth

The api-server authenticates with a **hand-rolled** session layer: `bcryptjs`
(pure-JS, cost 12) for passwords + `node:crypto` opaque 32-byte tokens whose
SHA-256 hash is the only thing persisted (Postgres `sessions` table). Cookie
`axel_session` is httpOnly. Roles live in `org_members`, not on the user row;
there is a single `users` table (uuid PK).

**Why not better-auth (the originally-planned library):**
- The `users` table is uuid-PK and lacks better-auth's required columns
  (name / emailVerified / updatedAt).
- An `accounts` table already exists → name clash with better-auth's schema.
- `drizzle-kit push` is a documented landmine in this repo — apply auth DDL via
  direct SQL against `$DATABASE_URL`, keeping the drizzle schema files as the
  source of truth.
- The bundled build externalizes native hashers, so a pure-JS hasher (bcryptjs)
  is required.

**How to apply:** if asked to "add better-auth" or swap the auth library, surface
these constraints first — a drop-in swap is not viable without migrating the
users/accounts tables. Extend the existing layer instead.

# Replit preview cookie + CORS constraints

- Session cookie must be `Secure; SameSite=None` because the dev preview runs the
  app inside a cross-site iframe; `Lax` would drop the cookie there.
- Because the cookie is `SameSite=None`, CORS must use an **explicit origin
  allowlist** (`REPLIT_DOMAINS` + `REPLIT_DEV_DOMAIN`), never `origin: true`
  reflection — reflection + credentials is a session-theft hole.

**Why:** the SameSite=None + credentialed-CORS combination is what makes origin
reflection dangerous here specifically; both settings are load-bearing for the
preview to work, so neither can simply be "tightened" away.
