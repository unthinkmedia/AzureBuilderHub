import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { requireUser, AuthError } from "../shared/auth.js";

const GITHUB_API = "https://api.github.com";

async function handleGitHubRepos(req: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const user = await requireUser(req);
    const token = process.env.GITHUB_TOKEN;

    if (!token) {
      return { status: 500, body: "GITHUB_TOKEN not configured" };
    }

    const username = user.userDetails;
    const q = encodeURIComponent(`topic:vibe-platform user:${username}`);
    const res = await fetch(`${GITHUB_API}/search/repositories?q=${q}&per_page=100`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!res.ok) {
      const text = await res.text();
      return { status: res.status, body: text };
    }

    const data = await res.json();
    return {
      status: 200,
      jsonBody: data,
      headers: { "Cache-Control": "no-cache" },
    };
  } catch (err) {
    if (err instanceof AuthError) return { status: err.statusCode, body: err.message };
    throw err;
  }
}

async function handleExperimentJson(req: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  try {
    await requireUser(req);
    const token = process.env.GITHUB_TOKEN;

    if (!token) {
      return { status: 500, body: "GITHUB_TOKEN not configured" };
    }

    const owner = req.params.owner;
    const repo = req.params.repo;

    const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/contents/experiment.json`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!res.ok) {
      return { status: res.status, jsonBody: null };
    }

    const data = await res.json() as { content: string; encoding: string };
    if (data.encoding === "base64") {
      const decoded = JSON.parse(Buffer.from(data.content, "base64").toString("utf-8"));
      return { status: 200, jsonBody: decoded };
    }

    return { status: 200, jsonBody: null };
  } catch (err) {
    if (err instanceof AuthError) return { status: err.statusCode, body: err.message };
    throw err;
  }
}

app.http("githubRepos", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "github-repos",
  handler: handleGitHubRepos,
});

app.http("githubExperimentJson", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "github-repos/{owner}/{repo}/experiment",
  handler: handleExperimentJson,
});
