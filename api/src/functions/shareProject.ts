import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { projects, shares } from "../shared/cosmos.js";
import { requireUser, AuthError } from "../shared/auth.js";
import type { ProjectDocument, ShareDocument } from "../shared/types.js";
import { randomUUID } from "node:crypto";

/**
 * POST   /api/projects/:id/share   — Share a project with a user
 * DELETE /api/projects/:id/share   — Unshare a project from a user
 * GET    /api/projects/:id/shares  — List users a project is shared with
 * GET    /api/shares/by-me         — List all projects shared by the current user
 * GET    /api/shares/with-me       — List all projects shared with the current user
 */

async function handleShareAction(req: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const user = requireUser(req);
    const projectId = req.params.id;
    if (!projectId) return { status: 400, body: "Missing project ID" };

    const container = projects();
    const { resource: project } = await container.item(projectId, projectId).read<ProjectDocument>();

    if (!project || project.deletedAt) {
      return { status: 404, body: "Project not found" };
    }

    if (req.method === "POST") {
      // Only the owner can share their project
      if (project.authorId !== user.userId) {
        return { status: 403, body: "Only the project owner can share" };
      }

      const body = (await req.json()) as { userId: string; userName: string };
      if (!body.userId || !body.userName) {
        return { status: 400, body: "userId and userName are required" };
      }

      // Can't share with yourself
      if (body.userId === user.userId) {
        return { status: 400, body: "Cannot share a project with yourself" };
      }

      const shareDoc: ShareDocument = {
        id: randomUUID(),
        projectId,
        ownerId: user.userId,
        ownerName: user.userDetails,
        sharedWithId: body.userId,
        sharedWithName: body.userName,
        createdAt: new Date().toISOString(),
      };

      try {
        const { resource } = await shares().items.create(shareDoc);
        return { status: 201, jsonBody: resource };
      } catch (err: unknown) {
        if ((err as { code?: number }).code === 409) {
          return { status: 409, body: "Already shared with this user" };
        }
        throw err;
      }
    }

    if (req.method === "DELETE") {
      // Owner can unshare, or the shared user can remove themselves
      const body = (await req.json()) as { shareId: string };
      if (!body.shareId) return { status: 400, body: "shareId is required" };

      try {
        const { resource: share } = await shares().item(body.shareId, body.shareId).read<ShareDocument>();
        if (!share) return { status: 404, body: "Share not found" };

        // Only owner or the recipient can remove
        if (share.ownerId !== user.userId && share.sharedWithId !== user.userId) {
          return { status: 403, body: "Not authorized to remove this share" };
        }

        await shares().item(body.shareId, body.shareId).delete();
        return { status: 204 };
      } catch (err: unknown) {
        if ((err as { code?: number }).code === 404) {
          return { status: 404, body: "Share not found" };
        }
        throw err;
      }
    }

    return { status: 405, body: "Method not allowed" };
  } catch (err) {
    if (err instanceof AuthError) {
      return { status: err.statusCode, body: err.message };
    }
    throw err;
  }
}

async function handleProjectShares(req: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const user = requireUser(req);
    const projectId = req.params.id;
    if (!projectId) return { status: 400, body: "Missing project ID" };

    const { resources } = await shares().items
      .query({
        query: "SELECT * FROM c WHERE c.projectId = @projectId AND c.ownerId = @ownerId",
        parameters: [
          { name: "@projectId", value: projectId },
          { name: "@ownerId", value: user.userId },
        ],
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

async function handleSharedByMe(req: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const user = requireUser(req);

    const { resources } = await shares().items
      .query({
        query: "SELECT * FROM c WHERE c.ownerId = @ownerId ORDER BY c.createdAt DESC",
        parameters: [{ name: "@ownerId", value: user.userId }],
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

async function handleSharedWithMe(req: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const user = requireUser(req);

    const { resources } = await shares().items
      .query({
        query: "SELECT * FROM c WHERE c.sharedWithId = @userId ORDER BY c.createdAt DESC",
        parameters: [{ name: "@userId", value: user.userId }],
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

app.http("shareProject", {
  methods: ["POST", "DELETE"],
  authLevel: "anonymous",
  route: "projects/{id}/share",
  handler: handleShareAction,
});

app.http("projectShares", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "projects/{id}/shares",
  handler: handleProjectShares,
});

app.http("sharedByMe", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "shares/by-me",
  handler: handleSharedByMe,
});

app.http("sharedWithMe", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "shares/with-me",
  handler: handleSharedWithMe,
});
