import jsPDF from "jspdf";

export function generarPDFFicha(datos: Record<string, unknown>): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentW = pageW - margin * 2;
  let y = 0;

  // ── Encabezado ──────────────────────────────────────────────
  doc.setFillColor(18, 52, 108);
  doc.rect(0, 0, pageW, 36, "F");
  doc.setFillColor(40, 140, 90);
  doc.rect(0, 36, pageW, 3, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("FICHA DE INFORMACIÓN BÁSICA", pageW / 2, 15, { align: "center" });
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Programa Rectores Líderes Transformadores (RLT) / Coordinadores Líderes Transformadores (CLT)", pageW / 2, 23, { align: "center" });
  doc.setFontSize(8);
  doc.text(`Generado el: ${new Date().toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" })}`, pageW / 2, 30, { align: "center" });

  y = 48;
  doc.setTextColor(30, 30, 30);

  // ── Helper functions ─────────────────────────────────────────
  const checkNewPage = (needed = 18) => {
    if (y + needed > 275) {
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
  drawRow("Fecha de Nacimiento", val("fecha_nacimiento"));
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
  drawRow("Estudiantes Ciclo Complementario", val("estudiantes_ciclo_complementario"));

  // ── Pie de página ────────────────────────────────────────────
  const totalPages = (doc.internal as { getNumberOfPages?: () => number }).getNumberOfPages?.() ?? 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFillColor(18, 52, 108);
    doc.rect(0, 287, pageW, 10, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.text("Programa RLT/CLT — Documento confidencial generado automáticamente", pageW / 2, 293, { align: "center" });
    doc.text(`Página ${i} de ${totalPages}`, pageW - margin, 293, { align: "right" });
  }

  const nombre = String(datos["apellidos"] ?? datos["nombres"] ?? "ficha").replace(/\s+/g, "_");
  doc.save(`Ficha_RLT_${nombre}.pdf`);
}
