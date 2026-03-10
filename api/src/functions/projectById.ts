import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { query } from "../shared/db.js";
import { getUser, AuthError } from "../shared/auth.js";
import { rowToProject } from "./projects.js";

async function handleProjectById(req: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const id = req.params.id;
    if (!id) return { status: 400, body: "Missing project ID" };

    const r = await query();
    const result = await r
      .input("id", id)
      .query("SELECT * FROM projects WHERE id = @id AND deleted_at IS NULL");

    if (result.recordset.length === 0) {
      return { status: 404, body: "Project not found" };
    }

    const project = rowToProject(result.recordset[0]);

    if (project.status !== "published") {
      const user = getUser(req);
      if (!user || user.userId !== project.authorId) {
        return { status: 404, body: "Project not found" };
      }
    }

    return { status: 200, jsonBody: project };
  } catch (err) {
    if (err instanceof AuthError) return { status: err.statusCode, body: err.message };
    throw err;
  }
}

app.http("projectById", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "projects/{id}",
  handler: handleProjectById,
});
