/**
 * Ad-hoc reports — natural language to read-only SQL.
 *
 * Flow:
 *  1. Admin types a question in Spanish.
 *  2. Schema introspection dump is sent to Grok-3 with the question.
 *  3. The model returns either { sql, explanation } or { needs_clarification, question }.
 *  4. The SQL is validated server-side (regex blocklist + identifier whitelist + EXPLAIN dry-run).
 *  5. Executed via pool.query (15s statement_timeout already configured).
 *  6. Returned to the client with columns + rows.
 */

import { Router, Request, Response } from "express";
import { z } from "zod";
import { pool } from "../db";
import { requireAuth, requireAdmin } from "../middleware/auth";
import {
  ADHOC_ALLOWED_TABLES,
  getSchemaDump,
  invalidateSchemaCache,
} from "../utils/schemaIntrospection";

const router = Router();

const QuestionSchema = z.object({
  question: z.string().trim().min(5).max(500),
  refresh_schema: z.boolean().optional(),
});

const HARD_ROW_LIMIT = 1000;
const ALLOWED_TABLES_SET = new Set(ADHOC_ALLOWED_TABLES);

const DANGEROUS_RE =
  /\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|GRANT|REVOKE|CREATE|COPY|VACUUM|REINDEX|CLUSTER|LOCK|MERGE|CALL|DO|REFRESH|LISTEN|NOTIFY|SECURITY|SET\s+SESSION|RESET)\b/i;
const FORBIDDEN_SCHEMAS_RE = /\b(pg_catalog|information_schema|pg_temp|pg_toast)\b/i;
const COMMENT_RE = /--|\/\*|\*\//;
const MULTI_STMT_RE = /;\s*\S/;

function extractCteNames(sql: string): Set<string> {
  // Match CTE names in: WITH name AS (...), name2 AS (...) [RECURSIVE allowed]
  // After WITH or after a comma at CTE level, an identifier followed by optional (cols) then AS (
  const out = new Set<string>();
  const withMatch = sql.match(/\bWITH\s+(?:RECURSIVE\s+)?([\s\S]+?)\bSELECT\b/i);
  if (!withMatch) return out;
  const cteBlock = withMatch[1];
  const re = /(?:^|,)\s*"?([a-zA-Z_][a-zA-Z0-9_]*)"?\s*(?:\([^)]*\)\s*)?AS\s*\(/gi;
  let m;
  while ((m = re.exec(cteBlock)) !== null) {
    out.add(m[1].toLowerCase());
  }
  return out;
}

function stripFromInsideFunctions(sql: string): string {
  // Remove SQL constructs where FROM is a keyword inside a function call, not a table source.
  // EXTRACT(field FROM source), SUBSTRING(str FROM n FOR m), TRIM([leading|trailing|both] [chars] FROM str),
  // OVERLAY(str PLACING ... FROM n FOR m), POSITION(sub IN str).
  // Strategy: iteratively replace the inner contents of these function calls with a placeholder.
  let out = sql;
  // EXTRACT(... FROM ...)
  out = out.replace(/\bEXTRACT\s*\([^()]*\)/gi, " __FUNC__ ");
  // SUBSTRING(... FROM ... [FOR ...])
  out = out.replace(/\bSUBSTRING\s*\([^()]*\)/gi, " __FUNC__ ");
  // TRIM(... FROM ...)
  out = out.replace(/\bTRIM\s*\([^()]*\)/gi, " __FUNC__ ");
  // OVERLAY(... FROM ... [FOR ...])
  out = out.replace(/\bOVERLAY\s*\([^()]*\)/gi, " __FUNC__ ");
  // POSITION(... IN ...)
  out = out.replace(/\bPOSITION\s*\([^()]*\)/gi, " __FUNC__ ");
  return out;
}

function extractTableIdentifiers(sql: string): string[] {
  const cleaned = stripFromInsideFunctions(sql);
  // Match FROM/JOIN <identifier> but NOT when the identifier is immediately followed by '(',
  // which means it's a function call (e.g. FROM date_trunc(...)).
  const matches = cleaned.matchAll(/\b(?:FROM|JOIN)\s+"?([a-zA-Z_][a-zA-Z0-9_]*)"?(\s*\()?/gi);
  const out = new Set<string>();
  for (const m of matches) {
    if (m[2]) continue; // followed by '(' → function call, not a table
    out.add(m[1].toLowerCase());
  }
  return [...out];
}

function ensureLimit(sql: string): string {
  if (/\blimit\s+\d+/i.test(sql)) return sql;
  const trimmed = sql.trim().replace(/;\s*$/, "");
  return `${trimmed} LIMIT ${HARD_ROW_LIMIT}`;
}

interface ValidationResult {
  ok: boolean;
  reason?: string;
  sql?: string;
}

function validateSql(rawSql: string): ValidationResult {
  if (!rawSql || typeof rawSql !== "string") {
    return { ok: false, reason: "SQL vacío." };
  }
  const sql = rawSql.trim().replace(/;\s*$/, "");

  if (!/^\s*SELECT\b/i.test(sql) && !/^\s*WITH\b/i.test(sql)) {
    return { ok: false, reason: "Solo se permiten consultas SELECT." };
  }
  if (MULTI_STMT_RE.test(sql)) {
    return { ok: false, reason: "Múltiples sentencias no permitidas." };
  }
  if (COMMENT_RE.test(sql)) {
    return { ok: false, reason: "Comentarios SQL no permitidos." };
  }
  if (DANGEROUS_RE.test(sql)) {
    return { ok: false, reason: "Palabra clave SQL no permitida." };
  }
  if (FORBIDDEN_SCHEMAS_RE.test(sql)) {
    return { ok: false, reason: "Esquema no permitido." };
  }

  const tables = extractTableIdentifiers(sql);
  if (tables.length === 0) {
    return { ok: false, reason: "No se detectó tabla en la consulta." };
  }
  const cteNames = extractCteNames(sql);
  let hasRealTable = false;
  for (const t of tables) {
    if (cteNames.has(t)) continue; // CTE reference, allowed
    if (!ALLOWED_TABLES_SET.has(t)) {
      return { ok: false, reason: `Tabla no permitida: ${t}` };
    }
    hasRealTable = true;
  }
  if (!hasRealTable) {
    return { ok: false, reason: "La consulta no referencia ninguna tabla permitida." };
  }

  return { ok: true, sql: ensureLimit(sql) };
}

interface LlmResult {
  sql?: string;
  explanation?: string;
  needs_clarification?: boolean;
  question?: string;
  raw?: string;
}

async function askGrok(question: string, schemaDump: string): Promise<LlmResult> {
  const XAI_API_KEY = process.env.XAI_API_KEY;
  if (!XAI_API_KEY) {
    throw new Error("XAI_API_KEY no está configurada en el servidor.");
  }

  const systemPrompt = `Eres un generador experto de SQL PostgreSQL **de solo lectura**.

REGLAS ABSOLUTAS:
- Solo puedes producir una única sentencia SELECT (o WITH ... SELECT).
- PROHIBIDO: INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE, GRANT, REVOKE, CREATE, COPY, pg_catalog, information_schema, comentarios (-- o /* */), múltiples sentencias.
- Solo puedes referenciar tablas listadas en el esquema. Si la pregunta requiere una tabla no listada, devuelve needs_clarification.
- Incluye SIEMPRE LIMIT 1000 al final.
- Para texto, prefiere ILIKE con comodines en lugar de igualdad estricta.
- Se permiten agregaciones (COUNT, SUM, AVG, GROUP BY, JOIN, CTE de solo lectura).

FORMATO DE SALIDA — responde ÚNICAMENTE con un objeto JSON, sin bloque de código ni texto adicional:

Si puedes generar la consulta:
{"sql": "SELECT ...", "explanation": "Breve descripción en español de lo que hace la consulta."}

Si la pregunta es ambigua o requiere datos no disponibles:
{"needs_clarification": true, "question": "Pregunta de clarificación en español."}

ESQUEMA DE LA BASE DE DATOS (introspectado dinámicamente):
${schemaDump}`;

  const response = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${XAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "grok-3-mini-fast",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question },
      ],
    }),
  });

  if (!response.ok) {
    const t = await response.text();
    console.error("[adhoc-report] xAI error", response.status, t);
    throw new Error("Error del servicio de IA.");
  }
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";
  try {
    const parsed = JSON.parse(content);
    return { ...parsed, raw: content };
  } catch {
    // Try to extract a JSON block if the model misbehaved
    const m = content.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return { ...JSON.parse(m[0]), raw: content };
      } catch {
        // fall through
      }
    }
    return { raw: content, explanation: content };
  }
}

router.post("/", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const parsed = QuestionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "La pregunta debe tener entre 5 y 500 caracteres." });
    }

    const { question, refresh_schema } = parsed.data;
    const { dump } = await getSchemaDump(!!refresh_schema);

    const llm = await askGrok(question, dump);

    if (llm.needs_clarification) {
      return res.json({
        needs_clarification: true,
        clarification_question: llm.question || "¿Podrías reformular tu pregunta?",
      });
    }

    const candidate = (llm.sql || "").trim();
    if (!candidate) {
      return res.status(422).json({
        error: "El modelo no devolvió ninguna consulta SQL.",
        llm_raw: llm.raw,
      });
    }

    const validation = validateSql(candidate);
    if (!validation.ok || !validation.sql) {
      return res.status(400).json({
        error: `SQL rechazado por validación: ${validation.reason}`,
        sql_propuesto: candidate,
      });
    }

    // EXPLAIN dry-run
    try {
      await pool.query(`EXPLAIN ${validation.sql}`);
    } catch (err: any) {
      return res.status(400).json({
        error: `SQL inválido (EXPLAIN falló): ${err.message}`,
        sql: validation.sql,
      });
    }

    const result = await pool.query(validation.sql);
    const columns = result.fields.map((f) => f.name);
    const truncated = result.rows.length >= HARD_ROW_LIMIT;

    return res.json({
      sql: validation.sql,
      explanation: llm.explanation || "",
      columns,
      rows: result.rows,
      row_count: result.rows.length,
      truncated,
    });
  } catch (err: any) {
    console.error("[adhoc-report] error", err);
    return res.status(500).json({ error: err.message || "Error desconocido" });
  }
});

router.post("/refresh-schema", requireAuth, requireAdmin, async (_req, res) => {
  invalidateSchemaCache();
  try {
    await getSchemaDump(true);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
