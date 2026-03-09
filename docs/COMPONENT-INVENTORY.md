# Azure Builder Hub — Custom Component Inventory

> **Purpose:** Track all Hub-specific components for potential upstream contribution to Azure Storybook.
> Each component is tagged with its readiness level and the Storybook primitives it composes.

## Readiness Legend

| Level | Meaning |
|-------|---------|
| 🟢 Ready | API stable, tested, documentation complete — ready to propose to Storybook |
| 🟡 Draft | Functional but API may change, needs review |
| 🔴 WIP | Under construction, not ready for contribution |

---

## Component Inventory

| # | Component | Type | Storybook Primitives Used | Category | Status | Path |
|---|-----------|------|--------------------------|----------|--------|------|
| 1 | **ProjectCard** | Composed | `Card`, `Badge`, `Tag`, `Avatar` | Gallery | 🟡 Draft | `src/components/ProjectCard/` |
| 2 | **StatCounter** | Primitive | — (standalone) | Data Display | 🟡 Draft | `src/components/StatCounter/` |
| 3 | **StarToggleButton** | Composed | `Button` | Interaction | 🟡 Draft | `src/components/StarToggleButton/` |
| 4 | **LivePreviewFrame** | Composed | `Spinner`, `MessageBar` | Content | 🟡 Draft | `src/components/LivePreviewFrame/` |
| 5 | **SchemaInspector** | Composed | `PageTabs` | Content | 🟡 Draft | `src/components/SchemaInspector/` |
| 6 | **TagInput** | Composed | `Input`, `Tag`, `Combobox` | Form | 🟡 Draft | `src/components/TagInput/` |
| 7 | **VersionTimeline** | Composed | `Button`, `Badge` | Data Display | 🟡 Draft | `src/components/VersionTimeline/` |
| 8 | **ForkAttributionBanner** | Composed | `Avatar`, `MessageBar` | Content | 🟡 Draft | `src/components/ForkAttributionBanner/` |
| 9 | **VersionDiffViewer** | Composed | `PageTabs`, `Spinner` | Content | 🟡 Draft | `src/components/VersionDiffViewer/` |
| 10 | **ProjectStatusToggle** | Composed | `Button`, `Dialog`, `Badge` | Interaction | 🟡 Draft | `src/components/ProjectStatusToggle/` |

---

## Storybook Contribution Checklist (per component)

Before proposing any component to the Azure Storybook team:

- [ ] Props API is generic (no Hub-specific business logic baked in)
- [ ] CSS uses design tokens only (no hardcoded values)
- [ ] Meets WCAG 2.1 AA accessibility
- [ ] Has Storybook stories with all variants
- [ ] Has unit tests
- [ ] TypeScript types are exported
- [ ] Documentation with usage examples
- [ ] Light + dark theme support verified

---

## Contribution Priority

**High priority** (broadly reusable beyond the Hub):
1. `StatCounter` — generic icon + number display
2. `TagInput` — form control for multi-tag editing
3. `VersionTimeline` — vertical timeline for any version/history list
4. `LivePreviewFrame` — iframe wrapper with loading/error states

**Medium priority** (useful with minor generalization):
5. `StarToggleButton` → generalize to `ToggleCountButton`
6. `ForkAttributionBanner` → generalize to `AttributionBanner`
7. `ProjectStatusToggle` → generalize to `StatusToggle`

**Low priority** (Hub-specific composition):
8. `ProjectCard` — very domain-specific layout
9. `SchemaInspector` — JSON/code viewing is specialized
10. `VersionDiffViewer` — diff viewing is specialized
