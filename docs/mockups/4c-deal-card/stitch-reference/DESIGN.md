---
name: Workforce OS
colors:
  surface: '#fbf9f8'
  surface-dim: '#dcd9d9'
  surface-bright: '#fbf9f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3f2'
  surface-container: '#f0eded'
  surface-container-high: '#eae8e7'
  surface-container-highest: '#e4e2e1'
  on-surface: '#1b1c1c'
  on-surface-variant: '#404753'
  inverse-surface: '#303030'
  inverse-on-surface: '#f3f0f0'
  outline: '#717785'
  outline-variant: '#c0c6d6'
  surface-tint: '#005eb3'
  primary: '#005cae'
  on-primary: '#ffffff'
  primary-container: '#0074da'
  on-primary-container: '#fefcff'
  inverse-primary: '#a7c8ff'
  secondary: '#4442e3'
  on-secondary: '#ffffff'
  secondary-container: '#5f5ffd'
  on-secondary-container: '#fffbff'
  tertiary: '#006a3b'
  on-tertiary: '#ffffff'
  tertiary-container: '#00864d'
  on-tertiary-container: '#f6fff4'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d5e3ff'
  primary-fixed-dim: '#a7c8ff'
  on-primary-fixed: '#001b3c'
  on-primary-fixed-variant: '#004689'
  secondary-fixed: '#e1dfff'
  secondary-fixed-dim: '#c1c1ff'
  on-secondary-fixed: '#09006b'
  on-secondary-fixed-variant: '#2c24ce'
  tertiary-fixed: '#60fea5'
  tertiary-fixed-dim: '#3be18b'
  on-tertiary-fixed: '#00210f'
  on-tertiary-fixed-variant: '#00522d'
  background: '#fbf9f8'
  on-background: '#1b1c1c'
  surface-variant: '#e4e2e1'
  workforce-blue-deep: '#0C1D36'
  action-green: '#00C875'
  warning-amber: '#FFCB00'
  error-red: '#E2445C'
  surface-gray: '#F5F6F8'
  border-subtle: '#D0D4E4'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  code-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  gutter-desktop: 24px
  margin-desktop: 32px
  gutter-mobile: 16px
  sidebar-width: 260px
---

## Brand & Style

The design system is engineered for the high-stakes environment of insurance underwriting, where precision, speed, and clarity are paramount. The brand personality is **efficient, transparent, and collaborative**, moving away from the "black box" legacy of insurance and toward a modern, data-driven operating system.

The aesthetic follows a **Corporate / Modern** direction with a focus on **Information Utility**. It leverages high-density layouts balanced by generous structural whitespace and crisp, low-contrast borders. The visual language takes cues from top-tier developer tools—prioritizing function over flourish—to ensure that underwriters can navigate complex risk assessments without cognitive fatigue.

## Colors

The palette is anchored by **Workforce Blue (#1F89F9)**, a color that communicates technological proficiency and institutional trust. 

- **Primary & Secondary:** Used for core navigation and primary actions. The transition from the deep blue to the lighter Monday-inspired blue (#6161FF) helps differentiate between systemic controls and interactive elements.
- **Semantic Colors:** **Action Green** is reserved strictly for successful submissions and approvals. **Warning Amber** identifies pending actions or high-risk flags in an underwriting file.
- **Grays:** A tiered system of grays (`#F5F6F8` for backgrounds and `#333333` for primary text) ensures a sophisticated information hierarchy, keeping data-heavy views legible.

## Typography

This design system utilizes **Inter** exclusively to maintain a utilitarian, Swiss-inspired aesthetic that excels in data density. 

- **Hierarchy:** High-contrast weights (Semi-Bold for headers vs. Regular for data) are used to guide the eye through complex forms.
- **Labels:** Small-caps or tight uppercase labels are used for metadata and table headers to save vertical space while remaining distinct from user-generated content.
- **Readability:** For long-form underwriting notes, `body-md` is the standard, utilizing a 1.4x line height to ensure scan-ability.

## Layout & Spacing

The system uses a **Fixed Grid** approach for internal dashboards to ensure that complex tables and data visualizations remain predictable across large monitors (1440px+).

- **Desktop Layout:** A persistent 260px left-hand sidebar contains global navigation. The main content area uses a 12-column grid with 24px gutters.
- **Data Density:** In underwriting views, vertical spacing is tightened to a 4px base unit to allow more information "above the fold."
- **Responsive Behavior:** On tablet, the sidebar collapses into a rail. On mobile, the 12-column grid collapses into a single column with 16px margins, though the primary use case remains desktop-first.

## Elevation & Depth

To maintain a clean and professional appearance, depth is conveyed through **Tonal Layers** and **Low-Contrast Outlines** rather than heavy shadows.

- **Surface Tiers:** The main background is `surface-gray` (#F5F6F8). Interactive cards and containers use #FFFFFF to "lift" off the page.
- **Outlines:** Elements are separated by 1px borders in `border-subtle` (#D0D4E4).
- **Subtle Shadows:** Only "floating" elements like dropdowns, modals, or hovered Submission Cards receive an ambient shadow (0px 4px 12px rgba(0, 0, 0, 0.05)) to indicate interactivity without cluttering the UI.

## Shapes

The shape language is **Soft (0.25rem)**. This subtle rounding maintains the professional "geometric" feel of a financial tool while providing a modern, approachable touch. 

- **Buttons & Inputs:** Use the standard 4px radius.
- **Status Badges:** Utilize a fully pill-shaped (100px) radius to distinguish them from clickable buttons or input fields.
- **Large Containers:** Submission cards and document previews may use an 8px (rounded-lg) radius to clearly define their boundaries within a dense grid.

## Components

### Submission Cards
These are the primary unit of work. They feature a white background, a 1px subtle border, and a 4px accent stripe on the left edge corresponding to the `primary_color` or status color.

### Status Badges
Used for underwriting states (e.g., "In Review", "Approved"). They use a 10% opacity background of the semantic color with a 100% opacity text label for maximum legibility without being visually overwhelming.

### Activity Timelines
A vertical 2px line in `border-subtle` connects circular nodes. Completed steps use `action-green`, while active steps use `primary_color`.

### Actionable Tabs
Underlined tabs with a 2px stroke indicate the active view. Hover states should trigger a subtle gray background shift (`surface-gray`).

### Document Previews
A 4:3 aspect ratio container with a light gray fill and a centered icon representing the file type (PDF, CSV). Includes a "Quick View" hover action that triggers a glassmorphic overlay.

### Input Fields
Standardized with a 1px border. Focus states must use a 2px `primary_color` glow (0px 0px 0px 2px rgba(31, 137, 249, 0.2)) to provide clear affordance for keyboard navigation.