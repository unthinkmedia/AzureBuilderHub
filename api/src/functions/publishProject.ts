import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { query } from "../shared/db.js";
import { requireUser, AuthError } from "../shared/auth.js";
import { rowToProject } from "./projects.js";

async function handlePublish(req: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const user = await requireUser(req);
    const id = req.params.id;
    if (!id) return { status: 400, body: "Missing project ID" };

    const r = await query();
    const result = await r
      .input("id", id)
      .query("SELECT * FROM projects WHERE id = @id AND deleted_at IS NULL");

    if (result.recordset.length === 0) return { status: 404, body: "Project not found" };
    const project = result.recordset[0];
    if (project.author_id !== user.userId) return { status: 403, body: "Only the project owner can publish" };

    const body = (await req.json()) as { publish: boolean };
    const now = new Date().toISOString();
    const newStatus = body.publish ? "published" : "draft";
    const publishedAt = body.publish ? (project.published_at ?? now) : project.published_at;

    const r2 = await query();
    await r2
      .input("id", id)
      .input("status", newStatus)
      .input("updatedAt", now)
      .input("publishedAt", publishedAt)
      .query(`
        UPDATE projects
        SET status = @status, updated_at = @updatedAt, published_at = @publishedAt
        WHERE id = @id
      `);

    const r3 = await query();
    const updated = await r3.input("id", id).query("SELECT * FROM projects WHERE id = @id");

    return { status: 200, jsonBody: rowToProject(updated.recordset[0]) };
  } catch (err) {
    if (err instanceof AuthError) return { status: err.statusCode, body: err.message };
    throw err;
  }
}

app.http("publishProject", {
  methods: ["PUT"],
  authLevel: "anonymous",
  route: "projects/{id}/publish",
  handler: handlePublish,
});
