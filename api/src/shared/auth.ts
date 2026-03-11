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
 */
export async function requireUser(req: HttpRequest): Promise<AuthenticatedUser> {
  const user = getUser(req);
  if (!user) {
    throw new AuthError(401, "Authentication required");
  }

  return user;
}

export class AuthError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = "AuthError";
  }
}
