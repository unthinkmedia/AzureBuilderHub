# AGENTS.md — Azure Builder Hub Workspace Rules

## Storybook-First Component Rule

**Before creating any UI component**, agents MUST:

1. **Query the Storybook MCP** — Call `mcp_storybook_getComponentList` to check if a matching component already exists in the configured Storybook (`http://localhost:6006`).
2. **Check props compatibility** — If a candidate component is found, call `mcp_storybook_getComponentsProps` with its name to verify it supports the needed props and variants.
3. **Use the Storybook component** if it satisfies the requirement, even partially. Compose multiple Storybook components together before resorting to custom code.

### When a Custom Component Is Necessary

If no Storybook component covers the need, the agent MUST:

1. **Notify the user** before creating it — clearly state:
   - The component name and purpose
   - Why no existing Storybook component was suitable
   - Which Storybook primitives (if any) it will compose internally
2. **Add an entry** to [docs/COMPONENT-INVENTORY.md](docs/COMPONENT-INVENTORY.md) following the existing table format:
   - Assign the next sequential `#`
   - Set **Status** to `🔴 WIP` for new components
   - List all Storybook primitives used in the **Storybook Primitives Used** column
   - Provide the correct **Path** to the component directory
3. **Place the component** under `src/components/<ComponentName>/` with an `index.ts` barrel export.

### Quick Reference

| Step | Action | Tool / File |
|------|--------|-------------|
| 1 | List available Storybook components | `mcp_storybook_getComponentList` |
| 2 | Inspect component props | `mcp_storybook_getComponentsProps` |
| 3 | If custom: notify user | Chat message |
| 4 | If custom: update inventory | `docs/COMPONENT-INVENTORY.md` |
