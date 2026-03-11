/**
 * Vite dev server plugin that intercepts /api/* requests and returns mock data.
 * Enables local testing without Azure Functions Core Tools.
 */
import type { Plugin } from "vite";
import type { IncomingMessage, ServerResponse } from "node:http";

/* ── Mock Data ── */
interface MockProject {
  id: string;
  name: string;
  description: string;
  author: { name: string; id: string; avatarUrl: string };
  status: string;
  tags: string[];
  layout: string;
  pageCount: number;
  currentVersion: number;
  starCount: number;
  forkCount: number;
  forkedFrom: { projectId: string; projectName: string; authorName: string } | null;
  thumbnailUrl: string;
  previewUrl: string;
  repoUrl?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  isStarred: boolean;
  jtbd?: string[];
  storybookComponents?: { name: string; storyPath: string }[];
  newComponents?: { name: string; description: string }[];
}

// Projects based on the Azure Builder Playground prototypes at localhost:5173
const mockProjects: MockProject[] = [
  {
    id: "proj-preview-features",
    name: "Preview Features",
    description:
      "Entra ID Default Directory preview features management page with registration grid, status badges, and per-feature detail view. Lists Azure-wide preview features with state (NotRegistered/Registered) and one-click registration.",
    author: { name: "Alex Britez", id: "user-1", avatarUrl: "" },
    status: "published",
    tags: ["identity", "security", "governance"],
    layout: "side-panel",
    pageCount: 1,
    currentVersion: 3,
    starCount: 34,
    forkCount: 5,
    forkedFrom: null,
    thumbnailUrl: "/thumbnails/proj-preview-features.png",
    previewUrl: "http://localhost:5173/",
    repoUrl: "https://github.com/AzureBuilderHub/preview-features",
    createdAt: "2026-01-15T09:00:00Z",
    updatedAt: "2026-03-10T11:20:00Z",
    publishedAt: "2026-02-01T10:00:00Z",
    isStarred: true,
    jtbd: [
      "When I want to try upcoming Azure capabilities, I want to browse available preview features, so I can evaluate new functionality before it becomes generally available.",
      "When I find a relevant preview, I want to register for it directly, so I can enable it for my subscription without filing a support ticket.",
      "When I need to track what previews I have opted into, I want to filter by registration status, so I can audit which experimental features are active.",
    ],
    storybookComponents: [
      { name: "CuiDataGrid", storyPath: "components-datagrid--docs" },
      { name: "CuiBadge", storyPath: "components-badge--docs" },
      { name: "CuiSideNav", storyPath: "components-sidenav--docs" },
      { name: "CuiToggle", storyPath: "components-toggle--docs" },
    ],
    newComponents: [
      { name: "FeatureDetailFlyout", description: "Expandable panel showing preview feature description, docs links, and registration history" },
      { name: "BulkRegistrationBar", description: "Action bar for batch-registering selected preview features" },
    ],
  },
  {
    id: "proj-subscriptions",
    name: "Subscriptions",
    description:
      "Resource Manager subscriptions list with sortable grid columns (Name, Subscription ID, Role, Cost, Secure Score). Includes filter pills, search, and per-subscription detail navigation.",
    author: { name: "Alex Britez", id: "user-1", avatarUrl: "" },
    status: "published",
    tags: ["management", "governance", "billing"],
    layout: "side-panel",
    pageCount: 1,
    currentVersion: 2,
    starCount: 58,
    forkCount: 11,
    forkedFrom: null,
    thumbnailUrl: "/thumbnails/proj-subscriptions.png",
    previewUrl: "http://localhost:5173/",
    repoUrl: "https://github.com/AzureBuilderHub/subscriptions",
    createdAt: "2026-01-20T08:30:00Z",
    updatedAt: "2026-03-09T15:45:00Z",
    publishedAt: "2026-02-05T09:00:00Z",
    isStarred: false,
    jtbd: [
      "When I need to manage my Azure subscriptions, I want to view all subscriptions with their roles and costs, so I can govern access and spending across my organization.",
      "When I need to add a new subscription, I want a clear entry point to create one, so I can onboard new teams or projects.",
      "When I need to enforce compliance, I want to manage policies across subscriptions, so I can ensure organizational standards are met.",
    ],
    storybookComponents: [
      { name: "CuiDataGrid", storyPath: "components-datagrid--docs" },
      { name: "CuiFilterPill", storyPath: "components-filterpill--docs" },
      { name: "CuiSideNav", storyPath: "components-sidenav--docs" },
      { name: "CuiSearchBox", storyPath: "components-searchbox--docs" },
    ],
    newComponents: [
      { name: "CostSparkline", description: "Inline SVG sparkline showing 30-day cost trend per subscription" },
      { name: "SecureScoreBadge", description: "Color-coded score indicator (green/yellow/red) with tooltip" },
    ],
  },
  {
    id: "proj-sre-agent",
    name: "Azure SRE Agent",
    description:
      "Custom SRE agent management experience with three tabs: Agents, Agent Spaces, and External agents. Features PREVIEW badge, filter pills, empty-state CTA for creating agent spaces, and full CRUD for agent configurations.",
    author: { name: "Jamie Chen", id: "user-2", avatarUrl: "" },
    status: "published",
    tags: ["ai-ml", "devops", "monitoring", "sre"],
    layout: "full-width",
    pageCount: 3,
    currentVersion: 4,
    starCount: 91,
    forkCount: 17,
    forkedFrom: null,
    thumbnailUrl: "/thumbnails/proj-sre-agent.png",
    previewUrl: "http://localhost:5173/",
    repoUrl: "https://github.com/AzureBuilderHub/sre-agent",
    createdAt: "2026-01-05T12:00:00Z",
    updatedAt: "2026-03-11T10:00:00Z",
    publishedAt: "2026-01-18T14:00:00Z",
    isStarred: true,
    jtbd: [
      "When I want to automate site reliability tasks, I want to browse existing agent spaces, so I can monitor and manage running agents.",
      "When I encounter a new operational scenario, I want to create a new agent space, so I can configure AI-driven automation for that workflow.",
      "When I am new to the service, I want a clear empty state with guidance, so I can understand the value and get started quickly.",
    ],
    storybookComponents: [
      { name: "CuiTabList", storyPath: "components-tablist--docs" },
      { name: "CuiDataGrid", storyPath: "components-datagrid--docs" },
      { name: "CuiBadge", storyPath: "components-badge--docs" },
      { name: "CuiFilterPill", storyPath: "components-filterpill--docs" },
      { name: "CuiEmptyState", storyPath: "components-emptystate--docs" },
    ],
    newComponents: [
      { name: "AgentCard", description: "Card layout showing agent name, status, last run, and quick-action buttons" },
      { name: "AgentSpaceEmptyState", description: "CTA empty state prompting users to create their first agent space" },
      { name: "ExternalAgentGrid", description: "Grid of partner-provided agents with integration status and docs link" },
    ],
  },
  {
    id: "proj-static-web-app",
    name: "Static Web App",
    description:
      "Resource detail page for an Azure Static Web App (coherence-preview). Includes Essentials panel, sidebar navigation (Overview, Activity log, IAM, etc.), Get Started guide, Monitoring tab, deployment status, and custom domain configuration.",
    author: { name: "Alex Britez", id: "user-1", avatarUrl: "" },
    status: "published",
    tags: ["serverless", "hosting", "web"],
    layout: "side-panel",
    pageCount: 1,
    currentVersion: 5,
    starCount: 112,
    forkCount: 24,
    forkedFrom: null,
    thumbnailUrl: "/thumbnails/proj-static-web-app.png",
    previewUrl: "http://localhost:5173/",
    repoUrl: "https://github.com/AzureBuilderHub/static-web-app",
    createdAt: "2025-12-20T10:00:00Z",
    updatedAt: "2026-03-10T16:30:00Z",
    publishedAt: "2026-01-05T08:00:00Z",
    isStarred: false,
    jtbd: [
      "When I have a deployed Static Web App, I want to see its status and key properties at a glance, so I can confirm it is running correctly.",
      "When I need to update my app configuration, I want to navigate to settings sub-pages, so I can adjust custom domains, APIs, and environment variables.",
      "When I need to share resource details with a colleague, I want to copy essential properties like URL and resource ID, so I can communicate resource specifics quickly.",
    ],
    storybookComponents: [
      { name: "CuiSideNav", storyPath: "components-sidenav--docs" },
      { name: "CuiTabList", storyPath: "components-tablist--docs" },
      { name: "CuiDataGrid", storyPath: "components-datagrid--docs" },
      { name: "CuiBreadcrumb", storyPath: "components-breadcrumb--docs" },
    ],
    newComponents: [
      { name: "EssentialsPanel", description: "Key-value grid showing resource details (Status, URL, Region, SKU, Resource Group)" },
      { name: "GetStartedGuide", description: "Step-by-step onboarding checklist with progress tracking" },
      { name: "DeploymentStatusCard", description: "Real-time deployment status with environment breakdown and commit history" },
    ],
  },
  {
    id: "proj-azure-home",
    name: "Azure Home",
    description:
      "Azure Portal home page with Azure services icon grid, Recent resources table (name, type, resource group), Navigate section, and Tools section. Full-width layout with responsive grid.",
    author: { name: "Sara Kim", id: "user-3", avatarUrl: "" },
    status: "published",
    tags: ["dashboard", "portal", "navigation"],
    layout: "full-width",
    pageCount: 1,
    currentVersion: 6,
    starCount: 145,
    forkCount: 31,
    forkedFrom: null,
    thumbnailUrl: "/thumbnails/proj-azure-home.png",
    previewUrl: "http://localhost:5173/",
    repoUrl: "https://github.com/AzureBuilderHub/azure-home",
    createdAt: "2025-12-01T09:00:00Z",
    updatedAt: "2026-03-08T14:00:00Z",
    publishedAt: "2025-12-15T10:00:00Z",
    isStarred: true,
    jtbd: [
      "When I open the Azure Portal, I want to see my recent resources and favorite services, so I can resume work without searching.",
      "When I need to create a new resource, I want quick-access shortcuts to common services, so I can start provisioning immediately.",
      "When I need to learn or troubleshoot, I want links to documentation, tutorials, and tools, so I can find guidance without leaving the portal.",
    ],
    storybookComponents: [
      { name: "CuiDataGrid", storyPath: "components-datagrid--docs" },
      { name: "CuiIcon", storyPath: "components-icon--docs" },
      { name: "CuiTooltip", storyPath: "components-tooltip--docs" },
    ],
    newComponents: [
      { name: "ServiceIconGrid", description: "Responsive grid of Azure service icons with hover tooltip and click-to-navigate" },
      { name: "RecentResourcesTable", description: "Table showing recently accessed resources with type, name, and resource group" },
      { name: "NavigateSection", description: "Quick-links grid for portal navigation shortcuts" },
      { name: "ToolsSection", description: "Action cards for Create a resource, Cloud Shell, and Azure Mobile App" },
    ],
  },
  {
    id: "proj-all-resources",
    name: "All Resources",
    description:
      "Resource Manager All Resources list with multi-filter pills (Subscription, Resource Group, Type, Location), sortable grid, and bulk actions. Shows VM image versions, resource groups, and mixed resource types.",
    author: { name: "Alex Britez", id: "user-1", avatarUrl: "" },
    status: "draft",
    tags: ["management", "governance", "resources"],
    layout: "side-panel",
    pageCount: 1,
    currentVersion: 1,
    starCount: 0,
    forkCount: 0,
    forkedFrom: { projectId: "proj-subscriptions", projectName: "Subscriptions", authorName: "Alex Britez" },
    thumbnailUrl: "/thumbnails/proj-all-resources.png",
    previewUrl: "http://localhost:5173/",
    repoUrl: "https://github.com/AzureBuilderHub/all-resources",
    createdAt: "2026-03-05T11:00:00Z",
    updatedAt: "2026-03-11T09:30:00Z",
    publishedAt: null,
    isStarred: false,
    jtbd: [
      "When I need to find a specific resource across my subscriptions, I want to search, filter, and browse all resources in one place, so I can quickly locate and act on any resource regardless of type or resource group.",
      "When I need to perform bulk operations, I want to multi-select resources and apply tags or delete them, so I can manage resources at scale.",
      "When I need to export resource data for reporting, I want to export the filtered list to CSV, so I can share inventory information with stakeholders.",
    ],
    storybookComponents: [
      { name: "CuiDataGrid", storyPath: "components-datagrid--docs" },
      { name: "CuiFilterPill", storyPath: "components-filterpill--docs" },
      { name: "CuiSideNav", storyPath: "components-sidenav--docs" },
    ],
    newComponents: [
      { name: "ResourceTypeColumn", description: "Custom grid column renderer with resource type icon and name" },
      { name: "BulkActionsBar", description: "Toolbar for bulk operations (Delete, Move, Tag) on selected resources" },
    ],
  },
  {
    id: "proj-sre-dashboard",
    name: "Custom SRE Dashboard",
    description: "Customized SRE agent dashboard with team-specific KPIs, Slack integration panel, and on-call rotation widget.",
    author: { name: "Marcus Johnson", id: "user-4", avatarUrl: "" },
    status: "published",
    tags: ["ai-ml", "devops", "monitoring"],
    layout: "full-width",
    pageCount: 2,
    currentVersion: 2,
    starCount: 23,
    forkCount: 3,
    forkedFrom: { projectId: "proj-sre-agent", projectName: "Azure SRE Agent", authorName: "Jamie Chen" },
    thumbnailUrl: "/thumbnails/proj-sre-agent.png",
    previewUrl: "http://localhost:5173/",
    repoUrl: "https://github.com/AzureBuilderHub/custom-sre-dashboard",
    createdAt: "2026-02-10T10:00:00Z",
    updatedAt: "2026-03-08T14:00:00Z",
    publishedAt: "2026-02-20T09:00:00Z",
    isStarred: false,
    jtbd: [
      "When I need team-specific reliability metrics, I want a customized SRE dashboard with KPIs relevant to my team, so I can track our operational health at a glance.",
      "When an alert fires, I want integrated Slack notifications routed to the right channel, so I can coordinate incident response without switching tools.",
      "When I need to check who is on call, I want an on-call rotation widget, so I can quickly identify the responsible engineer.",
    ],
    storybookComponents: [
      { name: "CuiDataGrid", storyPath: "components-datagrid--docs" },
      { name: "CuiBadge", storyPath: "components-badge--docs" },
    ],
    newComponents: [
      { name: "TeamKPIPanel", description: "Dashboard panel showing team-specific KPIs with charts" },
      { name: "SlackIntegrationWidget", description: "Slack channel integration panel for alert routing" },
      { name: "OnCallRotationWidget", description: "On-call schedule display with current/next rotation" },
    ],
  },
  {
    id: "proj-sre-agent-lite",
    name: "SRE Agent Lite",
    description: "Stripped-down SRE agent view focused on alert triage with simplified agent list and quick-action buttons.",
    author: { name: "Priya Patel", id: "user-5", avatarUrl: "" },
    status: "published",
    tags: ["devops", "monitoring", "sre"],
    layout: "full-width",
    pageCount: 1,
    currentVersion: 1,
    starCount: 8,
    forkCount: 0,
    forkedFrom: { projectId: "proj-sre-agent", projectName: "Azure SRE Agent", authorName: "Jamie Chen" },
    thumbnailUrl: "/thumbnails/proj-sre-agent.png",
    previewUrl: "http://localhost:5173/",
    repoUrl: "https://github.com/AzureBuilderHub/sre-agent-lite",
    createdAt: "2026-03-01T08:00:00Z",
    updatedAt: "2026-03-07T16:00:00Z",
    publishedAt: "2026-03-03T10:00:00Z",
    isStarred: false,
    jtbd: [
      "When I need to triage alerts quickly, I want a simplified agent list with quick-action buttons, so I can acknowledge or escalate without navigating complex menus.",
      "When I want a lightweight SRE view, I want a stripped-down interface focused on essentials, so I can reduce cognitive load during incidents.",
    ],
    storybookComponents: [
      { name: "CuiDataGrid", storyPath: "components-datagrid--docs" },
      { name: "CuiBadge", storyPath: "components-badge--docs" },
    ],
    newComponents: [
      { name: "QuickActionButton", description: "Simplified quick-action button for common triage operations" },
    ],
  },
];

const mockVersions = [
  // Preview Features
  { id: "v-pf-3", projectId: "proj-preview-features", version: 3, bundleUrl: "", manifest: {}, createdAt: "2026-03-10T11:20:00Z", changelog: "Added bulk registration and status filter pills" },
  { id: "v-pf-2", projectId: "proj-preview-features", version: 2, bundleUrl: "", manifest: {}, createdAt: "2026-02-20T09:00:00Z", changelog: "Added per-feature detail flyout with description and documentation links" },
  { id: "v-pf-1", projectId: "proj-preview-features", version: 1, bundleUrl: "", manifest: {}, createdAt: "2026-01-15T09:00:00Z", changelog: "Initial release with preview features grid and registration toggle" },
  // Subscriptions
  { id: "v-sub-2", projectId: "proj-subscriptions", version: 2, bundleUrl: "", manifest: {}, createdAt: "2026-03-09T15:45:00Z", changelog: "Added Secure Score column and cost sparkline" },
  { id: "v-sub-1", projectId: "proj-subscriptions", version: 1, bundleUrl: "", manifest: {}, createdAt: "2026-01-20T08:30:00Z", changelog: "Initial release with subscription grid (Name, ID, Role, Cost)" },
  // Azure SRE Agent
  { id: "v-sre-4", projectId: "proj-sre-agent", version: 4, bundleUrl: "", manifest: {}, createdAt: "2026-03-11T10:00:00Z", changelog: "External agents tab with partner integration grid" },
  { id: "v-sre-3", projectId: "proj-sre-agent", version: 3, bundleUrl: "", manifest: {}, createdAt: "2026-02-25T14:00:00Z", changelog: "Agent Spaces management with create/delete flows" },
  { id: "v-sre-2", projectId: "proj-sre-agent", version: 2, bundleUrl: "", manifest: {}, createdAt: "2026-02-10T11:00:00Z", changelog: "Added filter pills and empty-state CTA" },
  { id: "v-sre-1", projectId: "proj-sre-agent", version: 1, bundleUrl: "", manifest: {}, createdAt: "2026-01-05T12:00:00Z", changelog: "Initial agent list with PREVIEW badge and status indicators" },
  // Static Web App
  { id: "v-swa-5", projectId: "proj-static-web-app", version: 5, bundleUrl: "", manifest: {}, createdAt: "2026-03-10T16:30:00Z", changelog: "Monitoring tab with deployment metrics and request graphs" },
  { id: "v-swa-4", projectId: "proj-static-web-app", version: 4, bundleUrl: "", manifest: {}, createdAt: "2026-03-01T10:00:00Z", changelog: "Custom domain configuration panel" },
  { id: "v-swa-3", projectId: "proj-static-web-app", version: 3, bundleUrl: "", manifest: {}, createdAt: "2026-02-15T09:00:00Z", changelog: "Activity log tab with filterable event grid" },
  { id: "v-swa-2", projectId: "proj-static-web-app", version: 2, bundleUrl: "", manifest: {}, createdAt: "2026-01-25T12:00:00Z", changelog: "IAM sidebar section with role assignments" },
  { id: "v-swa-1", projectId: "proj-static-web-app", version: 1, bundleUrl: "", manifest: {}, createdAt: "2025-12-20T10:00:00Z", changelog: "Initial Essentials panel and Get Started guide" },
  // Azure Home
  { id: "v-home-6", projectId: "proj-azure-home", version: 6, bundleUrl: "", manifest: {}, createdAt: "2026-03-08T14:00:00Z", changelog: "Tools section with Create a resource, Cloud Shell, Azure Mobile App links" },
  { id: "v-home-5", projectId: "proj-azure-home", version: 5, bundleUrl: "", manifest: {}, createdAt: "2026-02-28T11:00:00Z", changelog: "Navigate section with quick links grid" },
  { id: "v-home-4", projectId: "proj-azure-home", version: 4, bundleUrl: "", manifest: {}, createdAt: "2026-02-15T10:00:00Z", changelog: "Recent resources table with type and resource group columns" },
  { id: "v-home-3", projectId: "proj-azure-home", version: 3, bundleUrl: "", manifest: {}, createdAt: "2026-01-30T09:00:00Z", changelog: "Responsive grid layout for service icons" },
  { id: "v-home-2", projectId: "proj-azure-home", version: 2, bundleUrl: "", manifest: {}, createdAt: "2026-01-10T08:00:00Z", changelog: "Azure services icon grid with hover tooltips" },
  { id: "v-home-1", projectId: "proj-azure-home", version: 1, bundleUrl: "", manifest: {}, createdAt: "2025-12-01T09:00:00Z", changelog: "Initial home page layout with hero section" },
  // All Resources (draft, version 1 only)
  { id: "v-ar-1", projectId: "proj-all-resources", version: 1, bundleUrl: "", manifest: {}, createdAt: "2026-03-05T11:00:00Z", changelog: "Forked from Subscriptions — added multi-filter pills and mixed resource type grid" },
];

interface MockCollection {
  id: string;
  name: string;
  description: string;
  authorId: string;
  authorName: string;
  projectIds: string[];
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

interface MockShare {
  id: string;
  projectId: string;
  ownerId: string;
  ownerName: string;
  sharedWithId: string;
  sharedWithName: string;
  createdAt: string;
}

const mockCollections: MockCollection[] = [
  {
    id: "col-portal-pages",
    name: "Portal Core Pages",
    description: "Essential portal pages — home, subscriptions, all resources",
    authorId: "user-1",
    authorName: "Alex Britez",
    projectIds: ["proj-azure-home", "proj-subscriptions", "proj-all-resources"],
    createdAt: "2026-02-01T10:00:00Z",
    updatedAt: "2026-03-05T11:00:00Z",
    deletedAt: null,
  },
  {
    id: "col-identity",
    name: "Identity & Security",
    description: "Projects related to Entra ID, RBAC, and security features",
    authorId: "user-1",
    authorName: "Alex Britez",
    projectIds: ["proj-preview-features", "proj-static-web-app"],
    createdAt: "2026-02-15T09:00:00Z",
    updatedAt: "2026-03-01T14:00:00Z",
    deletedAt: null,
  },
];

const mockUser = {
  clientPrincipal: {
    userId: "user-1",
    userDetails: "Alex Britez",
    identityProvider: "aad",
    userRoles: ["authenticated", "anonymous"],
  },
};

// Mock users for sharing
const mockUsers = [
  { userId: "user-1", userDetails: "Alex Britez" },
  { userId: "user-2", userDetails: "Jamie Chen" },
  { userId: "user-3", userDetails: "Sara Kim" },
  { userId: "user-4", userDetails: "Marcus Johnson" },
  { userId: "user-5", userDetails: "Priya Patel" },
];

const mockShares: MockShare[] = [
  {
    id: "share-1",
    projectId: "proj-preview-features",
    ownerId: "user-1",
    ownerName: "Alex Britez",
    sharedWithId: "user-2",
    sharedWithName: "Jamie Chen",
    createdAt: "2026-03-01T10:00:00Z",
  },
  {
    id: "share-2",
    projectId: "proj-subscriptions",
    ownerId: "user-1",
    ownerName: "Alex Britez",
    sharedWithId: "user-3",
    sharedWithName: "Sara Kim",
    createdAt: "2026-03-05T14:00:00Z",
  },
  {
    id: "share-3",
    projectId: "proj-sre-agent",
    ownerId: "user-2",
    ownerName: "Jamie Chen",
    sharedWithId: "user-1",
    sharedWithName: "Alex Britez",
    createdAt: "2026-03-02T09:00:00Z",
  },
  {
    id: "share-4",
    projectId: "proj-azure-home",
    ownerId: "user-3",
    ownerName: "Sara Kim",
    sharedWithId: "user-1",
    sharedWithName: "Alex Britez",
    createdAt: "2026-03-04T11:00:00Z",
  },
];

/* ── Helpers ── */
function parseBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk: Buffer) => (data += chunk.toString()));
    req.on("end", () => {
      try { resolve(JSON.parse(data)); } catch { resolve({}); }
    });
  });
}

function json(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

/* ── Plugin ── */
export function mockApiPlugin(): Plugin {
  return {
    name: "mock-api",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url ?? "";
        if (!url.startsWith("/api/") && url !== "/.auth/me") return next();

        // Auth endpoint
        if (url === "/.auth/me") {
          return json(res, 200, mockUser);
        }

        const method = req.method ?? "GET";

        // GET /api/projects
        if (url === "/api/projects" && method === "GET") {
          const userProjects = mockProjects.filter((p) => p.author.id === "user-1");
          return json(res, 200, userProjects);
        }

        // POST /api/projects
        if (url === "/api/projects" && method === "POST") {
          const body = await parseBody(req);
          const newProj = {
            ...mockProjects[1],
            id: `proj-${Date.now()}`,
            name: String(body.name ?? "New Project"),
            description: String(body.description ?? ""),
            tags: (body.tags as string[]) ?? [],
            status: "draft",
            starCount: 0,
            forkCount: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          mockProjects.push(newProj);
          return json(res, 201, newProj);
        }

        // GET /api/community
        if (url.startsWith("/api/community")) {
          const params = new URL(url, "http://localhost").searchParams;
          const search = params.get("search")?.toLowerCase() ?? "";
          const tagsFilter = params.get("tags")?.split(",").filter(Boolean) ?? [];
          const layoutFilter = params.get("layout") ?? "";
          const sortBy = params.get("sort") ?? "stars";

          let results = mockProjects.filter((p) => p.status === "published");

          if (search) {
            results = results.filter(
              (p) => p.name.toLowerCase().includes(search) || p.description.toLowerCase().includes(search)
            );
          }
          if (tagsFilter.length) {
            results = results.filter((p) => tagsFilter.every((t) => p.tags.includes(t)));
          }
          if (layoutFilter === "full-width" || layoutFilter === "side-panel") {
            results = results.filter((p) => p.layout === layoutFilter);
          }

          results.sort((a, b) => {
            if (sortBy === "newest") return new Date(b.publishedAt ?? 0).getTime() - new Date(a.publishedAt ?? 0).getTime();
            if (sortBy === "forks") return b.forkCount - a.forkCount;
            return b.starCount - a.starCount;
          });

          return json(res, 200, { items: results, total: results.length });
        }

        // Project-level routes: /api/projects/:id/...
        const projectMatch = url.match(/^\/api\/projects\/([^/]+)(\/.*)?$/);
        if (projectMatch) {
          const [, id, sub] = projectMatch;
          const project = mockProjects.find((p) => p.id === id);

          if (!sub && method === "GET") {
            return project ? json(res, 200, project) : json(res, 404, { error: "Not found" });
          }
          if (!sub && method === "DELETE") {
            return json(res, 204, null);
          }
          if (sub === "/versions" && method === "GET") {
            const vers = mockVersions.filter((v) => v.projectId === id);
            return json(res, 200, vers);
          }
          if (sub === "/publish" && method === "PUT") {
            if (project) project.status = project.status === "published" ? "draft" : "published";
            return json(res, 200, project);
          }
          if (sub === "/star" && method === "POST") {
            if (project) { project.starCount++; project.isStarred = true; }
            return json(res, 204, null);
          }
          if (sub === "/star" && method === "DELETE") {
            if (project) { project.starCount = Math.max(0, project.starCount - 1); project.isStarred = false; }
            return json(res, 204, null);
          }
          if (sub === "/forks" && method === "GET") {
            const forks = mockProjects.filter((p) => p.forkedFrom?.projectId === id);
            return json(res, 200, forks);
          }
          if (sub === "/fork" && method === "POST") {
            const forked = {
              ...project,
              id: `proj-${Date.now()}`,
              name: `${project?.name} (fork)`,
              status: "draft",
              forkedFrom: { projectId: id, projectName: project?.name ?? "", authorName: project?.author.name ?? "" },
              starCount: 0,
              forkCount: 0,
            };
            return json(res, 201, forked);
          }
          if (sub === "/metadata" && method === "PATCH") {
            return json(res, 200, project);
          }
        }

        // GET /api/collections
        if (url === "/api/collections" && method === "GET") {
          const userCollections = mockCollections.filter((c) => c.authorId === "user-1" && !c.deletedAt);
          return json(res, 200, userCollections);
        }

        // POST /api/collections
        if (url === "/api/collections" && method === "POST") {
          const body = await parseBody(req);
          const now = new Date().toISOString();
          const newCol: MockCollection = {
            id: `col-${Date.now()}`,
            name: String(body.name ?? "New Collection"),
            description: String(body.description ?? ""),
            authorId: "user-1",
            authorName: "Alex Britez",
            projectIds: [],
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
          };
          mockCollections.push(newCol);
          return json(res, 201, newCol);
        }

        // Collection-level routes: /api/collections/:id/...
        const colMatch = url.match(/^\/api\/collections\/([^/]+)(\/.*)?$/);
        if (colMatch) {
          const [, colId, colSub] = colMatch;
          const col = mockCollections.find((c) => c.id === colId && !c.deletedAt);

          if (!colSub && method === "GET") {
            return col ? json(res, 200, col) : json(res, 404, { error: "Not found" });
          }
          if (!colSub && method === "PATCH") {
            if (!col) return json(res, 404, { error: "Not found" });
            const body = await parseBody(req);
            if (body.name) col.name = String(body.name);
            if (body.description !== undefined) col.description = String(body.description);
            if (Array.isArray(body.projectIds)) col.projectIds = body.projectIds as string[];
            col.updatedAt = new Date().toISOString();
            return json(res, 200, col);
          }
          if (!colSub && method === "DELETE") {
            if (col) col.deletedAt = new Date().toISOString();
            return json(res, 204, null);
          }
          if (colSub === "/projects" && method === "POST") {
            if (!col) return json(res, 404, { error: "Not found" });
            const body = await parseBody(req);
            const pid = String(body.projectId ?? "");
            if (pid && !col.projectIds.includes(pid)) col.projectIds.push(pid);
            col.updatedAt = new Date().toISOString();
            return json(res, 200, col);
          }
          if (colSub === "/projects" && method === "DELETE") {
            if (!col) return json(res, 404, { error: "Not found" });
            const body = await parseBody(req);
            const pid = String(body.projectId ?? "");
            col.projectIds = col.projectIds.filter((p) => p !== pid);
            col.updatedAt = new Date().toISOString();
            return json(res, 200, col);
          }
        }

        // GET /api/stars/mine — projects the current user has starred
        if (url === "/api/stars/mine" && method === "GET") {
          const starredProjects = mockProjects.filter((p) => p.isStarred);
          return json(res, 200, starredProjects);
        }

        // GET /api/shares/by-me
        if (url === "/api/shares/by-me" && method === "GET") {
          const myShares = mockShares.filter((s) => s.ownerId === "user-1");
          return json(res, 200, myShares);
        }

        // GET /api/shares/with-me
        if (url === "/api/shares/with-me" && method === "GET") {
          const sharedWithMe = mockShares.filter((s) => s.sharedWithId === "user-1");
          return json(res, 200, sharedWithMe);
        }

        // GET /api/users/search?q=...
        if (url.startsWith("/api/users/search") && method === "GET") {
          const params = new URL(url, "http://localhost").searchParams;
          const q = params.get("q")?.toLowerCase() ?? "";
          const results = mockUsers
            .filter((u) => u.userId !== "user-1") // exclude current user
            .filter((u) => u.userDetails.toLowerCase().includes(q));
          return json(res, 200, results);
        }

        // Project shares sub-routes: /api/projects/:id/share(s)
        const shareMatch = url.match(/^\/api\/projects\/([^/]+)\/(shares?)$/);
        if (shareMatch) {
          const [, projId, endpoint] = shareMatch;

          // GET /api/projects/:id/shares — list who this project is shared with
          if (endpoint === "shares" && method === "GET") {
            const projectShares = mockShares.filter((s) => s.projectId === projId && s.ownerId === "user-1");
            return json(res, 200, projectShares);
          }

          // POST /api/projects/:id/share — share a project
          if (endpoint === "share" && method === "POST") {
            const body = await parseBody(req);
            const shareDoc: MockShare = {
              id: `share-${Date.now()}`,
              projectId: projId,
              ownerId: "user-1",
              ownerName: "Alex Britez",
              sharedWithId: String(body.userId ?? ""),
              sharedWithName: String(body.userName ?? ""),
              createdAt: new Date().toISOString(),
            };
            mockShares.push(shareDoc);
            return json(res, 201, shareDoc);
          }

          // DELETE /api/projects/:id/share — unshare
          if (endpoint === "share" && method === "DELETE") {
            const body = await parseBody(req);
            const shareId = String(body.shareId ?? "");
            const idx = mockShares.findIndex((s) => s.id === shareId);
            if (idx >= 0) {
              mockShares.splice(idx, 1);
            }
            return json(res, 204, null);
          }
        }

        return json(res, 404, { error: "Not found" });
      });
    },
  };
}
