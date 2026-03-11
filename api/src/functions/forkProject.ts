import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getPool, query } from "../shared/db.js";
import { requireUser, AuthError } from "../shared/auth.js";
import { rowToProject } from "./projects.js";
import { randomUUID } from "node:crypto";

async function handleFork(req: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const user = requireUser(req);
    const id = req.params.id;
    if (!id) return { status: 400, body: "Missing project ID" };

    const r = await query();
    const result = await r
      .input("id", id)
      .query("SELECT * FROM projects WHERE id = @id AND deleted_at IS NULL");

    if (result.recordset.length === 0) return { status: 404, body: "Project not found" };
    const original = result.recordset[0];
    if (original.status !== "published") return { status: 403, body: "Can only fork published projects" };

    const now = new Date().toISOString();
    const newId = randomUUID();

    const pool = await getPool();
    const txn = pool.transaction();
    await txn.begin();
    try {
      // Create forked project and return it via OUTPUT
      const insertResult = await txn.request()
        .input("id", newId)
        .input("name", `${original.name} (fork)`)
        .input("description", original.description)
        .input("authorId", user.userId)
        .input("authorName", user.userDetails)
        .input("tags", original.tags)
        .input("layout", original.layout)
        .input("pageCount", original.page_count)
        .input("forkedFromProjectId", original.id)
        .input("forkedFromProjectName", original.name)
        .input("forkedFromAuthorName", original.author_name)
        .input("thumbnailUrl", original.thumbnail_url)
        .input("previewUrl", original.preview_url)
        .input("createdAt", now)
        .input("updatedAt", now)
        .query(`
          INSERT INTO projects (
            id, name, description, author_id, author_name, tags, layout,
            page_count, forked_from_project_id, forked_from_project_name, forked_from_author_name,
            thumbnail_url, preview_url, created_at, updated_at
          )
          OUTPUT INSERTED.*
          VALUES (
            @id, @name, @description, @authorId, @authorName, @tags, @layout,
            @pageCount, @forkedFromProjectId, @forkedFromProjectName, @forkedFromAuthorName,
            @thumbnailUrl, @previewUrl, @createdAt, @updatedAt
          )
        `);

      // Increment fork count on original
      await txn.request()
        .input("id", id)
        .input("updatedAt", now)
        .query("UPDATE projects SET fork_count = fork_count + 1, updated_at = @updatedAt WHERE id = @id");

      await txn.commit();
      return { status: 201, jsonBody: rowToProject(insertResult.recordset[0]) };
    } catch (e) {
      await txn.rollback();
      throw e;
    }
  } catch (err) {
    if (err instanceof AuthError) return { status: err.statusCode, body: err.message };
    throw err;
  }
}

app.http("forkProject", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "projects/{id}/fork",
  handler: handleFork,
});
