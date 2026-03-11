import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { requireUser, AuthError } from "../shared/auth.js";
import { query } from "../shared/db.js";
import { getExperimentsContainer, getMimeType } from "../shared/storage.js";

/**
 * Preview proxy — streams experiment files from private blob storage.
 *
 * GET /api/projects/{id}/preview
 * GET /api/projects/{id}/preview/{*path}
 *
 * Requires SWA authentication (Microsoft employees only).
 * Looks up the project's current version, maps the request to a blob,
 * and streams the file back with correct Content-Type.
 */
async function handlePreview(req: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const user = requireUser(req);
    const projectId = req.params.id;
    if (!projectId) {
      return { status: 400, body: "Missing project ID" };
    }

    // Look up current version
    const r = await query();
    const result = await r
      .input("id", projectId)
      .query("SELECT current_version FROM projects WHERE id = @id AND deleted_at IS NULL");

    if (result.recordset.length === 0) {
      return { status: 404, body: "Project not found" };
    }

    const version = result.recordset[0].current_version as number;

    // Determine the file path within the blob container
    const rawPath = req.params.path || "";
    const filePath = rawPath || "index.html";

    // Sanitize: prevent path traversal
    if (filePath.includes("..") || filePath.startsWith("/")) {
      return { status: 400, body: "Invalid path" };
    }

    const blobName = `${projectId}/v${version}/${filePath}`;
    const container = getExperimentsContainer();
    const blobClient = container.getBlobClient(blobName);

    // Check if blob exists and download
    const exists = await blobClient.exists();
    if (!exists) {
      return { status: 404, body: "File not found" };
    }

    const downloadResponse = await blobClient.download(0);
    if (!downloadResponse.readableStreamBody) {
      return { status: 500, body: "Failed to read blob" };
    }

    // Read stream into buffer
    const chunks: Buffer[] = [];
    for await (const chunk of downloadResponse.readableStreamBody) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const body = Buffer.concat(chunks);

    const contentType = getMimeType(filePath);

    return {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": filePath === "index.html"
          ? "no-cache"
          : "public, max-age=31536000, immutable",
      },
      body,
    };
  } catch (err) {
    if (err instanceof AuthError) {
      return { status: err.statusCode, body: err.message };
    }
    const msg = err instanceof Error ? err.message : String(err);
    return { status: 500, body: `Preview failed: ${msg}` };
  }
}

// Route with wildcard to capture sub-paths (assets/index-abc.js, etc.)
app.http("experimentPreview", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "projects/{id}/preview/{*path}",
  handler: handlePreview,
});
