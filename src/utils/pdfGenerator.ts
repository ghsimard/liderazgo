import jsPDF from "jspdf";

/** Convert an image URL (imported asset) to a base64 data URL */
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

export interface PdfLogos {
  logoRLT: string;
  logoCLT?: string;
  logoCosmo: string;
}

export async function generarPDFFicha(
  datos: Record<string, unknown>,
  logoSources: { logoRLT: string; logoCLTDark: string; logoCosmo: string },
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
  const margin = 15;
  const contentW = pageW - margin * 2;
  let y = 0;

  // ── Header (white background, logos + centered text) ──
  const drawHeader = () => {
    const logoH = 18;
    const logoW = 22;
    const logoY = 10;

    // CLT logo left
    if (showClt && cltB64) {
      doc.addImage(cltB64, "PNG", margin, logoY, logoW, logoH);
    }

    // RLT logo right
    if (showRlt && rltB64) {
      doc.addImage(rltB64, "PNG", pageW - margin - logoW, logoY, logoW, logoH);
    }

    // Centered program titles
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    let titleY = 15;
    if (showRlt) {
      doc.text("PROGRAMA RECTORES LÍDERES TRANSFORMADORES - RLT", pageW / 2, titleY, { align: "center" });
      titleY += 5;
    }
    if (showClt) {
      doc.text("PROGRAMA COORDINADORES LÍDERES TRASFORMADORES - CLT", pageW / 2, titleY, { align: "center" });
      titleY += 3;
    }

    // Separator line
    doc.setDrawColor(120, 120, 120);
    doc.setLineWidth(0.4);
    const lineX1 = pageW / 2 - 45;
    const lineX2 = pageW / 2 + 45;
    doc.line(lineX1, 23, lineX2, 23);

    // Subtitle
    doc.setFontSize(9);
    doc.text("FICHA DE INFORMACIÓN BÁSICA", pageW / 2, 28, { align: "center" });

    // Date right-aligned
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const fechaStr = `Fecha de diligenciamiento: ${new Date().toLocaleDateString("es-CO", { year: "numeric", month: "long" })}`;
    doc.text(fechaStr, pageW - margin, 36, { align: "right" });

    y = 42;
  };

  drawHeader();

  // ── Helper functions ──
  const checkNewPage = (needed = 12) => {
    if (y + needed > pageH - 20) {
      doc.addPage();
      drawPageHeader();
      y = 42;
    }
  };

  const drawPageHeader = () => {
    const logoH = 18;
    const logoW = 22;
    const logoY = 10;
    if (showClt && cltB64) {
      doc.addImage(cltB64, "PNG", margin, logoY, logoW, logoH);
    }
    if (showRlt && rltB64) {
      doc.addImage(rltB64, "PNG", pageW - margin - logoW, logoY, logoW, logoH);
    }
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    let tY = 15;
    if (showRlt) { doc.text("PROGRAMA RECTORES LÍDERES TRANSFORMADORES - RLT", pageW / 2, tY, { align: "center" }); tY += 5; }
    if (showClt) { doc.text("PROGRAMA COORDINADORES LÍDERES TRASFORMADORES - CLT", pageW / 2, tY, { align: "center" }); tY += 3; }
    doc.setDrawColor(120, 120, 120);
    doc.setLineWidth(0.4);
    doc.line(pageW / 2 - 45, tY, pageW / 2 + 45, tY);
    doc.setFontSize(9);
    doc.text("FICHA DE INFORMACIÓN BÁSICA", pageW / 2, tY + 5, { align: "center" });
  };

  // Section title: light gray bar, centered text
  const drawSection = (title: string) => {
    checkNewPage(14);
    y += 3;
    doc.setFillColor(220, 230, 241); // light blue-gray
    doc.rect(margin, y, contentW, 7, "F");
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.text(title, pageW / 2, y + 5, { align: "center" });
    y += 11;
    doc.setFont("helvetica", "normal");
  };

  // Single row: bold label + normal value
  const drawRow = (label: string, value: string | undefined | null, valueBelow = false) => {
    const val = value ? String(value) : "";
    checkNewPage(valueBelow && val ? 14 : 8);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    const labelText = `${label}:`;
    doc.text(labelText, margin + 2, y);
    // Measure label width while still in bold font
    const labelWidth = doc.getTextWidth(labelText) + 4;
    if (val) {
      doc.setFont("helvetica", "normal");
      if (valueBelow) {
        y += 5;
        const lines = doc.splitTextToSize(val, contentW - 10);
        doc.text(lines, margin + 8, y);
        y += lines.length * 4.5 + 2;
      } else {
        const maxValW = contentW - labelWidth - 2;
        const lines = doc.splitTextToSize(val, maxValW);
        doc.text(lines, margin + 2 + labelWidth, y);
        y += Math.max(lines.length * 4.5, 6);
      }
    } else {
      y += 6;
    }
  };

  // Two fields side by side
  const drawRowDouble = (
    label1: string, value1: string | undefined | null,
    label2: string, value2: string | undefined | null
  ) => {
    const v1 = value1 ? String(value1) : "";
    const v2 = value2 ? String(value2) : "";
    checkNewPage(8);
    const halfW = contentW / 2;
    doc.setFontSize(8);

    // Left field
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    const lt1 = `${label1}:`;
    doc.text(lt1, margin + 2, y);
    const lw1 = doc.getTextWidth(lt1) + 4;
    if (v1) {
      doc.setFont("helvetica", "normal");
      doc.text(v1, margin + 2 + lw1, y);
    }

    // Right field
    doc.setFont("helvetica", "bold");
    const lt2 = `${label2}:`;
    doc.text(lt2, margin + halfW, y);
    const lw2 = doc.getTextWidth(lt2) + 4;
    if (v2) {
      doc.setFont("helvetica", "normal");
      doc.text(v2, margin + halfW + lw2, y);
    }

    y += 6;
  };

  const val = (key: string) => {
    const v = datos[key];
    if (Array.isArray(v)) return v.join(", ");
    return v !== undefined && v !== null && v !== "" ? String(v) : undefined;
  };

  // ── INFORMACIÓN PERSONAL ──
  drawSection("INFORMACIÓN PERSONAL*");
  drawRowDouble("Nombres y Apellido", val("nombres") && val("apellidos") ? `${val("nombres")} ${val("apellidos")}` : (val("nombres") || val("apellidos")), "Género", val("genero"));
  drawRow("Número de cédula", val("numero_cedula"));
  drawRowDouble("Lugar de nacimiento", val("lugar_nacimiento"), "Fecha de nacimiento (dd/mm/aaaa)", val("fecha_nacimiento"));
  drawRowDouble("Lengua materna", val("lengua_materna"), "Número de celular personal", val("celular_personal"));
  if (datos["lengua_otra"]) drawRow("Otra lengua", val("lengua_otra"));
  drawRow("Correo electrónico personal", val("correo_personal"));
  drawRow("Correo electrónico institucional (el que usted usa en su rol como directivo docente)", val("correo_institucional"));
  drawRow("Prefiere recibir comunicaciones en el correo", val("prefiere_correo"));
  drawRow("¿Tiene alguna enfermedad de base por la que pueda requerir atención especial durante los encuentros presenciales?", val("enfermedad_base"));
  if (datos["enfermedad_detalle"]) drawRow("Si la respuesta fue afirmativa, indique cuál enfermedad y qué requerimientos puede tener", val("enfermedad_detalle"));
  drawRow("Contacto de emergencia", val("contacto_emergencia"));
  drawRow("Teléfono de emergencia", val("telefono_emergencia"));
  drawRowDouble("¿Tiene alguna discapacidad?", val("discapacidad"), "¿cuál?", val("discapacidad_detalle"));

  // ── EXPERIENCIA LABORAL ──
  drawSection("EXPERIENCIA LABORAL");
  drawRow("Nombre completo de la IE actual", val("nombre_ie"));
  drawRow("Cargo", val("cargo_actual"));
  drawRow("Tipo de vinculación", val("tipo_vinculacion"));
  drawRow("Fecha de vinculación al servicio educativo estatal (dd/mm/aaaa)", val("fecha_vinculacion_servicio"));
  drawRow("Fecha de nombramiento estatal en el cargo actual (dd/mm/aaaa)", val("fecha_nombramiento_cargo"));
  drawRow("Fecha de nombramiento del cargo actual en la IE (dd/mm/aaaa)", val("fecha_nombramiento_ie"));
  drawRow("Estatuto al que pertenece", val("estatuto"));
  drawRow("Grado en el escalafón", val("grado_escalafon"));

  // ── FORMACIÓN ACADÉMICA ──
  drawSection("FORMACIÓN ACADÉMICA");
  drawRow("Tipo de formación", val("tipo_formacion"));
  drawRow("Título de pregrado", val("titulo_pregrado"));
  drawRow("Título de especialización", val("titulo_especializacion"));
  drawRow("Título de maestría", val("titulo_maestria"));
  drawRow("Título de doctorado", val("titulo_doctorado"));
  drawRow("Otros títulos, ¿cuáles?", val("otros_titulos"));

  // ── INFORMACIÓN DE LA INSTITUCIÓN EDUCATIVA ──
  doc.addPage();
  drawPageHeader();
  y = 42;
  drawSection("INFORMACIÓN DE LA INSTITUCIÓN EDUCATIVA – IE");
  drawRow("Nombre completo de la IE actual", val("nombre_ie"));
  drawRow("Código DANE de la IE (12 dígitos)", val("codigo_dane"));
  drawRowDouble("Entidad Territorial", val("entidad_territorial"), "Comuna, corregimiento o localidad", val("comuna_barrio"));
  drawRow("Dirección de la sede principal", val("direccion_sede_principal"));
  drawRowDouble("Zona de la sede principal de la IE", val("zona_sede"), "Correo electrónico institucional", val("correo_institucional"));
  drawRowDouble("Sitio web", val("sitio_web"), "Teléfono de la IE", val("telefono_ie"));

  const totalSedes = ((Number(datos["sedes_rural"]) || 0) + (Number(datos["sedes_urbana"]) || 0)) || undefined;
  drawRowDouble(
    "Número total de sedes de la IE (incluida la sede principal)", totalSedes ? String(totalSedes) : undefined,
    "Número de sedes por zona: Rurales", val("sedes_rural")
  );
  drawRow("Urbanas", val("sedes_urbana"));
  drawRow("Jornadas de la IE (opción múltiple)", Array.isArray(datos["jornadas"]) ? (datos["jornadas"] as string[]).join(", ") : val("jornadas"));
  drawRow("Grupos étnicos en la IE (puede marcar más de una opción)", val("grupos_etnicos"));
  drawRow("Proyectos transversales de la IE", val("proyectos_transversales"), true);
  drawRow("Estudiantes y familias de la IE en condición de desplazamiento", val("desplazamiento"));
  
  drawRow("Niveles educativos que ofrece la IE (opción múltiple)", Array.isArray(datos["niveles_educativos"]) ? (datos["niveles_educativos"] as string[]).join(", ") : val("niveles_educativos"));
  drawRow("Tipo de bachillerato que ofrece la IE", val("tipo_bachillerato"));
  drawRow("Modelo o enfoque pedagógico", val("modelo_pedagogico"));

  drawRowDouble("Número de docentes", val("num_docentes"), "Número de coordinadores/as", val("num_coordinadores"));
  drawRowDouble("Número de administrativos", val("num_administrativos"), "Número de orientadores/as", val("num_orientadores"));

  // Students: label + level headers on same line, values below
  checkNewPage(16);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  const estudLabel = "Número de estudiantes en:";
  doc.text(estudLabel, margin + 2, y);
  const estudLabelW = doc.getTextWidth(estudLabel) + 2;
  const niveles = ["Preescolar", "Básica primaria", "Básica secundaria", "Media", "Ciclo complementario"];
  const nivelesKeys = ["estudiantes_preescolar", "estudiantes_primaria", "estudiantes_basica_secundaria", "estudiantes_media", "estudiantes_ciclo_complementario"];
  // Calculate column widths based on text + padding
  doc.setFontSize(6.5);
  const colPad = 3;
  const colWidths = niveles.map(n => doc.getTextWidth(n) + colPad);
  // Level headers with vertical separators
  let cx = margin + 2 + estudLabelW;
  const headerY = y;
  niveles.forEach((n, i) => {
    if (i > 0) {
      doc.setDrawColor(150, 150, 150);
      doc.setLineWidth(0.2);
      doc.line(cx - 1, headerY - 3, cx - 1, headerY + 6);
    }
    doc.setFont("helvetica", "bold");
    doc.text(n, cx + 1, headerY);
    cx += colWidths[i];
  });
  y += 4;
  // Values row below each header
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  cx = margin + 2 + estudLabelW;
  nivelesKeys.forEach((k, i) => {
    const v = val(k) ?? "—";
    doc.text(v, cx + 1 + colWidths[i] / 2 - doc.getTextWidth(v) / 2, y);
    cx += colWidths[i];
  });
  y += 6;

  // ── Disclaimer on page 1 ──
  const totalPages = (doc.internal as { getNumberOfPages?: () => number }).getNumberOfPages?.() ?? 1;

  // Footer with Cosmo logo and page numbers
  const cosmoLogoW = 24;
  const cosmoLogoH = 8;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Disclaimer only on page 1
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

    // Cosmo logo bottom-left
    const cosmoY = pageH - 15;
    doc.addImage(cosmoB64, "PNG", margin, cosmoY, cosmoLogoW, cosmoLogoH);

    // Page number bottom-right
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(`${i}/${totalPages}`, pageW - margin, cosmoY + cosmoLogoH / 2 + 1, { align: "right" });
  }

  const nombre = String(datos["apellidos"] ?? datos["nombres"] ?? "ficha").replace(/\s+/g, "_");
  doc.save(`Ficha_RLT_${nombre}.pdf`);
}
