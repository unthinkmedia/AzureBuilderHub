import { CosmosClient, Database } from "@azure/cosmos";

let _db: Database | undefined;

export function getDatabase(): Database {
  if (_db) return _db;

  const connectionString = process.env.COSMOS_CONNECTION_STRING;
  if (!connectionString) {
    throw new Error("COSMOS_CONNECTION_STRING environment variable is required");
  }

  const client = new CosmosClient(connectionString);
  _db = client.database(process.env.COSMOS_DATABASE_NAME ?? "builderhub");
  return _db;
}

export function projects() {
  return getDatabase().container("projects");
}

export function versions() {
  return getDatabase().container("versions");
}

export function stars() {
  return getDatabase().container("stars");
}

export function collections() {
  return getDatabase().container("collections");
}

export function shares() {
  return getDatabase().container("shares");
}
