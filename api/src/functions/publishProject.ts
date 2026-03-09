import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { projects } from "../shared/cosmos.js";
import { requireUser, AuthError } from "../shared/auth.js";
import type { ProjectDocument } from "../shared/types.js";

/**
 * API-4: PUT /api/projects/:id/publish — Toggle publish status
 */

async function handlePublish(req: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
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
      return { status: 403, body: "Only the project owner can publish" };
    }

    const body = (await req.json()) as { publish: boolean };
    const now = new Date().toISOString();

    const updates: Partial<ProjectDocument> = {
      status: body.publish ? "published" : "draft",
      updatedAt: now,
      publishedAt: body.publish ? (project.publishedAt ?? now) : project.publishedAt,
    };

    const { resource: updated } = await container.item(id, id).patch({
      operations: [
        { op: "set", path: "/status", value: updates.status },
        { op: "set", path: "/updatedAt", value: updates.updatedAt },
        { op: "set", path: "/publishedAt", value: updates.publishedAt },
      ],
    });

    return { status: 200, jsonBody: updated };
  } catch (err) {
    if (err instanceof AuthError) {
      return { status: err.statusCode, body: err.message };
    }
    throw err;
  }
}

app.http("publishProject", {
  methods: ["PUT"],
  authLevel: "anonymous",
  route: "projects/{id}/publish",
  handler: handlePublish,
});
