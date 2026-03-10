import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";

app.http("health", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "health",
  handler: async (_req: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> => {
    const diagnostics: Record<string, string> = { status: "ok", timestamp: new Date().toISOString() };

    // Test import of shared modules
    try {
      const cosmos = await import("../shared/cosmos.js");
      diagnostics.cosmosImport = "ok";
      diagnostics.cosmosExports = Object.keys(cosmos).join(",");
    } catch (e) {
      diagnostics.cosmosImport = "FAIL: " + (e instanceof Error ? e.message : String(e));
    }

    try {
      const auth = await import("../shared/auth.js");
      diagnostics.authImport = "ok";
      diagnostics.authExports = Object.keys(auth).join(",");
    } catch (e) {
      diagnostics.authImport = "FAIL: " + (e instanceof Error ? e.message : String(e));
    }

    return {
      status: 200,
      jsonBody: diagnostics,
    };
  },
});
