import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { projects } from "../shared/cosmos.js";
import { requireUser, AuthError } from "../shared/auth.js";
import type { ProjectDocument } from "../shared/types.js";
import { randomUUID } from "node:crypto";

/**
 * API-5: POST /api/projects/:id/fork — Fork a project
 */

async function handleFork(req: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const user = requireUser(req);
    const id = req.params.id;
    if (!id) return { status: 400, body: "Missing project ID" };

    const container = projects();
    const { resource: original } = await container.item(id, id).read<ProjectDocument>();

    if (!original || original.deletedAt) {
      return { status: 404, body: "Project not found" };
    }

    if (original.status !== "published") {
      return { status: 403, body: "Can only fork published projects" };
    }

    const now = new Date().toISOString();
    const forkedProject: ProjectDocument = {
      id: randomUUID(),
      name: `${original.name} (fork)`,
      description: original.description,
      authorId: user.userId,
      authorName: user.userDetails,
      status: "draft",
      tags: [...original.tags],
      azureServices: [...original.azureServices],
      layout: original.layout,
      pageCount: original.pageCount,
      currentVersion: 0,
      starCount: 0,
      forkCount: 0,
      forkedFrom: {
        projectId: original.id,
        projectName: original.name,
        authorName: original.authorName,
      },
      thumbnailUrl: original.thumbnailUrl,
      previewUrl: original.previewUrl,
      createdAt: now,
      updatedAt: now,
      publishedAt: null,
      deletedAt: null,
    };

    // Increment fork count on original
    await container.item(id, id).patch({
      operations: [
        { op: "incr", path: "/forkCount", value: 1 },
        { op: "set", path: "/updatedAt", value: now },
      ],
    });

    const { resource } = await container.items.create(forkedProject);

    return { status: 201, jsonBody: resource };
  } catch (err) {
    if (err instanceof AuthError) {
      return { status: err.statusCode, body: err.message };
    }
    throw err;
  }
}

app.http("forkProject", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "projects/{id}/fork",
  handler: handleFork,
});
