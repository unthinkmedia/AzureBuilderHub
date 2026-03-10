import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { query } from "../shared/db.js";
import { requireUser, AuthError } from "../shared/auth.js";
import type { ProjectDocument } from "../shared/types.js";
import { rowToProject } from "./projects.js";

async function handleMetadata(req: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const user = requireUser(req);
    const id = req.params.id;
    if (!id) return { status: 400, body: "Missing project ID" };

    const r = await query();
    const result = await r
      .input("id", id)
      .query("SELECT * FROM projects WHERE id = @id AND deleted_at IS NULL");

    if (result.recordset.length === 0) return { status: 404, body: "Project not found" };
    const project = result.recordset[0];
    if (project.author_id !== user.userId) return { status: 403, body: "Only the project owner can edit metadata" };

    const body = (await req.json()) as Partial<Pick<ProjectDocument, "name" | "description" | "tags">>;

    // Build SET clause dynamically
    const sets: string[] = [];
    const r2 = await query();
    r2.input("id", id);

    if (body.name !== undefined) {
      if (typeof body.name !== "string" || body.name.trim().length < 3) {
        return { status: 400, body: "Name must be at least 3 characters" };
      }
      sets.push("name = @name");
      r2.input("name", body.name.trim());
    }

    if (body.description !== undefined) {
      sets.push("description = @description");
      r2.input("description", (body.description ?? "").trim());
    }

    if (body.tags !== undefined) {
      if (!Array.isArray(body.tags)) return { status: 400, body: "Tags must be an array" };
      sets.push("tags = @tags");
      r2.input("tags", JSON.stringify(body.tags.slice(0, 10)));
    }

    if (sets.length === 0) {
      return { status: 200, jsonBody: rowToProject(project) };
    }

    sets.push("updated_at = @updatedAt");
    r2.input("updatedAt", new Date().toISOString());

    await r2.query(`UPDATE projects SET ${sets.join(", ")} WHERE id = @id`);

    const r3 = await query();
    const updated = await r3.input("id", id).query("SELECT * FROM projects WHERE id = @id");

    return { status: 200, jsonBody: rowToProject(updated.recordset[0]) };
  } catch (err) {
    if (err instanceof AuthError) return { status: err.statusCode, body: err.message };
    throw err;
  }
}

app.http("projectMetadata", {
  methods: ["PATCH"],
  authLevel: "anonymous",
  route: "projects/{id}/metadata",
  handler: handleMetadata,
});
