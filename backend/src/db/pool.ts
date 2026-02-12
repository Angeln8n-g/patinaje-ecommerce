import pg from "pg";
const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
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
