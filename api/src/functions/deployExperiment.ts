import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { query } from "../shared/db.js";
import { randomUUID } from "node:crypto";
import { rowToProject } from "./projects.js";
import { generateUploadSasUrl } from "../shared/storage.js";
import { validateDeployToken } from "../shared/deploy-auth.js";

/**
 * Deploy endpoint called by Playground deploy scripts.
 * Authenticates via AAD Bearer token (from `az account get-access-token`).
 *
 * POST /api/deploy
 * Headers: Authorization: Bearer <AAD token>
 * Body: {
 *   repoOwner, repoName, experimentName, description,
 *   tags?, layout?, pageCount?,
 *   authorName?, changelog?
 * }
 *
 * Creates or updates a project, creates a new version record,
 * and returns a SAS upload URL for the client to push files.
 */
async function handleDeploy(req: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  // ── Auth: validate AAD Bearer token ──
  let identity;
  try {
    identity = await validateDeployToken(req.headers.get("authorization"));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Auth configuration error";
    return { status: 500, body: msg };
  }
  if (!identity) {
    return { status: 401, body: "JWT validation returned null — check server logs" };
  }

  try {
    const body = (await req.json()) as DeployPayload;

    // ── Validate required fields ──
    if (!body.repoOwner || !body.repoName) {
      return { status: 400, body: "repoOwner and repoName are required" };
    }
    if (!body.experimentName || body.experimentName.trim().length < 3) {
      return { status: 400, body: "experimentName must be at least 3 characters" };
    }

    const repoSlug = `${body.repoOwner}/${body.repoName}`;
    const now = new Date().toISOString();
    const tags = Array.isArray(body.tags) ? body.tags.slice(0, 10) : [];
    const layout = body.layout === "side-panel" ? "side-panel" : "full-width";
    const authorId = `aad:${identity.userId}`;
    const authorName = body.authorName || identity.userName || identity.userEmail;
    const pageCount = typeof body.pageCount === "number" ? body.pageCount : 1;

    // ── Find existing project by author + name ──
    const r1 = await query();
    const existing = await r1
      .input("authorId", authorId)
      .input("name", body.experimentName.trim())
      .query(`
        SELECT * FROM projects
        WHERE author_id = @authorId AND name = @name AND deleted_at IS NULL
      `);

    let projectId: string;
    let currentVersion: number;

    if (existing.recordset.length > 0) {
      // ── Update existing project ──
      const project = existing.recordset[0];
      projectId = project.id as string;
      currentVersion = (project.current_version as number) + 1;

      // Preview and thumbnail URLs are derived from projectId
      const previewUrl = `/api/projects/${projectId}/preview/`;
      const thumbnailUrl = `/api/projects/${projectId}/preview/thumbnail.png`;

      const r2 = await query();
      await r2
        .input("id", projectId)
        .input("description", body.description?.trim() ?? project.description)
        .input("previewUrl", previewUrl)
        .input("thumbnailUrl", thumbnailUrl)
        .input("tags", JSON.stringify(tags.length ? tags : JSON.parse((project.tags as string) || "[]")))
        .input("layout", layout)
        .input("pageCount", pageCount)
        .input("currentVersion", currentVersion)
        .input("updatedAt", now)
        .input("status", "published")
        .input("publishedAt", project.published_at ?? now)
        .query(`
          UPDATE projects SET
            description = @description,
            preview_url = @previewUrl,
            thumbnail_url = @thumbnailUrl,
            tags = @tags,
            layout = @layout,
            page_count = @pageCount,
            current_version = @currentVersion,
            updated_at = @updatedAt,
            status = @status,
            published_at = @publishedAt
          WHERE id = @id
        `);
    } else {
      // ── Create new project ──
      projectId = randomUUID();
      currentVersion = 1;

      const previewUrl = `/api/projects/${projectId}/preview/`;
      const thumbnailUrl = `/api/projects/${projectId}/preview/thumbnail.png`;

      const r2 = await query();
      await r2
        .input("id", projectId)
        .input("name", body.experimentName.trim())
        .input("description", body.description?.trim() ?? "")
        .input("authorId", authorId)
        .input("authorName", authorName)
        .input("tags", JSON.stringify(tags))
        .input("layout", layout)
        .input("pageCount", pageCount)
        .input("previewUrl", previewUrl)
        .input("thumbnailUrl", thumbnailUrl)
        .input("currentVersion", currentVersion)
        .input("status", "published")
        .input("createdAt", now)
        .input("updatedAt", now)
        .input("publishedAt", now)
        .query(`
          INSERT INTO projects (id, name, description, author_id, author_name, tags, layout, page_count, preview_url, thumbnail_url, current_version, status, created_at, updated_at, published_at)
          VALUES (@id, @name, @description, @authorId, @authorName, @tags, @layout, @pageCount, @previewUrl, @thumbnailUrl, @currentVersion, @status, @createdAt, @updatedAt, @publishedAt)
        `);
    }

    // ── Create version record ──
    const versionId = randomUUID();
    const bundleUrl = `/api/projects/${projectId}/preview/`;
    const r3 = await query();
    await r3
      .input("id", versionId)
      .input("projectId", projectId)
      .input("version", currentVersion)
      .input("bundleUrl", bundleUrl)
      .input("manifest", JSON.stringify({ repo: repoSlug, layout, tags, pageCount }))
      .input("changelog", body.changelog ?? null)
      .input("createdAt", now)
      .query(`
        INSERT INTO versions (id, project_id, version, bundle_url, manifest, changelog, created_at)
        VALUES (@id, @projectId, @version, @bundleUrl, @manifest, @changelog, @createdAt)
      `);

    // ── Return the updated project + SAS upload URL ──
    const r4 = await query();
    const updated = await r4.input("id", projectId).query("SELECT * FROM projects WHERE id = @id");

    const uploadPrefix = `${projectId}/v${currentVersion}`;
    const uploadUrl = generateUploadSasUrl(uploadPrefix);

    return {
      status: existing.recordset.length > 0 ? 200 : 201,
      jsonBody: {
        project: rowToProject(updated.recordset[0]),
        projectId,
        version: currentVersion,
        uploadUrl,
        message: existing.recordset.length > 0
          ? `Updated project to version ${currentVersion}`
          : `Created new project (version ${currentVersion})`,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { status: 500, body: `Deploy failed: ${message}` };
  }
}

interface DeployPayload {
  repoOwner: string;
  repoName: string;
  experimentName: string;
  description?: string;
  tags?: string[];
  layout?: "full-width" | "side-panel";
  pageCount?: number;
  authorName?: string;
  changelog?: string;
}

app.http("deployExperiment", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "deploy",
  handler: handleDeploy,
});
