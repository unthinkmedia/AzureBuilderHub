import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getPool, query } from "../shared/db.js";
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
  const user = await requireUser(req);
  const r = await query();
  const result = await r
    .input("authorId", user.userId)
    .query(`
      SELECT c.*,
        (SELECT STRING_AGG(CAST(cp.project_id AS NVARCHAR(36)), ',') FROM collection_projects cp WHERE cp.collection_id = c.id) AS project_ids_csv
      FROM collections c
      WHERE c.author_id = @authorId AND c.deleted_at IS NULL
      ORDER BY c.updated_at DESC
    `);

  return { status: 200, jsonBody: result.recordset.map(rowToCollection) };
}

async function createCollection(req: HttpRequest): Promise<HttpResponseInit> {
  const user = await requireUser(req);
  const body = (await req.json()) as Partial<CollectionDocument>;

  if (!body.name || typeof body.name !== "string" || body.name.trim().length < 1) {
    return { status: 400, body: "Collection name is required" };
  }

  const id = randomUUID();
  const now = new Date().toISOString();

  const r = await query();
  await r
    .input("id", id)
    .input("name", body.name.trim())
    .input("description", body.description?.trim() ?? "")
    .input("authorId", user.userId)
    .input("authorName", user.userDetails)
    .input("createdAt", now)
    .input("updatedAt", now)
    .query(`
      INSERT INTO collections (id, name, description, author_id, author_name, created_at, updated_at)
      VALUES (@id, @name, @description, @authorId, @authorName, @createdAt, @updatedAt)
    `);

  // Insert initial projectIds if provided
  if (Array.isArray(body.projectIds) && body.projectIds.length > 0) {
    const values = body.projectIds.map((_: string, i: number) => `(@collectionId, @pid${i})`).join(", ");
    const r2 = await query();
    r2.input("collectionId", id);
    body.projectIds.forEach((pid: string, i: number) => r2.input(`pid${i}`, pid));
    await r2.query(`INSERT INTO collection_projects (collection_id, project_id) VALUES ${values}`);
  }

  return { status: 201, jsonBody: await fetchCollection(id, user.userId) };
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
  const user = await requireUser(req);
  const collection = await fetchCollection(id, user.userId);
  if (!collection) return { status: 404, body: "Collection not found" };
  return { status: 200, jsonBody: collection };
}

async function updateCollection(req: HttpRequest, id: string): Promise<HttpResponseInit> {
  const user = await requireUser(req);
  const existing = await fetchCollection(id, user.userId);
  if (!existing) return { status: 404, body: "Collection not found" };

  const body = (await req.json()) as Partial<CollectionDocument>;
  const now = new Date().toISOString();

  const r = await query();
  await r
    .input("id", id)
    .input("name", body.name?.trim() || existing.name)
    .input("description", body.description?.trim() ?? existing.description)
    .input("updatedAt", now)
    .query("UPDATE collections SET name = @name, description = @description, updated_at = @updatedAt WHERE id = @id");

  // If projectIds provided, replace junction rows
  if (Array.isArray(body.projectIds)) {
    const r2 = await query();
    await r2.input("collectionId", id).query("DELETE FROM collection_projects WHERE collection_id = @collectionId");
    if (body.projectIds.length > 0) {
      const values = body.projectIds.map((_: string, i: number) => `(@collectionId2, @pid${i})`).join(", ");
      const r3 = await query();
      r3.input("collectionId2", id);
      body.projectIds.forEach((pid: string, i: number) => r3.input(`pid${i}`, pid));
      await r3.query(`INSERT INTO collection_projects (collection_id, project_id) VALUES ${values}`);
    }
  }

  return { status: 200, jsonBody: await fetchCollection(id, user.userId) };
}

async function deleteCollection(req: HttpRequest, id: string): Promise<HttpResponseInit> {
  const user = await requireUser(req);
  const existing = await fetchCollection(id, user.userId);
  if (!existing) return { status: 404, body: "Collection not found" };

  const r = await query();
  await r
    .input("id", id)
    .input("deletedAt", new Date().toISOString())
    .query("UPDATE collections SET deleted_at = @deletedAt WHERE id = @id");

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
    const user = await requireUser(req);
    const existing = await fetchCollection(id, user.userId);
    if (!existing) return { status: 404, body: "Collection not found" };

    const body = (await req.json()) as { projectId?: string };
    if (!body.projectId || typeof body.projectId !== "string") {
      return { status: 400, body: "projectId is required" };
    }

    if (req.method === "POST") {
      const r = await query();
      // MERGE to avoid duplicates
      await r
        .input("collectionId", id)
        .input("projectId", body.projectId)
        .query(`
          MERGE collection_projects AS target
          USING (SELECT @collectionId AS collection_id, @projectId AS project_id) AS source
          ON target.collection_id = source.collection_id AND target.project_id = source.project_id
          WHEN NOT MATCHED THEN
            INSERT (collection_id, project_id) VALUES (@collectionId, @projectId);
        `);
    } else if (req.method === "DELETE") {
      const r = await query();
      await r
        .input("collectionId", id)
        .input("projectId", body.projectId)
        .query("DELETE FROM collection_projects WHERE collection_id = @collectionId AND project_id = @projectId");
    }

    // Update timestamp
    const r2 = await query();
    await r2.input("id", id).input("updatedAt", new Date().toISOString())
      .query("UPDATE collections SET updated_at = @updatedAt WHERE id = @id");

    return { status: 200, jsonBody: await fetchCollection(id, user.userId) };
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

/* ── Helpers ── */

async function fetchCollection(id: string, authorId: string): Promise<CollectionDocument | null> {
  const r = await query();
  const result = await r
    .input("id", id)
    .input("authorId", authorId)
    .query(`
      SELECT c.*,
        (SELECT STRING_AGG(CAST(cp.project_id AS NVARCHAR(36)), ',') FROM collection_projects cp WHERE cp.collection_id = c.id) AS project_ids_csv
      FROM collections c
      WHERE c.id = @id AND c.author_id = @authorId AND c.deleted_at IS NULL
    `);

  if (result.recordset.length === 0) return null;
  return rowToCollection(result.recordset[0]);
}

function rowToCollection(row: Record<string, unknown>): CollectionDocument {
  const csv = (row.project_ids_csv as string) || "";
  return {
    id: row.id as string,
    name: row.name as string,
    description: row.description as string,
    authorId: row.author_id as string,
    authorName: row.author_name as string,
    projectIds: csv ? csv.split(",") : [],
    createdAt: (row.created_at as Date)?.toISOString?.() ?? (row.created_at as string),
    updatedAt: (row.updated_at as Date)?.toISOString?.() ?? (row.updated_at as string),
    deletedAt: row.deleted_at ? ((row.deleted_at as Date)?.toISOString?.() ?? (row.deleted_at as string)) : null,
  };
}
