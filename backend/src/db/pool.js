import "../config/env.js";
import pg from "pg";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function checkDatabaseConnection() {
  const result = await pool.query("SELECT now() AS checked_at");
  return result.rows[0];
}
