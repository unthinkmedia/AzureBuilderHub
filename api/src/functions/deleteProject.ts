import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { projects } from "../shared/cosmos.js";
import { requireUser, AuthError } from "../shared/auth.js";
import type { ProjectDocument } from "../shared/types.js";

/**
 * DELETE /api/projects/:id — Soft-delete a project (retained 30 days per PRD)
 */

async function handleDelete(req: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const user = requireUser(req);
    const id = req.params.id;
    if (!id) return { status: 400, body: "Missing project ID" };

    const container = projects();
    const { resource: project } = await container.item(id, id).read<ProjectDocument>();

    if (!project || project.deletedAt) {
      return { status: 404, body: "Project not found" };
    }

    if (project.authorId !== user.userId) {
      return { status: 403, body: "Only the project owner can delete" };
    }

    await container.item(id, id).patch({
      operations: [
        { op: "set", path: "/deletedAt", value: new Date().toISOString() },
        { op: "set", path: "/status", value: "archived" },
      ],
    });

    return { status: 204 };
  } catch (err) {
    if (err instanceof AuthError) {
      return { status: err.statusCode, body: err.message };
    }
    throw err;
  }
}

app.http("deleteProject", {
  methods: ["DELETE"],
  authLevel: "anonymous",
  route: "projects/{id}",
  handler: handleDelete,
});
