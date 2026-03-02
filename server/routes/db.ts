/**
 * Generic database proxy route.
 *
 * Handles the query protocol from the frontend's dbClient.ts QueryBuilder.
 *
 * GET  /api/db/:table?select=...&eq.col=val&order=col.asc&limit=N&single=true
 * POST /api/db/:table  { _method: "POST"|"PATCH"|"DELETE", _filters: [...], _body: {...} }
 */

import { Router, Request, Response } from "express";
import { pool, query } from "../db";
import { requireAuth, requireAdmin } from "../middleware/auth";

const router = Router();

// Tables that allow public reads (no auth required for GET)
const PUBLIC_READ_TABLES = new Set([
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
]);

// Whitelist of allowed tables
const ALLOWED_TABLES = new Set([
  ...PUBLIC_READ_TABLES,
  ...PUBLIC_INSERT_TABLES,
  "fichas_rlt",
  "encuestas_360",
  "deleted_records",
  "user_roles",
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
]);

// ── Helpers ────────────────────────────────────────────

/** Validate column/table names to prevent SQL injection via identifiers */
const VALID_IDENTIFIER = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

function sanitizeIdentifier(name: string): string {
  if (!VALID_IDENTIFIER.test(name)) {
    throw new Error(`Invalid identifier: "${name}"`);
  }
  return `"${name}"`;
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
    const idx = params.length + 1;
    switch (f.type) {
      case "eq":
        params.push(f.val);
        clauses.push(`${safeCol} = $${idx}`);
        break;
      case "neq":
        params.push(f.val);
        clauses.push(`${safeCol} != $${idx}`);
        break;
      case "gt":
        params.push(f.val);
        clauses.push(`${safeCol} > $${idx}`);
        break;
      case "gte":
        params.push(f.val);
        clauses.push(`${safeCol} >= $${idx}`);
        break;
      case "lt":
        params.push(f.val);
        clauses.push(`${safeCol} < $${idx}`);
        break;
      case "lte":
        params.push(f.val);
        clauses.push(`${safeCol} <= $${idx}`);
        break;
      case "like":
        params.push(f.val);
        clauses.push(`${safeCol} LIKE $${idx}`);
        break;
      case "ilike":
        params.push(f.val);
        clauses.push(`${safeCol} ILIKE $${idx}`);
        break;
      case "in":
        if (Array.isArray(f.val) && f.val.length > 0) {
          const placeholders = f.val.map((_: any, i: number) => `$${params.length + i + 1}`);
          params.push(...f.val);
          clauses.push(`${safeCol} IN (${placeholders.join(",")})`);
        } else if (typeof f.val === "string") {
          const vals = f.val.split(",");
          const placeholders = vals.map((_: any, i: number) => `$${params.length + i + 1}`);
          params.push(...vals);
          clauses.push(`${safeCol} IN (${placeholders.join(",")})`);
        }
        break;
      case "is":
        if (f.val === null || f.val === "null") {
          clauses.push(`${safeCol} IS NULL`);
        } else if (f.val === true || f.val === "true") {
          clauses.push(`${safeCol} IS TRUE`);
        } else if (f.val === false || f.val === "false") {
          clauses.push(`${safeCol} IS FALSE`);
        }
        break;
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
    if (!ALLOWED_TABLES.has(table)) {
      res.status(403).json({ error: `Table "${table}" non autorisée` });
      return;
    }

    // Auth check for non-public tables
    if (!PUBLIC_READ_TABLES.has(table)) {
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
    }

    // Limit & Range
    let limitClause = "";
    if (req.query.limit) limitClause = ` LIMIT ${parseInt(req.query.limit as string, 10)}`;

    let offsetClause = "";
    if (req.query.from) {
      offsetClause = ` OFFSET ${parseInt(req.query.from as string, 10)}`;
      if (req.query.to) {
        const from = parseInt(req.query.from as string, 10);
        const to = parseInt(req.query.to as string, 10);
        limitClause = ` LIMIT ${to - from + 1}`;
      }
    }

    if (isHead && countMode) {
      // COUNT only
      const countSql = `SELECT COUNT(*) as count FROM ${sanitizeIdentifier(table)}${where}`;
      const result = await pool.query(countSql, params);
      res.json({ count: parseInt(result.rows[0].count, 10) });
      return;
    }

    const sql = `SELECT ${selectCols} FROM ${sanitizeIdentifier(table)}${where}${orderClause}${limitClause}${offsetClause}`;
    const result = await pool.query(sql, params);

    if (isSingle) {
      res.json({ data: result.rows[0] ?? null });
    } else if (countMode) {
      // Return data + count
      const countSql = `SELECT COUNT(*) as count FROM ${sanitizeIdentifier(table)}${where}`;
      const countResult = await pool.query(countSql, params);
      res.json({ data: result.rows, count: parseInt(countResult.rows[0].count, 10) });
    } else {
      res.json({ data: result.rows });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/db/:table (mutations) ────────────────────

router.post("/:table", async (req: Request, res: Response) => {
  try {
    const table = req.params.table as string;
    if (!ALLOWED_TABLES.has(table)) {
      res.status(403).json({ error: `Table "${table}" non autorisée` });
      return;
    }

    const { _method, _filters, _body } = req.body;

    // If no _method, it's a direct INSERT from dbClient
    const method = _method || "POST";

    // Auth check: public inserts allowed for certain tables, everything else needs admin
    if (method === "POST" && !_body?._upsert && PUBLIC_INSERT_TABLES.has(table)) {
      // Public insert allowed, no auth needed
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
          "SELECT role FROM user_roles WHERE user_id = $1 AND role IN ('admin', 'superadmin')",
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
        const vals = cols.map((c) => row[c]);
        const placeholders = cols.map((_, i) => `$${i + 1}`);
        let sql = `INSERT INTO ${sanitizeIdentifier(table)} (${cols.map(c => sanitizeIdentifier(c)).join(",")}) VALUES (${placeholders.join(",")})`;

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
        params.push(body[col]);
        return `${sanitizeIdentifier(col)} = $${params.length}`;
      });

      const where = buildWhereClause(filters, params);
      const sql = `UPDATE ${sanitizeIdentifier(table)} SET ${setParts.join(",")}${where} RETURNING *`;
      const result = await pool.query(sql, params);
      res.json({ data: result.rows });
    } else if (method === "DELETE") {
      const params: any[] = [];
      const where = buildWhereClause(filters, params);
      const sql = `DELETE FROM ${sanitizeIdentifier(table)}${where} RETURNING *`;
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
