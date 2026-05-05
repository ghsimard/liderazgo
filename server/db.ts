import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,    // fail-fast si pool saturé
  statement_timeout: 15_000,          // tue toute requête > 15s côté PG
  query_timeout: 15_000,              // protection côté node-pg
});

// Empêche un crash de connexion idle de tuer le worker
pool.on("error", (err) => {
  console.error("[pg pool] idle client error:", err);
});

/** Helper: run a query and return rows */
export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  const result = await pool.query(text, params);
  return result.rows as T[];
}

/** Helper: run a query and return the first row or null */
export async function queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}
