import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getPool } from "../shared/db.js";
import { requireUser, AuthError } from "../shared/auth.js";
import { rowToProject } from "./projects.js";

async function handleStar(req: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const user = requireUser(req);
    const projectId = req.params.id;
    if (!projectId) return { status: 400, body: "Missing project ID" };

    const pool = await getPool();

    if (req.method === "POST") {
      const txn = pool.transaction();
      await txn.begin();
      try {
        const result = await txn.request()
          .input("userId", user.userId)
          .input("projectId", projectId)
          .input("createdAt", new Date().toISOString())
          .query(`
            MERGE stars AS target
            USING (SELECT @userId AS user_id, @projectId AS project_id) AS source
            ON target.user_id = source.user_id AND target.project_id = source.project_id
            WHEN NOT MATCHED THEN
              INSERT (user_id, project_id, created_at) VALUES (@userId, @projectId, @createdAt);
          `);

        if (result.rowsAffected[0] > 0) {
          await txn.request()
            .input("projectId", projectId)
            .query("UPDATE projects SET star_count = star_count + 1 WHERE id = @projectId");
        }
        await txn.commit();
      } catch (e) {
        await txn.rollback();
        throw e;
      }
      return { status: 204 };
    }

    if (req.method === "DELETE") {
      const txn = pool.transaction();
      await txn.begin();
      try {
        const result = await txn.request()
          .input("userId", user.userId)
          .input("projectId", projectId)
          .query("DELETE FROM stars WHERE user_id = @userId AND project_id = @projectId");

        if (result.rowsAffected[0] > 0) {
          await txn.request()
            .input("projectId", projectId)
            .query("UPDATE projects SET star_count = CASE WHEN star_count > 0 THEN star_count - 1 ELSE 0 END WHERE id = @projectId");
        }
        await txn.commit();
      } catch (e) {
        await txn.rollback();
        throw e;
      }
      return { status: 204 };
    }

    return { status: 405, body: "Method not allowed" };
  } catch (err) {
    if (err instanceof AuthError) return { status: err.statusCode, body: err.message };
    throw err;
  }
}

async function handleMyStars(req: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const user = requireUser(req);

    const pool = await getPool();
    const result = await pool.request()
      .input("userId", user.userId)
      .query(`
        SELECT p.* FROM projects p
        INNER JOIN stars s ON s.project_id = p.id
        WHERE s.user_id = @userId AND p.deleted_at IS NULL
        ORDER BY s.created_at DESC
      `);

    return { status: 200, jsonBody: result.recordset.map(rowToProject) };
  } catch (err) {
    if (err instanceof AuthError) return { status: err.statusCode, body: err.message };
    throw err;
  }
}

app.http("starProject", {
  methods: ["POST", "DELETE"],
  authLevel: "anonymous",
  route: "projects/{id}/star",
  handler: handleStar,
});

app.http("myStars", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "stars/mine",
  handler: handleMyStars,
});
