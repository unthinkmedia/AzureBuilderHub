import { createLocalJWKSet, jwtVerify, type JSONWebKeySet } from "jose";

const JWKS_URL = "https://login.microsoftonline.com/common/discovery/v2.0/keys";
const EXPECTED_AUDIENCE = "https://management.azure.com";

// Microsoft's JWKS keys omit the "alg" property, which causes jose to reject
// them on some Node.js runtimes (including SWA Functions). We fetch manually,
// patch each key with alg:"RS256", cache for 1 hour, and use createLocalJWKSet.
let cachedJwks: ReturnType<typeof createLocalJWKSet> | null = null;
let cacheExpiry = 0;

async function getJwks() {
  if (cachedJwks && Date.now() < cacheExpiry) return cachedJwks;

  const res = await fetch(JWKS_URL);
  if (!res.ok) throw new Error(`Failed to fetch JWKS: ${res.status}`);
  const data = (await res.json()) as JSONWebKeySet;

  // Patch: add alg:"RS256" to any RSA signing key that lacks it
  for (const key of data.keys) {
    if (!key.alg && key.kty === "RSA") {
      key.alg = "RS256";
    }
  }

  cachedJwks = createLocalJWKSet(data);
  cacheExpiry = Date.now() + 60 * 60 * 1000; // 1 hour
  return cachedJwks;
}

export interface DeployIdentity {
  userId: string;
  userName: string;
  userEmail: string;
  tenantId: string;
}

/**
 * Validate a Bearer token from `az account get-access-token`.
 *
 * Verifies:
 *   1. JWT signature against Microsoft's JWKS
 *   2. Audience is https://management.azure.com
 *   3. Tenant matches ALLOWED_TENANT_ID env var
 *   4. Token is not expired
 *
 * Returns the deployer's identity on success, null on failure.
 */
export async function validateDeployToken(authHeader: string | null): Promise<DeployIdentity | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  const allowedTenant = process.env.ALLOWED_TENANT_ID;
  if (!allowedTenant) {
    throw new Error("ALLOWED_TENANT_ID not configured on the server");
  }

  try {
    const jwks = await getJwks();
    const { payload } = await jwtVerify(token, jwks, {
      audience: EXPECTED_AUDIENCE,
    });

    const tid = payload.tid as string | undefined;
    if (!tid || tid !== allowedTenant) return null;

    return {
      userId: (payload.oid as string) ?? "",
      userName: (payload.name as string) ?? "",
      userEmail: (payload.upn as string) ?? (payload.preferred_username as string) ?? "",
      tenantId: tid,
    };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(`JWT verification: ${detail}`);
  }
}
