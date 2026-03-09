import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { projects, stars } from "../shared/cosmos.js";
import { requireUser, AuthError } from "../shared/auth.js";

/**
 * API-6: POST/DELETE /api/projects/:id/star — Star or unstar a project
 */

async function handleStar(req: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const user = requireUser(req);
    const projectId = req.params.id;
    if (!projectId) return { status: 400, body: "Missing project ID" };

    const starId = `${user.userId}_${projectId}`;

    if (req.method === "POST") {
      // Star
      try {
        await stars().items.create({
          id: starId,
          userId: user.userId,
          projectId,
          createdAt: new Date().toISOString(),
        });
        await projects().item(projectId, projectId).patch({
          operations: [{ op: "incr", path: "/starCount", value: 1 }],
        });
      } catch (err: unknown) {
        // 409 = already starred, ignore
        if ((err as { code?: number }).code !== 409) throw err;
      }
      return { status: 204 };
    }

    if (req.method === "DELETE") {
      // Unstar
      try {
        await stars().item(starId, starId).delete();
        await projects().item(projectId, projectId).patch({
          operations: [{ op: "incr", path: "/starCount", value: -1 }],
        });
      } catch (err: unknown) {
        if ((err as { code?: number }).code !== 404) throw err;
      }
      return { status: 204 };
    }

    return { status: 405, body: "Method not allowed" };
  } catch (err) {
    if (err instanceof AuthError) {
      return { status: err.statusCode, body: err.message };
    }
    throw err;
  }
}

app.http("starProject", {
  methods: ["POST", "DELETE"],
  authLevel: "anonymous",
  route: "projects/{id}/star",
  handler: handleStar,
});
