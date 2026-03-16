import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface FieldRow {
  section: string;
  campo: string;
  obligatorio: string;
  reglas: string;
}

const fields: FieldRow[] = [
  // ── Datos personales ──
  { section: "Datos personales", campo: "Consentimiento de datos", obligatorio: "Sí", reglas: "Debe ser true (checkbox de consentimiento)" },
  { section: "Datos personales", campo: "Nombre(s)", obligatorio: "Sí", reglas: "Mín. 2 caracteres" },
  { section: "Datos personales", campo: "Apellido(s)", obligatorio: "Sí", reglas: "Mín. 2 caracteres" },
  { section: "Datos personales", campo: "Género", obligatorio: "Sí", reglas: "Selección obligatoria (Masculino / Femenino / Otro)" },
  { section: "Datos personales", campo: "Número de cédula", obligatorio: "Sí", reglas: "Texto obligatorio" },
  { section: "Datos personales", campo: "Fecha de nacimiento", obligatorio: "Sí", reglas: "Fecha válida; edad entre 18 y 70 años" },
  { section: "Datos personales", campo: "Lugar de nacimiento", obligatorio: "No", reglas: "Texto libre, opcional" },
  { section: "Datos personales", campo: "Lengua materna", obligatorio: "Sí", reglas: "Selección obligatoria (Español / Otra)" },
  { section: "Datos personales", campo: "Otra lengua materna", obligatorio: "No", reglas: "Texto libre; requerido si lengua materna = Otra" },

  // ── Contacto ──
  { section: "Contacto", campo: "Código de país (celular)", obligatorio: "Sí", reglas: "Código de país (por defecto +57)" },
  { section: "Contacto", campo: "Número de celular personal", obligatorio: "Sí", reglas: "Exactamente 10 dígitos numéricos (se eliminan espacios/guiones)" },
  { section: "Contacto", campo: "Correo electrónico personal", obligatorio: "Sí", reglas: "Formato de email válido" },
  { section: "Contacto", campo: "Correo electrónico institucional", obligatorio: "No", reglas: "Formato de email válido o vacío" },
  { section: "Contacto", campo: "Prefiere recibir comunicaciones en el correo", obligatorio: "Sí", reglas: "Selección obligatoria (personal / institucional)" },

  // ── Salud y Contacto de Emergencia ──
  { section: "Salud y Contacto de Emergencia", campo: "¿Tiene alguna enfermedad de base?", obligatorio: "Sí", reglas: "Selección obligatoria (Sí / No)" },
  { section: "Salud y Contacto de Emergencia", campo: "Detalle de enfermedad", obligatorio: "No", reglas: "Texto libre; requerido si enfermedad_base = Sí" },
  { section: "Salud y Contacto de Emergencia", campo: "Contacto de emergencia", obligatorio: "No", reglas: "Texto libre, opcional" },
  { section: "Salud y Contacto de Emergencia", campo: "Código de país (emergencia)", obligatorio: "No", reglas: "Código de país, opcional" },
  { section: "Salud y Contacto de Emergencia", campo: "Teléfono de emergencia", obligatorio: "No", reglas: "10 dígitos numéricos o vacío" },
  { section: "Salud y Contacto de Emergencia", campo: "¿Tiene alguna discapacidad?", obligatorio: "Sí", reglas: "Selección obligatoria (Sí / No)" },
  { section: "Salud y Contacto de Emergencia", campo: "Detalle de discapacidad", obligatorio: "No", reglas: "Texto libre; requerido si discapacidad = Sí" },

  // ── Formación ──
  { section: "Formación Académica", campo: "Tipo de formación", obligatorio: "Sí", reglas: "Selección obligatoria (Profesional / Licenciado/a)" },
  { section: "Formación Académica", campo: "Título de pregrado", obligatorio: "Sí", reglas: "Texto obligatorio" },
  { section: "Formación Académica", campo: "Título de especialización", obligatorio: "No", reglas: "Texto libre, opcional" },
  { section: "Formación Académica", campo: "Título de maestría", obligatorio: "No", reglas: "Texto libre, opcional" },
  { section: "Formación Académica", campo: "Título de doctorado", obligatorio: "No", reglas: "Texto libre, opcional" },
  { section: "Formación Académica", campo: "Otros títulos ¿cuáles?", obligatorio: "No", reglas: "Texto libre, opcional" },

  // ── Información institucional ──
  { section: "Información Institucional", campo: "Región", obligatorio: "Sí", reglas: "Selección obligatoria (valores desde base de datos)" },
  { section: "Información Institucional", campo: "Entidad Territorial", obligatorio: "Sí", reglas: "Selección obligatoria (cascada desde región, valores desde base de datos)" },
  { section: "Información Institucional", campo: "Municipio", obligatorio: "Sí", reglas: "Selección obligatoria (cascada desde entidad, valores desde base de datos)" },
  { section: "Información Institucional", campo: "Comuna, barrio, corregimiento o localidad", obligatorio: "No", reglas: "Texto libre, opcional" },
  { section: "Información Institucional", campo: "Nombre de la IE", obligatorio: "Sí", reglas: "Selección obligatoria (cascada desde municipio, valores desde base de datos)" },
  { section: "Información Institucional", campo: "Código DANE (12 dígitos)", obligatorio: "Sí", reglas: "Obligatorio, exactamente 12 dígitos numéricos (/^\\d{12}$/)" },
  { section: "Información Institucional", campo: "Cargo actual", obligatorio: "Sí", reglas: "Selección obligatoria (Rector(a) / Coordinador(a))" },
  { section: "Información Institucional", campo: "Tipo de vinculación actual", obligatorio: "Sí", reglas: "Selección obligatoria (En propiedad / En encargo)" },
  { section: "Información Institucional", campo: "Fecha de vinculación al servicio educativo estatal", obligatorio: "No", reglas: "Fecha válida o vacío" },
  { section: "Información Institucional", campo: "Fecha de nombramiento estatal en el cargo actual", obligatorio: "No", reglas: "Fecha válida o vacío" },
  { section: "Información Institucional", campo: "Fecha de nombramiento del cargo actual en la IE", obligatorio: "No", reglas: "Fecha válida o vacío" },
  { section: "Información Institucional", campo: "Estatuto al que pertenece", obligatorio: "No", reglas: "Selección opcional (2277 / 1278)" },
  { section: "Información Institucional", campo: "Grado en el escalafón", obligatorio: "No", reglas: "Texto libre, opcional" },

  // ── Datos de la IE ──
  { section: "Datos de la IE", campo: "Dirección de la sede principal", obligatorio: "No", reglas: "Texto libre, opcional" },
  { section: "Datos de la IE", campo: "Código de país (teléfono IE)", obligatorio: "No", reglas: "Código de país, opcional" },
  { section: "Datos de la IE", campo: "Teléfono de la IE", obligatorio: "No", reglas: "10 dígitos numéricos o vacío" },
  { section: "Datos de la IE", campo: "Sitio web de la IE", obligatorio: "No", reglas: "Texto libre, opcional" },
  { section: "Datos de la IE", campo: "Zona de la sede principal de la IE", obligatorio: "Sí", reglas: "Selección obligatoria (Urbana / Rural)" },
  { section: "Datos de la IE", campo: "Número de sedes en zona rural", obligatorio: "Sí", reglas: "Número entero >= 0, obligatorio" },
  { section: "Datos de la IE", campo: "Número de sedes en zona urbana", obligatorio: "Sí", reglas: "Número entero >= 0, obligatorio" },
  { section: "Datos de la IE", campo: "Jornadas de la IE", obligatorio: "Sí", reglas: "Al menos 1 opción seleccionada (checkbox)" },
  { section: "Datos de la IE", campo: "Grupos étnicos en la IE", obligatorio: "No", reglas: "Selección múltiple opcional (checkbox)" },
  { section: "Datos de la IE", campo: "Proyectos transversales de la IE", obligatorio: "No", reglas: "Texto libre, opcional" },
  { section: "Datos de la IE", campo: "¿Hay estudiantes o familias en condición de desplazamiento?", obligatorio: "No", reglas: "Selección opcional (Sí / No)" },
  { section: "Datos de la IE", campo: "Tipo de bachillerato que ofrece la IE", obligatorio: "Sí", reglas: "Al menos 1 opción seleccionada (checkbox)" },
  { section: "Datos de la IE", campo: "Modelo o enfoque pedagógico", obligatorio: "No", reglas: "Texto libre, opcional" },
  { section: "Datos de la IE", campo: "Niveles educativos", obligatorio: "Sí", reglas: "Al menos 1 opción seleccionada (auto-calculado)" },

  // ── Personal de la IE ──
  { section: "Personal de la IE", campo: "Número de docentes", obligatorio: "Sí", reglas: "Número entero >= 0, obligatorio" },
  { section: "Personal de la IE", campo: "Número de coordinadores/as", obligatorio: "Sí", reglas: "Número entero >= 0, obligatorio" },
  { section: "Personal de la IE", campo: "Número de administrativos", obligatorio: "Sí", reglas: "Número entero >= 0, obligatorio" },
  { section: "Personal de la IE", campo: "Número de orientadores/as", obligatorio: "Sí", reglas: "Número entero >= 0, obligatorio" },

  // ── Estudiantes por nivel educativo ──
  { section: "Estudiantes por nivel educativo", campo: "Preescolar (Prejardín, Jardín, Transición)", obligatorio: "No", reglas: "Número entero >= 0 o vacío" },
  { section: "Estudiantes por nivel educativo", campo: "Básica primaria", obligatorio: "No", reglas: "Número entero >= 0 o vacío" },
  { section: "Estudiantes por nivel educativo", campo: "Básica secundaria", obligatorio: "No", reglas: "Número entero >= 0 o vacío" },
  { section: "Estudiantes por nivel educativo", campo: "Media", obligatorio: "No", reglas: "Número entero >= 0 o vacío" },
  { section: "Estudiantes por nivel educativo", campo: "Ciclo complementario", obligatorio: "No", reglas: "Número entero >= 0 o vacío" },
];

export function generateFichaFieldsPdf() {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  // Title
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Ficha de Información – Campos y reglas de validación", 14, 20);

  // Date
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Generado: ${new Date().toLocaleDateString("es-CO")}`, 14, 27);

  // Summary
  const mandatory = fields.filter((f) => f.obligatorio === "Sí").length;
  doc.text(`Total campos: ${fields.length}  |  Obligatorios: ${mandatory}  |  Opcionales: ${fields.length - mandatory}`, 14, 32);

  // Table
  let currentSection = "";
  const body: (string | { content: string; colSpan: number; styles: Record<string, unknown> })[][] = [];

  fields.forEach((f, i) => {
    if (f.section !== currentSection) {
      currentSection = f.section;
      body.push([
        {
          content: currentSection.toUpperCase(),
          colSpan: 4,
          styles: { fillColor: [41, 128, 185] as any, textColor: 255, fontStyle: "bold" as any, halign: "left" as any },
        },
      ]);
    }
    body.push([String(i + 1), f.campo, f.obligatorio, f.reglas]);
  });

  autoTable(doc, {
    startY: 36,
    head: [["#", "Campo", "Obligatorio", "Reglas de validación"]],
    body,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [44, 62, 80] as any, textColor: 255 },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 45 },
      2: { cellWidth: 20, halign: "center" },
      3: { cellWidth: "auto" },
    },
    theme: "grid",
  });

  doc.save("ficha-campos-validacion.pdf");
}
