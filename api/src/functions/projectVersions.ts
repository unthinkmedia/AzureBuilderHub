import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { projects, versions } from "../shared/cosmos.js";
import { getUser, AuthError } from "../shared/auth.js";
import type { ProjectDocument } from "../shared/types.js";

/**
 * API-8: GET /api/projects/:id/versions — List version history
 */

async function handleVersions(req: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const projectId = req.params.id;
    if (!projectId) return { status: 400, body: "Missing project ID" };

    // Verify project exists and user has access
    const { resource: project } = await projects().item(projectId, projectId).read<ProjectDocument>();

    if (!project || project.deletedAt) {
      return { status: 404, body: "Project not found" };
    }

    if (project.status !== "published") {
      const user = getUser(req);
      if (!user || user.userId !== project.authorId) {
        return { status: 404, body: "Project not found" };
      }
    }

    const { resources } = await versions().items
      .query({
        query: "SELECT * FROM c WHERE c.projectId = @projectId ORDER BY c.version DESC",
        parameters: [{ name: "@projectId", value: projectId }],
      })
      .fetchAll();

    return { status: 200, jsonBody: resources };
  } catch (err) {
    if (err instanceof AuthError) {
      return { status: err.statusCode, body: err.message };
    }
    throw err;
  }
}

app.http("projectVersions", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "projects/{id}/versions",
  handler: handleVersions,
});
