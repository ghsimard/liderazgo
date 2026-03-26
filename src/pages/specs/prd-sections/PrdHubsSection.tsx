import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import MermaidDiagram from "@/components/MermaidDiagram";

interface HubFeature { feature: string; description: string; }
interface HubSpec { id: string; title: string; type: string; routes: string[]; role: string; features: HubFeature[]; mindmap: string; }

const hubs: HubSpec[] = [
  { id: "inicio", title: "Pantalla de Inicio", type: "Página pública", routes: ["/"], role: "Cualquier visitante", features: [{ feature: "Identificación por cédula", description: "El usuario ingresa su número de cédula para acceder a su ficha o panel." }, { feature: "Acceso directo Mi Panel", description: "Si la cédula ya tiene ficha, redirige al panel del directivo." }, { feature: "Selector de rol", description: "Permite elegir entre Directivo, Evaluador u Operador." }, { feature: "Enlace a Encuesta 360", description: "Botón rápido para acceder al hub de encuestas 360°." }], mindmap: `mindmap\n  root((Inicio))\n    Identificacion\n      Ingresar cedula\n    Roles\n      Directivo\n      Evaluador\n      Operador\n    Acceso rapido\n      Mi Panel\n      Ficha RLT\n      Encuesta 360` },
  { id: "ficha", title: "Ficha RLT", type: "Página pública", routes: ["/ficha"], role: "Directivo identificado", features: [{ feature: "Datos personales", description: "Nombre, cédula, fecha de nacimiento, género, contacto." }, { feature: "Datos institucionales", description: "Institución educativa, código DANE, región, entidad territorial." }, { feature: "Formación académica", description: "Pregrado, especialización, maestría, doctorado." }, { feature: "Datos laborales", description: "Cargo, tipo de vinculación, estatuto, escalafón." }, { feature: "Información de la IE", description: "Sedes, jornadas, niveles educativos, estudiantes por nivel." }], mindmap: `mindmap\n  root((Ficha RLT))\n    Datos Personales\n      Nombre y cedula\n      Fecha nacimiento\n    Datos IE\n      Institucion\n      Codigo DANE\n      Region\n    Formacion\n      Pregrado\n      Maestria\n    Laboral\n      Cargo actual\n      Vinculacion` },
  { id: "mi-panel-directivo", title: "Mi Panel (Directivo)", type: "Página pública", routes: ["/mi-panel"], role: "Directivo con ficha registrada", features: [{ feature: "Vista de ficha", description: "Consulta y edición de la ficha RLT del directivo." }, { feature: "Rúbricas de evaluación", description: "Acceso a las rúbricas asignadas por módulo." }, { feature: "Encuestas 360°", description: "Acceso a autoevaluación y resultados." }, { feature: "Satisfacción", description: "Acceso a encuestas de satisfacción." }], mindmap: `mindmap\n  root((Mi Panel Directivo))\n    Ficha RLT\n      Consultar datos\n      Editar ficha\n    Rubricas\n      Por modulo\n    Encuestas 360\n      Autoevaluacion\n    Satisfaccion\n      Asistencia` },
  { id: "mi-panel-evaluador", title: "Mi Panel (Evaluador)", type: "Página pública", routes: ["/mi-panel"], role: "Evaluador registrado", features: [{ feature: "Directivos asignados", description: "Lista de directivos asignados al evaluador." }, { feature: "Rúbricas", description: "Evaluación por rúbrica para cada directivo asignado." }, { feature: "Encuestas 360°", description: "Acceso a formularios de encuesta." }, { feature: "Informe de módulo", description: "Acceso al informe de módulo." }], mindmap: `mindmap\n  root((Mi Panel Evaluador))\n    Directivos asignados\n      Lista\n      Estado de avance\n    Rubricas\n      Evaluar por modulo\n    Encuestas 360\n      Formularios visibles\n    Informe de modulo\n      Redactar` },
  { id: "encuesta-360", title: "Hub Encuesta 360°", type: "Página pública", routes: ["/encuesta-360"], role: "Cualquier visitante", features: [{ feature: "Selector de formulario", description: "6 tipos: Autoevaluación, Docente, Estudiante, Acudiente, Administrativo, Directivo." }, { feature: "Fases", description: "Soporte para fase inicial y final." }, { feature: "Invitaciones por email", description: "Acceso vía token único." }], mindmap: `mindmap\n  root((Encuesta 360))\n    Formularios\n      Autoevaluacion\n      Docente\n      Estudiante\n      Acudiente\n      Administrativo\n      Directivo\n    Fases\n      Inicial\n      Final` },
  { id: "operador", title: "Panel Operador", type: "Página pública", routes: ["/operador"], role: "Operador con permisos RBAC", features: [{ feature: "Secciones por permisos", description: "Solo ve las secciones asignadas por el admin." }, { feature: "Filtro por región/entidad/IE", description: "Datos limitados al scope del operador." }, { feature: "Exportación", description: "Descarga de datos en Excel/CSV." }], mindmap: `mindmap\n  root((Panel Operador))\n    Permisos RBAC\n      Secciones asignadas\n      Scope region\n    Fichas\n      Consultar\n      Exportar` },
  { id: "admin-enlaces", title: "Admin — Enlaces", type: "Hub admin", routes: ["/admin"], role: "Admin autenticado", features: [{ feature: "360° Entrada/Salida", description: "Enlaces a los formularios en línea y PDFs." }, { feature: "Rúbrica", description: "Enlace al formulario de Rúbrica." }, { feature: "RLT / Ambiente / Satisfacción", description: "Enlaces a todos los formularios." }], mindmap: `mindmap\n  root((Admin Enlaces))\n    360 Entrada\n      6 formularios\n      PDF\n    360 Salida\n      6 formularios finales\n    Rubrica\n      Formulario en linea\n    RLT\n      Ficha\n    Ambiente Escolar\n      3 formularios\n    Satisfaccion\n      Intensivo / Interludio / Asistencia` },
  { id: "admin-fichas", title: "Admin — Fichas", type: "Hub admin", routes: ["/admin", "/admin/ficha/:id"], role: "Admin con permiso fichas", features: [{ feature: "Lista de fichas", description: "Tabla con fichas RLT, filtrable por región/entidad." }, { feature: "Edición de ficha", description: "Editar cualquier campo." }, { feature: "Exportación Excel", description: "Descarga masiva." }, { feature: "Descarga PDF", description: "PDF individual." }, { feature: "Caracterización", description: "Estadísticas de los directivos: género, edades, formación, roles, vinculación, personal IE, estudiantes por nivel." }], mindmap: `mindmap\n  root((Admin Fichas))\n    Lista\n      Filtros region\n      Busqueda\n    Acciones\n      Editar ficha\n      Descargar PDF\n      Exportar Excel\n    Caracterizacion\n      Genero y edades\n      Formacion academica\n      Personal y estudiantes` },
  { id: "admin-rubricas", title: "Admin — Rúbricas", type: "Hub admin", routes: ["/admin"], role: "Admin con permiso rúbricas", features: [{ feature: "Evaluadores", description: "CRUD de evaluadores." }, { feature: "Asignaciones", description: "Asignar directivos a evaluadores." }, { feature: "Evaluaciones individuales", description: "Detalle por directivo." }, { feature: "Reporte por módulo y regional", description: "Informes consolidados." }], mindmap: `mindmap\n  root((Admin Rubricas))\n    Evaluadores\n      CRUD\n    Asignaciones\n      Directivo a evaluador\n    Evaluaciones\n      Individual\n    Reportes\n      Por modulo PDF\n      Regional PDF` },
  { id: "admin-360", title: "Admin — Encuesta 360°", type: "Hub admin", routes: ["/admin"], role: "Admin con permiso encuesta360", features: [{ feature: "Monitor de encuestas", description: "Tabla con todas las respuestas." }, { feature: "Gestión de competencias", description: "CRUD de dominios, competencias e ítems." }, { feature: "Pesos por competencia", description: "Configuración por rol observador." }, { feature: "Reporte 360°", description: "Reportes individuales y consolidados." }, { feature: "Invitaciones", description: "Envío masivo por email." }], mindmap: `mindmap\n  root((Admin 360))\n    Monitor\n      Respuestas\n      Filtros\n    Competencias\n      Dominios\n      Items\n    Pesos\n      Por rol observador\n    Reportes\n      Individual\n      PDF` },
  { id: "admin-informe", title: "Admin — Informe de Módulo", type: "Hub admin", routes: ["/admin"], role: "Admin con permiso informe", features: [{ feature: "Formulario de informe", description: "Campos estructurados: contexto, sesiones, acompañamiento." }, { feature: "Equipo de trabajo", description: "Lista de miembros." }, { feature: "Reporte consolidado", description: "Vista consolidada y PDF." }], mindmap: `mindmap\n  root((Admin Informe))\n    Formulario\n      Contexto\n      Sesiones\n      Acompanamiento\n    Equipo\n      Miembros\n    Reporte\n      Consolidado\n      PDF` },
  { id: "admin-ambiente", title: "Admin — Ambiente Escolar", type: "Hub admin", routes: ["/admin"], role: "Admin con permiso ambiente", features: [{ feature: "Monitor de encuestas", description: "Tabla con respuestas por tipo." }, { feature: "Estadísticas", description: "Promedios por categoría." }, { feature: "Reporte PDF", description: "Reporte por IE." }], mindmap: `mindmap\n  root((Admin Ambiente))\n    Encuestas\n      Estudiantes\n      Docentes\n      Acudientes\n    Monitor\n      Tabla respuestas\n    Estadisticas\n      Promedios\n    Reportes\n      PDF por IE` },
  { id: "admin-satisfaccion", title: "Admin — Satisfacciones", type: "Hub admin", routes: ["/admin"], role: "Admin con permiso satisfacción", features: [{ feature: "Configuración de formularios", description: "Activar/desactivar por región, módulo y tipo." }, { feature: "Monitor de respuestas", description: "Tabla con filtros." }, { feature: "Estadísticas", description: "Promedios y distribución." }, { feature: "Reporte PDF", description: "Generación de reporte." }], mindmap: `mindmap\n  root((Admin Satisfaccion))\n    Configuracion\n      Activar formularios\n    Monitor\n      Respuestas\n    Estadisticas\n      Promedios\n    Reportes\n      PDF` },
  { id: "admin-mel", title: "Admin — MEL", type: "Hub admin", routes: ["/admin"], role: "Admin con permiso MEL", features: [{ feature: "Configuración KPI", description: "CRUD de indicadores MEL." }, { feature: "Grupos de KPIs", description: "Agrupación por región." }, { feature: "Reporte global", description: "Reporte MEL consolidado." }], mindmap: `mindmap\n  root((Admin MEL))\n    KPIs\n      Configuracion\n      Formulas\n    Grupos\n      Por region\n    Reportes\n      Global PDF` },
  { id: "admin-sistema", title: "Admin — Sistema", type: "Hub admin", routes: ["/admin"], role: "Admin (superadmin para algunas secciones)", features: [{ feature: "Registro de actividad", description: "Log de acciones." }, { feature: "Mensajes de contacto", description: "Vista de mensajes." }, { feature: "Apreciaciones", description: "Sondeo post-envío y estadísticas." }, { feature: "Papelera", description: "Registros eliminados con restauración." }, { feature: "Purgar datos", description: "Eliminación masiva (solo superadmin)." }, { feature: "Changelog", description: "Historial de cambios." }], mindmap: `mindmap\n  root((Admin Sistema))\n    Actividad\n      Log de acciones\n    Mensajes\n      Contacto\n    Papelera\n      Restaurar\n    Purgar\n      Por tipo\n    Changelog\n      Versiones` },
  { id: "contacto", title: "Contacto / FAQ / Sugerencias", type: "Páginas públicas", routes: ["/contacto", "/faq", "/sugerencias"], role: "Cualquier visitante", features: [{ feature: "Formulario de contacto", description: "Envío de mensajes." }, { feature: "Preguntas frecuentes", description: "Accordion con preguntas." }, { feature: "Sugerencias", description: "Formulario para sugerencias." }], mindmap: `mindmap\n  root((Contacto y FAQ))\n    Contacto\n      Formulario\n      Email\n    FAQ\n      Por categoria\n    Sugerencias\n      Formulario` },
];

export function PrdHubsSection() {
  return (
    <div className="my-8">
      <Accordion type="multiple" className="space-y-3">
        {hubs.map((hub, idx) => (
          <AccordionItem key={hub.id} value={hub.id} className="border border-border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex items-center gap-3 text-left">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                  {idx + 1}
                </span>
                <div>
                  <span className="font-semibold text-foreground">{hub.title}</span>
                  <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{hub.type}</span>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-6 space-y-6">
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Ruta(s)</p>
                  <div className="flex flex-wrap gap-1">
                    {hub.routes.map(r => <code key={r} className="text-xs bg-muted px-2 py-0.5 rounded">{r}</code>)}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Rol requerido</p>
                  <p className="text-sm text-foreground">{hub.role}</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Funcionalidades</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Funcionalidad</TableHead>
                      <TableHead className="text-xs">Descripción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {hub.features.map(f => (
                      <TableRow key={f.feature}>
                        <TableCell className="font-medium text-xs">{f.feature}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{f.description}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Mindmap</p>
                <MermaidDiagram chart={hub.mindmap} id={`prd-hub-${hub.id}`} />
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
