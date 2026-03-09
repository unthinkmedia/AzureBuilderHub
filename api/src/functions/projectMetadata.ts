import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { projects } from "../shared/cosmos.js";
import { requireUser, AuthError } from "../shared/auth.js";
import type { ProjectDocument } from "../shared/types.js";

/**
 * API-9: PATCH /api/projects/:id/metadata — Update name, description, tags
 */

async function handleMetadata(req: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
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
      return { status: 403, body: "Only the project owner can edit metadata" };
    }

    const body = (await req.json()) as Partial<Pick<ProjectDocument, "name" | "description" | "tags">>;
    const operations: Array<{ op: "set"; path: string; value: unknown }> = [];

    if (body.name !== undefined) {
      if (typeof body.name !== "string" || body.name.trim().length < 3) {
        return { status: 400, body: "Name must be at least 3 characters" };
      }
      operations.push({ op: "set", path: "/name", value: body.name.trim() });
    }

    if (body.description !== undefined) {
      operations.push({ op: "set", path: "/description", value: (body.description ?? "").trim() });
    }

    if (body.tags !== undefined) {
      if (!Array.isArray(body.tags)) {
        return { status: 400, body: "Tags must be an array" };
      }
      operations.push({ op: "set", path: "/tags", value: body.tags.slice(0, 10) });
    }

    if (operations.length === 0) {
      return { status: 200, jsonBody: project };
    }

    operations.push({ op: "set", path: "/updatedAt", value: new Date().toISOString() });

    const { resource: updated } = await container.item(id, id).patch({ operations });

    return { status: 200, jsonBody: updated };
  } catch (err) {
    if (err instanceof AuthError) {
      return { status: err.statusCode, body: err.message };
    }
    throw err;
  }
}

app.http("projectMetadata", {
  methods: ["PATCH"],
  authLevel: "anonymous",
  route: "projects/{id}/metadata",
  handler: handleMetadata,
});
