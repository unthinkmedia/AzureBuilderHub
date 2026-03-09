import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { projects } from "../shared/cosmos.js";
import { getUser, requireUser, AuthError } from "../shared/auth.js";
import type { ProjectDocument } from "../shared/types.js";

/**
 * API-3: GET /api/projects/:id — Get project detail
 */

async function handleProjectById(req: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const id = req.params.id;
    if (!id) return { status: 400, body: "Missing project ID" };

    const container = projects();
    const { resource: project } = await container.item(id, id).read<ProjectDocument>();

    if (!project || project.deletedAt) {
      return { status: 404, body: "Project not found" };
    }

    // Draft projects are only visible to the owner
    if (project.status !== "published") {
      const user = getUser(req);
      if (!user || user.userId !== project.authorId) {
        return { status: 404, body: "Project not found" };
      }
    }

    return { status: 200, jsonBody: project };
  } catch (err) {
    if (err instanceof AuthError) {
      return { status: err.statusCode, body: err.message };
    }
    throw err;
  }
}

app.http("projectById", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "projects/{id}",
  handler: handleProjectById,
});
