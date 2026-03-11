import { createRemoteJWKSet, jwtVerify } from "jose";

const JWKS_URL = "https://login.microsoftonline.com/common/discovery/v2.0/keys";
const EXPECTED_AUDIENCE = "https://management.azure.com";

const jwks = createRemoteJWKSet(new URL(JWKS_URL));

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
    const { payload } = await jwtVerify(token, jwks, {
      audience: EXPECTED_AUDIENCE,
      algorithms: ["RS256"],
    });

    const tid = payload.tid as string | undefined;
    if (!tid || tid !== allowedTenant) return null;

    return {
      userId: (payload.oid as string) ?? "",
      userName: (payload.name as string) ?? "",
      userEmail: (payload.upn as string) ?? (payload.preferred_username as string) ?? "",
      tenantId: tid,
    };
  } catch {
    return null;
  }
}
