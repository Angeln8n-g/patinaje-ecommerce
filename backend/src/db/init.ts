import "dotenv/config";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { pool } from "./pool.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function init() {
  console.log("Initializing database...");
  const schema = readFileSync(join(__dirname, "schema.sql"), "utf-8");
  await pool.query(schema);
  console.log("Database initialized successfully.");
  await pool.end();
}

init().catch((err) => {
  console.error("Failed to initialize database:", err);
  process.exit(1);
});
