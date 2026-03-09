# IconCloud.design API Reference

## Authentication

All API endpoints require Microsoft Entra ID (AAD) authentication. The API returns "You do not have permission to view this directory or page" without valid auth cookies.

**Auth flow:** Navigate to `https://iconcloud.design` in a browser → Microsoft login redirect → authenticated session cookies set → API calls work within that browser context.

AAD Client ID: `001e2304-949e-480d-a925-1034f6c4aa50`

---

## Endpoints

### 1. List All Libraries

```
GET /api/iconlibraryfont/masterfontinfos
```

**Response:** Array of library metadata objects.

```json
[
  {
    "masterFontName": "Azure Icons",
    "iconType": "Svg",
    "fontNames": ["AI + Machine Learning", "Analytics", "Compute", "Containers", "Databases", ...],
    "totalIcons": 1442
  },
  {
    "masterFontName": "Fluent System Library",
    "iconType": "Svg",
    "fontNames": ["Fluent Filled", "Fluent Regular"],
    "totalIcons": 8500
  }
]
```

**Libraries:**
| Master Font Name | Icon Type | Total Icons |
|---|---|---|
| Azure Icons | Svg | ~1442 |
| Bing Icons | Svg | ~71 |
| Fluent System Library | Svg | ~8500 |
| Full MDL2 Assets | Glyph | ~2790 |
| Visual Studio | Svg | ~700 |
| Visual Studio Code | Glyph | ~500 |
| Windows Fluent Icons | Glyph | ~4600 |
| XBOX MDL2 Assets | Glyph | ~50 |

---

### 2. Get Collection Icons

```
GET /api/iconlibraryfont/font?masterFontName={library}&fontName={collection}
```

**Parameters:**
- `masterFontName` — Library name (e.g., `Azure Icons`, `Fluent System Library`)
- `fontName` — Collection/font name (e.g., `Compute`, `Fluent Regular`)

**Response:** Array of icon objects for that collection.

---

### 3. Search Icons

```
GET /api/iconlibraryfont/searchAllIcons?terms={query}&exactSearch=true&searchType={type}
```

**Parameters:**
- `terms` — Search query (URL-encoded, use `+` for spaces)
- `exactSearch` — `true` for exact match, `false` for partial
- `searchType` — Search algorithm:
  - `2` — Name-based search
  - `5` — Weighted/fuzzy search (best general results)

**Response:** Array of library result groups:

```json
[
  {
    "libraryName": "Azure Icons",
    "icons": [
      {
        "friendlyName": "Virtual Machine",
        "libraryName": "Azure Icons",
        "iconType": "Svg",
        "size": 18,
        "fonts": ["Compute"],
        "svgXml": "<svg xmlns=\"http://www.w3.org/2000/svg\" ...>...</svg>",
        "svgKey": "991027817",
        "iconGroup": {
          "keyedIconSizes": [{ "size": 18, "internalKey": "991027817-de64dd68d" }],
          "preferredSize": 18
        },
        "internalKey": "991027817-de64dd68d"
      }
    ]
  },
  {
    "libraryName": "Fluent System Library",
    "icons": [
      {
        "friendlyName": "Desktop",
        "libraryName": "Fluent System Library",
        "iconType": "Svg",
        "size": 20,
        "fonts": ["Fluent Regular"],
        "svgXml": "<svg ...>...</svg>",
        "iconGroup": {
          "keyedIconSizes": [
            { "size": 16, "internalKey": "..." },
            { "size": 20, "internalKey": "..." },
            { "size": 24, "internalKey": "..." },
            { "size": 28, "internalKey": "..." },
            { "size": 48, "internalKey": "..." }
          ],
          "preferredSize": 20
        }
      }
    ]
  }
]
```

---

### 4. Visual Similarity Search

```
GET /api/iconlibraryfont/visualSearch?masterFontName={library}&searchKey={iconId}&iconTypeName=glyph
```

**Parameters:**
- `masterFontName` — Library name
- `searchKey` — The `internalKey` or `svgKey` of the reference icon
- `iconTypeName` — `glyph` or `svg`

**Response:** Array of visually similar icons.

---

## Icon Data Schema

### SVG Icon (Azure Icons, Fluent, Visual Studio, Bing)

```json
{
  "friendlyName": "Virtual Machine",
  "libraryName": "Azure Icons",
  "iconType": "Svg",
  "size": 18,
  "fonts": ["Compute"],
  "svgXml": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 18 18\">...</svg>",
  "svgKey": "991027817",
  "iconGroup": {
    "keyedIconSizes": [
      { "size": 18, "internalKey": "991027817-de64dd68d" }
    ],
    "preferredSize": 18
  },
  "internalKey": "991027817-de64dd68d"
}
```

Key fields:
- `friendlyName` — Human-readable icon name
- `svgXml` — Complete SVG markup (ready to save to .svg file)
- `fonts` — Collection(s) the icon belongs to
- `size` — Icon size in pixels
- `iconGroup.keyedIconSizes` — All available sizes for this icon
- `iconGroup.preferredSize` — Default/recommended size

### Glyph Icon (MDL2, VS Code, Windows Fluent)

```json
{
  "friendlyName": "Accept",
  "libraryName": "Full MDL2 Assets",
  "iconType": "Glyph",
  "size": 16,
  "fonts": ["Fabric MDL2 Assets"],
  "unicodePoint": "E8FB",
  "iconGroup": {
    "keyedIconSizes": [{ "size": 16, "internalKey": "..." }],
    "preferredSize": 16
  },
  "internalKey": "..."
}
```

Key fields:
- `unicodePoint` — Unicode code point for use in font-based rendering
- No `svgXml` field — these are font glyphs, not SVGs

---

## URL Patterns (Browser Navigation)

| Purpose | URL Pattern |
|---------|-------------|
| Home | `https://iconcloud.design` |
| Browse Library | `https://iconcloud.design/browse/{Library}` |
| Browse Collection | `https://iconcloud.design/browse/{Library}/{Collection}` |
| Search in Library | `https://iconcloud.design/search/filter/{Library}/all/{query}` |
| Search All | `https://iconcloud.design/search/all/{query}` |

**Examples:**
- `https://iconcloud.design/browse/Azure%20Icons`
- `https://iconcloud.design/browse/Azure%20Icons/Compute`
- `https://iconcloud.design/browse/Fluent%20System%20Library/Fluent%20Regular`
- `https://iconcloud.design/search/filter/Azure%20Icons/all/virtual%20machine`

---

## Azure Icons Collections

AI + Machine Learning, Analytics, Azure Ecosystem, Azure Stack, Blockchain, CXP, Compute, Containers, Databases, DevOps, FXT Edge Filer, General, Hybrid + Multicloud, Identity, Integration, Intune, IoT, Management + Governance, Menu, Migrate, Mixed Reality, Monitor, Networking, New Icons, Other, PreviewIcons, Security, Storage, Web

---

## Fluent Icon Sizes

Fluent System Library icons are available in multiple sizes:
- **12px** — Extra small (badges, tight spaces)
- **16px** — Small (inline with text)
- **20px** — Default/preferred size
- **24px** — Medium (toolbar icons)
- **28px** — Large
- **48px** — Extra large (hero/feature icons)

Not all icons have all sizes. Check `iconGroup.keyedIconSizes` for available sizes.
