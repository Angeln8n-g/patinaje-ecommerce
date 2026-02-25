import pg from "pg";
import { logger } from "../lib/logger.js";
const { Pool } = pg;

const IS_PRODUCTION = process.env.NODE_ENV === "production";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Connection pool tuning
  max: parseInt(process.env.DB_POOL_MAX || "20"),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  // SSL in production
  ...(IS_PRODUCTION && { ssl: { rejectUnauthorized: false } }),
});

// Log pool errors (don't crash the server)
pool.on("error", (err) => {
  logger.error({ err }, "Unexpected database pool error");
});

pool.on("connect", () => {
  logger.debug("New database connection established");
});

// Helper for single queries
export async function query(text: string, params?: any[]) {
  const result = await pool.query(text, params);
  return result;
}

// Helper for transactions
export async function withTransaction<T>(
  fn: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
