/**
 * PDF generator for Satisfaction survey reports.
 * Matches the reference report format:
 * - Cover page with programme + partner logos, title, table of contents
 * - Content pages with header (RLT logo), footer (COSMO + page number)
 * - Sections: text, chart+analysis, ficha técnica, satisfaction summary, bullet lists, comments annex
 */
import jsPDF from "jspdf";
import logoRLT from "@/assets/logo_rlt_white.png";
import logoCLT from "@/assets/logo_clt_white.png";
import logoCosmo from "@/assets/logo_cosmo_dark.png";
import { FORM_TYPE_LABELS } from "@/data/satisfaccionData";

function loadImageAsBase64(src: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas not supported"));
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

function getImageNaturalSize(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

interface SectionStat {
  title: string;
  type: string;
  data: { label: string; value: number; count: number }[];
}

interface ReportSection {
  id: string;
  type: string;
  title: string;
  content?: string;
  bullets?: string[];
  chartSectionTitle?: string;
  enabled: boolean;
}

export interface SatisfaccionReportOptions {
  filterType: string;
  filterModule: string;
  filterRegion: string;
  totalResponses: number;
  showLogoRlt: boolean;
  showLogoClt: boolean;
  extraLogos: string[];
  reportContent: {
    reportTitle: string;
    reportSubtitle: string;
    sections: ReportSection[];
    extraLogos: string[];
  };
  sectionStats: SectionStat[];
  generalSatisfaction: { label: string; value: number }[];
  overallSatisfaction: number;
  comments: string[];
}

export async function generateSatisfaccionReport(opts: SatisfaccionReportOptions): Promise<void> {
  const {
    filterType, filterModule, filterRegion, totalResponses,
    showLogoRlt, showLogoClt, extraLogos,
    reportContent, sectionStats, generalSatisfaction, overallSatisfaction, comments,
  } = opts;

  // Load logos with proportional sizing
  const [rltB64, rltSize, cltB64, cltSize, cosmoB64, cosmoSize] = await Promise.all([
    showLogoRlt ? loadImageAsBase64(logoRLT) : Promise.resolve(""),
    showLogoRlt ? getImageNaturalSize(logoRLT) : Promise.resolve({ width: 1, height: 1 }),
    showLogoClt ? loadImageAsBase64(logoCLT) : Promise.resolve(""),
    showLogoClt ? getImageNaturalSize(logoCLT) : Promise.resolve({ width: 1, height: 1 }),
    loadImageAsBase64(logoCosmo),
    getImageNaturalSize(logoCosmo),
  ]);

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentW = pageW - margin * 2;

  // ── Helper: proportional logo dimensions ──
  const logoH = (naturalW: number, naturalH: number, targetH: number) => {
    const w = (targetH * naturalW) / naturalH;
    return { w, h: targetH };
  };

  // ── Header for content pages (and cover) ──
  const drawHeader = () => {
    // RLT logo top-left
    if (showLogoRlt && rltB64) {
      const dim = logoH(rltSize.width, rltSize.height, 14);
      doc.addImage(rltB64, "PNG", margin, 8, dim.w, dim.h);
    }
    // CLT logo top-right
    if (showLogoClt && cltB64) {
      const dim = logoH(cltSize.width, cltSize.height, 14);
      doc.addImage(cltB64, "PNG", pageW - margin - dim.w, 8, dim.w, dim.h);
    }
    // Thin separator line
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(margin, 24, pageW - margin, 24);
    return 28;
  };

  // ── Footer ──
  const drawFooter = () => {
    const pn = doc.getNumberOfPages();
    // Cosmo logo bottom-left
    if (cosmoB64) {
      const dim = logoH(cosmoSize.width, cosmoSize.height, 8);
      doc.addImage(cosmoB64, "PNG", margin, pageH - 14, dim.w, dim.h);
    }
    // Page number bottom-right
    doc.setFontSize(8);
    doc.setTextColor(130, 130, 130);
    doc.text(String(pn - 1), pageW - margin, pageH - 8, { align: "right" }); // page 1 = cover
    doc.setTextColor(30, 30, 30);
  };

  let y = 0;

  const checkPageBreak = (needed: number): number => {
    if (y + needed > pageH - 22) {
      drawFooter();
      doc.addPage();
      y = drawHeader();
    }
    return y;
  };

  // ── Wrap text and advance y ──
  const writeText = (text: string, fontSize: number = 10, lineSpacing: number = 5) => {
    doc.setFontSize(fontSize);
    doc.setFont("helvetica", "normal");
    const paragraphs = text.split("\n");
    for (const para of paragraphs) {
      if (!para.trim()) { y += lineSpacing; continue; }
      const lines = doc.splitTextToSize(para.trim(), contentW);
      for (const line of lines) {
        y = checkPageBreak(lineSpacing + 2);
        doc.text(line, margin, y);
        y += lineSpacing;
      }
      y += 1;
    }
  };

  const writeSectionTitle = (title: string, numbered?: string) => {
    y = checkPageBreak(14);
    y += 4;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 60, 90);
    const prefix = numbered ? `${numbered} ` : "";
    const lines = doc.splitTextToSize(prefix + title, contentW);
    for (const line of lines) {
      doc.text(line, margin, y);
      y += 6;
    }
    doc.setTextColor(30, 30, 30);
    y += 2;
  };

  // ══════════════════════════════════════════
  // COVER PAGE
  // ══════════════════════════════════════════

  // Draw header on cover page
  drawHeader();
  let coverY = 40;

  // Extra/partner logos below header (centered)
  if (extraLogos.length > 0) {
    const extraH = 16;
    const gap = 15;
    const loadedExtras: { b64: string; w: number }[] = [];
    for (const logo of extraLogos) {
      try {
        const size = await getImageNaturalSize(logo);
        const dim = logoH(size.width, size.height, extraH);
        loadedExtras.push({ b64: logo, w: dim.w });
      } catch { /* skip */ }
    }
    if (loadedExtras.length > 0) {
      const totalExtrasW = loadedExtras.reduce((sum, e) => sum + e.w, 0) + (loadedExtras.length - 1) * gap;
      let x = pageW / 2 - totalExtrasW / 2;
      for (const extra of loadedExtras) {
        doc.addImage(extra.b64, "PNG", x, coverY, extra.w, extraH);
        x += extra.w + gap;
      }
      coverY += extraH + 10;
    }
  }

  // Push title to roughly 1/3 of the page for a proper cover feel
  coverY = Math.max(coverY, 80);

  // Programme title
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 60, 90);
  doc.text("PROGRAMA RECTORES LÍDERES TRANSFORMADORES", pageW / 2, coverY, { align: "center" });
  // Underline
  const titleW = doc.getTextWidth("PROGRAMA RECTORES LÍDERES TRANSFORMADORES");
  doc.setDrawColor(30, 60, 90);
  doc.setLineWidth(0.5);
  doc.line(pageW / 2 - titleW / 2, coverY + 2, pageW / 2 + titleW / 2, coverY + 2);
  coverY += 20;

  // Decorative line
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(pageW / 2 - 40, coverY, pageW / 2 + 40, coverY);
  coverY += 12;

  // Report title (larger)
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  const titleLines = doc.splitTextToSize(reportContent.reportTitle, contentW - 20);
  for (const line of titleLines) {
    doc.text(line, pageW / 2, coverY, { align: "center" });
    coverY += 7;
  }
  coverY += 4;

  // Subtitle
  if (reportContent.reportSubtitle) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(80, 80, 80);
    doc.text(`"${reportContent.reportSubtitle}"`, pageW / 2, coverY, { align: "center" });
    coverY += 15;
  } else {
    coverY += 8;
  }

  doc.setTextColor(30, 30, 30);

  // Region + Module info
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Región: ${filterRegion}  ·  Módulo ${filterModule}`, pageW / 2, coverY, { align: "center" });
  coverY += 15;

  // Table of contents placeholder — will be filled after content is rendered
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 60, 90);
  doc.text("TABLA DE CONTENIDO", pageW / 2, coverY, { align: "center" });
  coverY += 8;

  // Reserve space for TOC entries (we'll come back to fill page numbers)
  const enabledSections = reportContent.sections.filter(s => s.enabled);
  const tocY = coverY;
  coverY += enabledSections.length * 5 + 4;

  doc.setTextColor(30, 30, 30);

  // Cosmo logo at bottom of cover
  if (cosmoB64) {
    const dim = logoH(cosmoSize.width, cosmoSize.height, 10);
    doc.addImage(cosmoB64, "PNG", pageW / 2 - dim.w / 2, pageH - 20, dim.w, dim.h);
  }

  // Track section page numbers
  const sectionPages: { title: string; page: number }[] = [];

  // ══════════════════════════════════════════
  // CONTENT PAGES
  // ══════════════════════════════════════════
  doc.addPage();
  y = drawHeader();

  let sectionNum = 0;

  for (const section of enabledSections) {
    if (section.type === "text") {
      sectionNum++;
      sectionPages.push({ title: section.title, page: doc.getNumberOfPages() });
      writeSectionTitle(section.title, String(sectionNum));
      if (section.content) {
        writeText(section.content);
      }
      y += 4;
    }

    if (section.type === "ficha_tecnica") {
      sectionNum++;
      sectionPages.push({ title: section.title, page: doc.getNumberOfPages() });
      writeSectionTitle(section.title, String(sectionNum));
      y = checkPageBreak(50);

      // Draw table
      const formLabel = FORM_TYPE_LABELS[filterType] || filterType;
      const rows = [
        ["Nombre del instrumento", `Encuesta de satisfacción ${formLabel} ${filterModule}`],
        ["Entidad responsable", "Sistema de evaluación del Programa RLT"],
        ["Objetivo de la encuesta", "Recoger percepciones sobre la experiencia formativa y oportunidades de mejora"],
        ["Región", filterRegion],
        ["Módulo", `Módulo ${filterModule}`],
        ["Total de respuestas válidas", String(totalResponses)],
        ["Modalidad", "En línea, mediante formulario digital"],
      ];

      const colW1 = 55;
      const colW2 = contentW - colW1;
      const rowH = 7;

      // Header row
      doc.setFillColor(70, 100, 130);
      doc.rect(margin, y, contentW, rowH, "F");
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text("Ítem", margin + 3, y + 5);
      doc.text("Detalle", margin + colW1 + 3, y + 5);
      y += rowH;
      doc.setTextColor(30, 30, 30);

      for (let ri = 0; ri < rows.length; ri++) {
        y = checkPageBreak(rowH + 2);
        const bg = ri % 2 === 0 ? 245 : 255;
        doc.setFillColor(bg, bg, bg);
        doc.rect(margin, y, contentW, rowH, "F");
        doc.setDrawColor(220, 220, 220);
        doc.rect(margin, y, contentW, rowH, "S");
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.text(rows[ri][0], margin + 3, y + 5);
        doc.setFont("helvetica", "normal");
        const detailLines = doc.splitTextToSize(rows[ri][1], colW2 - 6);
        doc.text(detailLines[0], margin + colW1 + 3, y + 5);
        y += rowH;
      }
      y += 8;
    }

    if (section.type === "chart_analysis") {
      sectionNum++;
      sectionPages.push({ title: section.title, page: doc.getNumberOfPages() });
      writeSectionTitle(section.title, String(sectionNum));

      // Find matching stats section
      const chartData = sectionStats.find(s => s.title === section.chartSectionTitle);
      if (chartData && chartData.data.length > 0) {
        // Chart title
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(60, 60, 60);
        doc.text(chartData.title, pageW / 2, y, { align: "center" });
        y += 6;
        doc.setTextColor(30, 30, 30);

        // Horizontal bar chart
        const barMaxW = contentW - 50;
        const barH = 5;
        const rowGap = 8;
        const maxVal = Math.max(...chartData.data.map(d => d.value), 1);

        for (const item of chartData.data) {
          y = checkPageBreak(rowGap + 4);

          // Label (truncated)
          doc.setFontSize(7.5);
          doc.setFont("helvetica", "normal");
          const labelLines = doc.splitTextToSize(item.label, contentW - 20);
          doc.text(labelLines[0], margin, y + 3.5);
          const labelW = Math.min(doc.getTextWidth(labelLines[0]) + 4, contentW * 0.5);

          // Bar
          const barX = margin + Math.max(labelW, 60);
          const availBarW = pageW - margin - barX - 20;
          const barW = (item.value / Math.max(maxVal, 100)) * availBarW;

          // Bar background
          doc.setFillColor(235, 235, 235);
          doc.rect(barX, y, availBarW, barH, "F");

          // Bar fill (gradient-like using primary color)
          if (item.value >= 80) doc.setFillColor(190, 30, 80); // magenta/pink like reference
          else if (item.value >= 60) doc.setFillColor(220, 60, 100);
          else if (item.value >= 40) doc.setFillColor(240, 100, 130);
          else doc.setFillColor(250, 150, 170);
          doc.rect(barX, y, barW, barH, "F");

          // Percentage label
          doc.setFontSize(7.5);
          doc.setFont("helvetica", "bold");
          doc.text(`${item.value}%`, barX + availBarW + 2, y + 3.8);
          doc.setFont("helvetica", "normal");

          y += rowGap;
        }
        y += 4;
      }

      // Analysis text
      if (section.content) {
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 60, 90);
        y = checkPageBreak(10);
        doc.text("ANÁLISIS:", margin, y);
        y += 6;
        doc.setTextColor(30, 30, 30);
        writeText(section.content);
      }
      y += 4;
    }

    if (section.type === "satisfaction_summary") {
      sectionNum++;
      sectionPages.push({ title: section.title, page: doc.getNumberOfPages() });
      writeSectionTitle(section.title, String(sectionNum));

      if (section.content) {
        writeText(section.content);
        y += 2;
      }

      if (generalSatisfaction.length > 0) {
        y = checkPageBreak(25);

        // Overall percentage
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text("El nivel de satisfacción general alcanzó un sólido", margin, y);
        y += 6;

        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 100, 170);
        doc.text(`${overallSatisfaction}%`, margin + 5, y);
        y += 10;
        doc.setTextColor(30, 30, 30);

        // Breakdown
        doc.setFontSize(9);
        for (const gs of generalSatisfaction) {
          y = checkPageBreak(7);
          doc.setFont("helvetica", "normal");
          doc.text(`• ${gs.label}:`, margin + 5, y);
          doc.setFont("helvetica", "bold");
          doc.text(`${gs.value}%`, margin + contentW - 15, y, { align: "right" });
          y += 6;
        }
      }
      y += 6;
    }

    if (section.type === "bullet_list") {
      sectionNum++;
      sectionPages.push({ title: section.title, page: doc.getNumberOfPages() });
      writeSectionTitle(section.title, String(sectionNum));

      if (section.bullets && section.bullets.length > 0) {
        for (const bullet of section.bullets) {
          if (!bullet.trim()) continue;

          // Check if it's a category header (short text, < 60 chars) vs description
          const lines = bullet.split("\n");
          for (const line of lines) {
            if (!line.trim()) continue;
            y = checkPageBreak(7);

            if (line.startsWith("- ") || line.startsWith("• ")) {
              doc.setFontSize(9);
              doc.setFont("helvetica", "normal");
              const wrapped = doc.splitTextToSize(line, contentW - 10);
              for (const wl of wrapped) {
                y = checkPageBreak(5);
                doc.text(wl, margin + 8, y);
                y += 4.5;
              }
            } else {
              // Category header
              doc.setFontSize(10);
              doc.setFont("helvetica", "bold");
              const wrapped = doc.splitTextToSize(line, contentW - 5);
              for (const wl of wrapped) {
                y = checkPageBreak(6);
                doc.text(wl, margin + 3, y);
                y += 5.5;
              }
            }
          }
          y += 2;
        }
      }
      y += 4;
    }

    if (section.type === "comments_annex") {
      // Start new page for annex
      drawFooter();
      doc.addPage();
      y = drawHeader();

      sectionNum++;
      sectionPages.push({ title: section.title, page: doc.getNumberOfPages() });
      writeSectionTitle(section.title);

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");

      for (const comment of comments) {
        const wrapped = doc.splitTextToSize(comment, contentW - 10);
        const neededH = wrapped.length * 4.5 + 4;
        y = checkPageBreak(neededH);

        for (const line of wrapped) {
          doc.text(line, margin + 3, y);
          y += 4.5;
        }
        y += 3;
      }
    }
  }

  // Final footer
  drawFooter();

  // ══════════════════════════════════════════
  // FILL TABLE OF CONTENTS WITH PAGE NUMBERS
  // ══════════════════════════════════════════
  doc.setPage(1);
  let tocEntryY = tocY;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  for (let i = 0; i < sectionPages.length; i++) {
    const entry = sectionPages[i];
    const pageNum = entry.page - 1; // subtract cover page

    // Section number + title
    doc.setTextColor(60, 60, 60);
    const label = `${i + 1}. ${entry.title}`;
    const truncated = label.length > 70 ? label.slice(0, 67) + "…" : label;
    doc.text(truncated, margin + 4, tocEntryY);

    // Dotted leader + page number
    const labelW = doc.getTextWidth(truncated);
    const pageNumStr = String(pageNum);
    const pageNumW = doc.getTextWidth(pageNumStr);
    const dotsStart = margin + 4 + labelW + 2;
    const dotsEnd = pageW - margin - pageNumW - 2;

    // Draw dots
    doc.setTextColor(180, 180, 180);
    let dotX = dotsStart;
    while (dotX < dotsEnd) {
      doc.text(".", dotX, tocEntryY);
      dotX += 2;
    }

    // Page number right-aligned
    doc.setTextColor(60, 60, 60);
    doc.setFont("helvetica", "bold");
    doc.text(pageNumStr, pageW - margin, tocEntryY, { align: "right" });
    doc.setFont("helvetica", "normal");

    tocEntryY += 5;
  }

  doc.setTextColor(30, 30, 30);

  // Download
  const formLabel = FORM_TYPE_LABELS[filterType] || filterType;
  const regLabel = filterRegion.replace(/\s+/g, "_");
  doc.save(`Informe_Satisfaccion_${formLabel}_${filterModule}_${regLabel}.pdf`);
}
