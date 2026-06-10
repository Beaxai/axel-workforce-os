---
name: Light-mode theming + WCAG AA contrast in axel-workforce-os
description: Why light mode breaks, the two-source token contract, the duplicated local textMuted smell, and which contrast failures are accepted-by-design
---

# Two theming paths that MUST stay in sync

The web app (`artifacts/axel-workforce-os`) resolves theme colors via TWO parallel
sources, and any token must be defined in BOTH or the JS and CSS styling paths drift:
- `src/index.css` — CSS vars under `:root` (light) and `.dark` (dark). The
  `.dark`/`.light` class is set on `document.documentElement` (in `AppShell.tsx`),
  so any inline style using `var(--token)` re-resolves automatically on toggle.
- `src/lib/use-theme-colors.ts` — the `useThemeColors()` hook, a JS MIRROR of the
  same values for components that compute styles in JS.

**How to apply:** when adding/changing a theme token, edit both files with identical
per-mode values. Form/text surfaces use dedicated tokens (`--input-bg`,
`--input-border`, `--input-text`, `--input-placeholder`, `--input-bg-focus`,
`--input-border-focus`, `--label-text`, `--section-heading`).

# Duplicated local `textMuted` constants are the root contrast smell

Dozens of components do NOT consume the hook; they declare their own
`const textMuted = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.45)"` (and
similar `textSecondary`, StatTile/SectionHeader inline `rgba(0,0,0,0.5)`). This is
local color drift from the shared primitives.

**Why it matters:** light muted text at `rgba(0,0,0,0.45)` is ~3.5:1 on white —
**fails WCAG AA** (needs 4.5:1 for normal text). The same alpha in dark
(`rgba(255,255,255,0.48)` on near-black) is ~5.8:1 and passes, so the bug is
light-mode-only and hidden if you only test dark.
**Fix used:** bump light muted text to `rgba(0,0,0,0.58)` (~5:1); secondary to
`0.68`; `--muted-foreground` light to `215 19% 40%`. Leave dark values untouched.
**How to apply:** prefer refactoring new components to consume `useThemeColors()`
instead of re-declaring locals; if you must keep a local, never use a light muted
alpha below ~0.55 for text.

# Brand/status accent contrast failures are accepted BY DESIGN

axe-core color-contrast will NEVER reach zero on light backgrounds because the
locked design system mandates bright accents as TEXT/links: pink `#E91E8C` (~3.9:1
on white), purple `#7C3AED`, blue `#3b82f6`/`#1E6BE9`, plus status greens/ambers/reds
on chips/charts. These are intentional and must not be changed to chase AA.
**How to apply:** when auditing contrast, separate residual failures into
(a) plain gray/muted body text — fix these, and (b) locked brand/status accents —
document as an accepted exception, do not alter the accent hex.
