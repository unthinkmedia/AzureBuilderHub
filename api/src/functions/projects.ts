import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { projects } from "../shared/cosmos.js";
import { getUser, requireUser, AuthError } from "../shared/auth.js";
import type { ProjectDocument } from "../shared/types.js";
import { randomUUID } from "node:crypto";

/**
 * API-1: POST /api/projects — Create project (from GitHub Action or hub)
 * API-2: GET  /api/projects — List projects for authenticated user
 */

async function handleProjects(req: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  try {
    if (req.method === "GET") {
      return await listMyProjects(req);
    }
    if (req.method === "POST") {
      return await createProject(req);
    }
    return { status: 405, body: "Method not allowed" };
  } catch (err) {
    if (err instanceof AuthError) {
      return { status: err.statusCode, body: err.message };
    }
    throw err;
  }
}

async function listMyProjects(req: HttpRequest): Promise<HttpResponseInit> {
  const user = requireUser(req);
  const container = projects();
  const { resources } = await container.items
    .query({
      query: "SELECT * FROM c WHERE c.authorId = @authorId AND c.deletedAt = null ORDER BY c.updatedAt DESC",
      parameters: [{ name: "@authorId", value: user.userId }],
    })
    .fetchAll();

  return {
    status: 200,
    jsonBody: resources,
  };
}

async function createProject(req: HttpRequest): Promise<HttpResponseInit> {
  const user = requireUser(req);
  const body = (await req.json()) as Partial<ProjectDocument>;

  if (!body.name || typeof body.name !== "string" || body.name.trim().length < 3) {
    return { status: 400, body: "Project name must be at least 3 characters" };
  }

  const now = new Date().toISOString();
  const doc: ProjectDocument = {
    id: randomUUID(),
    name: body.name.trim(),
    description: body.description?.trim() ?? "",
    authorId: user.userId,
    authorName: user.userDetails,
    status: "draft",
    tags: Array.isArray(body.tags) ? body.tags.slice(0, 10) : [],
    azureServices: Array.isArray(body.azureServices) ? body.azureServices : [],
    layout: body.layout === "side-panel" ? "side-panel" : "full-width",
    pageCount: 0,
    currentVersion: 0,
    starCount: 0,
    forkCount: 0,
    forkedFrom: null,
    thumbnailUrl: "",
    previewUrl: "",
    createdAt: now,
    updatedAt: now,
    publishedAt: null,
    deletedAt: null,
  };

  const { resource } = await projects().items.create(doc);

  return {
    status: 201,
    jsonBody: resource,
  };
}

app.http("projects", {
  methods: ["GET", "POST"],
  authLevel: "anonymous",
  route: "projects",
  handler: handleProjects,
});
