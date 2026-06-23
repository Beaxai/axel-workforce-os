---
name: Deal Card modal access
description: The deal card hub is a modal with no route — how to reach it for verification.
---

The Phase 4C Deal Card collaboration hub is a modal (React portal), opened via an
`openDealCard(dealId)` window event from `GlobalDealCardHost`. There is no direct URL route.

**How to apply:**
- To verify it visually you must: log in, go to `/pipeline` (or AccountDetail / Global Search), and click a deal card. A static `screenshot` of a path cannot reach it — use the testing skill (Playwright) instead.
- Use a seeded dev account at the `/login` page (the DB seed defines ADMIN and UNDERWRITER users); do not record their credentials here. ADMIN/UNDERWRITER see Approve/Decline (server `canApprove`).
- Always verify in BOTH dark and light themes (toggle in AppShell header flips `.dark`/`.light` on `documentElement`).

**Why:** Repeated need to verify deal-card UI changes; the no-route modal trips up static screenshot attempts.
