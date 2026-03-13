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
import logoCosmo from "@/assets/logo_cosmo.png";
import { FORM_TYPE_LABELS } from "@/data/satisfaccionData";

/** Decode HTML entities only (including Spanish accented characters) */
function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/&Aacute;/g, "Á").replace(/&aacute;/g, "á")
    .replace(/&Eacute;/g, "É").replace(/&eacute;/g, "é")
    .replace(/&Iacute;/g, "Í").replace(/&iacute;/g, "í")
    .replace(/&Oacute;/g, "Ó").replace(/&oacute;/g, "ó")
    .replace(/&Uacute;/g, "Ú").replace(/&uacute;/g, "ú")
    .replace(/&Ntilde;/g, "Ñ").replace(/&ntilde;/g, "ñ")
    .replace(/&iquest;/g, "¿").replace(/&iexcl;/g, "¡")
    .replace(/&Uuml;/g, "Ü").replace(/&uuml;/g, "ü")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

/** Strip HTML tags and decode entities, preserving line breaks */
function htmlToPlainText(html: string): string {
  if (!html) return "";
  let text = html;
  text = text.replace(/<\/p>/gi, "\n");
  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<\/li>/gi, "\n");
  text = text.replace(/<li[^>]*>/gi, "• ");
  text = text.replace(/<\/(?:div|h[1-6]|tr|blockquote)>/gi, "\n");
  text = text.replace(/<[^>]+>/g, "");
  text = decodeEntities(text);
  text = text.replace(/\n{3,}/g, "\n\n");
  return text.trim();
}

/** Parse HTML into styled segments: { text, bold, italic } */
interface StyledSegment { text: string; bold: boolean; italic: boolean; }

function parseHtmlToSegments(html: string): { paragraphs: StyledSegment[][] } {
  if (!html) return { paragraphs: [] };
  // Normalize: split by block-level elements into paragraphs
  let normalized = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "¶")
    .replace(/<\/li>/gi, "¶")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<\/(?:div|h[1-6]|tr|blockquote)>/gi, "¶")
    .replace(/<p[^>]*>/gi, "");

  const rawParagraphs = normalized.split("¶").map(p => p.trim()).filter(Boolean);
  const paragraphs: StyledSegment[][] = [];

  for (const rawP of rawParagraphs) {
    const lines = rawP.split("\n");
    for (const line of lines) {
      const segments: StyledSegment[] = [];
      // Parse inline formatting tags
      const regex = /(<\/?(?:strong|b|em|i|u|s)(?:\s[^>]*)?>)/gi;
      const parts = line.split(regex);
      let bold = false;
      let italic = false;
      for (const part of parts) {
        if (!part) continue;
        const lower = part.toLowerCase();
        if (lower === "<strong>" || lower === "<b>") { bold = true; continue; }
        if (lower === "</strong>" || lower === "</b>") { bold = false; continue; }
        if (lower === "<em>" || lower === "<i>") { italic = true; continue; }
        if (lower === "</em>" || lower === "</i>") { italic = false; continue; }
        if (/^<\/?(?:u|s)(?:\s|>)/i.test(part)) continue; // skip underline/strikethrough tags
        // Strip any remaining tags from this part
        const clean = decodeEntities(part.replace(/<[^>]+>/g, ""));
        if (clean) segments.push({ text: clean, bold, italic });
      }
      if (segments.length > 0) paragraphs.push(segments);
    }
  }
  return { paragraphs };
}

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
  questionKey?: string;
  data: { label: string; value: number; count: number }[];
}

interface ReportSection {
  id: string;
  type: string;
  title: string;
  content?: string;
  bullets?: string[];
  chartSectionTitle?: string;
  selectedQuestionKeys?: string[];
  chartType?: string;
  enabled: boolean;
  isSubsection?: boolean;
}

export interface ExtraLogo {
  src: string;
  scale: number; // percentage 10-200, default 100
}

export interface SatisfaccionReportOptions {
  filterType: string;
  filterModule: string;
  filterRegion: string;
  totalResponses: number;
  showLogoRlt: boolean;
  showLogoClt: boolean;
  extraLogos: ExtraLogo[];
  reportContent: {
    reportTitle: string;
    reportSubtitle: string;
    sections: ReportSection[];
    extraLogos: ExtraLogo[];
  };
  sectionStats: SectionStat[];
  generalSatisfaction: { label: string; value: number }[];
  overallSatisfaction: number;
  comments: string[];
  executiveSummary?: string;
}

export async function generateSatisfaccionReport(opts: SatisfaccionReportOptions): Promise<void> {
  const {
    filterType, filterModule, filterRegion, totalResponses,
    showLogoRlt, showLogoClt, extraLogos,
    reportContent, sectionStats, generalSatisfaction, overallSatisfaction, comments,
    executiveSummary,
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
    // Position logic: if both logos, left/right. If only one, put it on the right.
    const hasRlt = showLogoRlt && !!rltB64;
    const hasClt = showLogoClt && !!cltB64;

    if (hasRlt && hasClt) {
      const dimRlt = logoH(rltSize.width, rltSize.height, 18);
      doc.addImage(rltB64, "PNG", margin, 8, dimRlt.w, dimRlt.h);
      const dimClt = logoH(cltSize.width, cltSize.height, 18);
      doc.addImage(cltB64, "PNG", pageW - margin - dimClt.w, 8, dimClt.w, dimClt.h);
    } else if (hasRlt) {
      const dim = logoH(rltSize.width, rltSize.height, 18);
      doc.addImage(rltB64, "PNG", pageW - margin - dim.w, 8, dim.w, dim.h);
    } else if (hasClt) {
      const dim = logoH(cltSize.width, cltSize.height, 18);
      doc.addImage(cltB64, "PNG", pageW - margin - dim.w, 8, dim.w, dim.h);
    }

    // Thin separator line
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(margin, 28, pageW - margin, 28);
    return 38;
  };

  // ── Footer (page numbers filled in second pass) ──
  const drawFooter = () => {
    // Cosmo logo bottom-left
    if (cosmoB64) {
      const dim = logoH(cosmoSize.width, cosmoSize.height, 8);
      doc.addImage(cosmoB64, "PNG", margin, pageH - 14, dim.w, dim.h);
    }
  };

  // Fill page numbers "X/N" after all pages are created
  const fillPageNumbers = () => {
    const totalPages = doc.getNumberOfPages() - 1; // exclude cover
    for (let p = 2; p <= doc.getNumberOfPages(); p++) {
      doc.setPage(p);
      doc.setFontSize(8);
      doc.setTextColor(130, 130, 130);
      doc.text(`${p - 1}/${totalPages}`, pageW - margin, pageH - 8, { align: "right" });
      doc.setTextColor(30, 30, 30);
    }
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

  // ── Write a single styled segment run on the current line ──
  const writeStyledLine = (segments: StyledSegment[], startX: number, maxW: number, fontSize: number, lineSpacing: number) => {
    // Flatten segments into words with style, then wrap manually
    interface Word { text: string; bold: boolean; italic: boolean; width: number; }
    const words: Word[] = [];
    for (const seg of segments) {
      const style = seg.bold && seg.italic ? "bolditalic" : seg.bold ? "bold" : seg.italic ? "italic" : "normal";
      doc.setFont("helvetica", style);
      doc.setFontSize(fontSize);
      const parts = seg.text.split(/(\s+)/);
      for (const p of parts) {
        if (!p) continue;
        words.push({ text: p, bold: seg.bold, italic: seg.italic, width: doc.getTextWidth(p) });
      }
    }
    // Line-wrap
    let lineWords: Word[] = [];
    let lineW = 0;
    const flushLine = () => {
      if (lineWords.length === 0) return;
      y = checkPageBreak(lineSpacing + 2);
      let cx = startX;
      for (const w of lineWords) {
        const style = w.bold && w.italic ? "bolditalic" : w.bold ? "bold" : w.italic ? "italic" : "normal";
        doc.setFont("helvetica", style);
        doc.setFontSize(fontSize);
        doc.text(w.text, cx, y);
        cx += w.width;
      }
      y += lineSpacing;
      lineWords = [];
      lineW = 0;
    };
    for (const w of words) {
      if (lineW + w.width > maxW && lineWords.length > 0) flushLine();
      lineWords.push(w);
      lineW += w.width;
    }
    flushLine();
  };

  // ── Wrap text and advance y (rich text aware) ──
  const writeText = (rawText: string, fontSize: number = 10, lineSpacing: number = 5) => {
    const { paragraphs } = parseHtmlToSegments(rawText);
    if (paragraphs.length === 0) {
      // Fallback for plain text without HTML
      const text = htmlToPlainText(rawText);
      doc.setFontSize(fontSize);
      doc.setFont("helvetica", "normal");
      const lines = doc.splitTextToSize(text, contentW);
      for (const line of lines) {
        y = checkPageBreak(lineSpacing + 2);
        doc.text(line, margin, y);
        y += lineSpacing;
      }
      return;
    }
    for (const segments of paragraphs) {
      writeStyledLine(segments, margin, contentW, fontSize, lineSpacing);
      y += 1;
    }
  };

  const writeSectionTitle = (title: string, numbered?: string, isSubsection?: boolean) => {
    // Reserve enough space for title + beginning of paragraph to keep them together
    y = checkPageBreak(isSubsection ? 22 : 30);
    y += isSubsection ? 2 : 4;
    doc.setFontSize(isSubsection ? 11 : 12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(isSubsection ? 50 : 30, isSubsection ? 80 : 60, isSubsection ? 110 : 90);
    const prefix = numbered ? `${numbered}. ` : "";
    const lines = doc.splitTextToSize(prefix + title, contentW);
    for (const line of lines) {
      doc.text(line, margin, y);
      y += 6;
    }
    doc.setTextColor(30, 30, 30);
    y += isSubsection ? 1 : 2;
  };

  // ══════════════════════════════════════════
  // COVER PAGE
  // ══════════════════════════════════════════

  // Draw header on cover page
  drawHeader();
  let coverY = 40;

  // Extra/partner logos below header (centered)
  if (extraLogos.length > 0) {
    const baseH = 16;
    const gap = 15;
    const loadedExtras: { b64: string; w: number; h: number }[] = [];
    for (const logo of extraLogos) {
      try {
        const size = await getImageNaturalSize(logo.src);
        const scaleFactor = (logo.scale || 100) / 100;
        const targetH = baseH * scaleFactor;
        const dim = logoH(size.width, size.height, targetH);
        loadedExtras.push({ b64: logo.src, w: dim.w, h: dim.h });
      } catch { /* skip */ }
    }
    if (loadedExtras.length > 0) {
      const maxH = Math.max(...loadedExtras.map(e => e.h));
      const totalExtrasW = loadedExtras.reduce((sum, e) => sum + e.w, 0) + (loadedExtras.length - 1) * gap;
      let x = pageW / 2 - totalExtrasW / 2;
      for (const extra of loadedExtras) {
        const yOffset = coverY + (maxH - extra.h) / 2; // vertically center
        doc.addImage(extra.b64, "PNG", x, yOffset, extra.w, extra.h);
        x += extra.w + gap;
      }
      coverY += maxH + 10;
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
    const dim = logoH(cosmoSize.width, cosmoSize.height, 14);
    doc.addImage(cosmoB64, "PNG", pageW / 2 - dim.w / 2, pageH - 20, dim.w, dim.h);
  }

  // Track section page numbers and subsection status
  const sectionPages: { title: string; page: number; isSubsection?: boolean }[] = [];

  // ══════════════════════════════════════════
  // EXECUTIVE SUMMARY PAGE (optional)
  // ══════════════════════════════════════════
  if (executiveSummary && executiveSummary.trim()) {
    doc.addPage();
    y = drawHeader();

    // Title
    y += 4;
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 60, 90);
    doc.text("RESUMEN EJECUTIVO", pageW / 2, y, { align: "center" });
    y += 4;

    // Decorative line
    doc.setDrawColor(30, 60, 90);
    doc.setLineWidth(0.4);
    doc.line(pageW / 2 - 30, y, pageW / 2 + 30, y);
    y += 8;

    // Summary text
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const summaryParagraphs = htmlToPlainText(executiveSummary).split("\n");
    for (const para of summaryParagraphs) {
      if (!para.trim()) { y += 4; continue; }
      const lines = doc.splitTextToSize(para.trim(), contentW);
      for (const line of lines) {
        y = checkPageBreak(6);
        doc.text(line, margin, y);
        y += 5;
      }
      y += 3;
    }

    drawFooter();
  }

  // ══════════════════════════════════════════
  // CONTENT PAGES
  // ══════════════════════════════════════════
  doc.addPage();
  y = drawHeader();

  let mainNum = 0;
  let subNum = 0;

  const getNumber = (isSubsection?: boolean) => {
    if (isSubsection) {
      subNum++;
      return `${mainNum}.${subNum}`;
    } else {
      mainNum++;
      subNum = 0;
      return String(mainNum);
    }
  };

  for (const section of enabledSections) {
    if (section.type === "text") {
      const num = getNumber(section.isSubsection);
      sectionPages.push({ title: section.title, page: doc.getNumberOfPages(), isSubsection: section.isSubsection });
      writeSectionTitle(section.title, num, section.isSubsection);
      if (section.content) {
        writeText(section.content);
      }
      y += 4;
    }

    if (section.type === "ficha_tecnica") {
      const num = getNumber(section.isSubsection);
      sectionPages.push({ title: section.title, page: doc.getNumberOfPages(), isSubsection: section.isSubsection });
      writeSectionTitle(section.title, num, section.isSubsection);
      // Ensure entire table (header + all rows) stays on one page
      const totalTableH = rowH * (rows.length + 1) + 4;
      y = checkPageBreak(totalTableH);

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
      const num = getNumber(section.isSubsection);

      // Find matching stats section: prefer selectedQuestionKeys, fallback to chartSectionTitle
      let chartData: SectionStat | null = null;
      if (section.selectedQuestionKeys && section.selectedQuestionKeys.length > 0) {
        const matched = sectionStats.filter(s => s.questionKey && section.selectedQuestionKeys!.includes(s.questionKey));
        if (matched.length > 0) {
          const mergedData = matched.flatMap(s => s.data);
          chartData = { title: section.chartSectionTitle || section.title, type: matched[0].type, data: mergedData };
        }
      }
      if (!chartData) {
        chartData = sectionStats.find(s => s.title === section.chartSectionTitle) || null;
      }
      const chartType = section.chartType || (section as any).chartType || "horizontal_bar";

      // Pre-calculate total height needed for section title + chart title + chart body
      // so we can do a single page-break check and keep everything together
      let estimatedChartH = 20; // section title (~14) + chart title (~6)
      if (chartData && chartData.data.length > 0) {
        if (chartType === "pie") {
          estimatedChartH += Math.min(80, contentW * 0.4) + 30;
        } else if (chartType === "radar") {
          estimatedChartH += Math.min(90, contentW * 0.45) + 20;
        } else if (chartType === "vertical_bar") {
          estimatedChartH += 70 + 30;
        } else {
          // horizontal bar
          estimatedChartH += chartData.data.length * 13 + 10;
        }
      }
      // If it fits on the current page, keep it together; otherwise break before the title
      y = checkPageBreak(Math.min(estimatedChartH, pageH - 60));

      sectionPages.push({ title: section.title, page: doc.getNumberOfPages(), isSubsection: section.isSubsection });
      writeSectionTitle(section.title, num, section.isSubsection);

      if (chartData && chartData.data.length > 0) {
        // Chart title
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(60, 60, 60);
        doc.text(chartData.title, pageW / 2, y, { align: "center" });
        y += 6;
        doc.setTextColor(30, 30, 30);

        const CHART_COLORS = [
          [190, 30, 80], [40, 120, 180], [60, 170, 100], [230, 150, 30],
          [130, 80, 180], [220, 80, 40], [50, 180, 180], [180, 60, 140],
          [100, 140, 60], [200, 100, 60], [70, 100, 200], [180, 180, 40],
        ];

        if (chartType === "pie") {
          // ── PIE CHART ──
          const chartH = Math.min(80, contentW * 0.4);
          y = checkPageBreak(chartH + 30);
          const cx = pageW / 2 - 20;
          const cy = y + chartH / 2;
          const radius = chartH / 2 - 2;
          const total = chartData.data.reduce((s: number, d: any) => s + d.value, 0) || 1;

          let startAngle = -Math.PI / 2;
          chartData.data.forEach((item: any, i: number) => {
            const sliceAngle = (item.value / total) * 2 * Math.PI;
            const endAngle = startAngle + sliceAngle;
            const c = CHART_COLORS[i % CHART_COLORS.length];
            doc.setFillColor(c[0], c[1], c[2]);

            // Draw pie slice as filled triangle fan
            const steps = Math.max(Math.ceil(sliceAngle / 0.05), 2);
            const points: number[][] = [[cx, cy]];
            for (let s = 0; s <= steps; s++) {
              const a = startAngle + (sliceAngle * s) / steps;
              points.push([cx + radius * Math.cos(a), cy + radius * Math.sin(a)]);
            }
            // Draw using triangle fan
            for (let t = 1; t < points.length - 1; t++) {
              doc.triangle(
                points[0][0], points[0][1],
                points[t][0], points[t][1],
                points[t + 1][0], points[t + 1][1],
                "F"
              );
            }
            startAngle = endAngle;
          });

          // Legend on the right
          const legendX = cx + radius + 12;
          let legendY = y + 4;
          doc.setFontSize(7);
          chartData.data.forEach((item: any, i: number) => {
            const c = CHART_COLORS[i % CHART_COLORS.length];
            doc.setFillColor(c[0], c[1], c[2]);
            doc.rect(legendX, legendY - 2.5, 3, 3, "F");
            doc.setFont("helvetica", "normal");
            doc.setTextColor(30, 30, 30);
            const lbl = item.label.length > 35 ? item.label.substring(0, 32) + "…" : item.label;
            doc.text(`${lbl}: ${item.value}%`, legendX + 5, legendY);
            legendY += 4.5;
          });

          y += chartH + 8;

        } else if (chartType === "radar") {
          // ── RADAR / SPIDER CHART ──
          const chartH = Math.min(90, contentW * 0.45);
          y = checkPageBreak(chartH + 20);
          const cx = pageW / 2;
          const cy = y + chartH / 2;
          const radius = chartH / 2 - 8;
          const n = chartData.data.length;
          const angleStep = (2 * Math.PI) / n;

          // Draw grid circles and axes
          doc.setDrawColor(200, 200, 200);
          doc.setLineWidth(0.2);
          for (let ring = 1; ring <= 4; ring++) {
            const r = (radius * ring) / 4;
            // Draw polygon for ring
            for (let i = 0; i < n; i++) {
              const a1 = -Math.PI / 2 + i * angleStep;
              const a2 = -Math.PI / 2 + (i + 1) * angleStep;
              doc.line(cx + r * Math.cos(a1), cy + r * Math.sin(a1), cx + r * Math.cos(a2), cy + r * Math.sin(a2));
            }
          }
          // Axis lines
          for (let i = 0; i < n; i++) {
            const a = -Math.PI / 2 + i * angleStep;
            doc.line(cx, cy, cx + radius * Math.cos(a), cy + radius * Math.sin(a));
          }

          // Draw data polygon
          doc.setDrawColor(190, 30, 80);
          doc.setFillColor(190, 30, 80);
          doc.setLineWidth(0.6);
          const maxVal = 100;
          const dataPoints: number[][] = [];
          for (let i = 0; i < n; i++) {
            const a = -Math.PI / 2 + i * angleStep;
            const r = (Math.min(chartData.data[i].value, maxVal) / maxVal) * radius;
            dataPoints.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
          }
          // Draw filled polygon with transparency
          for (let i = 0; i < dataPoints.length; i++) {
            const next = dataPoints[(i + 1) % dataPoints.length];
            doc.line(dataPoints[i][0], dataPoints[i][1], next[0], next[1]);
          }
          // Fill using triangle fan (semi-transparent effect via lighter color)
          doc.setFillColor(190, 30, 80);
          // @ts-ignore - setGState may not be typed
          if (typeof doc.setGState === "function") {
            // @ts-ignore
            const gs = new (doc as any).GState({ opacity: 0.15 });
            doc.setGState(gs);
            for (let i = 1; i < dataPoints.length - 1; i++) {
              doc.triangle(dataPoints[0][0], dataPoints[0][1], dataPoints[i][0], dataPoints[i][1], dataPoints[i + 1][0], dataPoints[i + 1][1], "F");
            }
            // @ts-ignore
            const gsNormal = new (doc as any).GState({ opacity: 1 });
            doc.setGState(gsNormal);
          }

          // Labels around the chart
          doc.setFontSize(6.5);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(30, 30, 30);
          for (let i = 0; i < n; i++) {
            const a = -Math.PI / 2 + i * angleStep;
            const lx = cx + (radius + 7) * Math.cos(a);
            const ly = cy + (radius + 7) * Math.sin(a);
            const lbl = chartData.data[i].label.length > 25 ? chartData.data[i].label.substring(0, 22) + "…" : chartData.data[i].label;
            const align: "left" | "center" | "right" = Math.cos(a) < -0.1 ? "right" : Math.cos(a) > 0.1 ? "left" : "center";
            doc.text(`${lbl} (${chartData.data[i].value}%)`, lx, ly, { align });
          }

          y += chartH + 8;

        } else if (chartType === "vertical_bar") {
          // ── VERTICAL BAR CHART ──
          const chartH = 70;
          y = checkPageBreak(chartH + 30);
          const n = chartData.data.length;
          const maxVal = Math.max(...chartData.data.map((d: any) => d.value), 100);
          const totalBarArea = contentW - 10;
          const barW = Math.min(totalBarArea / n - 2, 18);
          const gap = (totalBarArea - barW * n) / (n + 1);
          const baseY = y + chartH;

          // Grid lines
          doc.setDrawColor(220, 220, 220);
          doc.setLineWidth(0.2);
          for (let pct = 0; pct <= 100; pct += 25) {
            const gy = baseY - (pct / maxVal) * chartH;
            doc.line(margin, gy, pageW - margin, gy);
            doc.setFontSize(6);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(150, 150, 150);
            doc.text(`${pct}%`, margin - 1, gy + 1.5, { align: "right" });
          }

          chartData.data.forEach((item: any, i: number) => {
            const barH = (item.value / maxVal) * chartH;
            const barX = margin + gap + i * (barW + gap);
            const c = CHART_COLORS[i % CHART_COLORS.length];
            doc.setFillColor(c[0], c[1], c[2]);
            doc.rect(barX, baseY - barH, barW, barH, "F");

            // Value on top
            doc.setFontSize(6.5);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(30, 30, 30);
            doc.text(`${item.value}%`, barX + barW / 2, baseY - barH - 2, { align: "center" });

            // Label below (rotated would be complex, use truncated horizontal)
            doc.setFontSize(5.5);
            doc.setFont("helvetica", "normal");
            const lbl = item.label.length > 15 ? item.label.substring(0, 12) + "…" : item.label;
            doc.text(lbl, barX + barW / 2, baseY + 4, { align: "center" });
          });

          y = baseY + 12;

        } else {
          // ── HORIZONTAL BAR CHART (default) ── matches online preview
          const HBAR_COLORS: [number, number, number][] = [
            [37, 99, 235],   // #2563eb
            [22, 163, 106],  // #16a34a
            [245, 158, 11],  // #f59e0b
            [239, 68, 68],   // #ef4444
            [139, 92, 246],  // #8b5cf6
            [6, 182, 212],   // #06b6d4
            [236, 72, 153],  // #ec4899
            [249, 115, 22],  // #f97316
          ];
          const barH = 5;
          const rowGap = 11;

          // Filter out items with 0%
          const filteredData = chartData.data.filter((d: any) => d.value > 0);

          // Pre-calculate total chart height to prevent page splits
          const totalChartH = filteredData.length * (rowGap + 3) + 4;
          y = checkPageBreak(Math.min(totalChartH, pageH - 60));

          for (let idx = 0; idx < filteredData.length; idx++) {
            const item = filteredData[idx];

            // Label line
            doc.setFontSize(7.5);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(30, 30, 30);
            const labelLines = doc.splitTextToSize(item.label, contentW);
            doc.text(labelLines[0], margin, y);
            y += 3;

            // Background bar (full width, light gray)
            const barRadius = 2;
            doc.setFillColor(230, 230, 230);
            doc.roundedRect(margin, y, contentW, barH, barRadius, barRadius, "F");

            // Foreground bar (colored, width = percentage of full bar)
            const barW = Math.max((item.value / 100) * contentW, contentW * 0.02);
            const c = HBAR_COLORS[idx % HBAR_COLORS.length];
            doc.setFillColor(c[0], c[1], c[2]);
            doc.roundedRect(margin, y, barW, barH, barRadius, barRadius, "F");

            // Value on the bar (right-aligned inside)
            doc.setFontSize(7);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(30, 30, 30);
            doc.text(`${item.value}%`, margin + contentW - 2, y + barH - 1.2, { align: "right" });

            doc.setFont("helvetica", "normal");
            y += barH + (rowGap - barH - 3);
          }
          y += 4;
        }
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
      const num = getNumber(section.isSubsection);
      sectionPages.push({ title: section.title, page: doc.getNumberOfPages(), isSubsection: section.isSubsection });
      writeSectionTitle(section.title, num, section.isSubsection);

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
      const num = getNumber(section.isSubsection);
      sectionPages.push({ title: section.title, page: doc.getNumberOfPages(), isSubsection: section.isSubsection });
      writeSectionTitle(section.title, num, section.isSubsection);

      if (section.bullets && section.bullets.length > 0) {
        for (const rawBullet of section.bullets) {
          const bullet = htmlToPlainText(rawBullet);
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

      const num = getNumber(section.isSubsection);
      sectionPages.push({ title: section.title, page: doc.getNumberOfPages(), isSubsection: section.isSubsection });
      writeSectionTitle(section.title, num, section.isSubsection);

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
  doc.setFontSize(9);

  // Regenerate numbering for TOC
  let tocMain = 0;
  let tocSub = 0;

  for (let i = 0; i < sectionPages.length; i++) {
    const entry = sectionPages[i];
    const pageNum = entry.page - 1;

    let numStr: string;
    if (entry.isSubsection) {
      tocSub++;
      numStr = `${tocMain}.${tocSub}.`;
    } else {
      tocMain++;
      tocSub = 0;
      numStr = `${tocMain}.`;
    }

    const indent = entry.isSubsection ? margin + 10 : margin + 4;
    doc.setFont("helvetica", entry.isSubsection ? "normal" : "bold");
    doc.setTextColor(60, 60, 60);
    const label = `${numStr}  ${entry.title}`;
    const maxLabelW = pageW - margin - indent - 20;
    const truncated = doc.getTextWidth(label) > maxLabelW
      ? label.slice(0, Math.floor(maxLabelW / 2)) + "…"
      : label;
    doc.text(truncated, indent, tocEntryY);

    // Dotted leader + page number
    const labelW = doc.getTextWidth(truncated);
    const pageNumStr = String(pageNum);
    const pageNumW = doc.getTextWidth(pageNumStr);
    const dotsStart = indent + labelW + 2;
    const dotsEnd = pageW - margin - pageNumW - 2;

    doc.setTextColor(180, 180, 180);
    doc.setFont("helvetica", "normal");
    let dotX = dotsStart;
    while (dotX < dotsEnd) {
      doc.text(".", dotX, tocEntryY);
      dotX += 2;
    }

    doc.setTextColor(60, 60, 60);
    doc.setFont("helvetica", "bold");
    doc.text(pageNumStr, pageW - margin, tocEntryY, { align: "right" });
    doc.setFont("helvetica", "normal");

    tocEntryY += 5;
  }

  doc.setTextColor(30, 30, 30);

  // Fill page numbers on all content pages
  fillPageNumbers();

  // Download
  const formLabel = FORM_TYPE_LABELS[filterType] || filterType;
  const regLabel = filterRegion.replace(/\s+/g, "_");
  doc.save(`Informe_Satisfaccion_${formLabel}_${filterModule}_${regLabel}.pdf`);
}
