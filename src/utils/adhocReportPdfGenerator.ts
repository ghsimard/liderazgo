/**
 * PDF generator for ad-hoc reports (jsPDF + autoTable).
 * Landscape, with header (logo + date + question) and SQL footer block.
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { loadImageAsBase64 } from "@/utils/pdfLogoHelper";

interface AdhocPdfOptions {
  question: string;
  sql: string;
  explanation?: string;
  columns: string[];
  rows: Record<string, unknown>[];
  logoRLT?: string;
  generatedBy?: string;
}

function formatCellValue(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "object") {
    try {
      return JSON.stringify(v);
    } catch {
      return String(v);
    }
  }
  if (typeof v === "boolean") return v ? "Sí" : "No";
  const s = String(v);
  return s.length > 200 ? s.slice(0, 197) + "..." : s;
}

function formatDateDDMMYYYY(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
}

export async function generateAdhocReportPdf(opts: AdhocPdfOptions): Promise<void> {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 12;

  let logoB64 = "";
  if (opts.logoRLT) {
    try {
      logoB64 = await loadImageAsBase64(opts.logoRLT);
    } catch {
      logoB64 = "";
    }
  }

  // Header
  if (logoB64) {
    try {
      doc.addImage(logoB64, "PNG", margin, 8, 24, 12, undefined, "FAST");
    } catch {
      /* ignore */
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(20, 30, 60);
  doc.text("Reporte Ad Hoc", pageW / 2, 14, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text(`Generado: ${formatDateDDMMYYYY(new Date())}`, pageW - margin, 14, { align: "right" });
  if (opts.generatedBy) {
    doc.text(`Por: ${opts.generatedBy}`, pageW - margin, 18, { align: "right" });
  }

  // Question block
  doc.setFontSize(9);
  doc.setTextColor(40, 40, 40);
  doc.setFont("helvetica", "bold");
  doc.text("Pregunta:", margin, 26);
  doc.setFont("helvetica", "normal");
  const wrappedQ = doc.splitTextToSize(opts.question, pageW - margin * 2 - 20);
  doc.text(wrappedQ, margin + 20, 26);
  let cursorY = 26 + Math.max(1, wrappedQ.length) * 4;

  if (opts.explanation) {
    doc.setFont("helvetica", "italic");
    doc.setTextColor(90, 90, 90);
    const wrappedE = doc.splitTextToSize(opts.explanation, pageW - margin * 2);
    doc.text(wrappedE, margin, cursorY + 2);
    cursorY = cursorY + 2 + wrappedE.length * 4;
  }

  // Table
  const head = [opts.columns];
  const body = opts.rows.map((r) => opts.columns.map((c) => formatCellValue(r[c])));

  autoTable(doc, {
    startY: cursorY + 4,
    head,
    body,
    styles: { fontSize: 7, cellPadding: 1.5, overflow: "linebreak", valign: "top" },
    headStyles: { fillColor: [30, 60, 120], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    margin: { left: margin, right: margin },
    didDrawPage: (data) => {
      const pageH = doc.internal.pageSize.getHeight();
      doc.setFontSize(7);
      doc.setTextColor(120, 120, 120);
      doc.text(
        `Página ${doc.getNumberOfPages()} — ${opts.rows.length} fila(s)`,
        pageW - margin,
        pageH - 5,
        { align: "right" }
      );
    },
  });

  // SQL block on last page (if it fits) or new page
  const finalY = (doc as any).lastAutoTable?.finalY ?? cursorY;
  const pageH = doc.internal.pageSize.getHeight();
  if (finalY > pageH - 40) doc.addPage();
  const sqlY = finalY > pageH - 40 ? 15 : finalY + 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(40, 40, 40);
  doc.text("SQL generado:", margin, sqlY);

  doc.setFont("courier", "normal");
  doc.setFontSize(7);
  doc.setTextColor(60, 60, 60);
  const wrappedSql = doc.splitTextToSize(opts.sql, pageW - margin * 2);
  doc.text(wrappedSql, margin, sqlY + 5);

  const filename = `reporte-adhoc-${Date.now()}.pdf`;
  doc.save(filename);
}
