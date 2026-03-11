import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { query } from "../shared/db.js";
import { requireUser, AuthError } from "../shared/auth.js";

async function handleDelete(req: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const user = await requireUser(req);
    const id = req.params.id;
    if (!id) return { status: 400, body: "Missing project ID" };

    const r = await query();
    const result = await r
      .input("id", id)
      .query("SELECT author_id FROM projects WHERE id = @id AND deleted_at IS NULL");

    if (result.recordset.length === 0) return { status: 404, body: "Project not found" };
    if (result.recordset[0].author_id !== user.userId) return { status: 403, body: "Only the project owner can delete" };

    const r2 = await query();
    await r2
      .input("id", id)
      .input("deletedAt", new Date().toISOString())
      .query("UPDATE projects SET deleted_at = @deletedAt, status = 'archived' WHERE id = @id");

    return { status: 204 };
  } catch (err) {
    if (err instanceof AuthError) return { status: err.statusCode, body: err.message };
    throw err;
  }
}

app.http("deleteProject", {
  methods: ["DELETE"],
  authLevel: "anonymous",
  route: "projects/{id}",
  handler: handleDelete,
});
