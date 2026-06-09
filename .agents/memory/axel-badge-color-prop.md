---
name: AxelBadge color prop must be a named color
description: Why Badge/AxelBadge color props break with CSS vars, and the accent token model for the Axel web app
---

# AxelBadge / Badge color prop = NAMED color only (never a CSS var)

In `artifacts/axel-workforce-os`, `Badge` is an alias for `AxelBadge` (see `components/ui/axel-index.ts`). AxelBadge resolves its `color` prop through an internal `COLOR_MAP` and then does **hex + alpha-hex string math** (`${resolved}${alphaHex}`) to build the translucent background.

**Rule:** the `color` prop must be a named key in `COLOR_MAP` (e.g. `"purple"`, `"blue"`, `"green"`) or a bare hex. It must **never** be a CSS variable like `var(--accent-primary)` — appending an alpha-hex to `var(...)` yields invalid CSS and the badge background silently breaks.

**Why:** a global find/replace of accent hex → CSS vars will corrupt Badge call sites. During the brand restyle, badge call sites were converted to named colors (`"purple"`/`"blue"`) and AxelBadge.tsx was excluded from the hex→var sweep.

**How to apply:** when sweeping colors, fix `<Badge color=...>` / `<AxelBadge color=...>` call sites to named colors FIRST, and exclude `AxelBadge.tsx` from any hex→`var()` codemod.

# Accent token model (two-tier)

Token source of truth: `src/index.css` (CSS vars) mirrored in `src/lib/use-theme-colors.ts` (JS path). Purple `#7C3AED` = primary interactive; pink `#E91E8C` = brand moments only (single `--gradient-cta` CTA per screen, active nav bar, avatar). Allowed raw hex literals anywhere: `#7C3AED` and categorical `#1E6BE9`; brand-pink literals confined to the two token files.
