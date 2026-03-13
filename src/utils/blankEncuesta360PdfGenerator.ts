import jsPDF from "jspdf";
import {
  type SurveyFormConfig,
  GLOSSARY,
  FREQUENCY_OPTIONS_WITH_NOSABE,
  FREQUENCY_OPTIONS_NO_NOSABE,
  AGREEMENT_OPTIONS_WITH_NOSABE,
  AGREEMENT_OPTIONS_NO_NOSABE,
  FORM_CONFIGS,
} from "@/data/encuesta360Data";

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

export async function generarPDFEncuesta360EnBlanco(
  formType: string,
  logoSources: { logoRLT: string; logoCLTDark: string; logoCosmo: string },
  logoFlags: { showLogoRlt?: boolean; showLogoClt?: boolean } = {}
): Promise<void> {
  const config = FORM_CONFIGS[formType];
  if (!config) throw new Error(`Unknown form type: ${formType}`);

  const showRlt = logoFlags.showLogoRlt ?? true;
  const showClt = logoFlags.showLogoClt ?? true;

  const [rltB64, cltB64, cosmoB64, cosmoSize] = await Promise.all([
    showRlt ? loadImageAsBase64(logoSources.logoRLT) : Promise.resolve(""),
    showClt ? loadImageAsBase64(logoSources.logoCLTDark) : Promise.resolve(""),
    loadImageAsBase64(logoSources.logoCosmo),
    getImageNaturalSize(logoSources.logoCosmo),
  ]);

  const rltNatSize = showRlt ? await getImageNaturalSize(logoSources.logoRLT) : { width: 1, height: 1 };
  const cltNatSize = showClt ? await getImageNaturalSize(logoSources.logoCLTDark) : { width: 1, height: 1 };

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 12;
  const contentW = pageW - margin * 2;
  let y = 0;

  const drawLogos = () => {
    const logoY = 8;
    if (showRlt && rltB64) {
      const d = logoDims(rltNatSize.width, rltNatSize.height, HEADER_LOGO_H);
      doc.addImage(rltB64, "PNG", margin, logoY, d.w, d.h);
    }
    if (showClt && cltB64) {
      const d = logoDims(cltNatSize.width, cltNatSize.height, HEADER_LOGO_H);
      doc.addImage(cltB64, "PNG", pageW - margin - d.w, logoY, d.w, d.h);
    }
  };

  const drawHeader = () => {
    drawLogos();
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(config.title, pageW / 2, 28, { align: "center" });
    doc.setFontSize(9);
    doc.text(config.subtitle, pageW / 2, 33, { align: "center" });
    doc.setDrawColor(120, 120, 120);
    doc.setLineWidth(0.4);
    doc.line(pageW / 2 - 50, 36, pageW / 2 + 50, 36);
    y = 42;
  };

  const drawPageHeader = () => {
    drawLogos();
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text(`${config.title} — ${config.subtitle}`, pageW / 2, 28, { align: "center" });
    y = 34;
  };

  const checkNewPage = (needed = 10) => {
    if (y + needed > pageH - 18) {
      doc.addPage();
      drawPageHeader();
    }
  };

  // ── Page 1: Cover ──
  drawHeader();

  // Intro text
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  const introLines = doc.splitTextToSize(config.intro, contentW);
  checkNewPage(introLines.length * 3 + 4);
  doc.text(introLines, margin, y);
  y += introLines.length * 3 + 4;

  // Glossary
  checkNewPage(GLOSSARY.length * 4 + 6);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("Glosario:", margin, y);
  y += 3.5;
  doc.setFont("helvetica", "normal");
  GLOSSARY.forEach((g) => {
    const lines = doc.splitTextToSize(`• ${g}`, contentW - 4);
    checkNewPage(lines.length * 3);
    doc.text(lines, margin + 2, y);
    y += lines.length * 3;
  });
  y += 3;

  // Header fields
  const drawBlankField = (label: string, lineW?: number) => {
    checkNewPage(8);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, margin + 2, y);
    const lw = doc.getTextWidth(`${label}:`) + 3;
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.3);
    const end = lineW ? Math.min(margin + 2 + lw + lineW, margin + contentW) : margin + contentW;
    doc.line(margin + 2 + lw, y + 1, end, y + 1);
    y += 6;
  };

  checkNewPage(40);
  doc.setFillColor(220, 220, 220);
  doc.rect(margin, y, contentW, 6, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("DATOS DE IDENTIFICACIÓN", pageW / 2, y + 4, { align: "center" });
  y += 10;

  drawBlankField("Institución Educativa");
  if (config.isAutoeval) {
    drawBlankField("Nombre completo");
  } else {
    drawBlankField("Nombre del directivo docente a evaluar");
    drawBlankField("¿Cuántos días de la semana pasada habló con el directivo evaluado?");
  }
  if (config.extraFields) {
    config.extraFields.forEach((ef) => {
      checkNewPage(8);
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "bold");
      doc.text(`${ef.label}:`, margin + 2, y);
      const lw = doc.getTextWidth(`${ef.label}:`) + 3;
      ef.options.forEach((opt, i) => {
        const x = margin + 2 + lw + i * 25;
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.circle(x, y - 0.5, 1.5);
        doc.text(opt, x + 3, y);
      });
      y += 6;
    });
  }
  y += 2;

  // ── Items section ──
  const freqOptions = config.isAutoeval ? FREQUENCY_OPTIONS_NO_NOSABE : FREQUENCY_OPTIONS_WITH_NOSABE;
  const agrOptions = config.isAutoeval ? AGREEMENT_OPTIONS_NO_NOSABE : AGREEMENT_OPTIONS_WITH_NOSABE;

  const drawItemsSection = (title: string, items: { num: number; text: string }[], options: string[]) => {
    checkNewPage(16);
    doc.setFillColor(220, 220, 220);
    doc.rect(margin, y, contentW, 6, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text(title, pageW / 2, y + 4, { align: "center" });
    y += 9;

    // Scale header
    const scaleX = margin + contentW * 0.55;
    const scaleW = contentW * 0.45;
    const optW = scaleW / options.length;

    checkNewPage(8);
    doc.setFontSize(5.5);
    doc.setFont("helvetica", "bold");
    options.forEach((opt, i) => {
      const cx = scaleX + i * optW + optW / 2;
      // Wrap long option text
      const optLines = doc.splitTextToSize(opt, optW - 2);
      optLines.forEach((line: string, li: number) => {
        doc.text(line, cx, y + li * 2.5, { align: "center" });
      });
    });
    y += 6;

    // Draw separator
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.2);
    doc.line(margin, y, margin + contentW, y);
    y += 2;

    // Items
    items.forEach((item) => {
      const textW = contentW * 0.53;
      const textLines = doc.splitTextToSize(`${item.num}. ${item.text}`, textW);
      const rowH = Math.max(textLines.length * 3.2, 5);

      checkNewPage(rowH + 2);

      doc.setFontSize(6.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(30, 30, 30);
      doc.text(textLines, margin + 2, y);

      // Draw circles for each option
      options.forEach((_, i) => {
        const cx = scaleX + i * optW + optW / 2;
        doc.setDrawColor(150, 150, 150);
        doc.setLineWidth(0.3);
        doc.circle(cx, y + rowH / 2 - 1.5, 1.8);
      });

      y += rowH + 1;

      // Separator line
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.15);
      doc.line(margin, y, margin + contentW, y);
      y += 1.5;
    });
  };

  drawItemsSection(
    "SECCIÓN I — FRECUENCIA",
    config.frequencyItems,
    freqOptions
  );

  y += 3;

  drawItemsSection(
    "SECCIÓN II — GRADO DE ACUERDO",
    config.agreementItems,
    agrOptions
  );

  // Closing message
  y += 4;
  checkNewPage(8);
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(80, 80, 80);
  doc.text(config.closingMessage, pageW / 2, y, { align: "center" });

  // ── Footers ──
  const totalPages = (doc.internal as any).getNumberOfPages?.() ?? 1;
  const cosmoTargetH = 7;
  const cosmoLogoW = cosmoTargetH * (cosmoSize.width / cosmoSize.height);

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const cosmoY = pageH - 13;
    doc.addImage(cosmoB64, "PNG", margin, cosmoY, cosmoLogoW, cosmoTargetH);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(`${i}/${totalPages}`, pageW - margin, cosmoY + cosmoTargetH / 2 + 1, { align: "right" });
  }

  const typeLabel = config.subtitle.replace("INSTRUMENTO PARA ", "").replace("INSTRUMENTO DE ", "");
  doc.save(`Encuesta_360_${typeLabel.replace(/\s+/g, "_")}_En_Blanco.pdf`);
}
