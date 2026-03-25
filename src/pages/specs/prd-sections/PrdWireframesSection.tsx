interface WireframeSection {
  title: string;
  screens: { label: string; src: string }[];
}

const sections: WireframeSection[] = [
  { title: "1. Inicio / Onboarding", screens: [
    { label: "Mi Panel — Rector", src: "/images/specs/inicio-panel-rector.png" },
    { label: "Mi Panel — Evaluador", src: "/images/specs/inicio-panel-evaluador.png" },
    { label: "Acceso Administrador", src: "/images/specs/inicio-acceso-admin.png" },
    { label: "Panel de Administración", src: "/images/specs/inicio-panel-admin.png" },
    { label: "Selector de Rol (Multirol)", src: "/images/specs/inicio-multirol.png" },
    { label: "Panel de Operador", src: "/images/specs/inicio-panel-operador.png" },
    { label: "Nuevo Rector — Bienvenida", src: "/images/specs/inicio-nuevo-bienvenida.png" },
    { label: "Selección de Región", src: "/images/specs/inicio-region-seleccion.png" },
    { label: "Autorización de Datos", src: "/images/specs/inicio-autorizacion-datos.png" },
    { label: "Verificación de Nombres", src: "/images/specs/inicio-verificacion-nombres.png" },
    { label: "Nueva Ficha de Información", src: "/images/specs/inicio-nueva-ficha.png" },
  ]},
  { title: "2. Mi Panel — Directivo", screens: [{ label: "Mi Panel — Vista Rector", src: "/images/mi-panel-directivo-preview.png" }]},
  { title: "3. Mi Panel — Evaluador", screens: [
    { label: "Vista general", src: "/images/mi-panel-evaluador-preview.png" },
    { label: "Rúbrica de Evaluación", src: "/images/evaluador-rubrica-preview.png" },
    { label: "Encuestas 360°", src: "/images/evaluador-encuestas360-preview.png" },
  ]},
  { title: "4. Admin — Enlaces", screens: [{ label: "Formularios y Rúbrica", src: "/images/specs/admin-enlaces-preview.png" }]},
  { title: "5. Admin — Fichas", screens: [
    { label: "Lista de Fichas", src: "/images/specs/admin-fichas-lista.png" },
    { label: "Enlace y PDF", src: "/images/specs/admin-fichas-enlace-pdf.png" },
    { label: "Configuración", src: "/images/specs/admin-fichas-configuracion.png" },
  ]},
  { title: "6. Admin — Rúbricas", screens: [
    { label: "Resultados", src: "/images/specs/admin-rubricas-resultados.png" },
    { label: "Informes por módulo", src: "/images/specs/admin-rubricas-informes-modulo.png" },
    { label: "Informe regional", src: "/images/specs/admin-rubricas-informe-regional.png" },
    { label: "Configuración — Evaluadores", src: "/images/specs/admin-rubricas-configuracion.png" },
    { label: "Nuevo evaluador", src: "/images/specs/admin-rubricas-nuevo-evaluador.png" },
    { label: "Asignar directivos", src: "/images/specs/admin-rubricas-asignar-directivos.png" },
  ]},
  { title: "7. Admin — Encuesta 360°", screens: [
    { label: "Formularios", src: "/images/specs/admin-360-formularios.png" },
    { label: "Entrada — Monitor", src: "/images/specs/admin-360-entrada.png" },
    { label: "Detalle de respuesta", src: "/images/specs/admin-360-detalle.png" },
    { label: "Invitaciones", src: "/images/specs/admin-360-invitaciones.png" },
    { label: "Informes Entrada", src: "/images/specs/admin-360-informes.png" },
    { label: "Config — Dominios", src: "/images/specs/admin-360-config-dominios.png" },
    { label: "Config — Competencias", src: "/images/specs/admin-360-config-competencias.png" },
    { label: "Config — Ítems", src: "/images/specs/admin-360-config-items.png" },
    { label: "Config — Ponderaciones", src: "/images/specs/admin-360-config-ponderaciones.png" },
    { label: "Asistente de creación", src: "/images/specs/admin-360-config-wizard.png" },
  ]},
  { title: "8. Admin — Informe de Módulo", screens: [
    { label: "Asistencia", src: "/images/specs/admin-informe-asistencia.png" },
    { label: "Informe de Módulo", src: "/images/specs/admin-informe-modulo.png" },
    { label: "Evaluación Individual", src: "/images/specs/admin-informe-evaluacion.png" },
    { label: "Reportes PDF", src: "/images/specs/admin-informe-reportes.png" },
  ]},
  { title: "9. Admin — Ambiente Escolar", screens: [
    { label: "Monitoreo", src: "/images/specs/admin-ambiente-monitoreo.png" },
    { label: "Estadísticas", src: "/images/specs/admin-ambiente-estadisticas.png" },
    { label: "Enlaces", src: "/images/specs/admin-ambiente-enlaces.png" },
  ]},
  { title: "10. Admin — Satisfacciones", screens: [
    { label: "Respuestas", src: "/images/specs/admin-satisf-respuestas.png" },
    { label: "Detalle de respuesta", src: "/images/specs/admin-satisf-detalle.png" },
    { label: "Comentarios", src: "/images/specs/admin-satisf-comentarios.png" },
    { label: "Informe PDF", src: "/images/specs/admin-satisf-informe.png" },
    { label: "Form — Asistencia", src: "/images/specs/admin-satisf-form-asistencia.png" },
    { label: "Form — Interludio", src: "/images/specs/admin-satisf-form-interludio.png" },
    { label: "Form — Intensivo", src: "/images/specs/admin-satisf-form-intensivo.png" },
    { label: "Configuración", src: "/images/specs/admin-satisf-config.png" },
  ]},
  { title: "11. Admin — MEL", screens: [
    { label: "MEL 360°", src: "/images/specs/admin-mel-360.png" },
    { label: "MEL Rúbricas", src: "/images/specs/admin-mel-rubricas.png" },
    { label: "Configuración", src: "/images/specs/admin-mel-config.png" },
  ]},
  { title: "12. Admin — Sistema", screens: [
    { label: "Cuentas", src: "/images/specs/admin-sistema-cuentas.png" },
    { label: "Roles y Permisos — Admin", src: "/images/specs/admin-sistema-roles-admin.png" },
    { label: "Roles y Permisos — Monitoreo", src: "/images/specs/admin-sistema-roles-monitoreo.png" },
    { label: "Registro de Actividad", src: "/images/specs/admin-sistema-actividad.png" },
    { label: "Papelera", src: "/images/specs/admin-sistema-papelera.png" },
    { label: "Apreciaciones", src: "/images/specs/admin-sistema-apreciaciones.png" },
    { label: "Mensajes", src: "/images/specs/admin-sistema-mensajes.png" },
  ]},
];

export function PrdWireframesSection() {
  return (
    <div className="my-8 space-y-10">
      <p className="text-sm text-muted-foreground">
        {sections.reduce((sum, s) => sum + s.screens.length, 0)} écrans au total. Le filtre « croquis » distingue la documentation de l'interface réelle.
      </p>
      {sections.map((section) => (
        <div key={section.title}>
          <h4 className="text-base font-semibold text-foreground mb-4 border-b border-border pb-2">{section.title}</h4>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {section.screens.map((screen) => (
              <div key={screen.src} className="border border-border rounded-lg overflow-hidden bg-card">
                <p className="text-xs font-medium text-muted-foreground px-3 py-2 bg-muted/50">{screen.label}</p>
                <img src={screen.src} alt={screen.label} className="w-full" loading="lazy" style={{ filter: "grayscale(1) contrast(0.85) sepia(0.08)" }} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
