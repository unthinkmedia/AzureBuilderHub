---
name: iconcloud-browser
description: Browse, search, and download icons from IconCloud.design — the Microsoft icon repository containing Azure Icons, Fluent System Library, Visual Studio Icons, and more. Use this skill whenever the user wants to find an icon, search for icons, download an SVG icon, browse icon collections, get an Azure service icon, get a Fluent icon, or look up any Microsoft icon. Also use when someone says "find me an icon for X", "get the Azure icon for Y", "download the Fluent icon", "search for icons", "browse IconCloud", or any mention of iconcloud.design. This skill handles authentication, searching, browsing, and SVG extraction.
---

# IconCloud Icon Browser

Browse and download icons from [IconCloud.design](https://iconcloud.design), Microsoft's internal icon repository.

## Available Libraries

| Library | Type | Key Collections | Notes |
|---------|------|-----------------|-------|
| **Azure Icons** | SVG | AI + Machine Learning, Analytics, Compute, Containers, Databases, DevOps, Networking, Security, Storage, Web, etc. | Official Azure service icons (1442+ icons) |
| **Fluent System Library** | SVG | Fluent Filled, Fluent Regular | 8500+ Fluent UI icons in multiple sizes (12–48px) |
| **Visual Studio** | SVG | — | VS IDE icons |
| **Bing Icons** | SVG | — | Bing product icons |
| **Full MDL2 Assets** | Glyph | Fabric, Segoe, CRM, Azure DevOps, etc. | Font-based icons with unicode points |
| **Windows Fluent Icons** | Glyph | — | Windows system icons |

## Core Workflow

### Step 1: Establish Browser Session

The IconCloud API requires Microsoft authentication. Open the site in the Playwright MCP browser to establish a session:

```
Navigate to: https://iconcloud.design/browse/Azure%20Icons
Wait for text: "Azure Icons"
```

If the page redirects to Microsoft login:
1. Ask the user to authenticate in the browser
2. Wait for redirect back to `iconcloud.design`
3. Take a snapshot to confirm the page loaded

Once authenticated, the browser session persists and API calls work.

### Step 2: Search or Browse

**Option A — Search by keyword (PREFERRED for finding icons):**

Use `mcp_microsoft_pla_browser_evaluate` with the `function` parameter to call the search API:

```javascript
// Search across ALL libraries — pass as `function` param
async () => {
  const r = await fetch('/api/iconlibraryfont/searchAllIcons?terms=QUERY&exactSearch=true&searchType=5');
  const data = await r.json();
  return JSON.stringify(data.map(lib => ({
    library: lib.libraryName,
    count: lib.icons.length,
    icons: lib.icons.slice(0, 10).map(i => ({
      name: i.friendlyName,
      collection: i.fonts?.[0],
      size: i.size,
      hasSvg: !!i.svgXml,
      sizes: i.iconGroup?.keyedIconSizes?.map(s => s.size),
      internalKey: i.internalKey
    }))
  })), null, 2);
}
```

Replace `QUERY` with the user's search term. The `searchType=5` does weighted/fuzzy search (best results), `searchType=2` does name-based search.

**Option B — Browse a specific collection via UI:**

Navigate to the collection URL:
- Azure Icons: `https://iconcloud.design/browse/Azure%20Icons`
- Azure subcollection: `https://iconcloud.design/browse/Azure%20Icons/{Collection}` (e.g., `Compute`, `Networking`)
- Fluent Regular: `https://iconcloud.design/browse/Fluent%20System%20Library/Fluent%20Regular`
- Fluent Filled: `https://iconcloud.design/browse/Fluent%20System%20Library/Fluent%20Filled`

Take a snapshot to see available icons.

### Step 3: Get SVG Content

Once you've found the icon, extract its SVG using the API:

```javascript
// Get SVG for a specific icon from search results
async () => {
  const r = await fetch('/api/iconlibraryfont/searchAllIcons?terms=ICON_NAME&exactSearch=true&searchType=5');
  const data = await r.json();
  // Find the icon in the target library
  const lib = data.find(d => d.libraryName === 'LIBRARY_NAME');
  if (!lib) return JSON.stringify({ error: 'Library not found', available: data.map(d => d.libraryName) });
  const icon = lib.icons.find(i => i.friendlyName === 'EXACT_ICON_NAME');
  if (!icon) return JSON.stringify({ error: 'Icon not found', available: lib.icons.map(i => i.friendlyName) });
  return JSON.stringify({
    name: icon.friendlyName,
    library: icon.libraryName,
    collection: icon.fonts?.[0],
    size: icon.size,
    availableSizes: icon.iconGroup?.keyedIconSizes?.map(s => s.size),
    svgXml: icon.svgXml
  }, null, 2);
}
```

### Step 4: Save SVG to File

Save the extracted `svgXml` content to a `.svg` file:

```bash
# Save to a file — content comes from the API response
cat > path/to/icon.svg << 'SVGEOF'
<svg ...>...</svg>
SVGEOF
```

Or create the file using the file creation tool with the SVG content.

## Getting a Specific Size

For Fluent icons with multiple sizes (12, 16, 20, 24, 28, 48px), search for the icon then fetch the specific size:

```javascript
async () => {
  const r = await fetch('/api/iconlibraryfont/searchAllIcons?terms=ICON_NAME&exactSearch=true&searchType=5');
  const data = await r.json();
  const lib = data.find(d => d.libraryName === 'Fluent System Library');
  const icon = lib.icons.find(i => i.friendlyName === 'ICON_NAME' && i.size === DESIRED_SIZE);
  return icon ? JSON.stringify({ name: icon.friendlyName, size: icon.size, svgXml: icon.svgXml }) : 'Size not found';
}
```

## API Reference

See `references/api-reference.md` for full API documentation including:
- All endpoints and parameters
- Icon data schemas (SVG vs Glyph)
- URL patterns for browser navigation
- Available libraries and collections

## Common Tasks

### "Get the Azure icon for [service name]"
1. Navigate to IconCloud
2. Search for the service name with library filter `Azure Icons`
3. Extract `svgXml` from the matching result
4. Save to file

### "Find a Fluent icon for [concept]"
1. Navigate to IconCloud
2. Search with the concept keyword
3. Filter results to `Fluent System Library`
4. Present matching icon names to user
5. Extract SVG for chosen icon

### "Browse Azure [category] icons"
1. Navigate to `https://iconcloud.design/browse/Azure%20Icons/{Category}`
2. Take snapshot to show available icons
3. Let user pick from the list

### "Download icon as SVG file"
1. Search or browse to find the icon
2. Extract `svgXml` via API
3. Save to specified path as `.svg` file

## Authentication Notes

- IconCloud uses Microsoft Entra ID (AAD) authentication
- The Playwright MCP browser handles cookies automatically
- If redirected to login, the user must authenticate manually
- Once authenticated, the session persists for subsequent API calls
- For `agent-browser` CLI: use `--session iconcloud --headed` for interactive auth, then save state with `agent-browser state save iconcloud-auth.json`
