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
  "region_entidades",
  "fichas_rlt",
  "encuestas_360",
  "domains_360",
  "competencies_360",
  "items_360",
  "item_texts_360",
  "competency_weights",
  "deleted_records",
  "app_images",
  "app_settings",
  "rubrica_modules",
  "rubrica_items",
  "rubrica_evaluadores",
  "rubrica_asignaciones",
  "rubrica_evaluaciones",
  "rubrica_seguimientos",
  "rubrica_submission_dates",
  "rubrica_regional_analyses",
  "mel_kpi_config",
  "mel_kpi_groups",
  "mel_kpi_group_items",
  "site_reviews",
  "contact_messages",
  "encuesta_invitaciones",
  "admin_cedulas",
  "user_activity_log",
  "informe_modulo",
  "informe_modulo_equipo",
  "informe_directivo",
  "informe_asistencia",
  "encuestas_ambiente_escolar",
  "satisfaccion_config",
  "satisfaccion_responses",
  "operator_permissions",
];

router.get("/", requireAuth, requireSuperAdmin, async (_req: Request, res: Response) => {
  try {
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="export_${new Date().toISOString().slice(0, 10)}.sql"`);
    res.write(`-- Database Export\n-- Generated: ${new Date().toISOString()}\n\n`);

    // Export users
    res.write(`-- ══ Users ══\n`);
    const users = await query("SELECT id, email, password_hash, created_at FROM users ORDER BY created_at");
    for (const u of users) {
      res.write(
        `INSERT INTO users (id, email, password_hash, created_at) VALUES ('${u.id}', '${esc(u.email)}', '${esc(u.password_hash)}', '${u.created_at}') ON CONFLICT (id) DO NOTHING;\n`,
      );
    }

    const ucrs = await query("SELECT user_id, role_id, created_at FROM user_custom_roles");
    for (const r of ucrs) {
      res.write(
        `INSERT INTO user_custom_roles (user_id, role_id, created_at) VALUES ('${r.user_id}', '${r.role_id}', '${r.created_at}') ON CONFLICT (user_id, role_id) DO NOTHING;\n`,
      );
    }
    res.write(`\n`);

    // Export each table — stream row by row to avoid building one giant string in memory
    for (const table of EXPORT_TABLES) {
      res.write(`-- ══ ${table} ══\n`);
      const rows = await query(`SELECT * FROM "${table}" ORDER BY 1`);
      if (rows.length === 0) {
        res.write(`-- (empty)\n\n`);
        continue;
      }
      const cols = Object.keys(rows[0]);
      const colList = cols.map((c) => `"${c}"`).join(", ");
      for (const row of rows) {
        const vals = cols.map((c) => formatVal(row[c]));
        res.write(`INSERT INTO "${table}" (${colList}) VALUES (${vals.join(", ")}) ON CONFLICT DO NOTHING;\n`);
      }
      res.write(`\n`);
    }

    // Export uploaded files as base64
    const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";
    if (fs.existsSync(UPLOAD_DIR)) {
      res.write(`-- ══ Uploaded Files (base64) ══\n`);
      const files = fs.readdirSync(UPLOAD_DIR);
      for (const file of files) {
        const filePath = path.join(UPLOAD_DIR, file);
        if (fs.statSync(filePath).isFile()) {
          const b64 = fs.readFileSync(filePath).toString("base64");
          res.write(`-- FILE: ${file}\n-- BASE64: ${b64.substring(0, 100)}...\n`);
        }
      }
    }

    res.end();
  } catch (err: any) {
    console.error("[export] failed:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    } else {
      res.end(`\n-- ERROR: ${err.message}\n`);
    }
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
