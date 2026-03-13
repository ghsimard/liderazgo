import jsPDF from "jspdf";
import {
  loadPdfLogos,
  drawCoverLogos,
  drawPageHeaderLogos,
  drawFooterCosmo,
  HEADER_LOGO_H,
  CONTENT_START_Y,
  CONTENT_BOTTOM_MARGIN,
  type LoadedLogos,
} from "@/utils/pdfLogoHelper";

const NIVEL_COLORS = {
  avanzado: { r: 5, g: 150, b: 105 },
  intermedio: { r: 37, g: 99, b: 235 },
  basico: { r: 217, g: 119, b: 6 },
  sinEvidencia: { r: 220, g: 38, b: 38 },
};

export interface RegionalModuleData {
  moduleNumber: number;
  title: string;
  objective: string;
  distribution: {
    itemLabel: string;
    itemType: string;
    avanzado: number;
    intermedio: number;
    basico: number;
    sinEvidencia: number;
    total: number;
  }[];
  analysis?: string;
}

export interface RegionalReportData {
  regionName?: string;
  modules: RegionalModuleData[];
  globalStats: {
    uniqueDirectivos: number;
    totalEvals: number;
    avanzadoRate: number;
  };
}

export interface RegionalPdfLogos {
  logoRLT: string;
  logoCLT: string;
  logoCosmo: string;
  showLogoRLT: boolean;
  showLogoCLT: boolean;
}

export async function generarPDFRegionalRubricas(
  data: RegionalReportData,
  logoSources: RegionalPdfLogos,
): Promise<void> {
  const logos: LoadedLogos = await loadPdfLogos(
    { logoRLT: logoSources.logoRLT, logoCLT: logoSources.logoCLT, logoCosmo: logoSources.logoCosmo },
    logoSources.showLogoRLT,
    logoSources.showLogoCLT,
  );

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentW = pageW - margin * 2;
  let y = 0;

  const CONTENT_START_Y = 8 + HEADER_LOGO_H + 4; // after header logos

  const addHeaderAndFooter = () => {
    drawPageHeaderLogos(doc, logos, { margin, pageW });
    drawFooterCosmo(doc, logos, { margin, pageW, pageH, pageNum: doc.getNumberOfPages() });
  };

  const checkPageBreak = (needed: number) => {
    if (y + needed > pageH - 25) {
      addHeaderAndFooter();
      doc.addPage();
      y = CONTENT_START_Y;
    }
  };

  // ── COVER PAGE ──
  y = 30;
  y = drawCoverLogos(doc, logos, { y, pageW, targetH: 31 }) + 20;

  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text("INFORME REGIONAL", pageW / 2, y, { align: "center" });
  y += 9;
  doc.setFontSize(16);
  doc.setTextColor(80, 80, 80);
  doc.text("Rúbricas de Evaluación", pageW / 2, y, { align: "center" });
  y += 12;

  if (data.regionName) {
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text(`Región: ${data.regionName}`, pageW / 2, y, { align: "center" });
    y += 12;
  }

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(30, 30, 30);
  doc.text(`Fecha: ${new Date().toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" })}`, pageW / 2, y, { align: "center" });
  y += 7;
  doc.text(`Directivos evaluados: ${data.globalStats.uniqueDirectivos}`, pageW / 2, y, { align: "center" });
  y += 7;
  doc.text(`Total evaluaciones: ${data.globalStats.totalEvals}`, pageW / 2, y, { align: "center" });
  y += 7;
  doc.text(`Tasa Avanzado: ${data.globalStats.avanzadoRate}%`, pageW / 2, y, { align: "center" });

  drawFooterCosmo(doc, logos, { margin, pageW, pageH, pageNum: 1 });

  // ── MODULE PAGES ──
  for (const mod of data.modules) {
    const hasData = mod.distribution.some(d => d.total > 0);
    if (!hasData) continue;

    doc.addPage();
    y = CONTENT_START_Y;

    // Module title
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text(`MÓDULO ${mod.moduleNumber}: ${mod.title.toUpperCase()}`, margin, y);
    y += 7;

    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(80, 80, 80);
    const objLines = doc.splitTextToSize(`Objetivo: ${mod.objective}`, contentW);
    doc.text(objLines, margin, y);
    y += objLines.length * 4 + 6;

    // ── Bar Chart (horizontal stacked bars) ──
    const barMaxW = contentW * 0.55;
    const labelW = contentW * 0.35;
    const barH = 3;
    const barGap = 10;

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text("DISTRIBUCIÓN POR ÍTEM", margin, y);
    y += 8;

    for (const d of mod.distribution) {
      if (d.total === 0) continue;
      checkPageBreak(barGap + 4);

      // Label
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(60, 60, 60);
      const itemName = d.itemLabel.length > 35 ? d.itemLabel.substring(0, 32) + "…" : d.itemLabel;
      doc.text(itemName, margin, y + 2);

      // Stacked bar
      const barX = margin + labelW;
      let bx = barX;

      const segments = [
        { pct: d.avanzado, color: NIVEL_COLORS.avanzado },
        { pct: d.intermedio, color: NIVEL_COLORS.intermedio },
        { pct: d.basico, color: NIVEL_COLORS.basico },
        { pct: d.sinEvidencia, color: NIVEL_COLORS.sinEvidencia },
      ];

      for (const seg of segments) {
        if (seg.pct <= 0) continue;
        const w = (seg.pct / 100) * barMaxW;
        doc.setFillColor(seg.color.r, seg.color.g, seg.color.b);
        doc.rect(bx, y - 1, w, barH, "F");
        bx += w;
      }

      y += barGap;
    }

    // Legend
    y += 4;
    checkPageBreak(10);
    const legendItems = [
      { label: "Avanzado", color: NIVEL_COLORS.avanzado },
      { label: "Intermedio", color: NIVEL_COLORS.intermedio },
      { label: "Básico", color: NIVEL_COLORS.basico },
      { label: "Sin evidencia", color: NIVEL_COLORS.sinEvidencia },
    ];
    let lx = margin;
    for (const li of legendItems) {
      doc.setFillColor(li.color.r, li.color.g, li.color.b);
      doc.rect(lx, y, 3, 3, "F");
      doc.setFontSize(7);
      doc.setTextColor(60, 60, 60);
      doc.text(li.label, lx + 5, y + 2.5);
      lx += 35;
    }
    y += 10;

    // ── Distribution Table ──
    checkPageBreak(mod.distribution.length * 7 + 15);

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text("TABLA DE DISTRIBUCIÓN", margin, y);
    y += 6;

    const colWidths = [contentW * 0.40, contentW * 0.08, contentW * 0.13, contentW * 0.13, contentW * 0.13, contentW * 0.13];
    const headers = ["Ítem", "n", "Avanzado", "Intermedio", "Básico", "Sin evid."];
    const headerColors = [
      { r: 30, g: 30, b: 30 },
      { r: 30, g: 30, b: 30 },
      NIVEL_COLORS.avanzado,
      NIVEL_COLORS.intermedio,
      NIVEL_COLORS.basico,
      NIVEL_COLORS.sinEvidencia,
    ];

    // Table header
    const rowH = 7;
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, y, contentW, rowH, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");

    let xPos = margin;
    for (let i = 0; i < headers.length; i++) {
      doc.setTextColor(headerColors[i].r, headerColors[i].g, headerColors[i].b);
      const align = i === 0 ? "left" : "center";
      const textX = i === 0 ? xPos + 2 : xPos + colWidths[i] / 2;
      doc.text(headers[i], textX, y + 5, { align });
      xPos += colWidths[i];
    }
    y += rowH;

    // Table rows
    doc.setFont("helvetica", "normal");
    for (const d of mod.distribution) {
      checkPageBreak(rowH + 2);

      doc.setDrawColor(220, 220, 220);
      doc.line(margin, y, margin + contentW, y);

      xPos = margin;
      doc.setFontSize(7);

      // Item label
      doc.setTextColor(30, 30, 30);
      const label = d.itemLabel.length > 40 ? d.itemLabel.substring(0, 37) + "…" : d.itemLabel;
      doc.text(`[${d.itemType}] ${label}`, xPos + 2, y + 5);
      xPos += colWidths[0];

      // n
      doc.setFont("helvetica", "bold");
      doc.text(String(d.total), xPos + colWidths[1] / 2, y + 5, { align: "center" });
      xPos += colWidths[1];

      // Percentages
      const values = [d.avanzado, d.intermedio, d.basico, d.sinEvidencia];
      const colors = [NIVEL_COLORS.avanzado, NIVEL_COLORS.intermedio, NIVEL_COLORS.basico, NIVEL_COLORS.sinEvidencia];
      for (let i = 0; i < values.length; i++) {
        doc.setTextColor(colors[i].r, colors[i].g, colors[i].b);
        doc.text(`${values[i]}%`, xPos + colWidths[i + 2] / 2, y + 5, { align: "center" });
        xPos += colWidths[i + 2];
      }

      doc.setFont("helvetica", "normal");
      y += rowH;
    }

    // Source note under table
    y += 5;
    doc.setFontSize(7);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(120, 120, 120);
    const sourceText = "Fuente: Datos tomados de los Informes de Módulos del proceso RLT-CLT 2025";
    const sourceWidth = doc.getTextWidth(sourceText);
    doc.text(sourceText, pageW - margin - sourceWidth, y);
    y += 6;

    // ── AI Analysis ──
    if (mod.analysis) {
      checkPageBreak(30);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 30, 30);
      doc.text("ANÁLISIS INTERPRETATIVO", margin, y);
      y += 6;

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(50, 50, 50);
      const analysisLines = doc.splitTextToSize(mod.analysis, contentW);
      for (const line of analysisLines) {
        checkPageBreak(5);
        doc.text(line, margin, y);
        y += 4.5;
      }
    }

    addHeaderAndFooter();
  }

  doc.save(`Informe_Regional_Rubricas_${new Date().toISOString().slice(0, 10)}.pdf`);
}
