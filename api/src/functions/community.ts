import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { projects } from "../shared/cosmos.js";

/**
 * API-7: GET /api/community — List published projects with search/filter/sort
 */

async function handleCommunity(req: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  try {
  const search = req.query.get("search") ?? "";
  const tagsParam = req.query.get("tags") ?? "";
  const azureServicesParam = req.query.get("azureServices") ?? "";
  const layout = req.query.get("layout") ?? "";
  const sort = req.query.get("sort") ?? "stars";
  const offset = Math.max(0, parseInt(req.query.get("offset") ?? "0", 10) || 0);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.get("limit") ?? "20", 10) || 20));

  // Build query dynamically
  let query = "SELECT * FROM c WHERE c.status = 'published' AND c.deletedAt = null";
  const parameters: Array<{ name: string; value: string | string[] }> = [];

  if (search) {
    query += " AND (CONTAINS(LOWER(c.name), @search) OR CONTAINS(LOWER(c.description), @search))";
    parameters.push({ name: "@search", value: search.toLowerCase() });
  }

  if (tagsParam) {
    const tags = tagsParam.split(",").filter(Boolean);
    for (let i = 0; i < tags.length; i++) {
      query += ` AND ARRAY_CONTAINS(c.tags, @tag${i})`;
      parameters.push({ name: `@tag${i}`, value: tags[i] });
    }
  }

  if (azureServicesParam) {
    const services = azureServicesParam.split(",").filter(Boolean);
    for (let i = 0; i < services.length; i++) {
      query += ` AND ARRAY_CONTAINS(c.azureServices, @svc${i})`;
      parameters.push({ name: `@svc${i}`, value: services[i] });
    }
  }

  if (layout === "full-width" || layout === "side-panel") {
    query += " AND c.layout = @layout";
    parameters.push({ name: "@layout", value: layout });
  }

  // Sort
  switch (sort) {
    case "newest":
      query += " ORDER BY c.publishedAt DESC";
      break;
    case "forks":
      query += " ORDER BY c.forkCount DESC";
      break;
    case "stars":
    default:
      query += " ORDER BY c.starCount DESC";
      break;
  }

  // Cosmos DB does not support parameterized OFFSET/LIMIT — inline validated ints
  query += ` OFFSET ${offset} LIMIT ${limit}`;

  const container = projects();

  // Count
  const countQuery = query.replace(/SELECT \*/, "SELECT VALUE COUNT(1)").replace(/ ORDER BY.*OFFSET.*/, "");
  const { resources: countResult } = await container.items
    .query({ query: countQuery, parameters })
    .fetchAll();
  const total = countResult[0] ?? 0;

  // Items
  const { resources: items } = await container.items
    .query({ query, parameters })
    .fetchAll();

  return {
    status: 200,
    jsonBody: { items, total },
  };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { status: 500, body: `Community query failed: ${msg}` };
  }
}

app.http("community", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "community",
  handler: handleCommunity,
});
