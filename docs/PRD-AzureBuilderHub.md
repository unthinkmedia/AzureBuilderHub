# Product Requirements Document: Azure Builder Hub

**Author:** Alex Britez
**Date:** March 9, 2026
**Status:** Draft
**Version:** 1.0

---

## 1. Overview

### 1.1 Problem Statement

Azure Portal designers need a way to create, iterate on, and share interactive prototypes of Azure Portal pages. Today, prototype work happens in isolation — designers build locally with no way to share finished work, discover what others have built, or build on each other's explorations. There is no central gallery, no reuse mechanism, and no community feedback loop.

### 1.2 Product Vision

A two-part ecosystem:

1. **Azure Builder Playground** (Template Repo) — A GitHub template repository that gives designers a pre-configured sandbox with AI-assisted page building tools (Copilot skills, schema pipeline, Coherence UI components). Designers clone this template, build prototypes locally, and push changes via git.

2. **Azure Builder Hub** (Web App) — A web application where designers publish their prototypes, manage versions, and share work with the community. Other designers can browse published projects, fork them as starting points for new explorations, and build on each other's ideas.

### 1.3 Success Metrics

| Metric | Target (6 months post-launch) |
|--------|-------------------------------|
| Designers with at least one published project | 50+ |
| Projects published to community | 200+ |
| Fork rate (projects forked / projects published) | > 20% |
| Monthly active hub visitors | 100+ |
| Avg. time from template clone to first publish | < 1 day |

---

## 2. User Personas

### 2.1 Designer (Creator)

- Azure Portal designer who builds interactive prototypes
- Comfortable with VS Code and basic git (commit, push, pull)
- Uses Copilot skills to generate pages from schemas or screenshots
- Wants a private space to iterate, and a public space to share finished work
- Cares about attribution when others build on their work

### 2.2 Design Lead (Curator)

- Manages a team of designers
- Wants visibility into what the team is exploring
- Curates collections of exemplary prototypes for the org
- Uses the hub to review work-in-progress and provide feedback

### 2.3 Browser (Consumer)

- A designer, PM, or engineer looking for inspiration or reference
- Searches the community gallery for existing patterns
- Forks projects to use as starting points
- May not create original projects — primarily consumes

---

## 3. System Architecture

### 3.1 Two-Repo Model

| Repository | Purpose | Cloned By |
|-----------|---------|-----------|
| **AzureBuilderPlayground** | GitHub template repo — the designer's sandbox | Every designer (one clone per project) |
| **AzureBuilderHub** | Hub web app — gallery, API, database | Only hub maintainers |

### 3.2 Architecture Diagram

```
┌──────────────────────────────────────────────────────────┐
│                    Designer's Machine                     │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Sandbox Repo (cloned from template)               │  │
│  │  ├── project.json          (manifest)              │  │
│  │  ├── src/pages/            (generated pages)       │  │
│  │  ├── schemas/              (page schemas)          │  │
│  │  ├── public/assets/        (icons, images)         │  │
│  │  ├── .github/workflows/    (auto-publish action)   │  │
│  │  └── .github/skills/       (Copilot skills)        │  │
│  └───────────────┬────────────────────────────────────┘  │
│                  │ git push to main                       │
└──────────────────┼───────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────────┐
│              GitHub Action (in template repo)             │
│  1. Read project.json                                    │
│  2. Validate schemas                                     │
│  3. Build preview (vite build)                           │
│  4. Capture thumbnail (optional)                         │
│  5. POST bundle to Hub API                               │
└──────────────────┬───────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────────┐
│                  Azure Builder Hub                        │
│                                                          │
│  ┌─────────────────┐  ┌──────────────────────────────┐  │
│  │  Frontend (SWA)  │  │  API (Azure Functions)       │  │
│  │  - My Projects   │  │  - POST /projects            │  │
│  │  - Community     │  │  - GET  /projects            │  │
│  │  - Project View  │  │  - PUT  /projects/:id/publish│  │
│  │  - Fork Flow     │  │  - POST /projects/:id/fork   │  │
│  └─────────────────┘  │  - GET  /community            │  │
│                        │  - GET  /search               │  │
│  ┌────────────────┐   └──────────────────────────────┘  │
│  │  Auth (Entra)  │                                      │
│  └────────────────┘   ┌──────────────────────────────┐  │
│                        │  Data                         │  │
│                        │  - Azure SQL (metadata)       │  │
│                        │  - Blob Storage (assets/builds)│  │
│                        └──────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

### 3.3 Technology Stack

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Hub Frontend | Azure Static Web Apps (React) | Serverless hosting, built-in auth, CI/CD |
| Hub API | Azure Functions (Node.js/TypeScript) | Serverless, scales to zero, co-deploys with SWA |
| Database | Azure SQL Database | Relational schema for project metadata, proven reliability, cost-effective at scale |
| Asset Storage | Azure Blob Storage | Cost-effective storage for build bundles, thumbnails, screenshots |
| Authentication | Microsoft Entra ID | Internal users, SSO with Microsoft accounts |
| Search | Azure SQL LIKE queries (Phase 1) → Azure AI Search (Phase 4) | Start simple, upgrade when query complexity demands it |
| CI/CD (Hub) | GitHub Actions | Standard, deploys SWA + Functions |
| CI/CD (Template) | GitHub Actions (baked into template) | Auto-publishes to hub on push |

---

## 4. Data Model

### 4.1 Project Manifest (`project.json`)

This file lives in the designer's sandbox repo and defines the project metadata. It is the contract between the template repo and the hub.

```json
{
  "name": "SRE Agent Dashboard",
  "description": "An AI-powered SRE agent overview page with health metrics and incident timeline",
  "author": {
    "name": "Alex Britez",
    "id": "alexbritez@microsoft.com"
  },
  "tags": ["dashboard", "monitoring", "AI", "SRE"],
  "azureServices": ["Azure Monitor", "Azure AI Services"],
  "pages": [
    {
      "name": "Overview",
      "schema": "src/pages/SREAgent.schema.json",
      "component": "src/pages/SREAgent.tsx",
      "route": "/"
    }
  ],
  "thumbnail": "public/assets/thumbnail.png",
  "layout": "side-panel",
  "version": 3,
  "published": false,
  "createdAt": "2026-02-15T10:00:00Z",
  "updatedAt": "2026-03-09T14:30:00Z"
}
```

### 4.2 Hub Database Schema (Azure SQL)

See [`api/sql/001-init.sql`](../api/sql/001-init.sql) for the full DDL. Summary of tables:

**projects**

| Column | Type | Description |
|--------|------|-------------|
| `id` | UNIQUEIDENTIFIER (PK) | Auto-generated project ID |
| `name` | NVARCHAR(200) | Display name |
| `description` | NVARCHAR(MAX) | Long description |
| `author_id` | NVARCHAR(200) | Entra ID user identifier |
| `author_name` | NVARCHAR(200) | Display name |
| `status` | NVARCHAR(20) | `draft` \| `published` \| `archived` |
| `tags` | NVARCHAR(MAX) | JSON array of searchable tags |
| `azure_services` | NVARCHAR(MAX) | JSON array of Azure services referenced |
| `layout` | NVARCHAR(20) | `full-width` \| `side-panel` |
| `page_count` | INT | Number of pages in the project |
| `current_version` | INT | Latest version number |
| `star_count` | INT | Community stars (denormalized) |
| `fork_count` | INT | Times forked (denormalized) |
| `forked_from_project_id` | UNIQUEIDENTIFIER \| NULL | Source project for forks |
| `forked_from_project_name` | NVARCHAR(200) \| NULL | Source project name |
| `forked_from_author_name` | NVARCHAR(200) \| NULL | Source project author |
| `thumbnail_url` | NVARCHAR(2000) | Blob Storage URL for thumbnail |
| `preview_url` | NVARCHAR(2000) | Blob Storage URL for built Vite app (live preview) |
| `created_at` | DATETIME2 | First upload timestamp |
| `updated_at` | DATETIME2 | Last upload timestamp |
| `published_at` | DATETIME2 \| NULL | When published to community |
| `deleted_at` | DATETIME2 \| NULL | Soft-delete timestamp |

**versions**

| Column | Type | Description |
|--------|------|-------------|
| `id` | UNIQUEIDENTIFIER (PK) | Auto-generated version ID |
| `project_id` | UNIQUEIDENTIFIER (FK) | Parent project |
| `version` | INT | Sequential version number |
| `bundle_url` | NVARCHAR(2000) | Blob Storage URL for the version's file bundle |
| `manifest` | NVARCHAR(MAX) | JSON snapshot of `project.json` at this version |
| `changelog` | NVARCHAR(MAX) \| NULL | Version changelog |
| `created_at` | DATETIME2 | Upload timestamp |

**stars**

| Column | Type | Description |
|--------|------|-------------|
| `user_id` | NVARCHAR(200) (PK) | Who starred |
| `project_id` | UNIQUEIDENTIFIER (PK, FK) | What was starred |
| `created_at` | DATETIME2 | When |

**shares**

| Column | Type | Description |
|--------|------|-------------|
| `id` | UNIQUEIDENTIFIER (PK) | Share record ID |
| `project_id` | UNIQUEIDENTIFIER (FK) | Project shared |
| `owner_id` | NVARCHAR(200) | Project owner |
| `shared_with_id` | NVARCHAR(200) | Recipient user ID |
| `created_at` | DATETIME2 | When shared |

**collections** / **collection_projects**

| Column | Type | Description |
|--------|------|-------------|
| `id` | UNIQUEIDENTIFIER (PK) | Collection ID |
| `name` | NVARCHAR(200) | Collection name |
| `author_id` | NVARCHAR(200) | Collection owner |
| `collection_projects` | junction table | Maps collections ↔ projects |

---

## 5. User Flows

### 5.1 New Project (Greenfield)

```
1. Designer opens Azure Builder Hub → clicks "New Project"
2. Hub prompts: project name, description, tags
3. Hub creates a new private GitHub repo from the AzureBuilderPlayground template
   (via GitHub API, under the designer's account or an org)
4. Hub installs the GitHub App on the new repo (enables auto-publish)
5. Hub creates a draft project entry in Azure SQL
6. Designer clones the repo locally
7. Designer opens in VS Code → Copilot skills are ready to use
8. Designer builds pages (schemas → tsx → preview)
9. Designer commits and pushes
10. GitHub Action fires → packages project → POSTs to Hub API
11. Hub updates the project entry with new version, thumbnail, preview build
12. Designer sees updated project in "My Projects"
```

### 5.2 Publish to Community

```
1. Designer opens "My Projects" in the hub
2. Clicks on a draft project → clicks "Publish to Community"
3. Hub prompts for confirmation and optional metadata edits
4. Status flips from draft → published
5. Project appears in the Community Gallery
```

### 5.3 Browse & Fork

```
1. User opens Community Gallery
2. Browses or searches (by tag, Azure service, layout type, keyword)
3. Clicks on a project card → sees detail view with:
   - Live interactive preview (iframe)
   - Schema inspector
   - Version history
   - Author info
   - Fork count, star count
4. Clicks "Fork This"
5. Hub creates a new repo from the template under the user's account
6. Hub copies the forked project's files into the new repo
7. Hub creates a new draft project entry with forkedFrom attribution
8. User clones and starts iterating
```

### 5.4 Iterate & Version

```
1. Designer makes changes locally
2. git commit && git push
3. GitHub Action fires → hub receives new version
4. Hub stores version snapshot (immutable)
5. "My Projects" shows latest version; version history is accessible
6. If project is published, community sees the latest version automatically
```

---

## 6. Feature Requirements

### 6.1 Hub Frontend — My Projects

| ID | Requirement | Priority |
|----|------------|----------|
| MP-1 | List all projects owned by the authenticated user | P0 |
| MP-2 | Show project card: thumbnail, name, status (draft/published), version, last updated | P0 |
| MP-3 | Click project → detail view with live preview, schema inspector, version history | P0 |
| MP-4 | Publish / unpublish toggle | P0 |
| MP-5 | Edit metadata (name, description, tags) without re-uploading | P1 |
| MP-6 | Delete project (with confirmation) | P1 |
| MP-7 | Archive project (hidden but not deleted) | P2 |
| MP-8 | Version diff view (compare two versions side-by-side) | P2 |

### 6.2 Hub Frontend — Community Gallery

| ID | Requirement | Priority |
|----|------------|----------|
| CG-1 | Grid of published project cards: thumbnail, title, author, stars, forks, tags | P0 |
| CG-2 | Search by keyword (matches name, description, tags) | P0 |
| CG-3 | Filter by: Azure service, layout type, tag | P0 |
| CG-4 | Sort by: newest, most starred, most forked | P0 |
| CG-5 | Project detail view with live interactive preview | P0 |
| CG-6 | "Fork This" button → creates new sandbox repo with project files | P0 |
| CG-7 | Star/unstar a project | P1 |
| CG-8 | Show fork lineage ("forked from X by Y") | P1 |
| CG-9 | Author profile page (all published projects by a person) | P2 |
| CG-10 | Curated collections (themed groups of projects) | P2 |
| CG-11 | Comments on projects | P3 |

### 6.3 Hub API

| ID | Endpoint | Method | Auth | Description |
|----|----------|--------|------|-------------|
| API-1 | `/api/projects` | POST | GitHub App token | Create or update a project (called by GitHub Action) |
| API-2 | `/api/projects` | GET | Entra ID | List projects for authenticated user |
| API-3 | `/api/projects/:id` | GET | Public (if published) / Entra (if draft) | Get project detail |
| API-4 | `/api/projects/:id/publish` | PUT | Entra ID (owner only) | Toggle publish status |
| API-5 | `/api/projects/:id/fork` | POST | Entra ID | Fork a project → create new repo + project entry |
| API-6 | `/api/projects/:id/star` | POST/DELETE | Entra ID | Star or unstar |
| API-7 | `/api/community` | GET | Public | List published projects with search/filter/sort |
| API-8 | `/api/projects/:id/versions` | GET | Entra ID (owner) / Public (if published) | List version history |
| API-9 | `/api/projects/:id/metadata` | PATCH | Entra ID (owner only) | Update name, description, tags |

### 6.4 Template Repo Additions (AzureBuilderPlayground)

| ID | Requirement | Priority |
|----|------------|----------|
| TR-1 | `project.json` manifest file (pre-populated with placeholder values) | P0 |
| TR-2 | GitHub Action workflow: on push to main → validate → bundle → POST to hub API | P0 |
| TR-3 | JSON Schema for `project.json` (for validation and editor intellisense) | P1 |
| TR-4 | `npx abp doctor` command: checks template version, project.json validity, hub connectivity | P2 |

### 6.5 Authentication & Authorization

| ID | Requirement | Priority |
|----|------------|----------|
| AU-1 | Entra ID SSO for hub login | P0 |
| AU-2 | GitHub App for repo → hub communication (no manual tokens) | P0 |
| AU-3 | Owner-only access for draft projects | P0 |
| AU-4 | Public read access for published projects (no login required to browse) | P1 |
| AU-5 | Fork requires authentication (must be logged in) | P0 |

---

## 7. Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| **Performance** | Community gallery loads in < 2s; search results in < 1s |
| **Scalability** | Support 500+ projects, 200+ users without architecture changes |
| **Availability** | 99.9% uptime (standard SWA/Functions SLA) |
| **Security** | All API endpoints validate auth tokens; no cross-user data access; Blob Storage URLs are scoped with SAS tokens for draft content |
| **Privacy** | Draft projects are visible only to the owner; no personal data exposed in community beyond display name |
| **Accessibility** | Hub UI meets WCAG 2.1 AA |
| **Data Retention** | Deleted projects are soft-deleted (retained 30 days, then purged) |

---

## 8. Phased Rollout

### Phase 1 — Foundation (Weeks 1–4)

- [ ] Define `project.json` JSON Schema
- [ ] Build GitHub Action workflow for template repo (validate + bundle + POST)
- [ ] Scaffold AzureBuilderHub repo (SWA + Functions + Azure SQL)
- [ ] Implement Entra ID authentication
- [ ] Implement API: project create/update (API-1), list my projects (API-2), get detail (API-3)
- [ ] Build "My Projects" dashboard (MP-1, MP-2)
- [ ] Basic project detail view with static thumbnail (MP-3)
- [ ] Set up Blob Storage for bundles and thumbnails
- [ ] Deploy hub to Azure

### Phase 2 — Community MVP (Weeks 5–8)

- [ ] Implement publish/unpublish (API-4, MP-4)
- [ ] Build Community Gallery with search and filter (CG-1 through CG-4)
- [ ] Implement fork flow (API-5, CG-6)
- [ ] GitHub App for automatic repo creation and auth
- [ ] "New Project" button in hub that provisions repo
- [ ] Fork attribution chain (CG-8)
- [ ] Live interactive preview in project detail (CG-5)

### Phase 3 — Engagement (Weeks 9–12)

- [ ] Stars (API-6, CG-7)
- [ ] Version history view (API-8, MP-8)
- [ ] Edit metadata in hub (API-9, MP-5)
- [ ] Author profile pages (CG-9)
- [ ] Delete/archive projects (MP-6, MP-7)
- [ ] Template version check / `npx abp doctor` (TR-4)

### Phase 4 — Scale & Polish (Weeks 13+)

- [ ] Curated collections (CG-10)
- [ ] Comments (CG-11)
- [ ] Upgrade search to Azure AI Search
- [ ] AI-powered search ("show me dashboards with KPI cards")
- [ ] Lineage visualization (fork tree)
- [ ] Notifications (your project was starred/forked)
- [ ] Public API for integrations

---

## 9. Open Questions

| # | Question | Impact | Status |
|---|----------|--------|--------|
| 1 | Should repo creation happen under the designer's personal GitHub account or under an org (e.g., `AzurePrototypes/`)? | Affects ownership, visibility, offboarding | Leaning personal — hub is the durable store |
| 2 | Should the community gallery be public (no login to browse) or require Entra auth? | Adoption vs. security | Leaning public browse, auth for fork/star |
| 3 | How should thumbnails be generated? Designer-provided screenshot vs. automated capture (e.g., Playwright screenshot of the built preview)? | Quality vs. friction | Both — auto-generate with manual override |
| 4 | Should published projects auto-update when the designer pushes, or require explicit re-publish? | Freshness vs. control | Auto-update — designer can unpublish if needed |
| 5 | What happens to forks when the original project is deleted or unpublished? | Data integrity | Forks survive independently; `forkedFrom` shows "original unavailable" |
| 6 | Should there be an approval/moderation step before community publish? | Quality control vs. speed | Open publish with flag/report mechanism |
| 7 | Multi-page project support — is a "project" always a single page or can it be a multi-page flow? | Data model complexity | Support multi-page from day one (pages array in manifest) |

---

## 10. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Low adoption — designers don't publish | Medium | High | Seed gallery with exemplary projects; make publishing frictionless (auto on push) |
| Git barrier for designers | Medium | Medium | Provide VS Code "Push to Hub" button; web upload fallback |
| Template version drift | High | Medium | `npx abp doctor` version check; automated PR to update template files |
| Stale/abandoned projects cluttering gallery | Medium | Low | Auto-archive after N months of inactivity; trending/recent sort defaults |
| Security — unauthorized access to draft projects | Low | High | Entra ID auth on all draft endpoints; Blob SAS tokens scoped per user |

---

## 11. Glossary

| Term | Definition |
|------|-----------|
| **Sandbox** | A designer's local clone of the template repo — their private workspace |
| **Hub** | The Azure Builder Hub web app — the central gallery and project manager |
| **Project** | A collection of one or more Azure Portal page prototypes, defined by a `project.json` manifest |
| **Draft** | A project uploaded to the hub but visible only to the author |
| **Published** | A project visible in the Community Gallery |
| **Fork** | Creating a new project from an existing community project, with attribution to the original |
| **Template Repo** | AzureBuilderPlayground — the GitHub template that designers clone to start new projects |
