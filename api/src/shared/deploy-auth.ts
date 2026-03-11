import { importJWK, jwtVerify, decodeProtectedHeader, type JWK } from "jose";

const JWKS_URL = "https://login.microsoftonline.com/common/discovery/v2.0/keys";
const EXPECTED_AUDIENCE = "https://management.azure.com";

// Cache fetched keys for 1 hour
let cachedKeys: Array<JWK & { kid?: string }> = [];
let cacheExpiry = 0;

async function fetchKeys(): Promise<Array<JWK & { kid?: string }>> {
  if (cachedKeys.length > 0 && Date.now() < cacheExpiry) return cachedKeys;

  const res = await fetch(JWKS_URL);
  if (!res.ok) throw new Error(`Failed to fetch JWKS: ${res.status}`);
  const data = await res.json() as { keys: Array<JWK & { kid?: string }> };
  cachedKeys = data.keys;
  cacheExpiry = Date.now() + 60 * 60 * 1000;
  return cachedKeys;
}

/**
 * Find the matching key by kid and import it, explicitly setting alg to RS256.
 */
async function getSigningKey(token: string) {
  const header = decodeProtectedHeader(token);
  const keys = await fetchKeys();
  const match = keys.find(k => k.kid === header.kid);
  if (!match) throw new Error(`No matching key for kid: ${header.kid}`);
  return importJWK({ ...match, alg: "RS256" }, "RS256");
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
    const key = await getSigningKey(token);
    const { payload } = await jwtVerify(token, key, {
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
