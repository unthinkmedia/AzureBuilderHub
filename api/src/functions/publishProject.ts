import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { query } from "../shared/db.js";
import { requireUser, AuthError } from "../shared/auth.js";
import { rowToProject } from "./projects.js";
import { randomUUID } from "node:crypto";

interface PublishBody {
  publish: boolean;
  /** Optional project metadata — used to create the DB record for GitHub-sourced projects */
  project?: {
    name: string;
    description?: string;
    tags?: string[];
    layout?: "full-width" | "side-panel";
    repoUrl?: string;
  };
}

async function handlePublish(req: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const user = await requireUser(req);
    const id = req.params.id;
    if (!id) return { status: 400, body: "Missing project ID" };

    const body = (await req.json()) as PublishBody;
    const now = new Date().toISOString();
    const newStatus = body.publish ? "published" : "draft";

    // Try to find the project in the database
    const r = await query();
    const result = await r
      .input("id", id)
      .query("SELECT * FROM projects WHERE id = @id AND deleted_at IS NULL");

    let projectId = id;

    if (result.recordset.length === 0) {
      // Project not in DB — this is a GitHub-sourced project being published for the first time
      if (!body.publish) {
        return { status: 404, body: "Project not found" };
      }
      if (!body.project?.name) {
        return { status: 400, body: "Project metadata required for first-time publish" };
      }

      // Generate a new UUID for the DB record
      projectId = randomUUID();
      const tags = Array.isArray(body.project.tags) ? body.project.tags.slice(0, 10) : [];
      const layout = body.project.layout === "side-panel" ? "side-panel" : "full-width";

      const repoUrl = (body.project.repoUrl ?? "").trim();

      const rInsert = await query();
      await rInsert
        .input("id", projectId)
        .input("name", body.project.name.trim())
        .input("description", (body.project.description ?? "").trim())
        .input("authorId", user.userId)
        .input("authorName", user.userDetails)
        .input("tags", JSON.stringify(tags))
        .input("layout", layout)
        .input("repoUrl", repoUrl)
        .input("status", newStatus)
        .input("createdAt", now)
        .input("updatedAt", now)
        .input("publishedAt", now)
        .query(`
          INSERT INTO projects (id, name, description, author_id, author_name, tags, layout, repo_url, status, created_at, updated_at, published_at)
          VALUES (@id, @name, @description, @authorId, @authorName, @tags, @layout, @repoUrl, @status, @createdAt, @updatedAt, @publishedAt)
        `);
    } else {
      const project = result.recordset[0];
      if (project.author_id !== user.userId) return { status: 403, body: "Only the project owner can publish" };

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
    }

    const r3 = await query();
    const updated = await r3.input("id", projectId).query("SELECT * FROM projects WHERE id = @id");

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
