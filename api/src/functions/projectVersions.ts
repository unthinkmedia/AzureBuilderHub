import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { query } from "../shared/db.js";
import { getUser, AuthError } from "../shared/auth.js";
import type { VersionDocument } from "../shared/types.js";

async function handleVersions(req: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const projectId = req.params.id;
    if (!projectId) return { status: 400, body: "Missing project ID" };

    // Verify project exists and user has access
    const r = await query();
    const projResult = await r
      .input("id", projectId)
      .query("SELECT author_id, status FROM projects WHERE id = @id AND deleted_at IS NULL");

    if (projResult.recordset.length === 0) return { status: 404, body: "Project not found" };
    const project = projResult.recordset[0];

    if (project.status !== "published") {
      const user = getUser(req);
      if (!user || user.userId !== project.author_id) {
        return { status: 404, body: "Project not found" };
      }
    }

    const r2 = await query();
    const versions = await r2
      .input("projectId", projectId)
      .query("SELECT * FROM versions WHERE project_id = @projectId ORDER BY version DESC");

    return {
      status: 200,
      jsonBody: versions.recordset.map(rowToVersion),
    };
  } catch (err) {
    if (err instanceof AuthError) return { status: err.statusCode, body: err.message };
    throw err;
  }
}

function rowToVersion(row: Record<string, unknown>): VersionDocument {
  return {
    id: row.id as string,
    projectId: row.project_id as string,
    version: row.version as number,
    bundleUrl: row.bundle_url as string,
    manifest: JSON.parse((row.manifest as string) || "{}"),
    createdAt: (row.created_at as Date)?.toISOString?.() ?? (row.created_at as string),
    changelog: (row.changelog as string) ?? undefined,
  };
}

app.http("projectVersions", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "projects/{id}/versions",
  handler: handleVersions,
});
