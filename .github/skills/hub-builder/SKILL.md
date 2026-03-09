---
name: hub-builder
description: >
  Enforces Azure Builder Hub coding standards when creating or editing pages,
  components, layouts, or styles. Prevents the most common mistakes: hardcoded
  colors/typography, re-inventing Storybook components, inconsistent token usage,
  and missing accessibility patterns. ALWAYS use this skill when:
  building a new Hub page, editing an existing page/component, adding CSS to the Hub,
  creating a new component, refactoring Hub UI, or when the user says "build", "create",
  "add a page", "new component", "edit the styles", or any UI work inside the
  AzureBuilderHub workspace. Also triggers for "fix the CSS", "add a form",
  "add a button", "style this", or general UI implementation tasks in this repo.
  This skill is NOT for auditing (use component-audit for that) — it's the
  preventive guardrails that run DURING implementation.
---

# Hub Builder — Implementation Guardrails

This skill prevents the mistakes identified in Hub component audits. Follow
every rule below when creating or editing `.tsx` or `.css` files under `src/`.

These rules exist because the codebase had 47 static-value violations, 18
missed shared-component opportunities, and zero Storybook composed components
in use across all 4 pages. This skill prevents those from recurring.

---

## Rule 1 — Storybook-First Component Selection

Before writing ANY custom UI element, check Storybook.

### Step 1: Query available components

Call `mcp_storybook_getComponentList` and scan the result for a match. Here is
the current mapping of common UI patterns to their Storybook equivalents:

| If you need… | Use this | Source |
|---|---|---|
| App header / top nav bar | `AzureGlobalHeader` | Storybook Composed |
| Page title + actions row | `PageHeader` | Storybook Composed |
| Tab bar / segmented control | `PageTabs` | Storybook Composed |
| Breadcrumb trail | `AzureBreadcrumb` | Storybook Composed |
| Filter pill / toggle chip | `FilterPill` | Storybook Composed |
| Empty state / null state | `NullState` | Storybook Composed |
| Hero + search bar | `SearchBanner` | Storybook Composed |
| Side navigation | `SideNavigation` | Storybook Composed |
| Toolbar with icon buttons | `CommandBar` | Storybook Composed |
| Key-value detail pairs | `EssentialsPanel` | Storybook Composed |
| Metric / status card | `HealthStatusCard` | Storybook Composed |
| Flyout / side panel | `ServiceFlyout` | Storybook Composed |
| Step wizard | `WizardNav` | Storybook Composed |
| Filter bar with multiple filters | `FilterBar` | Storybook Composed |
| Loading spinner | `Spinner` | Storybook Components |
| Button (any variant) | `Button` | Storybook Components |
| Data table | `DataGrid` | Storybook Components |
| Form input | `Input` | Storybook Components |
| Dropdown / select | `Dropdown` | Storybook Components |
| Checkbox / radio / switch | `Checkbox` / `RadioGroup` / `Switch` | Storybook Selection |
| Text input with label + hint | `Input` inside Fluent `Field` | Fluent UI |
| Textarea with label | `Textarea` inside Fluent `Field` | Fluent UI |
| Tag / badge / chip | `Tag` or `Badge` | Storybook / Fluent |
| Modal dialog | `Dialog` | Storybook Components |
| Tooltip | `Tooltip` | Storybook Components |
| Message bar / banner | `MessageBar` | Storybook Components |
| Progress indicator | `ProgressBar` | Storybook Components |
| Avatar / user icon | `Avatar` | Storybook Components |
| Card surface | `Card` | Storybook Components |
| Combobox / search select | `Combobox` | Storybook Selection |

### Step 2: If a match exists, use it

Call `mcp_storybook_getComponentsProps` with the component name to confirm prop
compatibility. Use the Storybook component even if it only covers 80% of the
need — compose it with other components or extend with className, don't rebuild.

### Step 3: If no match exists

- Notify the user: "No Storybook component covers [X]. Building a custom one."
- Update `docs/COMPONENT-INVENTORY.md` with the new entry.
- Build it using Fluent UI v9 primitives from `@fluentui/react-components`.
- Place it under `src/components/<Name>/` with an `index.ts` barrel.

### Common traps to AVOID

These are the exact patterns that were hand-rolled when Storybook components
existed. Do NOT recreate them:

- **Custom `<button>` styled as a tab** → Use `PageTabs`
- **Custom `<div>` with loading spinner CSS animation** → Use `Spinner`
- **Custom `<div>` with "No data" message** → Use `NullState`
- **Custom `<select>` with manual styling** → Use `Dropdown`
- **Custom `<input>` / `<textarea>` with label + hint + error** → Use Fluent `Field`
- **Custom overlay + dialog div** → Use `Dialog` (it provides focus trap + scroll lock)
- **Custom header bar with logo + nav + user** → Use `AzureGlobalHeader`
- **Custom pill/chip buttons** → Use `FilterPill` or `Badge`

---

## Rule 2 — Design Token Mandate (Zero Hardcoded Values)

Every visual property MUST use a design token. The Hub defines tokens in
`src/styles/global.css` under `:root`. Fluent tokens are also available via
`var(--token-name)` in CSS or `tokens.tokenName` in `makeStyles`.

### Color — NEVER hardcode

| Instead of | Use |
|---|---|
| `#ffffff`, `#fff`, `white` | `var(--colorNeutralForegroundOnBrand)` on brand bg, or `var(--colorNeutralBackground1)` |
| `#0078d4` | `var(--colorBrandBackground)` or `var(--colorBrandForeground1)` |
| `#242424`, `#333` | `var(--colorNeutralForeground1)` |
| `#616161` | `var(--colorNeutralForeground2)` |
| `#9e9e9e`, `#707070` | `var(--colorNeutralForeground3)` |
| `#d1d1d1` | `var(--colorNeutralStroke1)` |
| `#e0e0e0` | `var(--colorNeutralStroke2)` |
| `#f5f5f5` | `var(--colorNeutralBackground3)` |
| `#fafafa` | `var(--colorNeutralBackground2)` |
| `#d13438`, `red` | `var(--colorPaletteRedForeground1)` |
| `#107c10`, `green` | `var(--colorPaletteGreenForeground1)` |
| `#e3a400` | `var(--colorPaletteYellowForeground1)` |
| `rgba(0,0,0,0.*)` for shadows | `var(--shadow4)`, `var(--shadow8)`, etc. |

The ONLY acceptable literal color is `transparent` and `currentColor`.

If you catch yourself typing a `#` or `rgb(`, stop and find the token.

### Typography — NEVER hardcode

| Instead of | Use |
|---|---|
| `font-size: 10px` | `var(--fontSizeBase100)` |
| `font-size: 12px` | `var(--fontSizeBase200)` |
| `font-size: 14px` | `var(--fontSizeBase300)` |
| `font-size: 16px` | `var(--fontSizeBase400)` |
| `font-size: 20px` | `var(--fontSizeBase500)` |
| `font-size: 24px` | `var(--fontSizeBase600)` |
| `font-size: 28px` | `var(--fontSizeBase700)` |
| `font-weight: 400` | `var(--fontWeightRegular)` |
| `font-weight: 500` | `var(--fontWeightMedium)` |
| `font-weight: 600` | `var(--fontWeightSemibold)` |
| `font-weight: 700` | `var(--fontWeightBold)` |
| `font-family: "Segoe UI"…` | `var(--fontFamilyBase)` |
| `line-height: 16px` | `var(--lineHeightBase200)` |
| `line-height: 20px` | `var(--lineHeightBase300)` |

**The Fluent type scale is: 10, 12, 14, 16, 20, 24, 28, 32, 40, 68px.**
If your design calls for `15px` or `13px`, round to the nearest scale value.

### Spacing — Use the 4px grid

All padding, margin, and gap values should land on: **4, 8, 12, 16, 20, 24, 32, 40, 48px**.

In CSS, use the Fluent spacing tokens:

| Token | Value |
|---|---|
| `var(--spacingHorizontalXXS)` / `var(--spacingVerticalXXS)` | 2px |
| `var(--spacingHorizontalXS)` / `var(--spacingVerticalXS)` | 4px |
| `var(--spacingHorizontalS)` / `var(--spacingVerticalS)` | 8px |
| `var(--spacingHorizontalM)` / `var(--spacingVerticalM)` | 12px |
| `var(--spacingHorizontalL)` / `var(--spacingVerticalL)` | 16px |
| `var(--spacingHorizontalXL)` / `var(--spacingVerticalXL)` | 20px |
| `var(--spacingHorizontalXXL)` / `var(--spacingVerticalXXL)` | 24px |

If you're about to type a pixel value for spacing, use a token instead.

**Exception:** `0` values, `100%`, `max-width` constraints, and grid template definitions are fine as literals.

### Border Radius

| Instead of | Use |
|---|---|
| `2px` | `var(--borderRadiusSmall)` |
| `4px` | `var(--borderRadiusMedium)` |
| `8px` | `var(--borderRadiusLarge)` |
| `12px` | `var(--borderRadiusXLarge)` |
| `50%`, `9999px` | `var(--borderRadiusCircular)` |

**`6px` is NOT on the Fluent scale.** Choose 4px or 8px.

### Shadows

| Instead of | Use |
|---|---|
| `box-shadow: 0 1px 2px rgba(…)` | `var(--shadow2)` |
| `box-shadow: 0 2px 4px rgba(…)` | `var(--shadow4)` |
| `box-shadow: 0 4px 8px rgba(…)` | `var(--shadow8)` |
| `box-shadow: 0 8px 16px rgba(…)` | `var(--shadow16)` |
| `box-shadow: 0 14px 28px rgba(…)` | `var(--shadow28)` |

### Transitions

Use `var(--durationFaster)` (100ms), `var(--durationFast)` (150ms), or
`var(--durationNormal)` (200ms) with `var(--curveEasyEase)` instead of raw
`0.15s ease`.

---

## Rule 3 — Consistency Checks

### Tags/badges must be consistent

The Hub uses Fluent `Badge` in `ProjectCard`. Every other place that renders
a tag/chip/pill MUST also use `Badge` (or `Tag` from Storybook). Do NOT mix
custom `<span className="*__tag">` with Fluent `Badge` in different pages.

### Buttons must be Fluent

Every clickable `<button>` that acts as a standard button (not a tab, not a
chip) should be a Fluent `Button` component with the appropriate `appearance`:
- Primary actions: `appearance="primary"`
- Secondary actions: `appearance="secondary"` or `appearance="outline"`
- Dangerous actions: `appearance="outline"` + custom danger styling
- Subtle actions: `appearance="subtle"`
- Icon-only: `appearance="subtle"` + `icon={<Icon />}` + `aria-label`

### Dialogs must use Fluent Dialog

Do NOT build custom overlays with `position: fixed; inset: 0`. Use Fluent
`Dialog` which provides:
- Focus trap (custom ones miss this)
- Scroll lock
- Escape to close
- Animation
- Proper aria-modal semantics

### Loading states must use Spinner

Do NOT create custom CSS spinner animations with `border-top-color` +
`@keyframes`. Use the Storybook/Fluent `Spinner` component.

### Form fields must use Fluent Field

Do NOT manually compose `<label>` + `<input>` + `<span class="hint">` +
`<div class="error">`. Use Fluent `Field` which handles:
- Label + required indicator
- Hint text
- Validation message with correct aria binding
- Consistent spacing

---

## Rule 4 — Hub File Structure

### Pages go in `src/pages/`

One TSX + one CSS file per page. The CSS file uses the `abh-<page>__` BEM
prefix (e.g., `abh-community__hero`).

### Components go in `src/components/<Name>/`

Each component directory has:
- `<Name>.tsx` — the component
- `<Name>.css` — styles
- `index.ts` — barrel export

New components MUST be added to:
1. `src/components/index.ts` (barrel export)
2. `docs/COMPONENT-INVENTORY.md` (tracking table)

### CSS conventions

- BEM naming: `abh-<block>__<element>--<modifier>`
- ALL visual values via tokens (Rule 2)
- Fallback values allowed in `var()` but they must match the token's resolved value
  (e.g., `var(--colorBrandBackground, #0078d4)` is OK because `#0078d4` IS the
  default brand value — but `var(--colorBrandBackground, blue)` is NOT)
- No `!important` except on Fluent Card padding override (known exception)

---

## Rule 5 — Pre-Commit Self-Check

Before considering any page or component implementation complete, verify:

1. **Zero hardcoded colors** — Search the CSS for `#`, `rgb(`, `rgba(`, named
   colors. The only allowed literals are `transparent`, `currentColor`, `none`,
   and `inherit`.

2. **Zero hardcoded typography** — Search for raw `font-size:`, `font-weight:`,
   `font-family:`, `line-height:` with pixel/number values instead of
   `var(--font*)` tokens.

3. **Storybook-first** — For each HTML element rendered in JSX, ask:
   "Does a Storybook or Fluent component exist for this?" If yes, use it.
   Pay special attention to: `<button>`, `<input>`, `<select>`, `<textarea>`,
   `<dialog>`, `<nav>`, `<header>`.

4. **Consistency** — Check if the same pattern appears elsewhere in the Hub.
   If ProjectCard uses `Badge` for tags, your new page must too.

5. **Accessibility** — Every interactive element needs:
   - `aria-label` if no visible text
   - `role` if semantic HTML isn't used
   - `aria-expanded` for toggleable panels
   - `aria-pressed` for toggle buttons
   - `aria-selected` for tabs
   - Focus-visible styles

6. **Component registration** — If you created a new component under
   `src/components/`, it must appear in both `index.ts` and
   `COMPONENT-INVENTORY.md`.

---

## Quick Reference — Token Cheat Sheet

```
/* Colors */
--colorNeutralBackground1      /* white surface */
--colorNeutralBackground2      /* subtle surface */
--colorNeutralBackground3      /* hover/secondary surface */
--colorNeutralForeground1      /* primary text */
--colorNeutralForeground2      /* secondary text */
--colorNeutralForeground3      /* tertiary/muted text */
--colorNeutralForegroundOnBrand /* text on brand-colored bg */
--colorNeutralStroke1           /* border */
--colorNeutralStroke2           /* subtle border */
--colorBrandBackground          /* primary brand bg */
--colorBrandBackground2         /* light brand bg */
--colorBrandForeground1         /* brand-colored text / links */
--colorBrandStroke1             /* brand-colored border */
--colorPaletteRedForeground1    /* error / danger text */
--colorPaletteGreenForeground1  /* success text */
--colorPaletteYellowForeground1 /* warning / star */

/* Typography */
--fontSizeBase100 (10px)  --fontSizeBase200 (12px)
--fontSizeBase300 (14px)  --fontSizeBase400 (16px)
--fontSizeBase500 (20px)  --fontSizeBase600 (24px)
--fontWeightRegular (400) --fontWeightMedium (500)
--fontWeightSemibold (600) --fontWeightBold (700)
--fontFamilyBase  --fontFamilyMonospace

/* Spacing */
--spacingHorizontalXS (4px) --spacingHorizontalS (8px)
--spacingHorizontalM (12px) --spacingHorizontalL (16px)
--spacingHorizontalXL (20px) --spacingHorizontalXXL (24px)

/* Borders + Shadows */
--borderRadiusMedium (4px)  --borderRadiusLarge (8px)
--borderRadiusXLarge (12px) --borderRadiusCircular (50%)
--shadow2  --shadow4  --shadow8  --shadow16  --shadow28
```
