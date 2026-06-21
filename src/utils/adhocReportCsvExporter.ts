/**
 * CSV export for ad-hoc report results.
 * RFC 4180-compliant escaping.
 */

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

export function exportAdhocReportCsv(
  columns: string[],
  rows: Record<string, unknown>[],
  filename = `reporte-adhoc-${Date.now()}.csv`
) {
  const lines: string[] = [];
  lines.push(columns.map(escapeCell).join(","));
  for (const row of rows) {
    lines.push(columns.map((c) => escapeCell(row[c])).join(","));
  }
  // BOM for Excel UTF-8 compatibility
  const blob = new Blob(["\uFEFF" + lines.join("\r\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
