import sql from "mssql";

let _poolPromise: Promise<sql.ConnectionPool> | undefined;

export async function getPool(): Promise<sql.ConnectionPool> {
  if (!_poolPromise) {
    const connectionString = process.env.SQL_CONNECTION_STRING;
    if (!connectionString) {
      throw new Error("SQL_CONNECTION_STRING environment variable is required");
    }
    _poolPromise = new sql.ConnectionPool(connectionString).connect();
    _poolPromise.catch(() => { _poolPromise = undefined; });
  }
  return _poolPromise;
}

/** Convenience: get a new Request object from the shared pool. */
export async function query(): Promise<sql.Request> {
  const pool = await getPool();
  return pool.request();
}
