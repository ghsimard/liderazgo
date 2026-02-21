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
  logoSources: { logoRLT: string; logoCLTDark: string; logoCosmo: string }
): Promise<void> {
  // Load images as base64
  const isQuibdo = datos["region"] === "Quibdó";
  const [rltB64, cltB64, cosmoB64] = await Promise.all([
    loadImageAsBase64(logoSources.logoRLT),
    isQuibdo ? Promise.resolve("") : loadImageAsBase64(logoSources.logoCLTDark),
    loadImageAsBase64(logoSources.logoCosmo),
  ]);

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentW = pageW - margin * 2;
  let y = 0;

  // ── Encabezado ──────────────────────────────────────────────
  doc.setFillColor(18, 52, 108);
  doc.rect(0, 0, pageW, 36, "F");
  doc.setFillColor(40, 140, 90);
  doc.rect(0, 36, pageW, 3, "F");

  // Logos in header — on each side of titles (reduced 25%)
  const logoH = 21;
  const logoW = 24;
  const logoY = 7;
  if (isQuibdo) {
    // RLT logo on left side
    doc.addImage(rltB64, "PNG", margin, logoY, logoW, logoH);
  } else {
    // RLT on left, CLT on right
    doc.addImage(rltB64, "PNG", margin, logoY, logoW, logoH);
    doc.addImage(cltB64, "PNG", pageW - margin - logoW, logoY, logoW, logoH);
  }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("FICHA DE INFORMACIÓN BÁSICA", pageW / 2, 22, { align: "center" });
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  if (isQuibdo) {
    doc.text("Programa Rectores Líderes Transformadores (RLT)", pageW / 2, 27, { align: "center" });
  } else {
    doc.text("Programa Rectores Líderes Transformadores (RLT)", pageW / 2, 26, { align: "center" });
    doc.text("Coordinadores Líderes Transformadores (CLT)", pageW / 2, 30, { align: "center" });
  }
  doc.setFontSize(7);
  doc.text(
    `Generado el: ${new Date().toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" })}`,
    pageW / 2,
    32,
    { align: "center" }
  );

  y = 48;
  doc.setTextColor(30, 30, 30);

  // ── Helper functions ─────────────────────────────────────────
  const checkNewPage = (needed = 18) => {
    if (y + needed > pageH - 22) {
      doc.addPage();
      y = 15;
    }
  };

  const drawSection = (title: string) => {
    checkNewPage(14);
    doc.setFillColor(18, 52, 108);
    doc.rect(margin, y, contentW, 7, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(title.toUpperCase(), margin + 3, y + 5);
    y += 11;
    doc.setTextColor(30, 30, 30);
  };

  const drawRow = (label: string, value: string | undefined | null) => {
    const val = value ? String(value) : "—";
    checkNewPage(10);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(18, 52, 108);
    doc.text(`${label}:`, margin + 2, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 30, 30);
    const lines = doc.splitTextToSize(val, contentW - 55);
    doc.text(lines, margin + 55, y);
    y += Math.max(lines.length * 5, 6) + 1;
  };

  const val = (key: string) => {
    const v = datos[key];
    if (Array.isArray(v)) return v.join(", ");
    return v !== undefined && v !== null && v !== "" ? String(v) : undefined;
  };

  // ── Secciones ────────────────────────────────────────────────
  drawSection("1. Datos Personales");
  drawRow("Nombres", val("nombres"));
  drawRow("Apellidos", val("apellidos"));
  drawRow("Género", val("genero"));
  drawRow("Número de Cédula", val("numero_cedula"));
  drawRow("Fecha de Nacimiento", val("fecha_nacimiento"));
  drawRow("Lugar de Nacimiento", val("lugar_nacimiento"));
  drawRow("Lengua Materna", val("lengua_materna"));
  if (datos["lengua_otra"]) drawRow("Otra Lengua", val("lengua_otra"));
  drawRow("Celular Personal", val("celular_personal"));
  drawRow("Correo Personal", val("correo_personal"));
  drawRow("Correo Institucional", val("correo_institucional"));
  drawRow("Prefiere Correo", val("prefiere_correo"));

  drawSection("2. Salud y Contacto de Emergencia");
  drawRow("Enfermedad de Base", val("enfermedad_base"));
  if (datos["enfermedad_detalle"]) drawRow("Detalle Enfermedad", val("enfermedad_detalle"));
  drawRow("Contacto Emergencia", val("contacto_emergencia"));
  drawRow("Teléfono Emergencia", val("telefono_emergencia"));
  drawRow("Discapacidad", val("discapacidad"));
  if (datos["discapacidad_detalle"]) drawRow("Detalle Discapacidad", val("discapacidad_detalle"));

  drawSection("3. Formación Académica");
  drawRow("Tipo de Formación", val("tipo_formacion"));
  drawRow("Pregrado", val("titulo_pregrado"));
  drawRow("Especialización", val("titulo_especializacion"));
  drawRow("Maestría", val("titulo_maestria"));
  drawRow("Doctorado", val("titulo_doctorado"));
  drawRow("Otros Títulos", val("otros_titulos"));

  drawSection("4. Información Institucional");
  drawRow("Región", val("region"));
  drawRow("Institución Educativa", val("nombre_ie"));
  drawRow("Cargo Actual", val("cargo_actual"));
  drawRow("Tipo de Vinculación", val("tipo_vinculacion"));
  drawRow("Fecha Vinc. Servicio Educ.", val("fecha_vinculacion_servicio"));
  drawRow("Fecha Nombr. en el Cargo", val("fecha_nombramiento_cargo"));
  drawRow("Fecha Nombr. en la IE", val("fecha_nombramiento_ie"));
  drawRow("Estatuto", val("estatuto"));
  drawRow("Grado en el Escalafón", val("grado_escalafon"));
  drawRow("Código DANE", val("codigo_dane"));
  drawRow("Entidad Territorial", val("entidad_territorial"));
  drawRow("Comuna / Barrio / Corregimiento", val("comuna_barrio"));

  drawSection("5. Datos de la IE");
  drawRow("Dirección Sede Principal", val("direccion_sede_principal"));
  drawRow("Teléfono de la IE", val("telefono_ie"));
  drawRow("Sitio Web", val("sitio_web"));
  drawRow("Zona Sede Principal", val("zona_sede"));
  const totalSedes = ((Number(datos["sedes_rural"]) || 0) + (Number(datos["sedes_urbana"]) || 0)) || undefined;
  drawRow("Total Sedes", totalSedes ? String(totalSedes) : undefined);
  drawRow("Sedes Zona Rural", val("sedes_rural"));
  drawRow("Sedes Zona Urbana", val("sedes_urbana"));
  drawRow("Jornadas", Array.isArray(datos["jornadas"]) ? (datos["jornadas"] as string[]).join(", ") : val("jornadas"));
  drawRow("Grupos Étnicos", val("grupos_etnicos"));
  drawRow("Proyectos Transversales", val("proyectos_transversales"));
  drawRow("Estudiantes JEC / Inspiración Comfama", val("estudiantes_jec"));
  drawRow("Desplazamiento", val("desplazamiento"));
  drawRow("Niveles Educativos", Array.isArray(datos["niveles_educativos"]) ? (datos["niveles_educativos"] as string[]).join(", ") : val("niveles_educativos"));
  drawRow("Tipo de Bachillerato", val("tipo_bachillerato"));
  drawRow("Modelo Pedagógico", val("modelo_pedagogico"));

  drawSection("6. Personal y Estudiantes");
  drawRow("Docentes", val("num_docentes"));
  drawRow("Coordinadores/as", val("num_coordinadores"));
  drawRow("Administrativos", val("num_administrativos"));
  drawRow("Orientadores/as", val("num_orientadores"));
  drawRow("Estudiantes Preescolar", val("estudiantes_preescolar"));
  drawRow("Estudiantes Primaria", val("estudiantes_primaria"));
  drawRow("Estudiantes Básica Secundaria", val("estudiantes_basica_secundaria"));
  drawRow("Estudiantes Media", val("estudiantes_media"));
  drawRow("Estudiantes Ciclo Complementario", val("estudiantes_ciclo_complementario"));

  // ── Pie de página con logo Cosmo ─────────────────────────────
  const totalPages = (doc.internal as { getNumberOfPages?: () => number }).getNumberOfPages?.() ?? 1;
  const footerH = 18;
  const cosmoLogoW = 21;
  const cosmoLogoH = 7;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    // Footer bar
    doc.setFillColor(18, 52, 108);
    doc.rect(0, pageH - footerH, pageW, footerH, "F");
    // White background rectangle for Cosmo logo
    const cosmoPadX = 2;
    const cosmoPadY = 1.5;
    const cosmoX = margin;
    const cosmoY = pageH - footerH + (footerH - cosmoLogoH) / 2;
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(cosmoX - cosmoPadX, cosmoY - cosmoPadY, cosmoLogoW + cosmoPadX * 2, cosmoLogoH + cosmoPadY * 2, 2, 2, "F");
    doc.addImage(cosmoB64, "PNG", cosmoX, cosmoY, cosmoLogoW, cosmoLogoH);
    // Text
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.text("Programa RLT/CLT — Documento confidencial", pageW / 2, pageH - footerH / 2 + 1, { align: "center" });
    doc.text(`Página ${i} de ${totalPages}`, pageW - margin, pageH - footerH / 2 + 1, { align: "right" });
  }

  const nombre = String(datos["apellidos"] ?? datos["nombres"] ?? "ficha").replace(/\s+/g, "_");
  doc.save(`Ficha_RLT_${nombre}.pdf`);
}
