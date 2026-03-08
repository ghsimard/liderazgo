/**
 * RPC routes — replaces Supabase .rpc() calls.
 *
 * Implements the same database functions that exist in Supabase:
 * - get_instituciones_con_ficha
 * - get_directivos_por_institucion
 * - get_table_columns
 * - get_table_constraints
 * - get_enum_types
 */

import { Router, Request, Response } from "express";
import { query } from "../db";

const router = Router();

/** GET /api/rpc/get_instituciones_con_ficha */
router.get("/get_instituciones_con_ficha", async (_req: Request, res: Response) => {
  try {
    const rows = await query(
      `SELECT DISTINCT nombre_ie FROM fichas_rlt ORDER BY nombre_ie`
    );
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/rpc/get_directivos_por_institucion?p_nombre_ie=... */
router.get("/get_directivos_por_institucion", async (req: Request, res: Response) => {
  try {
    const { p_nombre_ie } = req.query;
    if (!p_nombre_ie) {
      res.status(400).json({ error: "p_nombre_ie requis" });
      return;
    }
    const rows = await query(
      `SELECT nombres_apellidos, numero_cedula, cargo_actual, genero
       FROM fichas_rlt
       WHERE nombre_ie = $1
         AND cargo_actual IN ('Rector/a', 'Coordinador/a')
       ORDER BY nombres_apellidos`,
      [p_nombre_ie]
    );
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/rpc/get_table_columns?table_names=t1,t2 */
router.get("/get_table_columns", async (req: Request, res: Response) => {
  try {
    const names = (req.query.table_names as string || "").split(",").filter(Boolean);
    if (names.length === 0) {
      res.json([]);
      return;
    }
    const rows = await query(
      `SELECT
        c.table_name::text,
        c.column_name::text,
        CASE
          WHEN c.data_type = 'ARRAY' THEN c.udt_name || '[]'
          WHEN c.data_type = 'USER-DEFINED' THEN c.udt_name
          ELSE c.data_type
        END AS udt_name_full,
        c.is_nullable::text,
        c.column_default::text
      FROM information_schema.columns c
      WHERE c.table_schema = 'public'
        AND c.table_name = ANY($1)
      ORDER BY c.table_name, c.ordinal_position`,
      [names]
    );
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/rpc/get_table_constraints?table_names=t1,t2 */
router.get("/get_table_constraints", async (req: Request, res: Response) => {
  try {
    const names = (req.query.table_names as string || "").split(",").filter(Boolean);
    if (names.length === 0) {
      res.json([]);
      return;
    }
    const rows = await query(
      `SELECT
        tc.table_name::text,
        tc.constraint_name::text,
        tc.constraint_type::text,
        string_agg(DISTINCT kcu.column_name, ', ' ORDER BY kcu.column_name)::text AS column_names,
        ccu.table_name::text AS foreign_table,
        string_agg(DISTINCT ccu.column_name, ', ' ORDER BY ccu.column_name)::text AS foreign_columns
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
      LEFT JOIN information_schema.constraint_column_usage ccu
        ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema AND tc.constraint_type = 'FOREIGN KEY'
      WHERE tc.table_schema = 'public'
        AND tc.table_name = ANY($1)
        AND tc.constraint_type IN ('PRIMARY KEY', 'UNIQUE', 'FOREIGN KEY')
      GROUP BY tc.table_name, tc.constraint_name, tc.constraint_type, ccu.table_name
      ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name`,
      [names]
    );
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/rpc/get_enum_types */
router.get("/get_enum_types", async (_req: Request, res: Response) => {
  try {
    const rows = await query(
      `SELECT
        t.typname::text AS type_name,
        string_agg('''' || e.enumlabel || '''', ', ' ORDER BY e.enumsortorder) AS enum_values
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      JOIN pg_namespace n ON t.typnamespace = n.oid
      WHERE n.nspname = 'public'
      GROUP BY t.typname`
    );
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/rpc/instituciones-ficha — alias used by Encuesta360Form */
router.get("/instituciones-ficha", async (_req: Request, res: Response) => {
  try {
    const rows = await query(
      `SELECT DISTINCT nombre_ie FROM fichas_rlt ORDER BY nombre_ie`
    );
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/rpc/directivos?institucion=... — alias used by Encuesta360Form */
router.get("/directivos", async (req: Request, res: Response) => {
  try {
    const { institucion } = req.query;
    if (!institucion) {
      res.status(400).json({ error: "institucion required" });
      return;
    }
    const rows = await query(
      `SELECT nombres_apellidos, numero_cedula, cargo_actual, genero
       FROM fichas_rlt
       WHERE nombre_ie = $1
         AND cargo_actual IN ('Rector/a', 'Coordinador/a')
       ORDER BY nombres_apellidos`,
      [institucion]
    );
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/rpc/check_cedula_exists?p_cedula=... */
router.get("/check_cedula_exists", async (req: Request, res: Response) => {
  try {
    const { p_cedula } = req.query;
    if (!p_cedula) {
      res.status(400).json({ error: "p_cedula required" });
      return;
    }
    const rows = await query(
      `SELECT EXISTS (SELECT 1 FROM fichas_rlt WHERE numero_cedula = $1) AS exists`,
      [p_cedula]
    );
    res.json(rows[0]?.exists ?? false);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/rpc/check_cedula_role?p_cedula=... */
router.get("/check_cedula_role", async (req: Request, res: Response) => {
  try {
    const { p_cedula } = req.query;
    if (!p_cedula) {
      res.status(400).json({ error: "p_cedula required" });
      return;
    }

    const exists_ficha = await query(
      `SELECT EXISTS (SELECT 1 FROM fichas_rlt WHERE numero_cedula = $1) AS v`, [p_cedula]
    );
    const is_admin_rows = await query(
      `SELECT EXISTS (SELECT 1 FROM admin_cedulas WHERE cedula = $1) AS v`, [p_cedula]
    ).catch(() => [{ v: false }]);
    const directivo = await query(
      `SELECT nombres_apellidos, cargo_actual FROM fichas_rlt WHERE numero_cedula = $1 AND cargo_actual IN ('Rector/a', 'Coordinador/a') LIMIT 1`,
      [p_cedula]
    );
    const is_evaluador = await query(
      `SELECT EXISTS (SELECT 1 FROM rubrica_evaluadores WHERE cedula = $1) AS v`, [p_cedula]
    );
    const ficha_row = await query(
      `SELECT nombres_apellidos, genero FROM fichas_rlt WHERE numero_cedula = $1 LIMIT 1`, [p_cedula]
    );

    // Get nombre: try fichas_rlt first, then rubrica_evaluadores
    const evaluador_row = await query(
      `SELECT nombre FROM rubrica_evaluadores WHERE cedula = $1 LIMIT 1`, [p_cedula]
    );

    res.json({
      exists_ficha: exists_ficha[0]?.v ?? false,
      is_admin: is_admin_rows[0]?.v ?? false,
      is_directivo: directivo.length > 0,
      is_evaluador: is_evaluador[0]?.v ?? false,
      cargo_actual: directivo[0]?.cargo_actual ?? null,
      nombre: ficha_row[0]?.nombres_apellidos ?? evaluador_row[0]?.nombre ?? null,
      genero: ficha_row[0]?.genero ?? null,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/rpc/get_ficha_by_cedula?p_cedula=... */
router.get("/get_ficha_by_cedula", async (req: Request, res: Response) => {
  try {
    const { p_cedula } = req.query;
    if (!p_cedula) {
      res.status(400).json({ error: "p_cedula required" });
      return;
    }
    const rows = await query(
      `SELECT * FROM fichas_rlt WHERE numero_cedula = $1 LIMIT 1`,
      [p_cedula]
    );
    res.json(rows[0] ?? null);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/rpc/get_invitation_by_token?p_token=... */
router.get("/get_invitation_by_token", async (req: Request, res: Response) => {
  try {
    const { p_token } = req.query;
    if (!p_token) {
      res.status(400).json({ error: "p_token required" });
      return;
    }
    const rows = await query(
      `SELECT id, email_destinatario, directivo_nombre, institucion, tipo_formulario, fase, responded_at, access_count
       FROM encuesta_invitaciones WHERE token = $1 LIMIT 1`,
      [p_token]
    );
    res.json(rows[0] ?? null);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/rpc/get_invitaciones_directivo?p_cedula=... */
router.get("/get_invitaciones_directivo", async (req: Request, res: Response) => {
  try {
    const { p_cedula } = req.query;
    if (!p_cedula) {
      res.status(400).json({ error: "p_cedula required" });
      return;
    }
    const rows = await query(
      `SELECT id, token, email_destinatario, tipo_formulario, fase, sent_at, last_reminder_at, responded_at
       FROM encuesta_invitaciones WHERE directivo_cedula = $1 ORDER BY sent_at DESC`,
      [p_cedula]
    );
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
