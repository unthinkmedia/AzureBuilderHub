import {
  BlobServiceClient,
  ContainerClient,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
  ContainerSASPermissions,
  SASProtocol,
} from "@azure/storage-blob";

let _containerClient: ContainerClient | undefined;
let _sharedKeyCredential: StorageSharedKeyCredential | undefined;

const CONTAINER_NAME = "experiments";

/**
 * Parse account name and key from a connection string.
 */
function parseConnectionString(cs: string): { accountName: string; accountKey: string } {
  const accountName = cs.match(/AccountName=([^;]+)/)?.[1];
  const accountKey = cs.match(/AccountKey=([^;]+)/)?.[1];
  if (!accountName || !accountKey) {
    throw new Error("Connection string must contain AccountName and AccountKey");
  }
  return { accountName, accountKey };
}

/**
 * Get a ContainerClient for the "experiments" blob container.
 * Requires STORAGE_CONNECTION_STRING env var.
 */
export function getExperimentsContainer(): ContainerClient {
  if (!_containerClient) {
    const connectionString = process.env.STORAGE_CONNECTION_STRING;
    if (!connectionString) {
      throw new Error("STORAGE_CONNECTION_STRING environment variable is required");
    }
    const blobService = BlobServiceClient.fromConnectionString(connectionString);
    _containerClient = blobService.getContainerClient(CONTAINER_NAME);
  }
  return _containerClient;
}

/**
 * Generate a short-lived SAS URL scoped to a blob prefix (e.g. "{projectId}/v{version}/").
 * Grants write-only access for uploading files. Expires in 30 minutes.
 */
export function generateUploadSasUrl(blobPrefix: string): string {
  const connectionString = process.env.STORAGE_CONNECTION_STRING;
  if (!connectionString) {
    throw new Error("STORAGE_CONNECTION_STRING environment variable is required");
  }

  if (!_sharedKeyCredential) {
    const { accountName, accountKey } = parseConnectionString(connectionString);
    _sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
  }

  const startsOn = new Date();
  const expiresOn = new Date(startsOn.getTime() + 30 * 60 * 1000); // 30 min

  // Detect if we're using Azurite (local dev) — Azurite doesn't enforce SAS protocol
  const isLocal = connectionString.includes("devstoreaccount1");
  const blobEndpoint = connectionString.match(/BlobEndpoint=([^;]+)/)?.[1];

  const sasToken = generateBlobSASQueryParameters(
    {
      containerName: CONTAINER_NAME,
      permissions: ContainerSASPermissions.parse("racw"), // read, add, create, write
      startsOn,
      expiresOn,
      ...(isLocal ? {} : { protocol: SASProtocol.Https }),
    },
    _sharedKeyCredential,
  ).toString();

  // Build the container URL
  const baseUrl = blobEndpoint
    ? `${blobEndpoint}/${CONTAINER_NAME}`
    : `https://${parseConnectionString(connectionString).accountName}.blob.core.windows.net/${CONTAINER_NAME}`;

  return `${baseUrl}?${sasToken}`;
}

/** Content-type map for common static file extensions. */
const MIME_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".map": "application/json",
};

/** Resolve MIME type from a file path extension. */
export function getMimeType(filePath: string): string {
  const ext = filePath.slice(filePath.lastIndexOf(".")).toLowerCase();
  return MIME_TYPES[ext] || "application/octet-stream";
}
