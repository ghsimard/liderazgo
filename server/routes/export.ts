/**
 * Database export route — generates a full SQL dump.
 *
 * GET /api/export?mode=upsert|nothing  (admin only)
 *   - mode=upsert  → ON CONFLICT (pk) DO UPDATE SET col = EXCLUDED.col
 *   - mode=nothing → ON CONFLICT DO NOTHING (default, safe)
 */

import { Router, Request, Response } from "express";
import { query } from "../db";
import { requireAuth, requireSuperAdmin } from "../middleware/auth";
import fs from "fs";
import path from "path";

const router = Router();

const EXPORT_TABLES = [
  // Géographie & référentiel
  "entidades_territoriales",
  "municipios",
  "instituciones",
  "regiones",
  "region_municipios",
  "region_instituciones",
  "region_entidades",
  // Fichas & 360
  "fichas_rlt",
  "domains_360",
  "competencies_360",
  "items_360",
  "item_texts_360",
  "competency_weights",
  "encuestas_360",
  "encuesta_360_visibility",
  "encuesta_invitaciones",
  // Ambiente Escolar
  "ae_cohortes",
  "ae_cohorte_instituciones",
  "ae_campanas",
  "ae_rectores_2025",
  "ae_docentes_submissions_2025",
  "ae_estudiantes_submissions_2025",
  "ae_acudientes_submissions_2025",
  "encuestas_ambiente_escolar",
  // Rúbricas
  "rubrica_modules",
  "rubrica_items",
  "rubrica_evaluadores",
  "rubrica_asignaciones",
  "rubrica_evaluaciones",
  "rubrica_seguimientos",
  "rubrica_submission_dates",
  "rubrica_regional_analyses",
  // MEL
  "mel_kpi_config",
  "mel_kpi_groups",
  "mel_kpi_group_items",
  // Informes
  "informe_modulo",
  "informe_modulo_equipo",
  "informe_directivo",
  "informe_asistencia",
  // Satisfacción
  "satisfaccion_config",
  "satisfaccion_form_definitions",
  "satisfaccion_report_content",
  "satisfaccion_responses",
  // Système / admin
  "app_images",
  "app_settings",
  "admin_cedulas",
  "operator_permissions",
  "custom_roles",
  "role_permissions",
  "site_reviews",
  "contact_messages",
  "deleted_records",
  "user_activity_log",
];

/** Fetch primary key column(s) for a public schema table. */
async function getPrimaryKey(table: string): Promise<string[]> {
  const rows = await query<{ attname: string }>(
    `SELECT a.attname
     FROM pg_index i
     JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
     WHERE i.indrelid = ($1::regclass)
       AND i.indisprimary
     ORDER BY array_position(i.indkey, a.attnum)`,
    [`public."${table}"`]
  );
  return rows.map((r) => r.attname);
}

router.get("/", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  const mode = (req.query.mode as string) === "upsert" ? "upsert" : "nothing";
  try {
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="export_${mode}_${new Date().toISOString().slice(0, 10)}.sql"`
    );
    res.write(`-- Database Export\n-- Generated: ${new Date().toISOString()}\n-- Mode: ${mode}\n\n`);
    res.write(`SET session_replication_role = 'replica';\n\n`); // disable triggers/FK during load

    // Users
    res.write(`-- ══ users ══\n`);
    const users = await query("SELECT id, email, password_hash, created_at FROM users ORDER BY created_at");
    for (const u of users) {
      const base = `INSERT INTO users (id, email, password_hash, created_at) VALUES ('${u.id}', '${esc(u.email)}', '${esc(u.password_hash)}', '${u.created_at?.toISOString?.() ?? u.created_at}')`;
      res.write(
        mode === "upsert"
          ? `${base} ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, password_hash = EXCLUDED.password_hash;\n`
          : `${base} ON CONFLICT (id) DO NOTHING;\n`
      );
    }

    res.write(`\n-- ══ user_custom_roles ══\n`);
    const ucrs = await query("SELECT user_id, role_id, created_at FROM user_custom_roles");
    for (const r of ucrs) {
      res.write(
        `INSERT INTO user_custom_roles (user_id, role_id, created_at) VALUES ('${r.user_id}', '${r.role_id}', '${r.created_at?.toISOString?.() ?? r.created_at}') ON CONFLICT (user_id, role_id) DO NOTHING;\n`
      );
    }
    res.write(`\n`);

    // Tables métier
    for (const table of EXPORT_TABLES) {
      res.write(`-- ══ ${table} ══\n`);
      let rows: any[];
      try {
        rows = await query(`SELECT * FROM "${table}" ORDER BY 1`);
      } catch (e: any) {
        res.write(`-- SKIPPED (${e.message})\n\n`);
        continue;
      }
      if (rows.length === 0) {
        res.write(`-- (empty)\n\n`);
        continue;
      }
      const cols = Object.keys(rows[0]);
      const colList = cols.map((c) => `"${c}"`).join(", ");

      let conflictClause = "ON CONFLICT DO NOTHING";
      if (mode === "upsert") {
        const pk = await getPrimaryKey(table);
        if (pk.length > 0) {
          const updatable = cols.filter((c) => !pk.includes(c));
          if (updatable.length > 0) {
            const setList = updatable.map((c) => `"${c}" = EXCLUDED."${c}"`).join(", ");
            conflictClause = `ON CONFLICT (${pk.map((c) => `"${c}"`).join(", ")}) DO UPDATE SET ${setList}`;
          } else {
            conflictClause = `ON CONFLICT (${pk.map((c) => `"${c}"`).join(", ")}) DO NOTHING`;
          }
        }
      }

      for (const row of rows) {
        const vals = cols.map((c) => formatVal(row[c]));
        res.write(`INSERT INTO "${table}" (${colList}) VALUES (${vals.join(", ")}) ${conflictClause};\n`);
      }
      res.write(`\n`);
    }

    res.write(`\nSET session_replication_role = 'origin';\n`);

    // Uploaded files (juste un inventaire, pas le binaire complet)
    const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";
    if (fs.existsSync(UPLOAD_DIR)) {
      res.write(`\n-- ══ Uploaded Files (inventory only) ══\n`);
      for (const file of fs.readdirSync(UPLOAD_DIR)) {
        const filePath = path.join(UPLOAD_DIR, file);
        if (fs.statSync(filePath).isFile()) {
          res.write(`-- FILE: ${file} (${fs.statSync(filePath).size} bytes)\n`);
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
  return (s ?? "").toString().replace(/'/g, "''");
}

function formatVal(v: any): string {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "NULL";
  if (v instanceof Date) return `'${v.toISOString()}'`;
  if (Array.isArray(v)) {
    // jsonb array OR text[] — on dumpe en JSON et on cast en jsonb
    return `'${esc(JSON.stringify(v))}'::jsonb`;
  }
  if (typeof v === "object") return `'${esc(JSON.stringify(v))}'::jsonb`;
  return `'${esc(String(v))}'`;
}

export default router;
