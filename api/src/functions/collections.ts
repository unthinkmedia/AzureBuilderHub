import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { collections } from "../shared/cosmos.js";
import { requireUser, AuthError } from "../shared/auth.js";
import type { CollectionDocument } from "../shared/types.js";
import { randomUUID } from "node:crypto";

/* ── List & Create ── */

async function handleCollections(req: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  try {
    if (req.method === "GET") return await listCollections(req);
    if (req.method === "POST") return await createCollection(req);
    return { status: 405, body: "Method not allowed" };
  } catch (err) {
    if (err instanceof AuthError) return { status: err.statusCode, body: err.message };
    throw err;
  }
}

async function listCollections(req: HttpRequest): Promise<HttpResponseInit> {
  const user = requireUser(req);
  const { resources } = await collections().items
    .query({
      query: "SELECT * FROM c WHERE c.authorId = @authorId AND c.deletedAt = null ORDER BY c.updatedAt DESC",
      parameters: [{ name: "@authorId", value: user.userId }],
    })
    .fetchAll();
  return { status: 200, jsonBody: resources };
}

async function createCollection(req: HttpRequest): Promise<HttpResponseInit> {
  const user = requireUser(req);
  const body = (await req.json()) as Partial<CollectionDocument>;

  if (!body.name || typeof body.name !== "string" || body.name.trim().length < 1) {
    return { status: 400, body: "Collection name is required" };
  }

  const now = new Date().toISOString();
  const doc: CollectionDocument = {
    id: randomUUID(),
    name: body.name.trim(),
    description: body.description?.trim() ?? "",
    authorId: user.userId,
    authorName: user.userDetails,
    projectIds: Array.isArray(body.projectIds) ? body.projectIds : [],
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  const { resource } = await collections().items.create(doc);
  return { status: 201, jsonBody: resource };
}

app.http("collections", {
  methods: ["GET", "POST"],
  authLevel: "anonymous",
  route: "collections",
  handler: handleCollections,
});

/* ── Single Collection CRUD ── */

async function handleCollectionById(req: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const id = req.params.id;
    if (req.method === "GET") return await getCollection(req, id);
    if (req.method === "PATCH") return await updateCollection(req, id);
    if (req.method === "DELETE") return await deleteCollection(req, id);
    return { status: 405, body: "Method not allowed" };
  } catch (err) {
    if (err instanceof AuthError) return { status: err.statusCode, body: err.message };
    throw err;
  }
}

async function getCollection(req: HttpRequest, id: string): Promise<HttpResponseInit> {
  const user = requireUser(req);
  const { resources } = await collections().items
    .query({
      query: "SELECT * FROM c WHERE c.id = @id AND c.authorId = @authorId AND c.deletedAt = null",
      parameters: [
        { name: "@id", value: id },
        { name: "@authorId", value: user.userId },
      ],
    })
    .fetchAll();

  if (resources.length === 0) return { status: 404, body: "Collection not found" };
  return { status: 200, jsonBody: resources[0] };
}

async function updateCollection(req: HttpRequest, id: string): Promise<HttpResponseInit> {
  const user = requireUser(req);
  const body = (await req.json()) as Partial<CollectionDocument>;

  const { resources } = await collections().items
    .query({
      query: "SELECT * FROM c WHERE c.id = @id AND c.authorId = @authorId AND c.deletedAt = null",
      parameters: [
        { name: "@id", value: id },
        { name: "@authorId", value: user.userId },
      ],
    })
    .fetchAll();

  if (resources.length === 0) return { status: 404, body: "Collection not found" };

  const existing = resources[0] as CollectionDocument;
  const updated: CollectionDocument = {
    ...existing,
    name: body.name?.trim() || existing.name,
    description: body.description?.trim() ?? existing.description,
    projectIds: Array.isArray(body.projectIds) ? body.projectIds : existing.projectIds,
    updatedAt: new Date().toISOString(),
  };

  const { resource } = await collections().items.upsert(updated);
  return { status: 200, jsonBody: resource };
}

async function deleteCollection(req: HttpRequest, id: string): Promise<HttpResponseInit> {
  const user = requireUser(req);

  const { resources } = await collections().items
    .query({
      query: "SELECT * FROM c WHERE c.id = @id AND c.authorId = @authorId AND c.deletedAt = null",
      parameters: [
        { name: "@id", value: id },
        { name: "@authorId", value: user.userId },
      ],
    })
    .fetchAll();

  if (resources.length === 0) return { status: 404, body: "Collection not found" };

  const existing = resources[0] as CollectionDocument;
  existing.deletedAt = new Date().toISOString();
  await collections().items.upsert(existing);

  return { status: 204 };
}

app.http("collectionById", {
  methods: ["GET", "PATCH", "DELETE"],
  authLevel: "anonymous",
  route: "collections/{id}",
  handler: handleCollectionById,
});

/* ── Add / Remove projects ── */

async function handleCollectionProjects(req: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const id = req.params.id;
    const user = requireUser(req);

    const { resources } = await collections().items
      .query({
        query: "SELECT * FROM c WHERE c.id = @id AND c.authorId = @authorId AND c.deletedAt = null",
        parameters: [
          { name: "@id", value: id },
          { name: "@authorId", value: user.userId },
        ],
      })
      .fetchAll();

    if (resources.length === 0) return { status: 404, body: "Collection not found" };

    const collection = resources[0] as CollectionDocument;
    const body = (await req.json()) as { projectId?: string };

    if (!body.projectId || typeof body.projectId !== "string") {
      return { status: 400, body: "projectId is required" };
    }

    if (req.method === "POST") {
      if (!collection.projectIds.includes(body.projectId)) {
        collection.projectIds.push(body.projectId);
      }
    } else if (req.method === "DELETE") {
      collection.projectIds = collection.projectIds.filter((pid) => pid !== body.projectId);
    }

    collection.updatedAt = new Date().toISOString();
    const { resource } = await collections().items.upsert(collection);
    return { status: 200, jsonBody: resource };
  } catch (err) {
    if (err instanceof AuthError) return { status: err.statusCode, body: err.message };
    throw err;
  }
}

app.http("collectionProjects", {
  methods: ["POST", "DELETE"],
  authLevel: "anonymous",
  route: "collections/{id}/projects",
  handler: handleCollectionProjects,
});
