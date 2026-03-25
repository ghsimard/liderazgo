import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, FileDown } from "lucide-react";
import { generarPDFFichaEnBlanco } from "@/utils/blankFichaPdfGenerator";
import { useAppImages } from "@/hooks/useAppImages";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import MermaidDiagram from "@/components/MermaidDiagram";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/components/ui/carousel";

/* ------------------------------------------------------------------ */
/*  Data for each hub                                                  */
/* ------------------------------------------------------------------ */

interface HubFeature {
  feature: string;
  description: string;
}

interface HubSpec {
  id: string;
  title: string;
  type: string;
  routes: string[];
  role: string;
  features: HubFeature[];
  mindmap: string;
  previewPath: string;
}

const hubs: HubSpec[] = [
  /* 1 — Pantalla de Inicio */
  {
    id: "inicio",
    title: "Pantalla de Inicio",
    type: "Página pública",
    routes: ["/"],
    role: "Cualquier visitante",
    features: [
      { feature: "Identificación por cédula", description: "El usuario ingresa su número de cédula para acceder a su ficha o panel." },
      { feature: "Acceso directo Mi Panel", description: "Si la cédula ya tiene ficha, redirige al panel del directivo." },
      { feature: "Acceso directo Ficha RLT", description: "Si la cédula no tiene ficha, redirige al formulario de inscripción." },
      { feature: "Selector de rol", description: "Permite elegir entre Directivo, Evaluador u Operador." },
      { feature: "Enlace a Encuesta 360", description: "Botón rápido para acceder al hub de encuestas 360°." },
      { feature: "Información institucional", description: "Logos, enlaces legales y FAQ." },
    ],
    mindmap: `mindmap
  root((Inicio))
    Identificacion
      Ingresar cedula
      Validar existencia ficha
    Roles
      Directivo
      Evaluador
      Operador
    Acceso rapido
      Mi Panel
      Ficha RLT
      Encuesta 360
    Informacion
      FAQ
      Contacto
      Derechos`,
    previewPath: "/",
  },
  /* 2 — Ficha RLT */
  {
    id: "ficha",
    title: "Ficha RLT",
    type: "Página pública",
    routes: ["/ficha"],
    role: "Directivo identificado",
    features: [
      { feature: "Datos personales", description: "Nombre, cédula, fecha de nacimiento, género, contacto." },
      { feature: "Datos institucionales", description: "Institución educativa, código DANE, región, entidad territorial." },
      { feature: "Formación académica", description: "Pregrado, especialización, maestría, doctorado." },
      { feature: "Datos laborales", description: "Cargo, tipo de vinculación, estatuto, escalafón." },
      { feature: "Información de la IE", description: "Sedes, jornadas, niveles educativos, estudiantes por nivel." },
      { feature: "Validación y envío", description: "Validación de campos obligatorios, aceptación de datos, envío a la base de datos." },
      { feature: "Descarga PDF en blanco", description: "Generación de un PDF vacío para diligenciar a mano." },
    ],
    mindmap: `mindmap
  root((Ficha RLT))
    Datos Personales
      Nombre y cedula
      Fecha nacimiento
      Genero y contacto
    Datos IE
      Institucion
      Codigo DANE
      Region
      Sedes y jornadas
    Formacion
      Pregrado
      Especializacion
      Maestria
      Doctorado
    Laboral
      Cargo actual
      Vinculacion
      Estatuto
      Escalafon
    Acciones
      Guardar
      Descargar PDF`,
    previewPath: "/ficha",
  },
  /* 3 — Mi Panel (Directivo) */
  {
    id: "mi-panel-directivo",
    title: "Mi Panel (Directivo)",
    type: "Página pública",
    routes: ["/mi-panel"],
    role: "Directivo con ficha registrada",
    features: [
      { feature: "Vista de ficha", description: "Consulta y edición de la ficha RLT del directivo." },
      { feature: "Rúbricas de evaluación", description: "Acceso a las rúbricas asignadas por módulo con niveles de desempeño." },
      { feature: "Seguimientos", description: "Consulta de seguimientos por módulo." },
      { feature: "Encuestas 360°", description: "Acceso a autoevaluación y visualización de resultados." },
      { feature: "Satisfacción", description: "Acceso a encuestas de satisfacción disponibles." },
      { feature: "Asistencia", description: "Registro de asistencia por módulo." },
    ],
    mindmap: `mindmap
  root((Mi Panel Directivo))
    Ficha RLT
      Consultar datos
      Editar ficha
    Rubricas
      Por modulo
      Niveles de desempeno
      Comentarios
    Seguimientos
      Modulo actual
      Historico
    Encuestas 360
      Autoevaluacion
      Resultados
    Satisfaccion
      Asistencia
      Interludio
      Intensivo
    Asistencia
      AM y PM
      Observaciones`,
    previewPath: "/mi-panel",
  },
  /* 4 — Mi Panel (Evaluador) */
  {
    id: "mi-panel-evaluador",
    title: "Mi Panel (Evaluador)",
    type: "Página pública",
    routes: ["/mi-panel", "/evaluador-encuestas"],
    role: "Evaluador registrado",
    features: [
      { feature: "Directivos asignados", description: "Lista de directivos asignados al evaluador con estado de avance." },
      { feature: "Rúbricas", description: "Evaluación por rúbrica para cada directivo asignado." },
      { feature: "Seguimientos", description: "Registro de seguimientos por módulo." },
      { feature: "Encuestas 360°", description: "Acceso a formularios de encuesta según visibilidad configurada." },
      { feature: "Informe de módulo", description: "Acceso al informe de módulo si tiene permisos." },
    ],
    mindmap: `mindmap
  root((Mi Panel Evaluador))
    Directivos asignados
      Lista
      Estado de avance
    Rubricas
      Evaluar por modulo
      Niveles
      Comentarios
    Seguimientos
      Registrar avance
    Encuestas 360
      Formularios visibles
    Informe de modulo
      Redactar
      Consultar`,
    previewPath: "/mi-panel",
  },
  /* 5 — Hub Encuesta 360° */
  {
    id: "encuesta-360",
    title: "Hub Encuesta 360°",
    type: "Página pública",
    routes: ["/encuesta-360", "/formulario-360-*"],
    role: "Cualquier visitante (formularios públicos)",
    features: [
      { feature: "Selector de formulario", description: "Elige entre 6 tipos: Autoevaluación, Docente, Estudiante, Acudiente, Administrativo, Directivo." },
      { feature: "Fases", description: "Soporte para fase inicial y final." },
      { feature: "Formularios por rol", description: "Preguntas adaptadas a cada tipo de evaluador." },
      { feature: "Invitaciones por email", description: "Acceso vía token único enviado por correo." },
      { feature: "Modal de revisión post-envío", description: "Confirma las respuestas antes de enviar." },
    ],
    mindmap: `mindmap
  root((Encuesta 360))
    Formularios
      Autoevaluacion
      Docente
      Estudiante
      Acudiente
      Administrativo
      Directivo
    Fases
      Inicial
      Final
    Acceso
      Publico
      Por invitacion token
    Post envio
      Revision modal
      Calificacion sitio`,
    previewPath: "/encuesta-360",
  },
  /* 6 — Panel Operador */
  {
    id: "operador",
    title: "Panel Operador",
    type: "Página pública",
    routes: ["/operador"],
    role: "Operador con permisos RBAC",
    features: [
      { feature: "Secciones por permisos", description: "Solo ve las secciones asignadas por el admin (fichas, rúbricas, encuestas, etc.)." },
      { feature: "Filtro por región/entidad/IE", description: "Los datos mostrados se limitan al scope del operador." },
      { feature: "Exportación", description: "Descarga de datos en Excel/CSV según la sección." },
      { feature: "Consulta de fichas", description: "Vista de fichas RLT de los directivos de su scope." },
      { feature: "Consulta de encuestas", description: "Vista de encuestas 360° y ambiente escolar de su scope." },
    ],
    mindmap: `mindmap
  root((Panel Operador))
    Permisos RBAC
      Secciones asignadas
      Scope region
      Scope entidad
      Scope institucion
    Fichas
      Consultar
      Exportar
    Encuestas
      360
      Ambiente escolar
    Rubricas
      Consultar evaluaciones
    Informes
      Modulo`,
    previewPath: "/operador",
  },
  /* 7 — Admin: Enlaces */
  {
    id: "admin-enlaces",
    title: "Panel Admin — Enlaces",
    type: "Hub admin",
    routes: ["/admin"],
    role: "Admin autenticado",
    features: [
      { feature: "360° Entrada", description: "Enlaces a los 6 formularios en línea de la encuesta 360° de entrada y sus versiones PDF." },
      { feature: "360° Salida", description: "Enlaces a los 6 formularios en línea de la encuesta 360° de salida (final) y sus versiones PDF." },
      { feature: "Rúbrica", description: "Enlace al formulario en línea de la Rúbrica de Evaluación." },
      { feature: "RLT", description: "Enlace al formulario en línea de la Ficha de Información y su versión PDF." },
      { feature: "Ambiente Escolar", description: "Enlaces a los 3 formularios en línea de Ambiente Escolar y sus versiones PDF." },
      { feature: "Satisfacción", description: "Enlaces a los formularios en línea de Satisfacción (Intensivo, Interludio, Asistencia) y sus versiones PDF." },
    ],
    mindmap: `mindmap
  root((Admin Enlaces))
    360 Entrada
      6 formularios en linea
      PDF
    360 Salida
      6 formularios finales
      PDF
    Rubrica
      Formulario en linea
    RLT
      Ficha de Informacion
      PDF
    Ambiente Escolar
      3 formularios
      PDF
    Satisfaccion
      Intensivo / Interludio / Asistencia
      PDF`,
    previewPath: "/admin",
  },
  /* 8 — Admin: Fichas */
  {
    id: "admin-fichas",
    title: "Panel Admin — Fichas",
    type: "Hub admin",
    routes: ["/admin", "/admin/ficha/:id"],
    role: "Admin con permiso fichas",
    features: [
      { feature: "Lista de fichas", description: "Tabla con todas las fichas RLT registradas, filtrable por región/entidad." },
      { feature: "Edición de ficha", description: "Editar cualquier campo de una ficha existente." },
      { feature: "Exportación Excel", description: "Descarga masiva de fichas en formato Excel." },
      { feature: "Descarga PDF individual", description: "Generar PDF de una ficha específica." },
      { feature: "Eliminación", description: "Soft-delete con envío a la papelera." },
    ],
    mindmap: `mindmap
  root((Admin Fichas))
    Lista
      Filtros region
      Filtros entidad
      Busqueda
    Acciones
      Editar ficha
      Descargar PDF
      Exportar Excel
      Eliminar`,
    previewPath: "/admin",
  },
  /* 9 — Admin: Rúbricas */
  {
    id: "admin-rubricas",
    title: "Panel Admin — Rúbricas",
    type: "Hub admin",
    routes: ["/admin"],
    role: "Admin con permiso rúbricas",
    features: [
      { feature: "Evaluadores", description: "CRUD de evaluadores con cédula, nombre y email." },
      { feature: "Asignaciones", description: "Asignar directivos a evaluadores." },
      { feature: "Evaluaciones individuales", description: "Ver detalle de evaluación por directivo con niveles y comentarios." },
      { feature: "Reporte por módulo", description: "Informe consolidado por módulo con promedios y distribución." },
      { feature: "Reporte regional", description: "Informe consolidado por región con análisis por ítem." },
      { feature: "Transferencia de directivos", description: "Mover directivos entre evaluadores." },
    ],
    mindmap: `mindmap
  root((Admin Rubricas))
    Evaluadores
      CRUD
      Cedula y email
    Asignaciones
      Directivo a evaluador
      Transferir
    Evaluaciones
      Individual
      Niveles
      Comentarios
    Reportes
      Por modulo PDF
      Regional PDF
      Analisis IA`,
    previewPath: "/admin",
  },
  /* 10 — Admin: Encuesta 360° */
  {
    id: "admin-360",
    title: "Panel Admin — Encuesta 360°",
    type: "Hub admin",
    routes: ["/admin"],
    role: "Admin con permiso encuesta360",
    features: [
      { feature: "Monitor de encuestas", description: "Tabla con todas las respuestas 360° recibidas." },
      { feature: "Gestión de competencias", description: "CRUD de dominios, competencias e ítems por formulario." },
      { feature: "Pesos por competencia", description: "Configuración de pesos por rol observador." },
      { feature: "Reporte 360°", description: "Generación de reportes individuales y consolidados." },
      { feature: "Invitaciones", description: "Envío masivo de invitaciones por email con token." },
      { feature: "Visibilidad", description: "Control de visibilidad de formularios por fase y scope." },
    ],
    mindmap: `mindmap
  root((Admin 360))
    Monitor
      Respuestas
      Filtros
      Exportar
    Competencias
      Dominios
      Items
      Textos por formulario
    Pesos
      Por rol observador
    Reportes
      Individual
      Consolidado
      PDF
    Invitaciones
      Email masivo
      Tokens
    Visibilidad
      Por fase
      Por scope`,
    previewPath: "/admin",
  },
  /* 11 — Admin: Informe de Módulo */
  {
    id: "admin-informe",
    title: "Panel Admin — Informe de Módulo",
    type: "Hub admin",
    routes: ["/admin", "/informe-modulo"],
    role: "Admin con permiso informe",
    features: [
      { feature: "Formulario de informe", description: "Campos estructurados: contexto, sesiones, acompañamiento, estrategias." },
      { feature: "Equipo de trabajo", description: "Lista de miembros del equipo con rol." },
      { feature: "Novedades", description: "Registro de novedades por directivo." },
      { feature: "Reporte consolidado", description: "Vista consolidada de todos los informes por módulo." },
      { feature: "Generación PDF", description: "Descarga del informe en formato PDF." },
    ],
    mindmap: `mindmap
  root((Admin Informe))
    Formulario
      Contexto
      Sesiones programadas
      Sesiones realizadas
      Acompanamiento
    Equipo
      Miembros
      Roles
    Novedades
      Por directivo
    Reporte
      Consolidado
      PDF`,
    previewPath: "/admin",
  },
  {
    id: "admin-ambiente",
    title: "Panel Admin — Ambiente Escolar",
    type: "Hub admin",
    routes: ["/admin"],
    role: "Admin con permiso ambiente",
    features: [
      { feature: "Monitor de encuestas", description: "Tabla con respuestas de ambiente escolar por tipo (estudiantes, docentes, acudientes)." },
      { feature: "Estadísticas", description: "Promedios por categoría y tipo de encuesta." },
      { feature: "Reporte PDF", description: "Generación de reporte de ambiente escolar por IE." },
      { feature: "Exportación", description: "Descarga de datos en Excel." },
    ],
    mindmap: `mindmap
  root((Admin Ambiente))
    Encuestas
      Estudiantes
      Docentes
      Acudientes
    Monitor
      Tabla respuestas
      Filtros
    Estadisticas
      Promedios
      Por categoria
    Reportes
      PDF por IE
      Exportar Excel`,
    previewPath: "/admin",
  },
  /* 13 — Admin: Satisfacciones */
  {
    id: "admin-satisfaccion",
    title: "Panel Admin — Satisfacciones",
    type: "Hub admin",
    routes: ["/admin"],
    role: "Admin con permiso satisfacción",
    features: [
      { feature: "Configuración de formularios", description: "Activar/desactivar formularios por región, módulo y tipo." },
      { feature: "Definición de formularios", description: "Editor de preguntas y secciones por tipo de formulario." },
      { feature: "Monitor de respuestas", description: "Tabla de respuestas con filtros." },
      { feature: "Estadísticas", description: "Promedios y distribución por pregunta." },
      { feature: "Comentarios", description: "Vista de comentarios abiertos." },
      { feature: "Reporte PDF", description: "Generación de reporte de satisfacción." },
    ],
    mindmap: `mindmap
  root((Admin Satisfaccion))
    Configuracion
      Activar formularios
      Region y modulo
    Definicion
      Preguntas
      Secciones
    Monitor
      Respuestas
      Filtros
    Estadisticas
      Promedios
      Distribucion
    Comentarios
      Vista abierta
    Reportes
      PDF`,
    previewPath: "/admin",
  },
  {
    id: "admin-mel",
    title: "Panel Admin — MEL",
    type: "Hub admin",
    routes: ["/admin"],
    role: "Admin con permiso MEL",
    features: [
      { feature: "Configuración KPI", description: "CRUD de indicadores MEL con fórmulas, umbrales y metas." },
      { feature: "Grupos de KPIs", description: "Agrupación de indicadores por región." },
      { feature: "Rúbricas MEL", description: "Vista de evaluaciones de rúbrica con cálculo MEL." },
      { feature: "Reporte global", description: "Generación de reporte MEL consolidado con gráficos." },
      { feature: "Reporte 360° MEL", description: "Integración de datos 360° con indicadores MEL." },
    ],
    mindmap: `mindmap
  root((Admin MEL))
    KPIs
      Configuracion
      Formulas
      Umbrales
      Metas
    Grupos
      Por region
      Items
    Rubricas MEL
      Calculos
      Niveles
    Reportes
      Global PDF
      360 MEL PDF
      Graficos`,
    previewPath: "/admin",
  },
  /* 15 — Admin: Sistema */
  {
    id: "admin-sistema",
    title: "Panel Admin — Sistema",
    type: "Hub admin",
    routes: ["/admin"],
    role: "Admin (superadmin para algunas secciones)",
    features: [
      { feature: "Registro de actividad", description: "Log de acciones de usuarios con IP, cédula, acción y detalle." },
      { feature: "Mensajes de contacto", description: "Vista de mensajes enviados desde el formulario de contacto." },
      { feature: "Reseñas del sitio", description: "Calificaciones y comentarios dejados por usuarios." },
      { feature: "Papelera", description: "Registros eliminados con posibilidad de restauración." },
      { feature: "Purgar datos", description: "Eliminación masiva de datos por tipo y filtro." },
      { feature: "Changelog", description: "Historial de cambios de la aplicación." },
    ],
    mindmap: `mindmap
  root((Admin Sistema))
    Actividad
      Log de acciones
      IP y usuario
    Mensajes
      Contacto
      Leidos
    Resenas
      Calificaciones
      Comentarios
    Papelera
      Restaurar
      Eliminar
    Purgar
      Por tipo
      Por filtro
    Changelog
      Versiones`,
    previewPath: "/admin",
  },
  /* 16 — Contacto / FAQ / Sugerencias */
  {
    id: "contacto",
    title: "Contacto / FAQ / Sugerencias",
    type: "Páginas públicas",
    routes: ["/contacto", "/faq", "/sugerencias", "/derechos-contacto"],
    role: "Cualquier visitante",
    features: [
      { feature: "Formulario de contacto", description: "Envío de mensajes con asunto, email y opción de WhatsApp." },
      { feature: "Preguntas frecuentes", description: "Accordion con preguntas y respuestas organizadas por categoría." },
      { feature: "Sugerencias", description: "Formulario para enviar sugerencias sobre la plataforma." },
      { feature: "Derechos y contacto", description: "Información legal y datos de contacto del proyecto." },
    ],
    mindmap: `mindmap
  root((Contacto y FAQ))
    Contacto
      Formulario
      WhatsApp
      Email
    FAQ
      Por categoria
      Accordion
    Sugerencias
      Formulario
    Legal
      Derechos
    Datos de contacto`,
    previewPath: "/contacto",
  },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function SpecsHubs() {
  const navigate = useNavigate();
  const [loadedMap, setLoadedMap] = useState<Record<string, boolean>>({});
  const { images } = useAppImages();
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const handleDownloadBlankFicha = async () => {
    setGeneratingPdf(true);
    try {
      await generarPDFFichaEnBlanco(
        { logoRLT: images.logo_rlt_white, logoCLTDark: images.logo_clt_dark, logoCosmo: images.logo_cosmo },
        { showLogoRlt: true, showLogoClt: true }
      );
    } catch (e) {
      console.error(e);
    } finally {
      setGeneratingPdf(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/specs")}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Documentación
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 md:px-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Hubs de la Aplicación</h1>
        <p className="text-muted-foreground mb-8">
          Especificaciones detalladas de cada hub: rutas, roles, funcionalidades y diagramas.
        </p>

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
                    <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                      {hub.type}
                    </span>
                  </div>
                </div>
              </AccordionTrigger>

              <AccordionContent className="pb-6 space-y-6">
                {/* Routes & Role */}
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Ruta(s)</p>
                    <div className="flex flex-wrap gap-1">
                      {hub.routes.map((r) => (
                        <code key={r} className="text-xs bg-muted px-2 py-0.5 rounded">{r}</code>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Rol requerido</p>
                    <p className="text-sm text-foreground">{hub.role}</p>
                  </div>
                </div>

                {/* Live preview */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Vista previa de pantalla</p>
                  {hub.id === "inicio" ? (
                    <div className="space-y-4">
                      <div className="px-14">
                        <Carousel className="w-full">
                          <CarouselContent>
                            <CarouselItem>
                              <div className="relative border border-border rounded-lg overflow-hidden bg-muted/30" style={{ height: 350 }}>
                                {!loadedMap[hub.id] && (
                                  <div className="absolute inset-0 flex items-center justify-center z-10">
                                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                                  </div>
                                )}
                                <p className="text-xs font-medium text-muted-foreground px-3 py-2 bg-muted/50">Ingreso de Cédula (en vivo)</p>
                                <iframe
                                  src={`${window.location.origin}/`}
                                  title="Preview Inicio"
                                  loading="lazy"
                                  className="pointer-events-none origin-top-left"
                                  style={{ width: "200%", height: "200%", transform: "scale(0.5)", border: "none", filter: "grayscale(1) contrast(0.85) sepia(0.08)" }}
                                  onLoad={() => setLoadedMap((m) => ({ ...m, [hub.id]: true }))}
                                />
                              </div>
                            </CarouselItem>
                            {[
                              { label: "Mi Panel — Rector", src: "/images/specs/inicio-panel-rector.png" },
                              { label: "Mi Panel — Evaluador", src: "/images/specs/inicio-panel-evaluador.png" },
                              { label: "Acceso Administrador", src: "/images/specs/inicio-acceso-admin.png" },
                              { label: "Panel de Administración", src: "/images/specs/inicio-panel-admin.png" },
                              { label: "Selector de Rol (Multirol)", src: "/images/specs/inicio-multirol.png" },
                              { label: "Panel de Operador", src: "/images/specs/inicio-panel-operador.png" },
                              { label: "Nuevo Rector/Coordinador — Bienvenida", src: "/images/specs/inicio-nuevo-bienvenida.png" },
                              { label: "Selección de Región", src: "/images/specs/inicio-region-seleccion.png" },
                              { label: "Autorización de Datos Personales", src: "/images/specs/inicio-autorizacion-datos.png" },
                              { label: "Verificación de Nombres (Certificado)", src: "/images/specs/inicio-verificacion-nombres.png" },
                              { label: "Nueva Ficha de Información", src: "/images/specs/inicio-nueva-ficha.png" },
                            ].map((screen, i) => (
                              <CarouselItem key={i}>
                                <div className="border border-border rounded-lg overflow-hidden bg-muted/30">
                                  <p className="text-xs font-medium text-muted-foreground px-3 py-2 bg-muted/50">{screen.label}</p>
                                  <img src={screen.src} alt={screen.label} className="w-full" loading="lazy" style={{ filter: "grayscale(1) contrast(0.85) sepia(0.08)" }} />
                                </div>
                              </CarouselItem>
                            ))}
                          </CarouselContent>
                          <CarouselPrevious className="bg-primary text-primary-foreground hover:bg-primary/90 border-none shadow-md" />
                          <CarouselNext className="bg-primary text-primary-foreground hover:bg-primary/90 border-none shadow-md" />
                        </Carousel>
                      </div>
                    </div>
                  ) : hub.id === "ficha" ? (
                    <div className="space-y-4">
                      <div className="px-14">
                        <Carousel className="w-full">
                          <CarouselContent>
                            <CarouselItem>
                              <div className="relative border border-border rounded-lg overflow-hidden bg-muted/30" style={{ height: 350 }}>
                                {!loadedMap[hub.id] && (
                                  <div className="absolute inset-0 flex items-center justify-center z-10">
                                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                                  </div>
                                )}
                                <p className="text-xs font-medium text-muted-foreground px-3 py-2 bg-muted/50">Selección de Región (en vivo)</p>
                                <iframe
                                  src={`${window.location.origin}/ficha`}
                                  title="Preview Ficha"
                                  loading="lazy"
                                  className="pointer-events-none origin-top-left"
                                  style={{ width: "200%", height: "200%", transform: "scale(0.5)", border: "none", filter: "grayscale(1) contrast(0.85) sepia(0.08)" }}
                                  onLoad={() => setLoadedMap((m) => ({ ...m, [hub.id]: true }))}
                                />
                              </div>
                            </CarouselItem>
                            {[
                              { label: "Nuevo Rector/Coordinador — Bienvenida", src: "/images/specs/inicio-nuevo-bienvenida.png" },
                              { label: "Autorización de Datos Personales", src: "/images/specs/inicio-autorizacion-datos.png" },
                              { label: "Verificación de Nombres (Certificado)", src: "/images/specs/inicio-verificacion-nombres.png" },
                              { label: "Nueva Ficha de Información", src: "/images/specs/inicio-nueva-ficha.png" },
                            ].map((screen, i) => (
                              <CarouselItem key={i}>
                                <div className="border border-border rounded-lg overflow-hidden bg-muted/30">
                                  <p className="text-xs font-medium text-muted-foreground px-3 py-2 bg-muted/50">{screen.label}</p>
                                  <img src={screen.src} alt={screen.label} className="w-full" loading="lazy" style={{ filter: "grayscale(1) contrast(0.85) sepia(0.08)" }} />
                                </div>
                              </CarouselItem>
                            ))}
                          </CarouselContent>
                          <CarouselPrevious className="bg-primary text-primary-foreground hover:bg-primary/90 border-none shadow-md" />
                          <CarouselNext className="bg-primary text-primary-foreground hover:bg-primary/90 border-none shadow-md" />
                        </Carousel>
                      </div>
                    </div>
                  ) : hub.id === "mi-panel-directivo" ? (
                    <div className="space-y-4">
                      <div className="border border-border rounded-lg overflow-hidden bg-muted/30">
                         <img
                          src="/images/mi-panel-directivo-preview.png"
                          alt="Mi Panel — Vista Rector"
                          className="w-full rounded-lg"
                          loading="lazy"
                          style={{ filter: "grayscale(1) contrast(0.85) sepia(0.08)" }}
                        />
                      </div>
                    </div>
                  ) : hub.id === "mi-panel-evaluador" ? (
                    <div className="space-y-4">
                      <div className="px-14">
                        <Carousel className="w-full">
                          <CarouselContent>
                            {[
                              { label: "Mi Panel — Vista general", src: "/images/mi-panel-evaluador-preview.png" },
                              { label: "Mi Rúbrica de Evaluación", src: "/images/evaluador-rubrica-preview.png" },
                              { label: "Encuestas 360° — Entrada", src: "/images/evaluador-encuestas360-preview.png" },
                            ].map((screen, i) => (
                              <CarouselItem key={i}>
                                <div className="border border-border rounded-lg overflow-hidden bg-muted/30">
                                  <p className="text-xs font-medium text-muted-foreground px-3 py-2 bg-muted/50">{screen.label}</p>
                                  <img src={screen.src} alt={screen.label} className="w-full" loading="lazy" style={{ filter: "grayscale(1) contrast(0.85) sepia(0.08)" }} />
                                </div>
                              </CarouselItem>
                            ))}
                          </CarouselContent>
                          <CarouselPrevious className="bg-primary text-primary-foreground hover:bg-primary/90 border-none shadow-md" />
                          <CarouselNext className="bg-primary text-primary-foreground hover:bg-primary/90 border-none shadow-md" />
                        </Carousel>
                      </div>
                    </div>
                  ) : hub.id === "admin-enlaces" ? (
                    <div className="space-y-4">
                      <div className="px-14">
                        <Carousel className="w-full">
                          <CarouselContent>
                            <CarouselItem>
                              <div className="border border-border rounded-lg overflow-hidden bg-muted/30">
                                <p className="text-xs font-medium text-muted-foreground px-3 py-2 bg-muted/50">Enlaces — Formularios y Rúbrica</p>
                                <img src="/images/specs/admin-enlaces-preview.png" alt="Admin Enlaces" className="w-full" loading="lazy" style={{ filter: "grayscale(1) contrast(0.85) sepia(0.08)" }} />
                              </div>
                            </CarouselItem>
                          </CarouselContent>
                          <CarouselPrevious className="bg-primary text-primary-foreground hover:bg-primary/90 border-none shadow-md" />
                          <CarouselNext className="bg-primary text-primary-foreground hover:bg-primary/90 border-none shadow-md" />
                        </Carousel>
                      </div>
                    </div>
                  ) : hub.id === "admin-fichas" ? (
                    <div className="space-y-4">
                      <div className="px-14">
                        <Carousel className="w-full">
                          <CarouselContent>
                            {[
                              { label: "Lista de Fichas", src: "/images/specs/admin-fichas-lista.png" },
                              { label: "Enlace y PDF", src: "/images/specs/admin-fichas-enlace-pdf.png" },
                              { label: "Configuración (ET, Región, Municipio, Institución)", src: "/images/specs/admin-fichas-configuracion.png" },
                            ].map((screen, i) => (
                              <CarouselItem key={i}>
                                <div className="border border-border rounded-lg overflow-hidden bg-muted/30">
                                  <p className="text-xs font-medium text-muted-foreground px-3 py-2 bg-muted/50">{screen.label}</p>
                                  <img src={screen.src} alt={screen.label} className="w-full" loading="lazy" style={{ filter: "grayscale(1) contrast(0.85) sepia(0.08)" }} />
                                </div>
                              </CarouselItem>
                            ))}
                          </CarouselContent>
                          <CarouselPrevious className="bg-primary text-primary-foreground hover:bg-primary/90 border-none shadow-md" />
                          <CarouselNext className="bg-primary text-primary-foreground hover:bg-primary/90 border-none shadow-md" />
                        </Carousel>
                      </div>
                    </div>
                  ) : hub.id === "admin-rubricas" ? (
                    <div className="space-y-4">
                      <div className="px-14">
                        <Carousel className="w-full">
                          <CarouselContent>
                            {[
                              { label: "Resultados", src: "/images/specs/admin-rubricas-resultados.png" },
                              { label: "Informes por módulo", src: "/images/specs/admin-rubricas-informes-modulo.png" },
                              { label: "Informe regional", src: "/images/specs/admin-rubricas-informe-regional.png" },
                              { label: "Configuración — Evaluadores", src: "/images/specs/admin-rubricas-configuracion.png" },
                              { label: "Nuevo evaluador", src: "/images/specs/admin-rubricas-nuevo-evaluador.png" },
                              { label: "Asignar directivos", src: "/images/specs/admin-rubricas-asignar-directivos.png" },
                            ].map((screen, i) => (
                              <CarouselItem key={i}>
                                <div className="border border-border rounded-lg overflow-hidden bg-muted/30">
                                  <p className="text-xs font-medium text-muted-foreground px-3 py-2 bg-muted/50">{screen.label}</p>
                                  <img src={screen.src} alt={screen.label} className="w-full" loading="lazy" style={{ filter: "grayscale(1) contrast(0.85) sepia(0.08)" }} />
                                </div>
                              </CarouselItem>
                            ))}
                          </CarouselContent>
                          <CarouselPrevious className="bg-primary text-primary-foreground hover:bg-primary/90 border-none shadow-md" />
                          <CarouselNext className="bg-primary text-primary-foreground hover:bg-primary/90 border-none shadow-md" />
                        </Carousel>
                      </div>
                    </div>
                  ) : hub.id === "admin-360" ? (
                    <div className="space-y-4">
                      <div className="px-14">
                        <Carousel className="w-full">
                          <CarouselContent>
                            {[
                              { label: "Formularios", src: "/images/specs/admin-360-formularios.png" },
                              { label: "Entrada — Monitor", src: "/images/specs/admin-360-entrada.png" },
                              { label: "Detalle de respuesta", src: "/images/specs/admin-360-detalle.png" },
                              { label: "Invitaciones", src: "/images/specs/admin-360-invitaciones.png" },
                              { label: "Informes Entrada", src: "/images/specs/admin-360-informes.png" },
                              { label: "Configuración — Dominios", src: "/images/specs/admin-360-config-dominios.png" },
                              { label: "Configuración — Competencias", src: "/images/specs/admin-360-config-competencias.png" },
                              { label: "Configuración — Ítems", src: "/images/specs/admin-360-config-items.png" },
                              { label: "Configuración — Ponderaciones", src: "/images/specs/admin-360-config-ponderaciones.png" },
                              { label: "Asistente de creación", src: "/images/specs/admin-360-config-wizard.png" },
                            ].map((screen, i) => (
                              <CarouselItem key={i}>
                                <div className="border border-border rounded-lg overflow-hidden bg-muted/30">
                                  <p className="text-xs font-medium text-muted-foreground px-3 py-2 bg-muted/50">{screen.label}</p>
                                  <img src={screen.src} alt={screen.label} className="w-full" loading="lazy" style={{ filter: "grayscale(1) contrast(0.85) sepia(0.08)" }} />
                                </div>
                              </CarouselItem>
                            ))}
                          </CarouselContent>
                          <CarouselPrevious className="bg-primary text-primary-foreground hover:bg-primary/90 border-none shadow-md" />
                          <CarouselNext className="bg-primary text-primary-foreground hover:bg-primary/90 border-none shadow-md" />
                        </Carousel>
                      </div>
                    </div>
                  ) : hub.id === "admin-informe" ? (
                    <div className="space-y-4">
                      <div className="px-14">
                        <Carousel className="w-full">
                          <CarouselContent>
                            {[
                              { label: "Asistencia", src: "/images/specs/admin-informe-asistencia.png" },
                              { label: "Informe de Módulo", src: "/images/specs/admin-informe-modulo.png" },
                              { label: "Evaluación Individual", src: "/images/specs/admin-informe-evaluacion.png" },
                              { label: "Reportes PDF", src: "/images/specs/admin-informe-reportes.png" },
                            ].map((screen, i) => (
                              <CarouselItem key={i}>
                                <div className="border border-border rounded-lg overflow-hidden bg-muted/30">
                                  <p className="text-xs font-medium text-muted-foreground px-3 py-2 bg-muted/50">{screen.label}</p>
                                  <img src={screen.src} alt={screen.label} className="w-full" loading="lazy" style={{ filter: "grayscale(1) contrast(0.85) sepia(0.08)" }} />
                                </div>
                              </CarouselItem>
                            ))}
                          </CarouselContent>
                          <CarouselPrevious className="bg-primary text-primary-foreground hover:bg-primary/90 border-none shadow-md" />
                          <CarouselNext className="bg-primary text-primary-foreground hover:bg-primary/90 border-none shadow-md" />
                        </Carousel>
                      </div>
                    </div>
                  ) : hub.id === "admin-ambiente" ? (
                    <div className="space-y-4">
                      <div className="px-14">
                        <Carousel className="w-full">
                          <CarouselContent>
                            {[
                              { label: "Monitoreo", src: "/images/specs/admin-ambiente-monitoreo.png" },
                              { label: "Estadísticas", src: "/images/specs/admin-ambiente-estadisticas.png" },
                              { label: "Enlaces", src: "/images/specs/admin-ambiente-enlaces.png" },
                            ].map((screen, i) => (
                              <CarouselItem key={i}>
                                <div className="border border-border rounded-lg overflow-hidden bg-muted/30">
                                  <p className="text-xs font-medium text-muted-foreground px-3 py-2 bg-muted/50">{screen.label}</p>
                                  <img src={screen.src} alt={screen.label} className="w-full" loading="lazy" style={{ filter: "grayscale(1) contrast(0.85) sepia(0.08)" }} />
                                </div>
                              </CarouselItem>
                            ))}
                          </CarouselContent>
                          <CarouselPrevious className="bg-primary text-primary-foreground hover:bg-primary/90 border-none shadow-md" />
                          <CarouselNext className="bg-primary text-primary-foreground hover:bg-primary/90 border-none shadow-md" />
                        </Carousel>
                      </div>
                    </div>
                  ) : hub.id === "admin-satisfaccion" ? (
                    <div className="space-y-4">
                      <div className="px-14">
                        <Carousel className="w-full">
                          <CarouselContent>
                            {[
                              { label: "Respuestas", src: "/images/specs/admin-satisf-respuestas.png" },
                              { label: "Detalle de respuesta", src: "/images/specs/admin-satisf-detalle.png" },
                              { label: "Comentarios", src: "/images/specs/admin-satisf-comentarios.png" },
                              { label: "Informe PDF", src: "/images/specs/admin-satisf-informe.png" },
                              { label: "Formulario — Asistencia", src: "/images/specs/admin-satisf-form-asistencia.png" },
                              { label: "Formulario — Interludio", src: "/images/specs/admin-satisf-form-interludio.png" },
                              { label: "Formulario — Intensivo", src: "/images/specs/admin-satisf-form-intensivo.png" },
                              { label: "Configuración", src: "/images/specs/admin-satisf-config.png" },
                            ].map((screen, i) => (
                              <CarouselItem key={i}>
                                <div className="border border-border rounded-lg overflow-hidden bg-muted/30">
                                  <p className="text-xs font-medium text-muted-foreground px-3 py-2 bg-muted/50">{screen.label}</p>
                                  <img src={screen.src} alt={screen.label} className="w-full" loading="lazy" style={{ filter: "grayscale(1) contrast(0.85) sepia(0.08)" }} />
                                </div>
                              </CarouselItem>
                            ))}
                          </CarouselContent>
                          <CarouselPrevious className="bg-primary text-primary-foreground hover:bg-primary/90 border-none shadow-md" />
                          <CarouselNext className="bg-primary text-primary-foreground hover:bg-primary/90 border-none shadow-md" />
                        </Carousel>
                      </div>
                    </div>
                  ) : (
                    <div className="relative border border-border rounded-lg overflow-hidden bg-muted/30" style={{ height: 350 }}>
                      {!loadedMap[hub.id] && (
                        <div className="absolute inset-0 flex items-center justify-center z-10">
                          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                        </div>
                      )}
                      <iframe
                        src={`${window.location.origin}${hub.previewPath}`}
                        title={`Preview ${hub.title}`}
                        loading="lazy"
                        className="pointer-events-none origin-top-left"
                        style={{ width: "200%", height: "200%", transform: "scale(0.5)", border: "none", filter: "grayscale(1) contrast(0.85) sepia(0.08)" }}
                        onLoad={() => setLoadedMap((m) => ({ ...m, [hub.id]: true }))}
                      />
                    </div>
                  )}
                </div>

                {/* Blank Ficha links – only for hub #2 */}
                {hub.id === "ficha" && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Formulaire de la Ficha</p>
                    <div className="flex flex-wrap gap-3">
                      <Button variant="outline" size="sm" asChild>
                        <a href={`${window.location.origin}/ficha`} target="_blank" rel="noopener noreferrer">
                          <FileDown className="w-4 h-4 mr-2" />
                          Ouvrir le formulaire en ligne
                        </a>
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleDownloadBlankFicha} disabled={generatingPdf}>
                        {generatingPdf ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileDown className="w-4 h-4 mr-2" />}
                        Descargar PDF en blanco
                      </Button>
                    </div>
                  </div>
                )}

                {/* Features table */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Funcionalidades</p>
                  <div className="overflow-x-auto border border-border rounded-lg">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="text-left px-3 py-2 font-semibold text-foreground">Funcionalidad</th>
                          <th className="text-left px-3 py-2 font-semibold text-foreground">Descripción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {hub.features.map((f, i) => (
                          <tr key={i} className="border-t border-border">
                            <td className="px-3 py-2 font-medium text-foreground whitespace-nowrap">{f.feature}</td>
                            <td className="px-3 py-2 text-muted-foreground">{f.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Mindmap */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Mapa mental</p>
                  <MermaidDiagram chart={hub.mindmap} id={`hub-${hub.id}`} />
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
}
