import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { query } from "../shared/db.js";
import { rowToProject } from "./projects.js";
import sql from "mssql";

async function handleCommunity(req: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const search = req.query.get("search") ?? "";
    const tagsParam = req.query.get("tags") ?? "";
    const layout = req.query.get("layout") ?? "";
    const sort = req.query.get("sort") ?? "stars";
    const offset = Math.max(0, parseInt(req.query.get("offset") ?? "0", 10) || 0);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.get("limit") ?? "20", 10) || 20));

    // Build WHERE clause dynamically
    const conditions: string[] = ["status = 'published'", "deleted_at IS NULL"];
    const r = await query();

    if (search) {
      conditions.push("(LOWER(name) LIKE @search OR LOWER(description) LIKE @search)");
      r.input("search", sql.NVarChar, `%${search.toLowerCase()}%`);
    }

    if (tagsParam) {
      const tags = tagsParam.split(",").filter(Boolean);
      for (let i = 0; i < tags.length; i++) {
        // Check if tag exists in the JSON array using JSON_VALUE/LIKE approach
        conditions.push(`tags LIKE @tag${i}`);
        r.input(`tag${i}`, sql.NVarChar, `%"${tags[i]}"%`);
      }
    }

    if (layout === "full-width" || layout === "side-panel") {
      conditions.push("layout = @layout");
      r.input("layout", sql.NVarChar, layout);
    }

    const where = conditions.join(" AND ");

    // Sort
    let orderBy: string;
    switch (sort) {
      case "newest":
        orderBy = "published_at DESC";
        break;
      case "forks":
        orderBy = "fork_count DESC";
        break;
      case "stars":
      default:
        orderBy = "star_count DESC";
        break;
    }

    // Count + Items in one round-trip
    r.input("offset", sql.Int, offset);
    r.input("limit", sql.Int, limit);

    const result = await r.query(`
      SELECT COUNT(*) AS total FROM projects WHERE ${where};
      SELECT * FROM projects WHERE ${where}
      ORDER BY ${orderBy}
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;
    `);

    const sets = result.recordsets as sql.IRecordSet<Record<string, unknown>>[];
    const total = (sets[0][0] as { total: number }).total;
    const items = sets[1].map(rowToProject);

    return { status: 200, jsonBody: { items, total } };
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
