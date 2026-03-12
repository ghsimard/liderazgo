import jsPDF from "jspdf";
import {
  FREQUENCY_OPTIONS,
  GRADOS_COMPLETOS,
  GRADOS_ESTUDIANTE,
  JORNADA_OPTIONS,
  ANOS_OPTIONS,
  FUENTES_RETROALIMENTACION,
  INTRO_TEXT,
  FORM_TITLES,
  ACUDIENTES_LIKERT,
  ESTUDIANTES_LIKERT,
  DOCENTES_LIKERT,
  type LikertSection,
} from "@/data/ambienteEscolarData";

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

interface LogoSources {
  logoRLT: string;
  logoCLTDark: string;
  logoCosmo: string;
}

export async function generarPDFAmbienteEscolarEnBlanco(
  formType: "acudientes" | "estudiantes" | "docentes",
  logoSources: LogoSources,
  logoFlags: { showLogoRlt?: boolean; showLogoClt?: boolean } = {}
): Promise<void> {
  const showRlt = logoFlags.showLogoRlt ?? true;
  const showClt = logoFlags.showLogoClt ?? true;

  const [rltB64, cltB64, cosmoB64] = await Promise.all([
    showRlt ? loadImageAsBase64(logoSources.logoRLT) : Promise.resolve(""),
    showClt ? loadImageAsBase64(logoSources.logoCLTDark) : Promise.resolve(""),
    loadImageAsBase64(logoSources.logoCosmo),
  ]);

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 12;
  const contentW = pageW - margin * 2;
  let y = 0;

  const likertSections: LikertSection[] =
    formType === "acudientes"
      ? ACUDIENTES_LIKERT
      : formType === "estudiantes"
      ? ESTUDIANTES_LIKERT
      : DOCENTES_LIKERT;

  // ── Helpers ──

  const ensureSpace = (needed: number) => {
    if (y + needed > pageH - 15) {
      doc.addPage();
      drawHeader();
    }
  };

  const drawLogos = () => {
    const logoH = 14;
    const logoW = 18;
    const logoY = 6;
    if (showRlt && rltB64) doc.addImage(rltB64, "PNG", margin, logoY, logoW, logoH);
    if (showClt && cltB64) doc.addImage(cltB64, "PNG", pageW - margin - logoW, logoY, logoW, logoH);

    // Cosmo centered
    const cosmoH = 12;
    const cosmoW = 18;
    if (cosmoB64) doc.addImage(cosmoB64, "PNG", (pageW - cosmoW) / 2, logoY + 1, cosmoW, cosmoH);
  };

  const drawHeader = () => {
    drawLogos();
    y = 24;
  };

  const drawFooter = () => {
    const footerY = pageH - 8;
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text("Encuesta de Ambiente Escolar – Formulario en blanco", pageW / 2, footerY, { align: "center" });
  };

  const wrapText = (text: string, maxW: number, fontSize: number): string[] => {
    doc.setFontSize(fontSize);
    return doc.splitTextToSize(text, maxW) as string[];
  };

  // ── Page 1: Title + Intro ──

  drawHeader();

  // Title
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(26, 58, 107);
  doc.text("ENCUESTA DE AMBIENTE ESCOLAR", pageW / 2, y, { align: "center" });
  y += 6;
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(FORM_TITLES[formType], pageW / 2, y, { align: "center" });
  y += 8;

  // Intro box
  doc.setDrawColor(26, 58, 107);
  doc.setLineWidth(0.8);
  const introLines = wrapText(INTRO_TEXT, contentW - 8, 8);
  const closingLine = "Te invitamos a responder con sinceridad y a completar todas las preguntas de la encuesta. ¡Gracias!";
  const closingLines = wrapText(closingLine, contentW - 8, 8);
  const introH = (introLines.length + closingLines.length + 1) * 3.5 + 6;
  doc.line(margin, y, margin, y + introH);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(30, 30, 30);
  doc.text(introLines, margin + 4, y + 4);
  y += 4 + introLines.length * 3.5 + 2;
  doc.setFont("helvetica", "bold");
  doc.text(closingLines, margin + 4, y);
  doc.setFont("helvetica", "normal");
  y += closingLines.length * 3.5 + 6;

  // ── Institution field ──
  y += 2;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text("Nombre de la Institución Educativa *", margin, y);
  y += 5;
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.rect(margin, y, contentW, 7);
  y += 12;

  // ── Demographic questions ──

  const drawRadioRow = (label: string, options: string[]) => {
    const labelLines = wrapText(label, contentW, 9);
    ensureSpace(labelLines.length * 4 + 10);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text(labelLines, margin, y);
    y += labelLines.length * 4 + 2;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const colW = Math.min(35, contentW / Math.min(options.length, 5));
    let cx = margin;
    let row = 0;
    for (const opt of options) {
      if (cx + colW > pageW - margin) {
        cx = margin;
        row++;
      }
      const oy = y + row * 5;
      doc.circle(cx + 2, oy + 0.5, 1.5);
      doc.text(opt, cx + 5, oy + 1);
      cx += colW;
    }
    y += (row + 1) * 5 + 4;
  };

  const drawCheckboxRow = (label: string, options: string[]) => {
    const labelLines = wrapText(label, contentW, 9);
    ensureSpace(labelLines.length * 4 + 10);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text(labelLines, margin, y);
    y += labelLines.length * 4 + 2;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const colW = Math.min(35, contentW / Math.min(options.length, 5));
    let cx = margin;
    let row = 0;
    for (const opt of options) {
      if (cx + colW > pageW - margin) {
        cx = margin;
        row++;
      }
      const oy = y + row * 5;
      doc.rect(cx + 0.5, oy - 1, 3, 3);
      doc.text(opt, cx + 5, oy + 1);
      cx += colW;
    }
    y += (row + 1) * 5 + 4;
  };

  if (formType === "acudientes") {
    drawCheckboxRow(
      "¿Qué grado se encuentra cursando el o los estudiantes que usted representa? (puede marcar más de una casilla) *",
      GRADOS_COMPLETOS
    );
  }

  if (formType === "estudiantes") {
    drawRadioRow("¿Cuántos años llevas estudiando en el colegio? *", ANOS_OPTIONS);
    drawRadioRow("¿En qué grado estás actualmente? *", GRADOS_ESTUDIANTE);
    drawRadioRow("¿En qué jornada tienes clases? *", JORNADA_OPTIONS);
  }

  if (formType === "docentes") {
    drawRadioRow(
      "Incluyendo este año escolar, ¿cuántos años se ha desempeñado como docente en este colegio? *",
      ANOS_OPTIONS
    );
    drawCheckboxRow(
      "¿En qué grados tiene asignación de actividades de docencia en este colegio? (múltiple respuesta) *",
      GRADOS_COMPLETOS
    );
    drawCheckboxRow(
      "¿En qué jornada desarrolla sus clases? (múltiple respuesta) *",
      JORNADA_OPTIONS
    );
    drawCheckboxRow(
      "¿De qué fuentes de retroalimentación recibe información sobre su desempeño docente? (múltiple respuesta) *",
      FUENTES_RETROALIMENTACION
    );
  }

  // ── Likert tables ──

  const freqOpts = FREQUENCY_OPTIONS as readonly string[];
  const colCount = freqOpts.length;

  for (const section of likertSections) {
    ensureSpace(20);

    // Section title
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(26, 58, 107);
    doc.text(section.title, margin, y);
    y += 4;
    doc.setFontSize(7);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(100, 100, 100);
    doc.text(section.instruction, margin, y);
    y += 2;
    doc.setFontSize(6);
    doc.setTextColor(200, 50, 50);
    doc.text("* Todas las preguntas son obligatorias", margin, y);
    y += 4;

    // Table header
    const textColW = contentW * 0.50;
    const optColW = (contentW - textColW) / colCount;
    const headerH = 6;

    ensureSpace(headerH + 8);
    doc.setFillColor(240, 240, 245);
    doc.rect(margin, y, contentW, headerH, "F");
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.rect(margin, y, contentW, headerH);

    doc.setFontSize(6);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(80, 80, 80);
    for (let c = 0; c < colCount; c++) {
      const cx = margin + textColW + c * optColW + optColW / 2;
      doc.text(freqOpts[c], cx, y + headerH / 2 + 1, { align: "center" });
    }
    y += headerH;

    // Rows
    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 30, 30);

    for (let i = 0; i < section.items.length; i++) {
      const item = section.items[i];
      const lines = wrapText(item.text, textColW - 4, 7);
      const rowH = Math.max(lines.length * 3.2 + 2, 7);

      ensureSpace(rowH + 2);

      // Alternate row bg
      if (i % 2 === 0) {
        doc.setFillColor(248, 248, 252);
        doc.rect(margin, y, contentW, rowH, "F");
      }
      doc.setDrawColor(220, 220, 220);
      doc.rect(margin, y, contentW, rowH);

      // Text
      doc.setFontSize(7);
      doc.text(lines, margin + 2, y + 3.5);

      // Radio circles
      for (let c = 0; c < colCount; c++) {
        const cx = margin + textColW + c * optColW + optColW / 2;
        doc.circle(cx, y + rowH / 2, 1.5);
      }

      // Vertical column lines
      for (let c = 0; c <= colCount; c++) {
        const lx = margin + textColW + c * optColW;
        doc.line(lx, y, lx, y + rowH);
      }

      y += rowH;
    }

    y += 6;
  }

  // ── Footer on all pages ──
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    drawFooter();
  }

  doc.save(`encuesta_ambiente_escolar_${formType}_blanco.pdf`);
}
