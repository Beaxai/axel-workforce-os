---
name: AxelBadge color prop + Axel accent token model
description: Why Badge/AxelBadge color props break with CSS vars, and the two-tier pink-primary / purple-support accent model for the Axel web app
---

# AxelBadge / Badge color prop = NAMED color only (never a CSS var)

In `artifacts/axel-workforce-os`, `Badge` is an alias for `AxelBadge`. AxelBadge resolves its `color` prop through an internal `COLOR_MAP` and then does **hex + alpha-hex string math** (`${resolved}${alphaHex}`) to build the translucent background.

**Rule:** the `color` prop must be a named key in `COLOR_MAP` (`"pink"`, `"purple"`, `"blue"`, `"green"`, …) or a bare hex. It must **never** be a CSS variable like `var(--accent-primary)` — appending an alpha-hex to `var(...)` yields invalid CSS and the badge background silently breaks.

**Why:** a global find/replace of accent hex → CSS vars corrupts Badge call sites.
**How to apply:** when sweeping colors, fix `<Badge color=...>` / `<AxelBadge color=...>` call sites to named colors FIRST, and exclude `AxelBadge.tsx` from any hex→`var()` codemod (it is the one sanctioned home for accent hex literals).

# Accent token model (two-tier): PINK primary, PURPLE support

Source of truth: `src/index.css` CSS vars, mirrored in `src/lib/use-theme-colors.ts` (JS path).

- **Pink `#E91E8C` = primary interactive accent** → `--accent-primary` (+ `-hover` `#d1187e`, `-focus` `#ff4ba6`, `-soft`). Buttons, links, focus rings, active/selected states, active nav bar, tab underlines, View All / ghost actions, loading.
- **Purple `#7C3AED` = supporting accent** → `--accent-support` (+ `-hover` `#6D28D9`, `-soft`). Icon chips (soft bg + icon), AxelBadge `purple` variant, secondary chart series, category/role distinctions (e.g. non-ASO deal border, ADMIN role label).
- **`--gradient-cta` (purple→pink) is the ONLY permitted gradient**, for the single primary CTA per screen.
- shadcn HSL tokens `--primary`/`--ring`/`--sidebar-primary`/`--sidebar-ring`/`--chart-1` point to pink (`328 84% 52%`); `--chart-2` is purple (`262 83% 58%`); `--chart-3..5` are violet/magenta shades.

**Why:** the hierarchy was deliberately INVERTED from an earlier purple-primary/pink-brand-only model — older notes describing "purple primary, pink brand moments only" are obsolete.

**How to apply (sweep invariant):** after any accent change, `#7C3AED` / `#E91E8C` / `rgba(124,58,237,…)` must appear ONLY in `index.css`, `use-theme-colors.ts`, and `AxelBadge.tsx`. `rgba(233,30,140,…)` (pink-soft) may appear inline. `#6D28D9` (purple) and `#1E6BE9` (WC blue) are allowed as categorical literals.

# Recharts + CSS-var chart colors

Recharts `<Cell fill="hsl(var(--chart-N))">` renders correctly in the app's Chromium preview — CSS custom properties resolve inside SVG presentation attributes. Prefer driving chart palettes from the `--chart-*` tokens (wrapped in `hsl(...)`) rather than hardcoded accent hex, so charts follow the accent model automatically.
