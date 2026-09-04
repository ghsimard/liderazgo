/**
 * Generic database proxy route.
 *
 * Handles the query protocol from the frontend's dbClient.ts QueryBuilder.
 *
 * GET  /api/db/:table?select=...&eq.col=val&order=col.asc&limit=N&single=true
 * POST /api/db/:table  { _method: "POST"|"PATCH"|"DELETE", _filters: [...], _body: {...} }
 */

import { Router, Request, Response } from "express";
import { pool, query, queryOne } from "../db";
import { requireAuth, requireAdmin } from "../middleware/auth";

const router = Router();

// Tables that allow public reads (no auth required for GET)
const PUBLIC_READ_TABLES = new Set([
  "fichas_rlt",
  "domains_360",
  "competencies_360",
  "competency_weights",
  "items_360",
  "item_texts_360",
  "entidades_territoriales",
  "municipios",
  "instituciones",
  "regiones",
  "region_entidades",
  "region_municipios",
  "region_instituciones",
  "app_images",
  "app_settings",
  "rubrica_submission_dates",
  "rubrica_modules",
  "rubrica_items",
  "rubrica_evaluadores",
  "rubrica_asignaciones",
  "rubrica_evaluaciones",
  "rubrica_seguimientos",
  "encuesta_invitaciones",
  "mel_kpi_config",
  "mel_kpi_groups",
  "mel_kpi_group_items",
  "informe_modulo",
  "informe_modulo_equipo",
  "informe_directivo",
  "informe_asistencia",
  "satisfaccion_config",
  "satisfaccion_responses",
  "encuestas_ambiente_escolar",
  "ae_cohortes",
  "ae_cohorte_instituciones",
  "v_ae_instituciones_por_cohorte",
  "ae_campanas",
  "ae_rectores_2025",
  "ae_docentes_submissions_2025",
  "ae_estudiantes_submissions_2025",
  "ae_acudientes_submissions_2025",
  "satisfaccion_report_content",
  "satisfaccion_form_definitions",
  "encuesta_360_visibility",
  "operator_permissions",
]);

// Tables that allow public inserts (no auth required for POST without _method)
const PUBLIC_INSERT_TABLES = new Set([
  "fichas_rlt",
  "encuestas_360",
  "rubrica_submission_dates",
  "rubrica_evaluaciones",
  "rubrica_seguimientos",
  "site_reviews",
  "contact_messages",
  "encuesta_invitaciones",
  "user_activity_log",
  "informe_modulo",
  "informe_modulo_equipo",
  "informe_directivo",
  "informe_asistencia",
  "encuestas_ambiente_escolar",
  "satisfaccion_responses",
  "encuesta_360_visibility",
  "rubrica_asignaciones",
]);

// Tables that allow public updates (no auth required for PATCH)
const PUBLIC_UPDATE_TABLES = new Set([
  "fichas_rlt",
  "rubrica_evaluaciones",
  "rubrica_seguimientos",
  "rubrica_submission_dates",
  "encuesta_invitaciones",
  "informe_modulo",
  "informe_modulo_equipo",
  "informe_directivo",
  "informe_asistencia",
  "rubrica_asignaciones",
  "encuesta_360_visibility",
]);

// Tables that allow public deletes (no auth required for DELETE)
// Used by Evaluador flows that replace child rows on save (e.g. team members)
const PUBLIC_DELETE_TABLES = new Set([
  "informe_modulo_equipo",
]);

// Whitelist of allowed tables
const ALLOWED_TABLES = new Set([
  ...PUBLIC_READ_TABLES,
  ...PUBLIC_INSERT_TABLES,
  "fichas_rlt",
  "encuestas_360",
  "deleted_records",
  "institucion_renames",
  "custom_roles",
  "role_permissions",
  "user_custom_roles",
  "operator_permissions",
  "region_entidades",
  "region_municipios",
  "region_instituciones",
  "rubrica_evaluadores",
  "rubrica_asignaciones",
  "rubrica_evaluaciones",
  "rubrica_seguimientos",
  "rubrica_modules",
  "rubrica_items",
  "site_reviews",
  "app_settings",
  "contact_messages",
  "admin_cedulas",
  "user_activity_log",
  "mel_kpi_config",
  "mel_kpi_groups",
  "mel_kpi_group_items",
  "rubrica_regional_analyses",
  "informe_modulo",
  "informe_modulo_equipo",
  "informe_directivo",
  "informe_asistencia",
  "encuestas_ambiente_escolar",
  "ae_cohortes",
  "ae_cohorte_instituciones",
  "ae_campanas",
  "satisfaccion_config",
  "satisfaccion_responses",
  "satisfaccion_form_definitions",
  "satisfaccion_report_content",
  "encuesta_360_visibility",
]);

// ── Schéma dédié `e360` (application Encuesta 360 autonome) ──────────
// Les données e360 vivent dans leur propre schéma : invisibles depuis le site RLT.
const E360_PUBLIC_READ_TABLES = new Set([
  "v_360_dominios",
  "v_360_competencias",
  "v_360_items",
  "v_360_item_texts",
  "v_360_ponderaciones",
  "encuestas_360",
  "encuesta_invitaciones",
  "encuesta_360_visibility",
  "fichas_rlt",
]);

const E360_PUBLIC_INSERT_TABLES = new Set([
  "encuestas_360",
  "encuesta_invitaciones",
  "fichas_rlt",
]);

const E360_PUBLIC_UPDATE_TABLES = new Set([
  "encuesta_invitaciones",
  "fichas_rlt",
]);

const E360_ALLOWED_TABLES = new Set([
  ...E360_PUBLIC_READ_TABLES,
  ...E360_PUBLIC_INSERT_TABLES,
  ...E360_PUBLIC_UPDATE_TABLES,
]);

/** Découpe "e360.encuestas_360" → { schema: "e360", name: "encuestas_360" } */
function splitTable(table: string): { schema: string | null; name: string } {
  const idx = table.indexOf(".");
  if (idx === -1) return { schema: null, name: table };
  return { schema: table.slice(0, idx), name: table.slice(idx + 1) };
}

function isAllowedTable(table: string): boolean {
  const { schema, name } = splitTable(table);
  if (schema === "e360") return E360_ALLOWED_TABLES.has(name);
  if (schema) return false;
  return ALLOWED_TABLES.has(name);
}

function isPublicRead(table: string): boolean {
  const { schema, name } = splitTable(table);
  if (schema === "e360") return E360_PUBLIC_READ_TABLES.has(name);
  if (schema) return false;
  return PUBLIC_READ_TABLES.has(name);
}

function isPublicInsert(table: string): boolean {
  const { schema, name } = splitTable(table);
  if (schema === "e360") return E360_PUBLIC_INSERT_TABLES.has(name);
  if (schema) return false;
  return PUBLIC_INSERT_TABLES.has(name);
}

function isPublicUpdate(table: string): boolean {
  const { schema, name } = splitTable(table);
  if (schema === "e360") return E360_PUBLIC_UPDATE_TABLES.has(name);
  if (schema) return false;
  return PUBLIC_UPDATE_TABLES.has(name);
}

function isPublicDelete(table: string): boolean {
  const { schema, name } = splitTable(table);
  if (schema === "e360") return false;
  if (schema) return false;
  return PUBLIC_DELETE_TABLES.has(name);
}

// ── Helpers ────────────────────────────────────────────

/** Validate column/table names to prevent SQL injection via identifiers */
const VALID_IDENTIFIER = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

/** Serialize objects/arrays to JSON strings for pg parameters */
function pgValue(val: any): any {
  if (val !== null && typeof val === "object" && !(val instanceof Date) && !Array.isArray(val)) {
    return JSON.stringify(val);
  }
  if (Array.isArray(val) && val.length > 0 && typeof val[0] === "object") {
    return JSON.stringify(val);
  }
  return val;
}

function sanitizeIdentifier(name: string): string {
  if (!VALID_IDENTIFIER.test(name)) {
    throw new Error(`Invalid identifier: "${name}"`);
  }
  return `"${name}"`;
}

/** "e360.encuestas_360" → "e360"."encuestas_360" ; "fichas_rlt" → "fichas_rlt" */
function qualifyTable(table: string): string {
  const { schema, name } = splitTable(table);
  return schema
    ? `${sanitizeIdentifier(schema)}.${sanitizeIdentifier(name)}`
    : sanitizeIdentifier(name);
}

interface Filter {
  type: string;
  col: string;
  val: any;
}

function buildWhereClause(filters: Filter[], params: any[]): string {
  if (filters.length === 0) return "";

  const clauses: string[] = [];
  for (const f of filters) {
    if (f.type === "or" && f.col === "_expr") {
      const orParts = parseOrExpression(f.val, params);
      if (orParts) clauses.push(`(${orParts})`);
      continue;
    }

    // Validate column name
    const safeCol = sanitizeIdentifier(f.col);

    // Detect "not.<op>" prefix
    let negate = false;
    let opType = f.type;
    if (opType.startsWith("not.")) {
      negate = true;
      opType = opType.slice(4);
    }

    const idx = params.length + 1;
    let clause = "";
    switch (opType) {
      case "eq":
        params.push(f.val);
        clause = `${safeCol} = $${idx}`;
        break;
      case "neq":
        params.push(f.val);
        clause = `${safeCol} != $${idx}`;
        break;
      case "gt":
        params.push(f.val);
        clause = `${safeCol} > $${idx}`;
        break;
      case "gte":
        params.push(f.val);
        clause = `${safeCol} >= $${idx}`;
        break;
      case "lt":
        params.push(f.val);
        clause = `${safeCol} < $${idx}`;
        break;
      case "lte":
        params.push(f.val);
        clause = `${safeCol} <= $${idx}`;
        break;
      case "like":
        params.push(f.val);
        clause = `${safeCol} LIKE $${idx}`;
        break;
      case "ilike":
        params.push(f.val);
        clause = `${safeCol} ILIKE $${idx}`;
        break;
      case "in":
        if (Array.isArray(f.val) && f.val.length > 0) {
          const placeholders = f.val.map((_: any, i: number) => `$${params.length + i + 1}`);
          params.push(...f.val);
          clause = `${safeCol} IN (${placeholders.join(",")})`;
        } else if (typeof f.val === "string") {
          const vals = f.val.split(",");
          const placeholders = vals.map((_: any, i: number) => `$${params.length + i + 1}`);
          params.push(...vals);
          clause = `${safeCol} IN (${placeholders.join(",")})`;
        }
        break;
      case "is":
        if (f.val === null || f.val === "null") {
          clause = `${safeCol} IS NULL`;
        } else if (f.val === true || f.val === "true") {
          clause = `${safeCol} IS TRUE`;
        } else if (f.val === false || f.val === "false") {
          clause = `${safeCol} IS FALSE`;
        }
        break;
    }

    if (clause) {
      // For IS NULL / IS TRUE / IS FALSE → use IS NOT
      if (negate) {
        if (clause.includes(" IS ")) {
          clause = clause.replace(" IS ", " IS NOT ");
        } else {
          clause = `NOT (${clause})`;
        }
      }
      clauses.push(clause);
    }
  }

  return clauses.length > 0 ? ` WHERE ${clauses.join(" AND ")}` : "";
}

function parseOrExpression(expr: string, params: any[]): string | null {
  const parts = expr.split(",");
  const orClauses: string[] = [];
  for (const part of parts) {
    const match = part.match(/^(.+?)\.(eq|neq|ilike|like|gt|gte|lt|lte)\.(.+)$/);
    if (match) {
      const [, col, op, val] = match;
      const safeCol = sanitizeIdentifier(col);
      const idx = params.length + 1;
      params.push(val);
      const sqlOp = { eq: "=", neq: "!=", ilike: "ILIKE", like: "LIKE", gt: ">", gte: ">=", lt: "<", lte: "<=" }[op] || "=";
      orClauses.push(`${safeCol} ${sqlOp} $${idx}`);
    }
  }
  return orClauses.length > 0 ? orClauses.join(" OR ") : null;
}

function parseFiltersFromQuery(qs: Record<string, any>): Filter[] {
  const filters: Filter[] = [];
  for (const [key, val] of Object.entries(qs)) {
    // Match "not.<op>.<col>" first, then plain "<op>.<col>"
    const notMatch = key.match(/^not\.(eq|neq|gt|gte|lt|lte|like|ilike|in|is)\.(.+)$/);
    if (notMatch) {
      filters.push({ type: `not.${notMatch[1]}`, col: notMatch[2], val });
      continue;
    }
    const match = key.match(/^(eq|neq|gt|gte|lt|lte|like|ilike|in|is|or)\.(.+)$/);
    if (match) {
      filters.push({ type: match[1], col: match[2], val });
    }
  }
  return filters;
}

// ── GET /api/db/:table ─────────────────────────────────

router.get("/:table", async (req: Request, res: Response) => {
  try {
    const table = req.params.table as string;
    if (!isAllowedTable(table)) {
      res.status(403).json({ error: `Table "${table}" non autorisée` });
      return;
    }

    // Auth check for non-public tables
    if (!isPublicRead(table)) {
      // Inline auth check
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        res.status(401).json({ error: "Authentification requise" });
        return;
      }
    }

    // Sanitize select columns
    const rawSelect = (req.query.select as string) || "*";
    const selectCols = rawSelect === "*" ? "*" : rawSelect.split(",").map(c => {
      const trimmed = c.trim();
      // Allow "table.col" and "col" patterns, plus aggregate functions
      if (trimmed === "*") return "*";
      // Handle "relation(cols)" for joins — pass through if valid identifiers
      const joinMatch = trimmed.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\((.+)\)$/);
      if (joinMatch) {
        sanitizeIdentifier(joinMatch[1]);
        return trimmed; // relation selects
      }
      sanitizeIdentifier(trimmed.replace(/^.*\./, "")); // validate last part
      return trimmed;
    }).join(",");
    const isHead = req.query.head === "true";
    const countMode = req.query.count as string;
    const isSingle = req.query.single === "true";

    const filters = parseFiltersFromQuery(req.query as Record<string, string>);
    const params: any[] = [];
    const where = buildWhereClause(filters, params);

    // Order
    let orderClause = "";
    const orderParam = req.query.order;
    if (orderParam) {
      const orders = Array.isArray(orderParam) ? orderParam : [orderParam];
      const orderParts = (orders as string[]).map((o: string) => {
        const [col, dir] = o.split(".");
        return `${sanitizeIdentifier(col)} ${dir === "desc" ? "DESC" : "ASC"}`;
      });
      orderClause = ` ORDER BY ${orderParts.join(", ")}`;
    } else if (req.query.from || req.query.limit) {
      // Stable order fallback : sans ORDER BY, OFFSET/LIMIT en pagination peut sauter/dupliquer
      // des lignes (ordre PostgreSQL non garanti). ctid existe sur toutes les tables.
      orderClause = ` ORDER BY ctid`;
    }

    // Limit & Range — apply a hard cap to prevent OOM on accidental full-table scans
    const HARD_MAX_ROWS = 5000;
    let effectiveLimit: number | null = null;
    if (req.query.limit) {
      effectiveLimit = Math.min(parseInt(req.query.limit as string, 10) || HARD_MAX_ROWS, HARD_MAX_ROWS);
    }

    let offsetClause = "";
    if (req.query.from) {
      offsetClause = ` OFFSET ${parseInt(req.query.from as string, 10)}`;
      if (req.query.to) {
        const from = parseInt(req.query.from as string, 10);
        const to = parseInt(req.query.to as string, 10);
        effectiveLimit = Math.min(to - from + 1, HARD_MAX_ROWS);
      }
    }

    if (isSingle && effectiveLimit == null) effectiveLimit = 1;
    // Fallback hard cap when caller did not specify any limit/range
    if (effectiveLimit == null) effectiveLimit = HARD_MAX_ROWS;
    const limitClause = ` LIMIT ${effectiveLimit}`;

    if (isHead && countMode) {
      // COUNT only
      const countSql = `SELECT COUNT(*) as count FROM ${qualifyTable(table)}${where}`;
      const result = await pool.query(countSql, params);
      res.json({ count: parseInt(result.rows[0].count, 10) });
      return;
    }

    const sql = `SELECT ${selectCols} FROM ${qualifyTable(table)}${where}${orderClause}${limitClause}${offsetClause}`;
    const result = await pool.query(sql, params);

    if (result.rows.length >= HARD_MAX_ROWS) {
      console.warn(`[db] cap hit table=${table} rows=${result.rows.length} url=${req.originalUrl}`);
    }

    if (isSingle) {
      res.json({ data: result.rows[0] ?? null });
    } else if (countMode) {
      // Return data + count
      const countSql = `SELECT COUNT(*) as count FROM ${qualifyTable(table)}${where}`;
      const countResult = await pool.query(countSql, params);
      res.json({ data: result.rows, count: parseInt(countResult.rows[0].count, 10) });
    } else {
      res.json({ data: result.rows });
    }
  } catch (err: any) {
    console.error(`[db] GET ${req.originalUrl} failed:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/db/:table (mutations) ────────────────────

router.post("/:table", async (req: Request, res: Response) => {
  try {
    const table = req.params.table as string;
    if (!isAllowedTable(table)) {
      res.status(403).json({ error: `Table "${table}" non autorisée` });
      return;
    }

    const { _method, _filters, _body } = req.body;

    // If no _method, it's a direct INSERT from dbClient
    const method = _method || "POST";

    // Auth check: public inserts/updates allowed for certain tables, everything else needs admin
    if (method === "POST" && !_body?._upsert && isPublicInsert(table)) {
      // Public insert allowed, no auth needed
    } else if (method === "POST" && _body?._upsert && isPublicInsert(table) && isPublicUpdate(table)) {
      // Public upsert allowed when table allows both public insert and update
    } else if (method === "PATCH" && isPublicUpdate(table)) {
      // Public update allowed, no auth needed
    } else if (method === "DELETE" && isPublicDelete(table)) {
      // Public delete allowed, no auth needed (used by Evaluador "replace children" flows)
    } else {
      // Need admin auth — check manually since we may not use middleware
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        res.status(401).json({ error: "Authentification requise" });
        return;
      }
      // We trust requireAuth middleware if it was applied, but since this is 
      // a conditional check we verify the token inline
      const jwt = await import("jsonwebtoken");
      const JWT_SECRET = process.env.JWT_SECRET || "change-me";
      try {
        const decoded = jwt.default.verify(authHeader.slice(7), JWT_SECRET) as any;
        // Check admin role
        const { queryOne } = await import("../db");
        const role = await queryOne(
          `SELECT cr.name FROM user_custom_roles ucr
           JOIN custom_roles cr ON cr.id = ucr.role_id
           WHERE ucr.user_id = $1 AND cr.name IN ('Admin', 'Superadmin')`,
          [decoded.userId]
        );
        if (!role) {
          res.status(403).json({ error: "Accès admin requis" });
          return;
        }
      } catch {
        res.status(401).json({ error: "Token invalide" });
        return;
      }
    }

    const filters: Filter[] = _filters || [];

    // ── Superadmin protection for RBAC tables ──────────────
    const RBAC_TABLES = new Set(["role_permissions", "custom_roles", "user_custom_roles"]);
    if (RBAC_TABLES.has(table) && (method === "PATCH" || method === "DELETE" || method === "POST")) {
      let targetsSuperadmin = false;

      if (table === "role_permissions") {
        const roleIdFromFilters = filters.find((f: Filter) => f.col === "role_id")?.val;
        const roleIdFromBody = (_body || {}).role_id;
        const roleIdToCheck = roleIdFromFilters || roleIdFromBody;
        if (roleIdToCheck) {
          const saRow = await queryOne(
            `SELECT 1 FROM custom_roles WHERE id = $1 AND name = 'Superadmin'`,
            [roleIdToCheck]
          );
          if (saRow) targetsSuperadmin = true;
        }
      } else if (table === "custom_roles") {
        const idFromFilters = filters.find((f: Filter) => f.col === "id")?.val;
        if (idFromFilters) {
          const saRow = await queryOne(
            `SELECT 1 FROM custom_roles WHERE id = $1 AND name = 'Superadmin'`,
            [idFromFilters]
          );
          if (saRow) targetsSuperadmin = true;
        }
      } else if (table === "user_custom_roles") {
        const roleIdFromFilters = filters.find((f: Filter) => f.col === "role_id")?.val;
        const roleIdFromBody = (_body || {}).role_id;
        const roleIdToCheck = roleIdFromFilters || roleIdFromBody;
        if (roleIdToCheck) {
          const saRow = await queryOne(
            `SELECT 1 FROM custom_roles WHERE id = $1 AND name = 'Superadmin'`,
            [roleIdToCheck]
          );
          if (saRow) targetsSuperadmin = true;
        }
      }

      if (targetsSuperadmin) {
        const authHeader = req.headers.authorization;
        if (authHeader?.startsWith("Bearer ")) {
          const jwt = await import("jsonwebtoken");
          const JWT_SECRET = process.env.JWT_SECRET || "change-me";
          try {
            const decoded = jwt.default.verify(authHeader.slice(7), JWT_SECRET) as any;
            const callerRole = await queryOne(
              `SELECT cr.name FROM user_custom_roles ucr
               JOIN custom_roles cr ON cr.id = ucr.role_id
               WHERE ucr.user_id = $1 AND cr.name = 'Superadmin'`,
              [decoded.userId]
            );
            if (!callerRole) {
              res.status(403).json({ error: "Solo un Superadmin puede modificar el rol Superadmin" });
              return;
            }
          } catch {
            res.status(403).json({ error: "Solo un Superadmin puede modificar el rol Superadmin" });
            return;
          }
        } else {
          res.status(403).json({ error: "Solo un Superadmin puede modificar el rol Superadmin" });
          return;
        }
      }
    }

    if (method === "POST") {
      // INSERT or UPSERT
      let body = _body || req.body;

      // Handle _upsert flag
      const isUpsert = body._upsert;
      const onConflict = body._onConflict;
      delete body._upsert;
      delete body._onConflict;

      // Handle array of rows
      const rows = body.rows || (Array.isArray(body) ? body : [body]);

      if (rows.length === 0) {
        res.json({ data: [] });
        return;
      }

      const cols = Object.keys(rows[0]);
      // Validate all column names
      cols.forEach(c => sanitizeIdentifier(c));
      const insertedRows: any[] = [];

      for (const row of rows) {
        const vals = cols.map((c) => pgValue(row[c]));
        const placeholders = cols.map((_, i) => `$${i + 1}`);
        let sql = `INSERT INTO ${qualifyTable(table)} (${cols.map(c => sanitizeIdentifier(c)).join(",")}) VALUES (${placeholders.join(",")})`;

        if (isUpsert && onConflict) {
          const conflictCols = onConflict.split(",").map((c: string) => c.trim());
          conflictCols.forEach((c: string) => sanitizeIdentifier(c));
          const updateParts = cols
            .filter((c) => !conflictCols.includes(c))
            .map((c) => `${sanitizeIdentifier(c)} = EXCLUDED.${sanitizeIdentifier(c)}`);
          sql += ` ON CONFLICT (${conflictCols.map((c: string) => sanitizeIdentifier(c)).join(",")}) DO UPDATE SET ${updateParts.join(",")}`;
        } else if (isUpsert) {
          sql += ` ON CONFLICT DO NOTHING`;
        }

        sql += ` RETURNING *`;
        const result = await pool.query(sql, vals);
        insertedRows.push(...result.rows);
      }

      res.json({ data: insertedRows });
    } else if (method === "PATCH") {
      // UPDATE
      const body = _body || {};
      const setCols = Object.keys(body);
      if (setCols.length === 0) {
        res.json({ data: null });
        return;
      }
      // Validate column names
      setCols.forEach(c => sanitizeIdentifier(c));

      const params: any[] = [];
      const setParts = setCols.map((col) => {
        params.push(pgValue(body[col]));
        return `${sanitizeIdentifier(col)} = $${params.length}`;
      });

      const where = buildWhereClause(filters, params);
      const sql = `UPDATE ${qualifyTable(table)} SET ${setParts.join(",")}${where} RETURNING *`;
      const result = await pool.query(sql, params);
      res.json({ data: result.rows });
    } else if (method === "DELETE") {
      const params: any[] = [];
      const where = buildWhereClause(filters, params);
      const sql = `DELETE FROM ${qualifyTable(table)}${where} RETURNING *`;
      const result = await pool.query(sql, params);
      res.json({ data: result.rows });
    } else {
      res.status(400).json({ error: `Méthode non supportée: ${method}` });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
