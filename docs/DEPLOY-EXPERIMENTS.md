# Deploying Playground Experiments to the Hub

This guide explains how to connect an **AzureBuilderPlayground** experiment repo
to the **AzureBuilderHub** so experiments are automatically built, hosted, and
registered in the gallery.

## How It Works

```
┌─────────────────────────┐      ┌────────────────┐      ┌───────────────────┐
│  Playground Repo        │      │  GitHub Pages   │      │  AzureBuilderHub  │
│  (your experiment)      │─────▶│  (static host)  │      │  (gallery + API)  │
│                         │      │                 │◀─────│                   │
│  push to main           │      │  serves the     │ iframe│  LivePreviewFrame │
│  ──▶ GitHub Action      │      │  built app      │      │  loads preview    │
│      1. npm run build   │      └────────────────┘      │                   │
│      2. deploy to Pages │                               │                   │
│      3. POST /api/deploy│──────────────────────────────▶│  registers the    │
│         (register)      │                               │  experiment       │
└─────────────────────────┘                               └───────────────────┘
```

## Setup Steps

### 1. Generate a Deploy Key

Generate a random key that the Playground repos will use to authenticate
with the Hub API:

```bash
openssl rand -hex 32
```

Save this value — you'll need it in steps 2 and 3.

### 2. Configure the Hub (AzureBuilderHub)

Add the deploy key as an environment variable on the Azure Static Web App:

```bash
# Via Azure CLI
az staticwebapp appsettings set \
  --name <YOUR_SWA_NAME> \
  --setting-names DEPLOY_API_KEY=<your-generated-key>
```

Or via Azure Portal:
1. Go to your Static Web App → Configuration → Application settings
2. Add: `DEPLOY_API_KEY` = `<your-generated-key>`

For local development, add it to `api/local.settings.json`:
```json
{
  "Values": {
    "DEPLOY_API_KEY": "<your-generated-key>"
  }
}
```

### 3. Configure the Playground Repo

Each Playground clone (experiment repo) needs two things:

#### a. Repository Variable: `HUB_API_URL`

Go to your experiment repo → Settings → Secrets and variables → Actions → Variables tab:

| Name | Value |
|------|-------|
| `HUB_API_URL` | `https://victorious-ocean-0ea8ca710.1.azurestaticapps.net` |

(Replace with your actual Hub URL)

#### b. Repository Secret: `HUB_DEPLOY_KEY`

Go to the Secrets tab:

| Name | Value |
|------|-------|
| `HUB_DEPLOY_KEY` | `<your-generated-key>` (same key from step 1) |

### 4. Add the GitHub Action Workflow

Copy the workflow file to your Playground repo:

```bash
# From the Playground repo root:
mkdir -p .github/workflows
cp <path-to>/docs/playground-workflow/deploy-to-hub.yml .github/workflows/deploy-to-hub.yml
```

Or copy the contents of [`docs/playground-workflow/deploy-to-hub.yml`](../playground-workflow/deploy-to-hub.yml)
into `.github/workflows/deploy-to-hub.yml` in the Playground repo.

### 5. Enable GitHub Pages

In your Playground repo → Settings → Pages:
- Source: **GitHub Actions** (not "Deploy from a branch")

### 6. Update experiment.json

The workflow reads metadata from `experiment.json` in the Playground root.
Add optional fields for richer Hub integration:

```json
{
  "name": "Virtual Machines Overview",
  "description": "Azure Portal VM overview page prototype",
  "tags": ["compute", "virtual-machines"],
  "azureServices": ["Virtual Machines", "Microsoft.Compute"],
  "layout": "side-panel"
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Display name in the Hub gallery |
| `description` | No | Brief description |
| `tags` | No | Searchable tags (max 10) |
| `azureServices` | No | Azure services referenced |
| `layout` | No | `"full-width"` or `"side-panel"` |

### 7. Update Vite Config for GitHub Pages

GitHub Pages serves from `https://<user>.github.io/<repo>/`, so Vite needs
the correct base path. Update `vite.config.ts` in the Playground repo:

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: process.env.GITHUB_ACTIONS
    ? `/${process.env.GITHUB_REPOSITORY?.split('/')[1] ?? ''}/`
    : '/',
});
```

This sets the base path to `/<repo-name>/` when building in CI, and `/` for
local development.

## How It Flows

1. **Push code** to the Playground repo's `main` branch
2. **GitHub Action** runs automatically:
   - Builds the Vite app → `dist/`
   - Deploys `dist/` to GitHub Pages
   - Reads `experiment.json` for metadata
   - Calls `POST /api/deploy` on the Hub to register it
3. **Hub API** creates (or updates) the project record and creates a version
4. **Hub gallery** shows the experiment with a live preview iframe

## API Reference

### POST /api/deploy

Creates or updates a project in the Hub and records a new version.

**Auth:** `x-deploy-key` header with the shared deploy key.

**Body:**
```json
{
  "repoOwner": "unthinkmedia",
  "repoName": "my-vm-experiment",
  "experimentName": "Virtual Machines Overview",
  "description": "Azure Portal VM overview prototype",
  "previewUrl": "https://unthinkmedia.github.io/my-vm-experiment/",
  "tags": ["compute"],
  "azureServices": ["Virtual Machines"],
  "layout": "side-panel"
}
```

**Response (201 Created / 200 Updated):**
```json
{
  "project": { "id": "...", "name": "...", ... },
  "version": 1,
  "message": "Created new project (version 1)"
}
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "DEPLOY_API_KEY not configured" | Set the env var in the Hub's SWA app settings |
| "Invalid or missing deploy key" | Ensure `HUB_DEPLOY_KEY` secret matches the Hub's `DEPLOY_API_KEY` |
| Hub registration skipped | Set the `HUB_API_URL` repository variable (not secret) |
| Preview blank in Hub | Check CSP allows `frame-src https://*.github.io` |
| 404 on GitHub Pages | Ensure Pages source is "GitHub Actions" in repo settings |
| Assets 404 on Pages | Update `vite.config.ts` base path (see step 7) |
