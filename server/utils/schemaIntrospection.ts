/**
 * Schema introspection helper for the ad-hoc report feature.
 *
 * Builds a compact, LLM-friendly dump of the whitelisted tables:
 *  - columns + types + nullable + PG COMMENT ON COLUMN
 *  - enum values via pg_enum
 *  - distinct samples for low-cardinality text columns
 *  - 3 anonymized sample rows per table
 *
 * Result is cached in memory for TTL_MS to keep the route fast.
 */

import { pool, query } from "../db";

export const ADHOC_ALLOWED_TABLES = [
  "fichas_rlt",
  "rubrica_evaluaciones",
  "rubrica_seguimientos",
  "rubrica_asignaciones",
  "rubrica_modules",
  "rubrica_items",
  "rubrica_evaluadores",
  "rubrica_submission_dates",
  "rubrica_regional_analyses",
  "encuestas_360",
  "competencies_360",
  "items_360",
  "domains_360",
  "competency_weights",
  "item_texts_360",
  "mel_kpi_config",
  "mel_kpi_groups",
  "mel_kpi_group_items",
  "satisfaccion_responses",
  "satisfaccion_config",
  "satisfaccion_form_definitions",
  "satisfaccion_report_content",
  "informe_modulo",
  "informe_modulo_equipo",
  "informe_directivo",
  "informe_asistencia",
  "encuestas_ambiente_escolar",
  "ae_acudientes_submissions_2025",
  "ae_docentes_submissions_2025",
  "ae_estudiantes_submissions_2025",
  "ae_rectores_2025",
  "ae_cohortes",
  "ae_cohorte_instituciones",
  "ae_campanas",
  "regiones",
  "entidades_territoriales",
  "municipios",
  "instituciones",
  "region_entidades",
  "region_municipios",
  "region_instituciones",
  "encuesta_invitaciones",
  "encuesta_360_visibility",
];

/** Columns whose values must be masked when sent to the LLM */
const SENSITIVE_COLUMN_PATTERNS = [
  /cedula/i,
  /email/i,
  /telefono/i,
  /password/i,
  /token/i,
];

const TTL_MS = 10 * 60 * 1000; // 10 min

interface ColumnInfo {
  name: string;
  data_type: string;
  is_nullable: boolean;
  comment: string | null;
  enum_values?: string[];
  distinct_sample?: string[];
}

interface TableInfo {
  name: string;
  columns: ColumnInfo[];
  sample_rows: Record<string, unknown>[];
}

interface Cache {
  expiresAt: number;
  dump: string;
  tables: TableInfo[];
}

let cache: Cache | null = null;

function isSensitive(col: string): boolean {
  return SENSITIVE_COLUMN_PATTERNS.some((re) => re.test(col));
}

function maskValue(col: string, value: unknown): unknown {
  if (value == null) return null;
  if (isSensitive(col)) return "***";
  const s = String(value);
  if (s.length > 120) return s.slice(0, 117) + "...";
  return value;
}

async function getEnumMap(): Promise<Record<string, string[]>> {
  const rows = await query<{ type_name: string; value: string }>(
    `SELECT t.typname AS type_name, e.enumlabel AS value
       FROM pg_type t
       JOIN pg_enum e ON e.enumtypid = t.oid
       JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
      ORDER BY t.typname, e.enumsortorder`
  );
  const map: Record<string, string[]> = {};
  for (const r of rows) {
    (map[r.type_name] ||= []).push(r.value);
  }
  return map;
}

async function getTableInfo(table: string, enumMap: Record<string, string[]>): Promise<TableInfo | null> {
  // columns + comments
  const cols = await query<{
    column_name: string;
    udt_name: string;
    data_type: string;
    is_nullable: string;
    description: string | null;
  }>(
    `SELECT c.column_name,
            c.udt_name,
            c.data_type,
            c.is_nullable,
            pgd.description
       FROM information_schema.columns c
       LEFT JOIN pg_catalog.pg_statio_all_tables st
              ON st.schemaname = c.table_schema AND st.relname = c.table_name
       LEFT JOIN pg_catalog.pg_description pgd
              ON pgd.objoid = st.relid AND pgd.objsubid = c.ordinal_position
      WHERE c.table_schema = 'public' AND c.table_name = $1
      ORDER BY c.ordinal_position`,
    [table]
  );

  if (cols.length === 0) return null;

  const columns: ColumnInfo[] = [];
  for (const c of cols) {
    const info: ColumnInfo = {
      name: c.column_name,
      data_type: c.data_type === "USER-DEFINED" ? c.udt_name : c.data_type,
      is_nullable: c.is_nullable === "YES",
      comment: c.description,
    };

    // enum values?
    if (enumMap[c.udt_name]) {
      info.enum_values = enumMap[c.udt_name];
    }

    // distinct samples for text columns (skip sensitive ones)
    if (
      !info.enum_values &&
      !isSensitive(c.column_name) &&
      ["text", "character varying", "varchar"].includes(c.data_type)
    ) {
      try {
        const distinctCount = await query<{ n: string }>(
          `SELECT COUNT(*)::text AS n FROM (SELECT DISTINCT "${c.column_name}" FROM "${table}" LIMIT 51) s`
        );
        const n = parseInt(distinctCount[0]?.n || "0", 10);
        if (n > 0 && n <= 50) {
          const distinct = await query<Record<string, unknown>>(
            `SELECT DISTINCT "${c.column_name}" AS v FROM "${table}"
              WHERE "${c.column_name}" IS NOT NULL
              ORDER BY "${c.column_name}" LIMIT 20`
          );
          info.distinct_sample = distinct
            .map((r) => (r.v == null ? null : String(r.v)))
            .filter((v): v is string => !!v && v.length < 80);
        }
      } catch {
        // ignore — table may not exist yet
      }
    }

    columns.push(info);
  }

  // sample rows (3, anonymized)
  let sample_rows: Record<string, unknown>[] = [];
  try {
    const rows = await query<Record<string, unknown>>(`SELECT * FROM "${table}" LIMIT 3`);
    sample_rows = rows.map((row) => {
      const masked: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(row)) {
        masked[k] = maskValue(k, v);
      }
      return masked;
    });
  } catch {
    sample_rows = [];
  }

  return { name: table, columns, sample_rows };
}

function renderDump(tables: TableInfo[]): string {
  const lines: string[] = [];
  for (const t of tables) {
    lines.push(`\n## TABLA: ${t.name}`);
    for (const c of t.columns) {
      let line = `  - ${c.name} (${c.data_type}${c.is_nullable ? ", nullable" : ""})`;
      if (c.comment) line += ` // ${c.comment}`;
      if (c.enum_values?.length) line += `  enum: [${c.enum_values.join(", ")}]`;
      if (c.distinct_sample?.length) {
        line += `  ejemplos: [${c.distinct_sample.map((v) => JSON.stringify(v)).join(", ")}]`;
      }
      lines.push(line);
    }
    if (t.sample_rows.length) {
      lines.push(`  muestra (${t.sample_rows.length} filas, anonimizadas):`);
      for (const r of t.sample_rows) {
        lines.push(`    ${JSON.stringify(r)}`);
      }
    }
  }
  return lines.join("\n");
}

export async function getSchemaDump(forceRefresh = false): Promise<{ dump: string; tables: TableInfo[] }> {
  if (!forceRefresh && cache && cache.expiresAt > Date.now()) {
    return { dump: cache.dump, tables: cache.tables };
  }

  const enumMap = await getEnumMap();
  const tables: TableInfo[] = [];
  for (const t of ADHOC_ALLOWED_TABLES) {
    try {
      const info = await getTableInfo(t, enumMap);
      if (info) tables.push(info);
    } catch (err) {
      console.warn(`[adhoc-report] skip table ${t}:`, (err as Error).message);
    }
  }

  const dump = renderDump(tables);
  cache = { expiresAt: Date.now() + TTL_MS, dump, tables };
  return { dump, tables };
}

export function invalidateSchemaCache() {
  cache = null;
}
