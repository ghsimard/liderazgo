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
  { section: "Datos personales", campo: "acepta_datos", obligatorio: "Sí", reglas: "Debe ser true (checkbox de consentimiento)" },
  { section: "Datos personales", campo: "nombres", obligatorio: "Sí", reglas: "Mín. 2 caracteres" },
  { section: "Datos personales", campo: "apellidos", obligatorio: "Sí", reglas: "Mín. 2 caracteres" },
  { section: "Datos personales", campo: "genero", obligatorio: "Sí", reglas: "Selección obligatoria (Masculino / Femenino / Otro)" },
  { section: "Datos personales", campo: "numero_cedula", obligatorio: "Sí", reglas: "Texto obligatorio" },
  { section: "Datos personales", campo: "fecha_nacimiento", obligatorio: "Sí", reglas: "Fecha válida; edad entre 18 y 70 años" },
  { section: "Datos personales", campo: "lugar_nacimiento", obligatorio: "No", reglas: "Texto libre, opcional" },
  { section: "Datos personales", campo: "grupos_etnicos", obligatorio: "No", reglas: "Selección múltiple opcional (checkbox)" },
  { section: "Datos personales", campo: "lengua_materna", obligatorio: "Sí", reglas: "Selección obligatoria" },
  { section: "Datos personales", campo: "lengua_otra", obligatorio: "No", reglas: "Texto libre, opcional" },
  { section: "Datos personales", campo: "discapacidad", obligatorio: "Sí", reglas: "Selección obligatoria (Sí / No)" },
  { section: "Datos personales", campo: "discapacidad_detalle", obligatorio: "No", reglas: "Texto libre; requerido si discapacidad = Sí" },
  { section: "Datos personales", campo: "enfermedad_base", obligatorio: "Sí", reglas: "Selección obligatoria (Sí / No)" },
  { section: "Datos personales", campo: "enfermedad_detalle", obligatorio: "No", reglas: "Texto libre; requerido si enfermedad_base = Sí" },

  // ── Contacto ──
  { section: "Contacto", campo: "codigo_pais_celular", obligatorio: "Sí", reglas: "Código de país (por defecto +57)" },
  { section: "Contacto", campo: "celular_personal", obligatorio: "Sí", reglas: "Exactamente 10 dígitos numéricos (se eliminan espacios/guiones)" },
  { section: "Contacto", campo: "correo_personal", obligatorio: "Sí", reglas: "Formato de email válido" },
  { section: "Contacto", campo: "correo_institucional", obligatorio: "No", reglas: "Formato de email válido o vacío" },
  { section: "Contacto", campo: "prefiere_correo", obligatorio: "Sí", reglas: "Selección obligatoria (personal / institucional)" },
  { section: "Contacto", campo: "contacto_emergencia", obligatorio: "No", reglas: "Texto libre, opcional" },
  { section: "Contacto", campo: "codigo_pais_telefono_emergencia", obligatorio: "No", reglas: "Código de país, opcional" },
  { section: "Contacto", campo: "telefono_emergencia", obligatorio: "No", reglas: "10 dígitos numéricos o vacío" },

  // ── Formación ──
  { section: "Formación", campo: "tipo_formacion", obligatorio: "Sí", reglas: "Selección obligatoria" },
  { section: "Formación", campo: "titulo_pregrado", obligatorio: "Sí", reglas: "Texto obligatorio" },
  { section: "Formación", campo: "titulo_especializacion", obligatorio: "No", reglas: "Texto libre, opcional" },
  { section: "Formación", campo: "titulo_maestria", obligatorio: "No", reglas: "Texto libre, opcional" },
  { section: "Formación", campo: "titulo_doctorado", obligatorio: "No", reglas: "Texto libre, opcional" },
  { section: "Formación", campo: "otros_titulos", obligatorio: "No", reglas: "Texto libre, opcional" },

  // ── Información laboral ──
  { section: "Información laboral", campo: "cargo_actual", obligatorio: "Sí", reglas: "Selección obligatoria (Rector(a) / Coordinador(a))" },
  { section: "Información laboral", campo: "estatuto", obligatorio: "No", reglas: "Selección opcional" },
  { section: "Información laboral", campo: "grado_escalafon", obligatorio: "No", reglas: "Selección opcional" },
  { section: "Información laboral", campo: "tipo_vinculacion", obligatorio: "Sí", reglas: "Selección obligatoria" },
  { section: "Información laboral", campo: "fecha_vinculacion_servicio", obligatorio: "No", reglas: "Fecha válida o vacío" },
  { section: "Información laboral", campo: "fecha_nombramiento_cargo", obligatorio: "No", reglas: "Fecha válida o vacío" },
  { section: "Información laboral", campo: "fecha_nombramiento_ie", obligatorio: "No", reglas: "Fecha válida o vacío" },
  { section: "Información laboral", campo: "desplazamiento", obligatorio: "No", reglas: "Texto libre, opcional" },

  // ── Información institucional ──
  { section: "Información institucional", campo: "region", obligatorio: "Sí", reglas: "Selección obligatoria" },
  { section: "Información institucional", campo: "entidad_territorial", obligatorio: "Sí", reglas: "Selección obligatoria (cascada desde región)" },
  { section: "Información institucional", campo: "nombre_ie", obligatorio: "Sí", reglas: "Selección obligatoria (cascada desde municipio)" },
  { section: "Información institucional", campo: "codigo_dane", obligatorio: "No", reglas: "Exactamente 12 dígitos numéricos (/^\\d{12}$/)" },
  { section: "Información institucional", campo: "zona_sede", obligatorio: "No", reglas: "Selección opcional (Urbana / Rural)" },
  { section: "Información institucional", campo: "comuna_barrio", obligatorio: "No", reglas: "Texto libre, opcional" },
  { section: "Información institucional", campo: "direccion_sede_principal", obligatorio: "No", reglas: "Texto libre, opcional" },
  { section: "Información institucional", campo: "codigo_pais_telefono_ie", obligatorio: "No", reglas: "Código de país, opcional" },
  { section: "Información institucional", campo: "telefono_ie", obligatorio: "No", reglas: "10 dígitos numéricos o vacío" },
  { section: "Información institucional", campo: "sitio_web", obligatorio: "No", reglas: "Texto libre, opcional" },
  { section: "Información institucional", campo: "modelo_pedagogico", obligatorio: "No", reglas: "Texto libre, opcional" },
  { section: "Información institucional", campo: "proyectos_transversales", obligatorio: "No", reglas: "Texto libre, opcional" },
  { section: "Información institucional", campo: "jornadas", obligatorio: "Sí", reglas: "Al menos 1 opción seleccionada (checkbox)" },
  { section: "Información institucional", campo: "niveles_educativos", obligatorio: "Sí", reglas: "Al menos 1 opción seleccionada (checkbox)" },
  { section: "Información institucional", campo: "tipo_bachillerato", obligatorio: "Sí", reglas: "Al menos 1 opción seleccionada (checkbox)" },
  { section: "Información institucional", campo: "sedes_urbana", obligatorio: "No", reglas: "Número entero ≥ 0 o vacío" },
  { section: "Información institucional", campo: "sedes_rural", obligatorio: "No", reglas: "Número entero ≥ 0 o vacío" },

  // ── Estadísticas de personal ──
  { section: "Estadísticas de personal", campo: "num_docentes", obligatorio: "Sí", reglas: "Número entero ≥ 0, obligatorio" },
  { section: "Estadísticas de personal", campo: "num_coordinadores", obligatorio: "Sí", reglas: "Número entero ≥ 0, obligatorio" },
  { section: "Estadísticas de personal", campo: "num_orientadores", obligatorio: "Sí", reglas: "Número entero ≥ 0, obligatorio" },
  { section: "Estadísticas de personal", campo: "num_administrativos", obligatorio: "Sí", reglas: "Número entero ≥ 0, obligatorio" },

  // ── Estadísticas estudiantiles ──
  { section: "Estadísticas estudiantiles", campo: "estudiantes_preescolar", obligatorio: "No", reglas: "Número entero ≥ 0 o vacío" },
  { section: "Estadísticas estudiantiles", campo: "estudiantes_primaria", obligatorio: "No", reglas: "Número entero ≥ 0 o vacío" },
  { section: "Estadísticas estudiantiles", campo: "estudiantes_basica_secundaria", obligatorio: "No", reglas: "Número entero ≥ 0 o vacío" },
  { section: "Estadísticas estudiantiles", campo: "estudiantes_media", obligatorio: "No", reglas: "Número entero ≥ 0 o vacío" },
  { section: "Estadísticas estudiantiles", campo: "estudiantes_ciclo_complementario", obligatorio: "No", reglas: "Número entero ≥ 0 o vacío" },
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
