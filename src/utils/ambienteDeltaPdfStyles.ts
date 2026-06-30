/**
 * Shared visual helpers for Ambiente Escolar Δ PDFs.
 * Used by `ambienteDeltaPdfGenerator` (cohorte) and
 * `ambienteInstitucionPdfGenerator` (par institución).
 */
import jsPDF from "jspdf";

// ── Palette (RGB tuples) ──────────────────────────────────────────
export const PALETTE = {
  primary: [30, 58, 138] as [number, number, number],       // #1E3A8A
  primaryDark: [15, 30, 80] as [number, number, number],
  accent: [14, 165, 233] as [number, number, number],       // #0EA5E9
  good: [22, 163, 74] as [number, number, number],          // #16A34A
  bad: [220, 38, 38] as [number, number, number],           // #DC2626
  neutral: [100, 116, 139] as [number, number, number],     // #64748B
  text: [30, 41, 59] as [number, number, number],           // #1E293B
  textMuted: [100, 116, 139] as [number, number, number],
  surface: [248, 250, 252] as [number, number, number],     // #F8FAFC
  surfaceAlt: [241, 245, 249] as [number, number, number],  // #F1F5F9
  border: [203, 213, 225] as [number, number, number],      // #CBD5E1
  white: [255, 255, 255] as [number, number, number],
  // Likert gradient (Nunca → Siempre)
  likert: [
    [220, 38, 38],   // Nunca — red
    [234, 88, 12],   // Casi nunca — orange
    [202, 138, 4],   // A veces — amber
    [101, 163, 13],  // Casi siempre — lime
    [22, 163, 74],   // Siempre — green
  ] as [number, number, number][],
};

export function setFill(doc: jsPDF, c: [number, number, number]) {
  doc.setFillColor(c[0], c[1], c[2]);
}
export function setText(doc: jsPDF, c: [number, number, number]) {
  doc.setTextColor(c[0], c[1], c[2]);
}
export function setDraw(doc: jsPDF, c: [number, number, number]) {
  doc.setDrawColor(c[0], c[1], c[2]);
}

export function deltaColor(d: number | null): [number, number, number] {
  if (d === null) return PALETTE.neutral;
  if (d > 0.05) return PALETTE.good;
  if (d < -0.05) return PALETTE.bad;
  return PALETTE.neutral;
}
export function deltaSign(d: number | null): string {
  if (d === null) return "—";
  if (d > 0.05) return "▲";
  if (d < -0.05) return "▼";
  return "=";
}
export function fmtNum(n: number | null, digits = 2): string {
  return n === null ? "—" : n.toFixed(digits);
}
export function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}
export function stripHtml(html: string): string {
  return html
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h\d)>/gi, "\n\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ── Cover header band ─────────────────────────────────────────────
export function drawCoverBand(
  doc: jsPDF,
  opts: { pageW: number; title: string; subtitle: string; height?: number }
) {
  const h = opts.height ?? 55;
  setFill(doc, PALETTE.primary);
  doc.rect(0, 0, opts.pageW, h, "F");
  // Accent strip
  setFill(doc, PALETTE.accent);
  doc.rect(0, h, opts.pageW, 2, "F");

  setText(doc, PALETTE.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text(opts.title, opts.pageW / 2, h / 2 - 2, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.text(opts.subtitle, opts.pageW / 2, h / 2 + 8, { align: "center" });
}

// ── Section title bar (interior pages) ────────────────────────────
export function drawSectionTitle(
  doc: jsPDF,
  opts: { margin: number; pageW: number; y: number; title: string; eyebrow?: string }
): number {
  let y = opts.y;
  if (opts.eyebrow) {
    setText(doc, PALETTE.accent);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(opts.eyebrow.toUpperCase(), opts.margin, y);
    y += 4;
  }
  setText(doc, PALETTE.primary);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(opts.title, opts.margin, y + 2);
  y += 5;
  setDraw(doc, PALETTE.accent);
  doc.setLineWidth(0.8);
  doc.line(opts.margin, y + 1, opts.margin + 24, y + 1);
  doc.setLineWidth(0.2);
  return y + 7;
}

// ── KPI card ──────────────────────────────────────────────────────
export function drawKpiCard(
  doc: jsPDF,
  opts: {
    x: number; y: number; w: number; h: number;
    label: string; value: string; valueColor?: [number, number, number];
    sublabel?: string;
  }
) {
  setFill(doc, PALETTE.surface);
  setDraw(doc, PALETTE.border);
  doc.roundedRect(opts.x, opts.y, opts.w, opts.h, 2, 2, "FD");

  setText(doc, PALETTE.textMuted);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(opts.label.toUpperCase(), opts.x + opts.w / 2, opts.y + 6, { align: "center" });

  setText(doc, opts.valueColor ?? PALETTE.primary);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(opts.value, opts.x + opts.w / 2, opts.y + opts.h / 2 + 4, { align: "center" });

  if (opts.sublabel) {
    setText(doc, PALETTE.textMuted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(opts.sublabel, opts.x + opts.w / 2, opts.y + opts.h - 3, { align: "center" });
  }
}

// ── Δ badge (pill) ────────────────────────────────────────────────
export function drawDeltaBadge(
  doc: jsPDF,
  opts: { x: number; y: number; delta: number | null; align?: "left" | "right" }
) {
  const c = deltaColor(opts.delta);
  const label = opts.delta === null
    ? "—"
    : `${deltaSign(opts.delta)} ${opts.delta > 0 ? "+" : ""}${opts.delta.toFixed(2)} pt`;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  const w = doc.getTextWidth(label) + 8;
  const h = 6;
  const x = opts.align === "right" ? opts.x - w : opts.x;
  setFill(doc, c);
  doc.roundedRect(x, opts.y - h + 1.5, w, h, 1.5, 1.5, "F");
  setText(doc, PALETTE.white);
  doc.text(label, x + w / 2, opts.y + 1, { align: "center" });
}

// ── Zebra table row ───────────────────────────────────────────────
export function drawTableHeader(
  doc: jsPDF,
  opts: { x: number; y: number; w: number; cols: { label: string; width: number; align?: "left" | "right" }[] }
): number {
  const h = 7;
  setFill(doc, PALETTE.primary);
  doc.rect(opts.x, opts.y, opts.w, h, "F");
  setText(doc, PALETTE.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  let cx = opts.x;
  for (const col of opts.cols) {
    const align = col.align ?? "left";
    if (align === "right") {
      doc.text(col.label, cx + col.width - 2, opts.y + 4.7, { align: "right" });
    } else {
      doc.text(col.label, cx + 2, opts.y + 4.7);
    }
    cx += col.width;
  }
  return opts.y + h;
}

export interface CellRender {
  text: string;
  align?: "left" | "right";
  color?: [number, number, number];
  bold?: boolean;
}
export function drawTableRow(
  doc: jsPDF,
  opts: {
    x: number; y: number; w: number;
    cols: { width: number }[];
    cells: CellRender[];
    zebra?: boolean;
    height?: number;
  }
): number {
  const h = opts.height ?? 7;
  if (opts.zebra) {
    setFill(doc, PALETTE.surface);
    doc.rect(opts.x, opts.y, opts.w, h, "F");
  }
  setDraw(doc, PALETTE.border);
  doc.setLineWidth(0.1);
  doc.line(opts.x, opts.y + h, opts.x + opts.w, opts.y + h);

  let cx = opts.x;
  doc.setFontSize(8);
  for (let i = 0; i < opts.cols.length; i++) {
    const col = opts.cols[i];
    const cell = opts.cells[i] ?? { text: "" };
    setText(doc, cell.color ?? PALETTE.text);
    doc.setFont("helvetica", cell.bold ? "bold" : "normal");
    const align = cell.align ?? "left";
    if (align === "right") {
      doc.text(cell.text, cx + col.width - 2, opts.y + 4.8, { align: "right" });
    } else {
      // wrap if needed (single-line truncation)
      const maxW = col.width - 4;
      const lines = doc.splitTextToSize(cell.text, maxW);
      doc.text(lines[0], cx + 2, opts.y + 4.8);
    }
    cx += col.width;
  }
  return opts.y + h;
}

// ── Segmented Likert distribution bar ─────────────────────────────
// optionsOrder must match PALETTE.likert order (Nunca → Siempre).
export function drawLikertBar(
  doc: jsPDF,
  opts: {
    x: number; y: number; w: number; h: number;
    counts: number[]; // length 5, in Nunca→Siempre order
    showLabels?: boolean;
  }
) {
  const total = opts.counts.reduce((a, b) => a + b, 0);
  if (total === 0) {
    setFill(doc, PALETTE.surfaceAlt);
    doc.rect(opts.x, opts.y, opts.w, opts.h, "F");
    setText(doc, PALETTE.textMuted);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7);
    doc.text("Sin respuestas", opts.x + opts.w / 2, opts.y + opts.h / 2 + 1.5, { align: "center" });
    return;
  }
  let cx = opts.x;
  for (let i = 0; i < opts.counts.length; i++) {
    const seg = (opts.counts[i] / total) * opts.w;
    if (seg <= 0) continue;
    setFill(doc, PALETTE.likert[i]);
    doc.rect(cx, opts.y, seg, opts.h, "F");
    if (opts.showLabels && seg > 8) {
      setText(doc, PALETTE.white);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.text(String(opts.counts[i]), cx + seg / 2, opts.y + opts.h / 2 + 2, { align: "center" });
    }
    cx += seg;
  }
}

export const LIKERT_LABELS = ["Nunca", "Casi nunca", "A veces", "Casi siempre", "Siempre"];

export function drawLikertLegend(
  doc: jsPDF,
  opts: { x: number; y: number; w: number }
) {
  const itemW = opts.w / LIKERT_LABELS.length;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  for (let i = 0; i < LIKERT_LABELS.length; i++) {
    const cx = opts.x + i * itemW;
    setFill(doc, PALETTE.likert[i]);
    doc.rect(cx, opts.y, 3, 3, "F");
    setText(doc, PALETTE.text);
    doc.text(LIKERT_LABELS[i], cx + 4, opts.y + 2.5);
  }
}

export const NOTACION_PARAGRAPHS: string[] = [
  "El análisis comparativo (Variación) se calcula entre dos campañas de medición de la misma cohorte: la fase Inicial (línea base) y la fase de Evolución (cierre).",
  "Cada respuesta se codifica en una escala Likert de frecuencia de 1 a 5 puntos, donde 1 = Nunca y 5 = Siempre. Las opciones intermedias (Casi nunca, A veces, Casi siempre) reciben los valores 2, 3 y 4 respectivamente.",
  "Por cada sección y grupo (Docentes, Estudiantes, Acudientes) se obtiene el promedio aritmético de todos los ítems Likert respondidos. La Variación corresponde a la diferencia: Promedio Evolución - Promedio Inicial.",
  "Umbral de significatividad pedagógica: Variación >= 0.5 puntos se considera una mejora notable; Variación <= -0.5 puntos indica un retroceso a atender. Variaciones inferiores a 0.05 (en valor absoluto) se consideran estables.",
  "Convención visual: (+) en verde indica mejora, (-) en rojo indica retroceso, = en gris indica estabilidad.",
  "El promedio global de la cohorte corresponde a la media no ponderada de los promedios obtenidos por los tres grupos encuestados.",
];

