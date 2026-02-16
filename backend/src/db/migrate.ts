import "dotenv/config";
import { readFileSync, readdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { pool } from "./pool.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, "migrations");

async function migrate() {
  // Create migrations tracking table if it doesn't exist
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) UNIQUE NOT NULL,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Get already applied migrations
  const { rows: applied } = await pool.query(
    "SELECT filename FROM schema_migrations ORDER BY filename"
  );
  const appliedSet = new Set(applied.map((r: { filename: string }) => r.filename));

  // Get all migration files sorted
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  let count = 0;
  for (const file of files) {
    if (appliedSet.has(file)) {
      console.log(`  ✓ ${file} (already applied)`);
      continue;
    }

    console.log(`  → Applying ${file}...`);
    const sql = readFileSync(join(migrationsDir, file), "utf-8");

    await pool.query("BEGIN");
    try {
      await pool.query(sql);
      await pool.query(
        "INSERT INTO schema_migrations (filename) VALUES ($1)",
        [file]
      );
      await pool.query("COMMIT");
      console.log(`  ✓ ${file} applied`);
      count++;
    } catch (err) {
      await pool.query("ROLLBACK");
      console.error(`  ✗ ${file} failed:`, err);
      throw err;
    }
  }

  console.log(
    count > 0
      ? `\nDone. ${count} migration(s) applied.`
      : "\nNo new migrations to apply."
  );
  await pool.end();
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
