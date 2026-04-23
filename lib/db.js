import { Pool } from "pg";

let pool;

if (!global._pool) {
  global._pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });
}

pool = global._pool;

/**
 * Run a database query safely
 */
export async function query(text, params = []) {
  try {
    const res = await pool.query(text, params);
    return res;
  } catch (err) {
    console.error("DB ERROR:", err.message);
    throw err;
  }
}

/**
 * Get single row helper
 */
export async function getOne(text, params = []) {
  const res = await query(text, params);
  return res.rows[0] || null;
}

/**
 * Get multiple rows helper
 */
export async function getMany(text, params = []) {
  const res = await query(text, params);
  return res.rows;
}
