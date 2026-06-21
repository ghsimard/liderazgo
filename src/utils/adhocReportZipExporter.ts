/**
 * ZIP export for ad-hoc report results.
 * Bundles CSV data + SQL + metadata into a single archive.
 * Useful when the result set is too large for a single CSV/PDF download.
 */

import JSZip from "jszip";

function formatDateValue(s: string): string | null {
  const mDate = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (mDate) return `${mDate[3]}/${mDate[2]}/${mDate[1]}`;
  const mDt = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|[+-]\d{2}:?\d{2})?$/.exec(s);
  if (mDt) {
    const [, y, mo, d, hh, mi, ss] = mDt;
    if (hh === "00" && mi === "00" && ss === "00") return `${d}/${mo}/${y}`;
    return `${d}/${mo}/${y} ${hh}:${mi}`;
  }
  return null;
}

function escapeCell(v: unknown): string {
  if (v == null) return "";
  let s: string;
  if (v instanceof Date) {
    s = formatDateValue(v.toISOString()) ?? v.toISOString();
  } else if (typeof v === "string") {
    s = formatDateValue(v) ?? v;
  } else if (typeof v === "object") {
    try {
      s = JSON.stringify(v);
    } catch {
      s = String(v);
    }
  } else {
    s = String(v);
  }
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function buildCsv(columns: string[], rows: Record<string, unknown>[]): string {
  const lines: string[] = [];
  lines.push(columns.map(escapeCell).join(","));
  for (const row of rows) {
    lines.push(columns.map((c) => escapeCell(row[c])).join(","));
  }
  return "\uFEFF" + lines.join("\r\n");
}

function formatDateDDMMYYYY(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
}

interface AdhocZipOptions {
  question: string;
  sql: string;
  explanation?: string;
  columns: string[];
  rows: Record<string, unknown>[];
  generatedBy?: string;
}

export async function exportAdhocReportZip(opts: AdhocZipOptions): Promise<void> {
  const zip = new JSZip();

  zip.file("datos.csv", buildCsv(opts.columns, opts.rows));
  zip.file("consulta.sql", opts.sql + "\n");

  const metadata = [
    "Reporte Ad Hoc",
    "================",
    "",
    `Fecha de generación: ${formatDateDDMMYYYY(new Date())}`,
    opts.generatedBy ? `Generado por: ${opts.generatedBy}` : null,
    `Número de filas: ${opts.rows.length}`,
    `Número de columnas: ${opts.columns.length}`,
    "",
    "Pregunta:",
    opts.question,
    "",
    opts.explanation ? "Explicación:" : null,
    opts.explanation || null,
    "",
    "Columnas:",
    ...opts.columns.map((c) => `  - ${c}`),
    "",
    "Archivos incluidos:",
    "  - datos.csv      : todas las filas en formato CSV (UTF-8 con BOM)",
    "  - consulta.sql   : consulta SQL generada y ejecutada",
    "  - metadata.txt   : este archivo",
  ]
    .filter((l) => l !== null)
    .join("\n");

  zip.file("metadata.txt", metadata);

  const blob = await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `reporte-adhoc-${Date.now()}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
