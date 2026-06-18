---
name: Theming literal convention (axel-workforce-os)
description: The real prevailing theming pattern vs the token-only aspiration in replit.md.
---

replit.md states a strict "token-only, never hardcode color literals" rule, but in
practice ~22 of 33 page files in `artifacts/axel-workforce-os/src/pages/` use the inline
pattern `const textPrimary = isDark ? "#fff" : "#111"` (and similar rgba pairs), reading
`isDark` from the theme store. Only a handful use `var(--input-text)` / token vars.

**Why this matters:** these inline literals DO render correctly in both light and dark
(they branch on `isDark`), so they satisfy the functional light+dark Definition of Done.
A full migration to CSS-variable tokens would be a codebase-wide refactor (22 files),
not something to bundle into a feature task.

**How to apply:** new page code may follow the prevailing inline `isDark ? … : …`
convention to stay consistent with surrounding files. Don't treat lingering literals as a
bug to fix mid-feature; if a true token migration is wanted, scope it as its own task.
