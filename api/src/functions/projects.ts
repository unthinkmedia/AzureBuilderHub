import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { query } from "../shared/db.js";
import { requireUser, AuthError } from "../shared/auth.js";
import type { ProjectDocument } from "../shared/types.js";
import { randomUUID } from "node:crypto";

async function handleProjects(req: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  try {
    if (req.method === "GET") return await listMyProjects(req);
    if (req.method === "POST") return await createProject(req);
    return { status: 405, body: "Method not allowed" };
  } catch (err) {
    if (err instanceof AuthError) return { status: err.statusCode, body: err.message };
    throw err;
  }
}

async function listMyProjects(req: HttpRequest): Promise<HttpResponseInit> {
  const user = await requireUser(req);
  const r = await query();
  const result = await r
    .input("authorId", user.userId)
    .query(`
      SELECT * FROM projects
      WHERE author_id = @authorId AND deleted_at IS NULL
      ORDER BY updated_at DESC
    `);

  return { status: 200, jsonBody: result.recordset.map(rowToProject) };
}

async function createProject(req: HttpRequest): Promise<HttpResponseInit> {
  const user = await requireUser(req);
  const body = (await req.json()) as Partial<ProjectDocument>;

  if (!body.name || typeof body.name !== "string" || body.name.trim().length < 3) {
    return { status: 400, body: "Project name must be at least 3 characters" };
  }

  const id = randomUUID();
  const now = new Date().toISOString();
  const tags = Array.isArray(body.tags) ? body.tags.slice(0, 10) : [];
  const layout = body.layout === "side-panel" ? "side-panel" : "full-width";

  const r = await query();
  const result = await r
    .input("id", id)
    .input("name", body.name.trim())
    .input("description", body.description?.trim() ?? "")
    .input("authorId", user.userId)
    .input("authorName", user.userDetails)
    .input("tags", JSON.stringify(tags))
    .input("layout", layout)
    .input("createdAt", now)
    .input("updatedAt", now)
    .query(`
      INSERT INTO projects (id, name, description, author_id, author_name, tags, layout, created_at, updated_at)
      OUTPUT INSERTED.*
      VALUES (@id, @name, @description, @authorId, @authorName, @tags, @layout, @createdAt, @updatedAt)
    `);

  return { status: 201, jsonBody: rowToProject(result.recordset[0]) };
}

/** Map a SQL row (snake_case) to the shape the frontend expects. */
export function rowToProject(row: Record<string, unknown>): ProjectDocument & { author: { id: string; name: string; avatarUrl?: string } } {
  return {
    id: row.id as string,
    name: row.name as string,
    description: row.description as string,
    authorId: row.author_id as string,
    authorName: row.author_name as string,
    author: {
      id: row.author_id as string,
      name: row.author_name as string,
    },
    status: row.status as ProjectDocument["status"],
    tags: JSON.parse((row.tags as string) || "[]"),
    layout: row.layout as ProjectDocument["layout"],
    pageCount: row.page_count as number,
    currentVersion: row.current_version as number,
    starCount: row.star_count as number,
    forkCount: row.fork_count as number,
    forkedFrom:
      row.forked_from_project_id
        ? {
            projectId: row.forked_from_project_id as string,
            projectName: row.forked_from_project_name as string,
            authorName: row.forked_from_author_name as string,
          }
        : null,
    thumbnailUrl: `/api/projects/${row.id}/preview/thumbnail.png`,
    previewUrl: `/api/projects/${row.id}/preview/`,
    createdAt: (row.created_at as Date)?.toISOString?.() ?? (row.created_at as string),
    updatedAt: (row.updated_at as Date)?.toISOString?.() ?? (row.updated_at as string),
    publishedAt: row.published_at ? ((row.published_at as Date)?.toISOString?.() ?? (row.published_at as string)) : null,
    deletedAt: row.deleted_at ? ((row.deleted_at as Date)?.toISOString?.() ?? (row.deleted_at as string)) : null,
  };
}

app.http("projects", {
  methods: ["GET", "POST"],
  authLevel: "anonymous",
  route: "projects",
  handler: handleProjects,
});
