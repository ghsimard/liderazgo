import jsPDF from "jspdf";
import { loadImageAsBase64, getImageNaturalSize, logoDims, HEADER_LOGO_H, FOOTER_COSMO_H } from "@/utils/pdfLogoHelper";

export async function generarPDFFichaEnBlanco(
  logoSources: { logoRLT: string; logoCLTDark: string; logoCosmo: string },
  logoFlags: { showLogoRlt?: boolean; showLogoClt?: boolean } = {}
): Promise<void> {
  const showRlt = logoFlags.showLogoRlt ?? true;
  const showClt = logoFlags.showLogoClt ?? true;

  const [rltB64, cltB64, cosmoB64, cosmoSize] = await Promise.all([
    showRlt ? loadImageAsBase64(logoSources.logoRLT) : Promise.resolve(""),
    showClt ? loadImageAsBase64(logoSources.logoCLTDark) : Promise.resolve(""),
    loadImageAsBase64(logoSources.logoCosmo),
    getImageNaturalSize(logoSources.logoCosmo),
  ]);

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentW = pageW - margin * 2;
  let y = 0;

  // ── Header ──
  const rltNatSize = showRlt ? await getImageNaturalSize(logoSources.logoRLT) : { width: 1, height: 1 };
  const cltNatSize = showClt ? await getImageNaturalSize(logoSources.logoCLTDark) : { width: 1, height: 1 };

  const drawHeader = () => {
    const logoY = 10;
    const rltLeft = showRlt;
    if (showRlt && rltB64) {
      const d = logoDims(rltNatSize.width, rltNatSize.height, HEADER_LOGO_H);
      doc.addImage(rltB64, "PNG", rltLeft ? margin : pageW - margin - d.w, logoY, d.w, d.h);
    }
    if (showClt && cltB64) {
      const d = logoDims(cltNatSize.width, cltNatSize.height, HEADER_LOGO_H);
      doc.addImage(cltB64, "PNG", rltLeft ? pageW - margin - d.w : margin, logoY, d.w, d.h);
    }
    const textStartY = logoY + HEADER_LOGO_H + 4;
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    let titleY = textStartY;
    if (showRlt) {
      doc.text("PROGRAMA RECTORES LÍDERES TRANSFORMADORES - RLT", pageW / 2, titleY, { align: "center" });
      titleY += 5;
    }
    if (showClt) {
      doc.text("PROGRAMA COORDINADORES LÍDERES TRASFORMADORES - CLT", pageW / 2, titleY, { align: "center" });
      titleY += 3;
    }
    const lineY = titleY + 2;
    doc.setDrawColor(120, 120, 120);
    doc.setLineWidth(0.4);
    doc.line(pageW / 2 - 45, lineY, pageW / 2 + 45, lineY);
    doc.setFontSize(9);
    doc.text("FICHA DE INFORMACIÓN BÁSICA", pageW / 2, lineY + 5, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Fecha de diligenciamiento: _____ / _____ / _____", pageW - margin, lineY + 12, { align: "right" });
    y = lineY + 18;
  };

  const drawPageHeader = () => {
    const logoH = 18;
    const logoW = 22;
    const logoY = 10;
    const rltLeft2 = showRlt;
    if (showRlt && rltB64) {
      doc.addImage(rltB64, "PNG", rltLeft2 ? margin : pageW - margin - logoW, logoY, logoW, logoH);
    }
    if (showClt && cltB64) {
      doc.addImage(cltB64, "PNG", rltLeft2 ? pageW - margin - logoW : margin, logoY, logoW, logoH);
    }
    const textStartY = logoY + logoH + 4;
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    let tY = textStartY;
    if (showRlt) { doc.text("PROGRAMA RECTORES LÍDERES TRANSFORMADORES - RLT", pageW / 2, tY, { align: "center" }); tY += 5; }
    if (showClt) { doc.text("PROGRAMA COORDINADORES LÍDERES TRASFORMADORES - CLT", pageW / 2, tY, { align: "center" }); tY += 3; }
    const lineY = tY + 2;
    doc.setDrawColor(120, 120, 120);
    doc.setLineWidth(0.4);
    doc.line(pageW / 2 - 45, lineY, pageW / 2 + 45, lineY);
    doc.setFontSize(9);
    doc.text("FICHA DE INFORMACIÓN BÁSICA", pageW / 2, lineY + 5, { align: "center" });
    y = lineY + 12;
  };

  drawHeader();

  const checkNewPage = (needed = 12) => {
    if (y + needed > pageH - 20) {
      doc.addPage();
      drawPageHeader();
      y = 42;
    }
  };

  // Section title bar
  const drawSection = (title: string) => {
    checkNewPage(14);
    y += 3;
    doc.setFillColor(220, 220, 220);
    doc.rect(margin, y, contentW, 7, "F");
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.text(title, pageW / 2, y + 5, { align: "center" });
    y += 11;
    doc.setFont("helvetica", "normal");
  };

  // Blank field: label + underline for writing
  const drawBlankRow = (label: string, lineWidth?: number) => {
    checkNewPage(10);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    const labelText = `${label}:`;
    doc.text(labelText, margin + 2, y);
    const labelW = doc.getTextWidth(labelText) + 3;
    // Draw underline for fill-in
    const lineStart = margin + 2 + labelW;
    const lineEnd = lineWidth ? Math.min(lineStart + lineWidth, margin + contentW) : margin + contentW;
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.3);
    doc.line(lineStart, y + 1, lineEnd, y + 1);
    y += 7;
  };

  // Two blank fields side by side
  const drawBlankRowDouble = (label1: string, label2: string) => {
    checkNewPage(10);
    const halfW = contentW / 2;
    doc.setFontSize(8);
    doc.setTextColor(30, 30, 30);

    // Left
    doc.setFont("helvetica", "bold");
    const lt1 = `${label1}:`;
    doc.text(lt1, margin + 2, y);
    const lw1 = doc.getTextWidth(lt1) + 3;
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.3);
    doc.line(margin + 2 + lw1, y + 1, margin + halfW - 3, y + 1);

    // Right
    doc.setFont("helvetica", "bold");
    const lt2 = `${label2}:`;
    doc.text(lt2, margin + halfW, y);
    const lw2 = doc.getTextWidth(lt2) + 3;
    doc.line(margin + halfW + lw2, y + 1, margin + contentW, y + 1);

    y += 7;
  };

  // Multi-line blank area (for long answers)
  const drawBlankArea = (label: string, lines = 2) => {
    checkNewPage(8 + lines * 6);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text(`${label}:`, margin + 2, y);
    y += 4;
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.3);
    for (let i = 0; i < lines; i++) {
      doc.line(margin + 4, y + 1, margin + contentW, y + 1);
      y += 5;
    }
    y += 2;
  };

  // ── INFORMACIÓN PERSONAL ──
  drawSection("INFORMACIÓN PERSONAL*");
  drawBlankRowDouble("Nombres", "Apellidos");
  drawBlankRowDouble("Género", "Número de cédula");
  drawBlankRowDouble("Lugar de nacimiento", "Fecha de nacimiento (dd/mm/aaaa)");
  drawBlankRowDouble("Lengua materna", "Otra lengua");
  drawBlankRow("Número de celular personal");
  drawBlankRow("Correo electrónico personal");
  drawBlankRow("Correo electrónico institucional");
  drawBlankRow("Prefiere recibir comunicaciones en el correo");
  drawBlankArea("¿Tiene alguna enfermedad de base por la que pueda requerir atención especial durante los encuentros presenciales?");
  drawBlankRowDouble("Contacto de emergencia", "Teléfono de emergencia");
  drawBlankRowDouble("¿Tiene alguna discapacidad?", "¿Cuál?");

  // ── EXPERIENCIA LABORAL ──
  drawSection("EXPERIENCIA LABORAL");
  drawBlankRow("Nombre completo de la IE actual");
  drawBlankRow("Cargo");
  drawBlankRow("Tipo de vinculación");
  drawBlankRow("Fecha de vinculación al servicio educativo estatal (dd/mm/aaaa)");
  drawBlankRow("Fecha de nombramiento estatal en el cargo actual (dd/mm/aaaa)");
  drawBlankRow("Fecha de nombramiento del cargo actual en la IE (dd/mm/aaaa)");
  drawBlankRowDouble("Estatuto al que pertenece", "Grado en el escalafón");

  // ── FORMACIÓN ACADÉMICA ──
  drawSection("FORMACIÓN ACADÉMICA");
  drawBlankRow("Tipo de formación");
  drawBlankRow("Título de pregrado");
  drawBlankRow("Título de especialización");
  drawBlankRow("Título de maestría");
  drawBlankRow("Título de doctorado");
  drawBlankArea("Otros títulos, ¿cuáles?");

  // ── INFORMACIÓN DE LA IE ──
  doc.addPage();
  drawPageHeader();
  y = 42;
  drawSection("INFORMACIÓN DE LA INSTITUCIÓN EDUCATIVA – IE");
  drawBlankRow("Nombre completo de la IE actual");
  drawBlankRow("Código DANE de la IE (12 dígitos)");
  drawBlankRowDouble("Entidad Territorial", "Comuna, corregimiento o localidad");
  drawBlankRow("Dirección de la sede principal");
  drawBlankRowDouble("Zona de la sede principal de la IE", "Correo electrónico institucional");
  drawBlankRowDouble("Sitio web", "Teléfono de la IE");
  drawBlankRowDouble("Número total de sedes de la IE", "Sedes rurales");
  drawBlankRow("Sedes urbanas");
  drawBlankRow("Jornadas de la IE");
  drawBlankRow("Grupos étnicos en la IE");
  drawBlankArea("Proyectos transversales de la IE", 2);
  drawBlankRow("Estudiantes y familias en condición de desplazamiento");
  drawBlankRow("Niveles educativos que ofrece la IE");
  drawBlankRow("Tipo de bachillerato que ofrece la IE");
  drawBlankRow("Modelo o enfoque pedagógico");
  drawBlankRowDouble("Número de docentes", "Número de coordinadores/as");
  drawBlankRowDouble("Número de administrativos", "Número de orientadores/as");

  // Students table
  checkNewPage(18);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("Número de estudiantes en:", margin + 2, y);
  y += 5;
  const niveles = ["Preescolar", "Básica primaria", "Básica secundaria", "Media", "Ciclo complementario"];
  const colW = contentW / niveles.length;
  doc.setFontSize(7);
  niveles.forEach((n, i) => {
    const cx = margin + i * colW;
    doc.setFont("helvetica", "bold");
    doc.text(n, cx + colW / 2, y, { align: "center" });
    // Empty box below
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.3);
    doc.rect(cx + 4, y + 2, colW - 8, 6);
  });
  y += 12;

  // ── Footer on all pages ──
  const totalPages = (doc.internal as { getNumberOfPages?: () => number }).getNumberOfPages?.() ?? 1;
  const cosmoTargetH = 8;
  const cosmoLogoW = cosmoTargetH * (cosmoSize.width / cosmoSize.height);

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    if (i === 1) {
      const disclaimerY = pageH - 20;
      doc.setFontSize(6.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 30, 30);
      doc.text("*", margin, disclaimerY);
      doc.setFont("helvetica", "normal");
      const disclaimerText = "Para efectos de la participación en el Programa Rectores Líderes Transformadores y Coordinadores Líderes Transformadores, los directivos docentes \"Entienden y aceptan el trato de sus datos personales\".";
      const disclaimerLines = doc.splitTextToSize(disclaimerText, contentW - 3);
      doc.text(disclaimerLines, margin + 3, disclaimerY);
    }
    const cosmoY = pageH - 15;
    doc.addImage(cosmoB64, "PNG", margin, cosmoY, cosmoLogoW, cosmoTargetH);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(`${i}/${totalPages}`, pageW - margin, cosmoY + cosmoTargetH / 2 + 1, { align: "right" });
  }

  doc.save("Ficha_RLT_En_Blanco.pdf");
}
