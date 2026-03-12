/**
 * Vite dev server plugin that handles GitHub OAuth flow for local development.
 * Mimics the SWA /.auth/* endpoints so the frontend auth works identically.
 *
 * Requires VITE_GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in .env.
 */
import type { Plugin } from "vite";
import type { IncomingMessage, ServerResponse } from "node:http";

/* ── Helpers ── */

function json(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

function getGitHubClientId() { return process.env.VITE_GITHUB_CLIENT_ID ?? ""; }
function getGitHubClientSecret() { return process.env.GITHUB_CLIENT_SECRET ?? ""; }

/** In-memory token store keyed by a random session id (cookie) */
const sessions = new Map<string, string>(); // sessionId → github access token

function randomId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function parseCookies(req: IncomingMessage): Record<string, string> {
  const header = req.headers.cookie ?? "";
  return Object.fromEntries(
    header.split(";").map((c) => {
      const [k, ...rest] = c.trim().split("=");
      return [k, rest.join("=")];
    })
  );
}

function getSessionToken(req: IncomingMessage): string | null {
  const sid = parseCookies(req)["hub_session"];
  return sid ? (sessions.get(sid) ?? null) : null;
}

async function exchangeCodeForToken(code: string): Promise<string> {
  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: getGitHubClientId(),
      client_secret: getGitHubClientSecret(),
      code,
    }),
  });
  const data = (await res.json()) as { access_token?: string; error?: string };
  if (!data.access_token) {
    throw new Error(data.error ?? "Failed to get access token");
  }
  return data.access_token;
}

async function fetchGitHubUser(token: string) {
  const res = await fetch("https://api.github.com/user", {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github.v3+json" },
  });
  if (!res.ok) throw new Error("Failed to fetch GitHub user");
  return res.json() as Promise<{ login: string; id: number; avatar_url: string; name: string | null }>;
}

/* ── Plugin ── */
export function devAuthPlugin(): Plugin {
  return {
    name: "dev-auth",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url ?? "";

        if (!getGitHubClientId() || !getGitHubClientSecret()) {
          // No GitHub OAuth credentials — skip all auth routes
          return next();
        }

        // Login: redirect to GitHub
        if (url === "/.auth/login/github") {
          const state = randomId();
          const params = new URLSearchParams({
            client_id: getGitHubClientId(),
            redirect_uri: "http://localhost:4200/.auth/callback/github",
            scope: "read:user repo",
            state,
          });
          res.writeHead(302, { Location: `https://github.com/login/oauth/authorize?${params}` });
          return res.end();
        }

        // Callback: exchange code for token
        if (url.startsWith("/.auth/callback/github")) {
          try {
            const params = new URL(url, "http://localhost:4200").searchParams;
            const code = params.get("code");
            if (!code) {
              res.writeHead(400, { "Content-Type": "text/plain" });
              return res.end("Missing code parameter");
            }
            const token = await exchangeCodeForToken(code);
            const sid = randomId();
            sessions.set(sid, token);
            res.writeHead(302, {
              Location: "/",
              "Set-Cookie": `hub_session=${sid}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`,
            });
            return res.end();
          } catch (err) {
            res.writeHead(500, { "Content-Type": "text/plain" });
            return res.end(String(err));
          }
        }

        // Logout: clear session
        if (url === "/.auth/logout") {
          const sid = parseCookies(req)["hub_session"];
          if (sid) sessions.delete(sid);
          res.writeHead(302, {
            Location: "/",
            "Set-Cookie": "hub_session=; Path=/; HttpOnly; Max-Age=0",
          });
          return res.end();
        }

        // Auth me: return user from GitHub token
        if (url === "/.auth/me") {
          const token = getSessionToken(req);
          if (!token) {
            return json(res, 200, { clientPrincipal: null });
          }
          try {
            const ghUser = await fetchGitHubUser(token);
            return json(res, 200, {
              clientPrincipal: {
                userId: String(ghUser.id),
                userDetails: ghUser.login,
                identityProvider: "github",
                userRoles: ["authenticated", "anonymous"],
              },
            });
          } catch {
            return json(res, 200, { clientPrincipal: null });
          }
        }

        // Return the GitHub token to the frontend for API calls
        if (url === "/api/github-token") {
          const token = getSessionToken(req);
          if (!token) return json(res, 401, { error: "Not authenticated" });
          return json(res, 200, { token });
        }

        return next();
      });
    },
  };
}
