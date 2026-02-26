/**
 * Database export route — generates a full SQL dump.
 * Replaces the Supabase Edge Function "export-database".
 *
 * GET /api/export (admin only)
 */

import { Router, Request, Response } from "express";
import { pool, query } from "../db";
import { requireAuth, requireSuperAdmin } from "../middleware/auth";
import fs from "fs";
import path from "path";

const router = Router();

const EXPORT_TABLES = [
  "entidades_territoriales",
  "municipios",
  "instituciones",
  "regiones",
  "region_municipios",
  "region_instituciones",
  "fichas_rlt",
  "encuestas_360",
  "domains_360",
  "competencies_360",
  "items_360",
  "item_texts_360",
  "competency_weights",
  "deleted_records",
  "app_images",
];

router.get("/", requireAuth, requireSuperAdmin, async (_req: Request, res: Response) => {
  try {
    let sql = `-- Database Export\n-- Generated: ${new Date().toISOString()}\n\n`;

    // Export users
    sql += `-- ══ Users ══\n`;
    const users = await query("SELECT id, email, password_hash, created_at FROM users ORDER BY created_at");
    for (const u of users) {
      sql += `INSERT INTO users (id, email, password_hash, created_at) VALUES ('${u.id}', '${esc(u.email)}', '${esc(u.password_hash)}', '${u.created_at}') ON CONFLICT (id) DO NOTHING;\n`;
    }

    const roles = await query("SELECT user_id, role, created_at FROM user_roles");
    for (const r of roles) {
      sql += `INSERT INTO user_roles (user_id, role, created_at) VALUES ('${r.user_id}', '${r.role}', '${r.created_at}') ON CONFLICT (user_id, role) DO NOTHING;\n`;
    }

    sql += `\n`;

    // Export each table
    for (const table of EXPORT_TABLES) {
      sql += `-- ══ ${table} ══\n`;
      const rows = await query(`SELECT * FROM "${table}" ORDER BY 1`);
      if (rows.length === 0) {
        sql += `-- (empty)\n\n`;
        continue;
      }

      const cols = Object.keys(rows[0]);
      for (const row of rows) {
        const vals = cols.map((c) => formatVal(row[c]));
        sql += `INSERT INTO "${table}" (${cols.map(c => `"${c}"`).join(", ")}) VALUES (${vals.join(", ")}) ON CONFLICT DO NOTHING;\n`;
      }
      sql += `\n`;
    }

    // Export uploaded files as base64
    const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";
    if (fs.existsSync(UPLOAD_DIR)) {
      sql += `-- ══ Uploaded Files (base64) ══\n`;
      const files = fs.readdirSync(UPLOAD_DIR);
      for (const file of files) {
        const filePath = path.join(UPLOAD_DIR, file);
        if (fs.statSync(filePath).isFile()) {
          const b64 = fs.readFileSync(filePath).toString("base64");
          sql += `-- FILE: ${file}\n-- BASE64: ${b64.substring(0, 100)}...\n`;
        }
      }
    }

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="export_${new Date().toISOString().slice(0, 10)}.sql"`);
    res.send(sql);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

function esc(s: string): string {
  return (s || "").replace(/'/g, "''");
}

function formatVal(v: any): string {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  if (typeof v === "number") return String(v);
  if (v instanceof Date) return `'${v.toISOString()}'`;
  if (typeof v === "object") return `'${esc(JSON.stringify(v))}'`;
  return `'${esc(String(v))}'`;
}

export default router;
