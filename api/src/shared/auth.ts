import { HttpRequest } from "@azure/functions";

export interface AuthenticatedUser {
  userId: string;
  userDetails: string;
  identityProvider: string;
  userRoles: string[];
}

/**
 * Extract the authenticated user from the SWA client principal header.
 * Returns null if not authenticated.
 */
export function getUser(req: HttpRequest): AuthenticatedUser | null {
  const header = req.headers.get("x-ms-client-principal");
  if (!header) return null;

  try {
    const decoded = Buffer.from(header, "base64").toString("utf-8");
    const principal = JSON.parse(decoded);
    if (!principal?.userId) return null;
    return {
      userId: principal.userId,
      userDetails: principal.userDetails ?? "",
      identityProvider: principal.identityProvider ?? "",
      userRoles: principal.userRoles ?? [],
    };
  } catch {
    return null;
  }
}

/**
 * Require authentication — throws 401 if the request is unauthenticated.
 * If ALLOWED_GITHUB_ORG is set, also verifies the GitHub user belongs to that org.
 */
export async function requireUser(req: HttpRequest): Promise<AuthenticatedUser> {
  const user = getUser(req);
  if (!user) {
    throw new AuthError(401, "Authentication required");
  }

  const allowedOrg = process.env.ALLOWED_GITHUB_ORG;
  if (allowedOrg && user.identityProvider === "github") {
    const isMember = await checkGitHubOrgMembership(user.userDetails, allowedOrg);
    if (!isMember) {
      throw new AuthError(403, `Access restricted to ${allowedOrg} org members (user: ${user.userDetails}, provider: ${user.identityProvider}, userId: ${user.userId})`);
    }
  }

  return user;
}

/**
 * Check if a GitHub user is a public member of the given org.
 * Uses unauthenticated GitHub API — works for orgs with public membership.
 * If GITHUB_ORG_TOKEN is set, uses it for private membership checks.
 */
async function checkGitHubOrgMembership(username: string, org: string): Promise<boolean> {
  const token = process.env.GITHUB_ORG_TOKEN;
  const headers: Record<string, string> = {
    "Accept": "application/vnd.github+json",
    "User-Agent": "AzureBuilderHub",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // With token: /orgs/{org}/members/{username} checks all members
  // Without token: /orgs/{org}/public_members/{username} checks public only
  const endpoint = token ? "members" : "public_members";
  const url = `https://api.github.com/orgs/${encodeURIComponent(org)}/${endpoint}/${encodeURIComponent(username)}`;

  try {
    const res = await fetch(url, { headers });
    return res.status === 204; // 204 = member, 404 = not member
  } catch {
    return false;
  }
}

export class AuthError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = "AuthError";
  }
}
