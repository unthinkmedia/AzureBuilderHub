---
name: component-audit
description: >
  Audit page files for (1) custom UI elements that could be replaced with shared
  AzureStorybook or Fluent UI components, and (2) hardcoded/static style values that
  should use design tokens. Use this skill whenever the user asks to "audit components",
  "find custom components", "check for missing shared components", "what components am I
  not using from storybook", "token audit", "check for hardcoded values", or after
  building/editing a page to verify nothing was re-invented. Also use when the user says
  "component check", "storybook audit", or "what did I build that already exists".
---

# Component Audit

Scan page `.tsx` and `.css` files for:
1. **Custom HTML/CSS patterns** that duplicate functionality already provided by the
   **AzureStorybook** shared component library or **Fluent UI v9**.
2. **Hardcoded/static style values** (colors, fonts, spacing, shadows, radii, etc.)
   that should use **design tokens** instead.

The goal is to surface every piece of hand-rolled UI and every static value so the
developer can decide what to fix — with clear **prioritized next steps**.

## When to run

- After building or significantly editing a page (post-build review step)
- On demand when the user asks to check component coverage or token usage
- As part of a broader UI verification pass

## How it works

### Step 1 — Load the component registry (Storybook MCP first, Fluent second)

The **primary** source for available UI components is the **Storybook MCP server**.
Always query it first. Fluent UI v9 is the **secondary/fallback** source — only
consider raw Fluent components when no Storybook component covers the use case.

#### 1a. Query Storybook MCP (primary)

Call `mcp_storybook_getComponentList` to get the full list of available shared
components. This is the authoritative, live source of truth — it reflects the
actual components that exist right now, not a static snapshot.

For any component that looks like a match for a custom pattern, call
`mcp_storybook_getComponentsProps` with the component name to get its full props,
variants, and usage examples. This tells you exactly what the component can do and
whether it covers the custom code's behavior.

#### 1b. Fluent UI v9 (secondary)

If no Storybook component covers the pattern, check whether a raw
`@fluentui/react-components` component does (e.g., `DataGrid`, `Dialog`, `Switch`,
`Input`, `Badge`, `Link`, `TabList`). Prefer the Storybook wrapper when both exist.

#### 1c. Static references (supplemental)

Optionally cross-reference these for additional context, but they are NOT the
primary source:

```
../AzureStorybook/src/component-registry.json
.github/skills/page-builder/references/component-catalog.md
```

### Step 2 — Read the target page file(s)

If the user specifies a file, audit that file. Otherwise, audit all `.tsx` files under
`src/pages/` and their associated `.css` files.

For each file, extract:
1. **Imports** — which `@azure-storybook/components` and `@fluentui/react-components`
   are already being used
2. **Style definitions** — all CSS custom properties, `makeStyles({...})` keys, and
   raw `.css` rules
3. **JSX markup** — the rendered component tree
4. **All literal values** — hex colors, rgb/rgba, font-size/weight/family literals,
   px/rem spacing, box-shadow strings, border-radius numbers, z-index values,
   transition/animation durations

### Step 3 — Detect custom UI patterns

Look for these categories of re-invention:

#### A. Custom HTML elements that map to shared components

| Custom pattern | Likely replacement |
|---|---|
| `<button>` with icon + label styled as a card | `CardButton` |
| `<nav>` or `<div>` with list of links/items | `SideNavigation` |
| `<div>` with key-value pairs in two columns | `EssentialsPanel` |
| `<div>` acting as a toolbar with icon buttons | `CommandBar` |
| `<div>` styled as breadcrumbs with `>` separators | `AzureBreadcrumb` |
| `<div>` with title + icon + pin/star/more actions | `PageHeader` / `PageTitleBar` |
| `<div>` styled as tabs with click handlers | `PageTabs` (or Fluent `TabList`) |
| `<div>` styled as a tag/chip/pill | `FilterPill` (or Fluent `Badge`) |
| `<div>` styled as a step wizard | `WizardNav` |
| `<div>` styled as a flyout/panel overlay | `ServiceFlyout` (or Fluent `Dialog`) |
| `<div>` with metric/status card layout | `HealthStatusCard` |
| `<div>` with "no data" illustration + message | `NullState` |
| `<div>` with search box + hero banner | `SearchBanner` |
| `<img>` loading from `public/azure-icons/` directly | `AzureServiceIcon` |

#### B. Custom styles that duplicate Fluent UI capabilities

| Custom style pattern | Likely replacement |
|---|---|
| Hardcoded `color`, `background-color` hex values | Fluent `tokens.*` |
| Hardcoded `font-size`, `font-weight` values | Fluent typography tokens |
| Custom `box-shadow` values | Fluent shadow tokens |
| Custom border-radius values | Fluent `tokens.borderRadius*` |
| Manual `display: grid/flex` for data tables | Fluent `DataGrid` |
| Manual `display: flex` toggle/switch | Fluent `Switch` |
| Custom `<input>` styling | Fluent `Input` / `Field` |
| Custom `<a>` link styling | Fluent `Link` |

#### C. Inline styles on shared components

Look for `style={{...}}` props applied to shared components that override their
built-in styling. These often indicate the component isn't being used correctly, or
that a variant/prop exists for the desired behavior.

### Step 4 — Detect static/hardcoded values (Token Audit)

Scan ALL style sources (`.css` files, `makeStyles` blocks, inline `style={{}}` props)
for literal values that should be design tokens. Flag every occurrence.

#### What counts as a static value violation

| Category | Static value examples | Expected token replacement |
|---|---|---|
| **Colors** | `#0078d4`, `#333`, `rgb(0,120,212)`, `rgba(0,0,0,0.1)`, named colors (`red`, `white`) | `var(--colorBrandBackground)`, `tokens.colorNeutralForeground1`, CSS custom properties |
| **Typography** | `font-size: 14px`, `font-weight: 600`, `font-family: "Segoe UI"`, `line-height: 20px` | `tokens.fontSizeBase300`, `tokens.fontWeightSemibold`, `tokens.fontFamilyBase`, `tokens.lineHeightBase300` |
| **Spacing** | `padding: 10px`, `margin: 15px`, `gap: 5px` (values not on 4px grid: 4/8/12/16/20/24/32/40/48) | `tokens.spacingHorizontalM`, `tokens.spacingVerticalL`, or CSS custom properties on 4px scale |
| **Border radius** | `border-radius: 4px`, `border-radius: 8px` | `tokens.borderRadiusMedium`, `tokens.borderRadiusLarge` |
| **Shadows** | `box-shadow: 0 2px 4px rgba(...)` | `tokens.shadow4`, `tokens.shadow8`, `var(--shadow-4)` |
| **Z-index** | `z-index: 999`, `z-index: 100` | `tokens.zIndexOverlay`, `tokens.zIndexFloating`, or named CSS custom properties |
| **Borders** | `border: 1px solid #e0e0e0` | `tokens.strokeWidthThin`, `tokens.colorNeutralStroke1` |
| **Transitions** | `transition: all 0.3s ease` | `tokens.durationNormal`, `tokens.curveEasyEase` |

#### Allowed exceptions (do NOT flag these)

Some static values are acceptable. When they appear, mark them as **Justified** with
a reason. For all other static values, the agent MUST flag them.

| Exception | Justification |
|---|---|
| `width: 100%`, `height: 100%`, `flex: 1` | Layout structure — no token equivalent |
| `display: flex`, `display: grid`, `position: relative/absolute` | Layout mode — not a design token concern |
| `0` values (`margin: 0`, `padding: 0`) | Zero is universal, no token needed |
| `overflow: hidden/auto/scroll` | Behavior, not visual design |
| Spacing values on the 4px grid (4/8/12/16/20/24/32/40/48px) in CSS files | Acceptable IF the project uses CSS custom properties as tokens |
| `max-width` / `min-width` layout constraints | Structural, not themeable |
| `transform`, `opacity` for animations | Behavior values, but durations/curves should use tokens |
| Custom SVG fill colors matching brand tokens | Only if the hex matches a token's resolved value — note which token |
| Media query breakpoints | Structural, project-defined |

#### Justification requirement

For ANY static value that the agent does NOT flag as a violation, the agent MUST
provide a one-line justification explaining why it's acceptable. No silent passes.
This ensures the audit is thorough and reviewable.

### Step 5 — Generate the audit report

Output a structured report in this format:

```
# Component Audit Report — [FileName]

## Summary
- Components from Storybook: N used
- Custom UI patterns found: N
- Potential component replacements: N
- Static value violations found: N
- Justified static values: N

## 🔴 Critical — Static Value Violations

### 1. [Category: e.g., Hardcoded Color]
- **Location:** [file:line]
- **Current value:** `color: #0078d4`
- **Required token:** `var(--colorBrandBackground)` or `tokens.colorBrandBackground`
- **Impact:** Breaks theme switching / dark mode / brand customization

### 2. [Next violation]
...

## 🟡 Component Replacements

### 1. [Description of custom element]
- **Location:** Lines X–Y
- **What it does:** [brief description]
- **Suggested replacement:** `ComponentName` from `@azure-storybook/components`
- **Confidence:** High / Medium / Low
- **Notes:** [why this is or isn't a clear swap]

### 2. [Next pattern]
...

## ✅ Already Using (✓)
- `AzureGlobalHeader` — top nav
- `CardButton` — service shortcuts
- ...

## ✅ Justified Static Values
- `width: 100%` at line N — Layout structure, no token equivalent
- `display: flex` at line N — Layout mode, not a design concern
- ...

## Not Applicable
List any Storybook components that exist but aren't relevant for this page type
(e.g., `WizardNav` isn't needed on a home page).

---

## 📋 Prioritized Next Steps

Changes ordered by impact and effort. Do items top-to-bottom.

### P0 — Critical (fix immediately)
These break theming, accessibility, or dark mode.

1. **Replace hardcoded colors with tokens** — [N occurrences across N files]
   - Files: [list]
   - Why first: hardcoded colors break dark mode and brand theming entirely
2. **Replace hardcoded typography with tokens** — [N occurrences]
   - Files: [list]
   - Why first: font inconsistencies compound across the app

### P1 — High (fix this sprint)
These duplicate existing shared components and add maintenance burden.

3. **Swap [custom element] → `ComponentName`** — [file:lines]
   - Effort: [Low/Medium/High]
   - Risk: [what could break]
4. ...

### P2 — Medium (fix next sprint)
These are style improvements that increase design consistency.

5. **Replace hardcoded spacing with tokens** — [N occurrences]
6. **Replace hardcoded shadows/radii with tokens** — [N occurrences]
7. ...

### P3 — Low (backlog)
These are nice-to-haves or low-confidence suggestions.

8. ...
```

### Priority assignment rules

Use this rubric to assign priorities:

| Priority | Criteria |
|---|---|
| **P0 — Critical** | Hardcoded colors, hardcoded typography. These break theming/dark mode/accessibility. Always highest priority. |
| **P1 — High** | Custom components with High-confidence shared replacements. Reduces code to maintain and ensures consistency. |
| **P2 — Medium** | Hardcoded spacing, shadows, border-radius, z-index. Important for consistency but less likely to cause visible breakage. Medium-confidence component replacements. |
| **P3 — Low** | Low-confidence component suggestions, inline style overrides, transition/animation values, hardcoded values where the token equivalent is unclear or doesn't exist yet. |

### Confidence levels

- **High** — The custom markup is a near-exact replica of what the shared component
  renders. Straightforward swap.
- **Medium** — The custom markup serves the same purpose but has minor differences
  (extra props, different layout). Would require checking the shared component's props
  to confirm feasibility.
- **Low** — The custom markup is in the same "family" but may be intentionally
  different. Flagged for awareness rather than as a hard recommendation.

## Important constraints

- Do NOT modify any files — this skill is read-only / diagnostic
- Do NOT suggest replacements that would lose functionality the custom code has
- Fluent UI v9 components (`@fluentui/react-components`) are also valid — not
  everything needs to come from AzureStorybook
- AzureStorybook wraps Fluent in many cases, so prefer AzureStorybook when both exist
  (e.g., prefer `PageTabs` over raw `TabList` if `PageTabs` covers the use case)
- If a custom component is genuinely novel (no shared equivalent exists), say so
  explicitly and suggest it as a candidate for extraction into AzureStorybook
- Every static value must be either **flagged as a violation** or **justified** — no
  silent passes. If a value isn't flagged, the report must say why.
- The "Prioritized Next Steps" section is **mandatory** — never skip it
- Group related fixes together (e.g., "Replace all 12 hardcoded colors" not 12 separate items)
- Include effort estimates and risk notes for each next step so the developer can plan
