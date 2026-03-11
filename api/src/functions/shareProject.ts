import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { query } from "../shared/db.js";
import { requireUser, AuthError } from "../shared/auth.js";
import type { ShareDocument } from "../shared/types.js";
import { randomUUID } from "node:crypto";

async function handleShareAction(req: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const user = await requireUser(req);
    const projectId = req.params.id;
    if (!projectId) return { status: 400, body: "Missing project ID" };

    // Verify project exists
    const r = await query();
    const projResult = await r
      .input("id", projectId)
      .query("SELECT author_id FROM projects WHERE id = @id AND deleted_at IS NULL");

    if (projResult.recordset.length === 0) return { status: 404, body: "Project not found" };
    const project = projResult.recordset[0];

    if (req.method === "POST") {
      if (project.author_id !== user.userId) return { status: 403, body: "Only the project owner can share" };

      const body = (await req.json()) as { userId: string; userName: string };
      if (!body.userId || !body.userName) return { status: 400, body: "userId and userName are required" };
      if (body.userId === user.userId) return { status: 400, body: "Cannot share a project with yourself" };

      const id = randomUUID();
      const r2 = await query();
      try {
        await r2
          .input("id", id)
          .input("projectId", projectId)
          .input("ownerId", user.userId)
          .input("ownerName", user.userDetails)
          .input("sharedWithId", body.userId)
          .input("sharedWithName", body.userName)
          .input("createdAt", new Date().toISOString())
          .query(`
            INSERT INTO shares (id, project_id, owner_id, owner_name, shared_with_id, shared_with_name, created_at)
            VALUES (@id, @projectId, @ownerId, @ownerName, @sharedWithId, @sharedWithName, @createdAt)
          `);
      } catch (err: unknown) {
        // Unique constraint violation = already shared
        if ((err as { number?: number }).number === 2627) {
          return { status: 409, body: "Already shared with this user" };
        }
        throw err;
      }

      const share: ShareDocument = {
        id,
        projectId,
        ownerId: user.userId,
        ownerName: user.userDetails,
        sharedWithId: body.userId,
        sharedWithName: body.userName,
        createdAt: new Date().toISOString(),
      };
      return { status: 201, jsonBody: share };
    }

    if (req.method === "DELETE") {
      const body = (await req.json()) as { shareId: string };
      if (!body.shareId) return { status: 400, body: "shareId is required" };

      const r2 = await query();
      const shareResult = await r2
        .input("shareId", body.shareId)
        .query("SELECT * FROM shares WHERE id = @shareId");

      if (shareResult.recordset.length === 0) return { status: 404, body: "Share not found" };
      const share = shareResult.recordset[0];

      if (share.owner_id !== user.userId && share.shared_with_id !== user.userId) {
        return { status: 403, body: "Not authorized to remove this share" };
      }

      const r3 = await query();
      await r3.input("shareId", body.shareId).query("DELETE FROM shares WHERE id = @shareId");
      return { status: 204 };
    }

    return { status: 405, body: "Method not allowed" };
  } catch (err) {
    if (err instanceof AuthError) return { status: err.statusCode, body: err.message };
    throw err;
  }
}

async function handleProjectShares(req: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const user = await requireUser(req);
    const projectId = req.params.id;
    if (!projectId) return { status: 400, body: "Missing project ID" };

    const r = await query();
    const result = await r
      .input("projectId", projectId)
      .input("ownerId", user.userId)
      .query("SELECT * FROM shares WHERE project_id = @projectId AND owner_id = @ownerId");

    return { status: 200, jsonBody: result.recordset.map(rowToShare) };
  } catch (err) {
    if (err instanceof AuthError) return { status: err.statusCode, body: err.message };
    throw err;
  }
}

async function handleSharedByMe(req: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const user = await requireUser(req);
    const r = await query();
    const result = await r
      .input("ownerId", user.userId)
      .query("SELECT * FROM shares WHERE owner_id = @ownerId ORDER BY created_at DESC");

    return { status: 200, jsonBody: result.recordset.map(rowToShare) };
  } catch (err) {
    if (err instanceof AuthError) return { status: err.statusCode, body: err.message };
    throw err;
  }
}

async function handleSharedWithMe(req: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const user = await requireUser(req);
    const r = await query();
    const result = await r
      .input("userId", user.userId)
      .query("SELECT * FROM shares WHERE shared_with_id = @userId ORDER BY created_at DESC");

    return { status: 200, jsonBody: result.recordset.map(rowToShare) };
  } catch (err) {
    if (err instanceof AuthError) return { status: err.statusCode, body: err.message };
    throw err;
  }
}

function rowToShare(row: Record<string, unknown>): ShareDocument {
  return {
    id: row.id as string,
    projectId: row.project_id as string,
    ownerId: row.owner_id as string,
    ownerName: row.owner_name as string,
    sharedWithId: row.shared_with_id as string,
    sharedWithName: row.shared_with_name as string,
    createdAt: (row.created_at as Date)?.toISOString?.() ?? (row.created_at as string),
  };
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
