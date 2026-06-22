import jsPDF from "jspdf";
import {
  loadPdfLogos,
  drawPageHeaderLogos,
  drawFooterCosmo,
  CONTENT_START_Y,
  CONTENT_BOTTOM_MARGIN,
  type LoadedLogos,
} from "@/utils/pdfLogoHelper";

export interface MonitorRow {
  ie: string;
  docentes: number;
  estudiantes: number;
  acudientes: number;
}

export interface AmbienteMonitorReportData {
  cohorteNombre: string;
  faseLabel: string;
  estadoLabel: string;
  busqueda: string;
  rows: MonitorRow[];
  totals: { docentes: number; estudiantes: number; acudientes: number; total: number };
}

export interface AmbienteMonitorPdfLogos {
  logoRLT: string;
  logoCLT: string;
  logoCosmo: string;
  showLogoRLT: boolean;
  showLogoCLT: boolean;
}

function fmtDate(d: Date) {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

function countColor(n: number): [number, number, number] {
  if (n === 0) return [220, 38, 38];
  if (n < 25) return [217, 119, 6];
  return [22, 163, 74];
}

export async function generarPDFAmbienteMonitor(
  data: AmbienteMonitorReportData,
  logoSources: AmbienteMonitorPdfLogos,
): Promise<void> {
  const logos: LoadedLogos = await loadPdfLogos(
    { logoRLT: logoSources.logoRLT, logoCLT: logoSources.logoCLT, logoCosmo: logoSources.logoCosmo },
    logoSources.showLogoRLT,
    logoSources.showLogoCLT,
  );

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentW = pageW - margin * 2;
  let y = 0;

  const addFooter = (pageNum: number) => {
    drawFooterCosmo(doc, logos, { margin, pageW, pageH, pageNum });
  };

  const newPage = () => {
    addFooter(doc.getNumberOfPages());
    doc.addPage();
    drawPageHeaderLogos(doc, logos, { margin, pageW });
    y = CONTENT_START_Y;
    drawTableHeader();
  };

  const ensureSpace = (needed: number) => {
    if (y + needed > pageH - CONTENT_BOTTOM_MARGIN) newPage();
  };

  // Column layout
  const colW = [contentW * 0.46, contentW * 0.13, contentW * 0.13, contentW * 0.13, contentW * 0.15];
  const colX = [margin];
  for (let i = 0; i < colW.length - 1; i++) colX.push(colX[i] + colW[i]);

  const drawTableHeader = () => {
    doc.setFillColor(235, 240, 248);
    doc.rect(margin, y, contentW, 7, "F");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(40, 40, 40);
    doc.text("Institución educativa", colX[0] + 2, y + 5);
    doc.text("Docentes", colX[1] + colW[1] / 2, y + 5, { align: "center" });
    doc.text("Estudiantes", colX[2] + colW[2] / 2, y + 5, { align: "center" });
    doc.text("Acudientes", colX[3] + colW[3] / 2, y + 5, { align: "center" });
    doc.text("Total", colX[4] + colW[4] / 2, y + 5, { align: "center" });
    y += 7;
  };

  // ─── First page header (no cover) ───
  drawPageHeaderLogos(doc, logos, { margin, pageW });
  y = CONTENT_START_Y;

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text("Monitoreo Ambiente Escolar", margin, y);
  y += 7;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text(`Cohorte: ${data.cohorteNombre}    ·    Fase: ${data.faseLabel}    ·    Estado: ${data.estadoLabel}`, margin, y);
  y += 5;
  if (data.busqueda) {
    doc.text(`Búsqueda: "${data.busqueda}"`, margin, y);
    y += 5;
  }
  doc.text(`Generado el ${fmtDate(new Date())}    ·    ${data.rows.length} instituciones`, margin, y);
  y += 8;

  // Summary
  doc.setFillColor(245, 247, 250);
  doc.roundedRect(margin, y, contentW, 14, 2, 2, "F");
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(40, 40, 40);
  doc.text(`Total respuestas: ${data.totals.total}`, margin + 4, y + 6);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Docentes: ${data.totals.docentes}    ·    Estudiantes: ${data.totals.estudiantes}    ·    Acudientes: ${data.totals.acudientes}`,
    margin + 4, y + 11
  );
  y += 18;

  drawTableHeader();

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);

  data.rows.forEach((r, idx) => {
    ensureSpace(6);
    if (idx % 2 === 1) {
      doc.setFillColor(250, 250, 252);
      doc.rect(margin, y, contentW, 6, "F");
    }
    doc.setTextColor(40, 40, 40);
    const ieLines = doc.splitTextToSize(r.ie, colW[0] - 4);
    doc.text(ieLines[0], colX[0] + 2, y + 4);

    const drawCount = (n: number, x: number, w: number) => {
      const c = countColor(n);
      doc.setTextColor(c[0], c[1], c[2]);
      doc.setFont("helvetica", "bold");
      doc.text(String(n), x + w / 2, y + 4, { align: "center" });
      doc.setFont("helvetica", "normal");
    };
    drawCount(r.docentes, colX[1], colW[1]);
    drawCount(r.estudiantes, colX[2], colW[2]);
    drawCount(r.acudientes, colX[3], colW[3]);
    const total = r.docentes + r.estudiantes + r.acudientes;
    doc.setTextColor(40, 40, 40);
    doc.setFont("helvetica", "bold");
    doc.text(String(total), colX[4] + colW[4] / 2, y + 4, { align: "center" });
    doc.setFont("helvetica", "normal");
    y += 6;
  });

  // Totals row
  ensureSpace(8);
  doc.setDrawColor(180, 180, 180);
  doc.line(margin, y, margin + contentW, y);
  y += 1;
  doc.setFillColor(235, 240, 248);
  doc.rect(margin, y, contentW, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(30, 30, 30);
  doc.text("TOTALES", colX[0] + 2, y + 5);
  doc.text(String(data.totals.docentes), colX[1] + colW[1] / 2, y + 5, { align: "center" });
  doc.text(String(data.totals.estudiantes), colX[2] + colW[2] / 2, y + 5, { align: "center" });
  doc.text(String(data.totals.acudientes), colX[3] + colW[3] / 2, y + 5, { align: "center" });
  doc.text(String(data.totals.total), colX[4] + colW[4] / 2, y + 5, { align: "center" });

  // Footers
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(i);
  }

  const safe = data.cohorteNombre.replace(/[^a-zA-Z0-9-_]+/g, "_");
  doc.save(`Monitoreo_AmbienteEscolar_${safe}.pdf`);
}
