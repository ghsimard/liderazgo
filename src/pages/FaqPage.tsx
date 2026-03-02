import { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, HelpCircle, FileText, ClipboardList, BarChart3, Mail, Shield, ExternalLink, Search, X } from "lucide-react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { RefreshCw } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

function AdminLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
    >
      {children}
      <ExternalLink className="w-3 h-3" />
    </Link>
  );
}

interface FaqQuestion {
  q: string;
  a: React.ReactNode;
}

interface FaqSection {
  title: string;
  icon: React.ElementType;
  questions: FaqQuestion[];
}

const faqSections: FaqSection[] = [
  {
    title: "Ficha de Información (RLT / CLT)",
    icon: FileText,
    questions: [
      {
        q: "¿Qué es la Ficha de Información?",
        a: "Es el formulario principal para recopilar los datos personales, profesionales e institucionales de cada directivo participante en el programa RLT o CLT.",
      },
      {
        q: "¿Qué debe configurar el administrador antes de que funcione?",
        a: (
          <div className="space-y-2">
            <p>1) Ir a <AdminLink to="/admin?tab=fichas">Fichas Gestión → Configuración de Región</AdminLink> y crear al menos una región.</p>
            <p>2) Dentro de cada región, asignar las entidades territoriales, municipios e instituciones educativas correspondientes.</p>
            <p>3) Sin estas configuraciones, los formularios de ficha no mostrarán opciones de selección para región, entidad territorial, municipio ni institución.</p>
          </div>
        ),
      },
      {
        q: "¿Qué campos son obligatorios?",
        a: "Los campos obligatorios incluyen: nombre completo, fecha de nacimiento, cédula, género, celular, correo personal, región, institución educativa, cargo actual, tipo de formación, título de pregrado, tipo de vinculación, código DANE (12 dígitos), entidad territorial, municipio, tipo de bachillerato, zona de sede, sedes (rural/urbana), jornadas, niveles educativos, y los datos del personal y estudiantes por nivel.",
      },
      {
        q: "¿Puedo editar una ficha ya enviada?",
        a: (
          <span>Solo los administradores pueden editar las fichas desde el panel de administración, en la pestaña <AdminLink to="/admin?tab=fichas">Fichas Gestión</AdminLink>.</span>
        ),
      },
      {
        q: "¿Qué formato tiene el código DANE?",
        a: "El código DANE debe tener exactamente 12 dígitos numéricos.",
      },
    ],
  },
  {
    title: "Encuesta 360°",
    icon: BarChart3,
    questions: [
      {
        q: "¿Qué es la Encuesta 360°?",
        a: "Es un instrumento de evaluación que permite recoger la percepción de múltiples actores (docentes, estudiantes, acudientes, administrativos, directivos y autoevaluación) sobre las competencias de liderazgo de un directivo.",
      },
      {
        q: "¿Qué debe configurar el administrador antes de que funcione?",
        a: (
          <div className="space-y-2">
            <p>1) Ir a <AdminLink to="/admin?tab=ponderaciones">Config 360°</AdminLink> y verificar que existan dominios, competencias e ítems. Si están vacíos, usar el botón 'Asistente de creación' para generar la estructura completa.</p>
            <p>2) En la sub-pestaña <AdminLink to="/admin?tab=ponderaciones">Ponderaciones</AdminLink>, asignar los pesos por competencia y por tipo de evaluador (docente, estudiante, acudiente, etc.). Sin ponderaciones, los informes 360° no podrán calcularse.</p>
            <p>3) Asegurarse de que al menos una ficha de directivo haya sido registrada en <AdminLink to="/admin?tab=fichas">Fichas Gestión</AdminLink>, ya que los formularios 360° requieren seleccionar una institución y un directivo existente.</p>
          </div>
        ),
      },
      {
        q: "¿Cuántos formularios existen?",
        a: (
          <span>Existen 6 formularios diferentes según el perfil del evaluador: Acudiente, Administrativo, Autoevaluación, Directivo, Docente y Estudiante. Los enlaces se encuentran en <AdminLink to="/admin?tab=formularios">Formularios</AdminLink>.</span>
        ),
      },
      {
        q: "¿Cómo se calculan los resultados?",
        a: (
          <span>Los resultados se calculan aplicando ponderaciones específicas por competencia y por tipo de evaluador. Estas ponderaciones son configurables por el administrador desde <AdminLink to="/admin?tab=ponderaciones">Config 360° → Ponderaciones</AdminLink>.</span>
        ),
      },
      {
        q: "¿Dónde puedo ver los informes?",
        a: (
          <span>Los informes 360° están disponibles en <AdminLink to="/admin?tab=reportes360">Informes 360°</AdminLink>. Se pueden generar reportes individuales en PDF.</span>
        ),
      },
    ],
  },
  {
    title: "Rúbrica de Evaluación",
    icon: ClipboardList,
    questions: [
      {
        q: "¿Qué es la Rúbrica de Evaluación?",
        a: "Es un instrumento de evaluación basado en módulos temáticos con ítems específicos. Cada ítem se evalúa en cuatro niveles: Avanzado, Intermedio, Básico y Sin evidencia.",
      },
      {
        q: "¿Qué debe configurar el administrador antes de que funcione?",
        a: (
          <div className="space-y-2">
            <p>1) Ir a la pestaña <AdminLink to="/admin?tab=rubricas">Rúbricas</AdminLink> del panel de administración.</p>
            <p>2) En la sub-pestaña 'Evaluadores', crear al menos un evaluador (nombre y cédula).</p>
            <p>3) En la sub-pestaña 'Asignaciones', asignar a cada evaluador los directivos que debe evaluar (nombre, cédula e institución del directivo).</p>
            <p>4) Verificar que los módulos y sus ítems existent (se cargan automáticamente al inicio). Sin evaluadores ni asignaciones, la rúbrica no será accesible.</p>
          </div>
        ),
      },
      {
        q: "¿Quién evalúa con la rúbrica?",
        a: (
          <span>La rúbrica es utilizada por evaluadores asignados por el administrador en <AdminLink to="/admin?tab=rubricas">Rúbricas</AdminLink>. Cada evaluador tiene directivos asignados para evaluar.</span>
        ),
      },
      {
        q: "¿Cómo funciona el proceso de evaluación paso a paso?",
        a: "1) El directivo accede primero y completa su autoevaluación (columna 'Directivo') para el Módulo 1.\n2) Una vez enviada, el evaluador puede acceder y completar su evaluación (columna 'Equipo').\n3) Ambos acuerdan un nivel final (columna 'Acordado') y lo envían.\n4) Solo cuando el 'nivel acordado' del Módulo 1 está completo, se desbloquea el Módulo 2, y así sucesivamente.\n5) Después de la evaluación inicial, se puede registrar un seguimiento para cada módulo.",
      },
      {
        q: "¿Qué son las tres columnas de evaluación?",
        a: "Cada ítem tiene tres perspectivas: la del directivo (autoevaluación), la del equipo evaluador, y el nivel acordado entre ambos. Cada una incluye un nivel y un comentario.",
      },
      {
        q: "¿Qué es el seguimiento?",
        a: "El seguimiento permite registrar el progreso del directivo en cada módulo después de la evaluación inicial, con un nivel y comentario actualizado.",
      },
    ],
  },
  {
    title: "Contacto y Sugerencias",
    icon: Mail,
    questions: [
      {
        q: "¿Qué debe configurar el administrador?",
        a: "No se requiere configuración previa. Los formularios de contacto y sugerencias funcionan de inmediato. Los mensajes enviados se almacenan automáticamente y son visibles para los superadmins a través del botón 'Mensajes' en el encabezado del panel de administración.",
      },
      {
        q: "¿Cómo puedo enviar una sugerencia?",
        a: (
          <span>Puede acceder al <Link to="/sugerencias" className="text-primary hover:underline font-medium">formulario de sugerencias</Link> desde el enlace 'Sugerencias' en el pie de página del sitio.</span>
        ),
      },
      {
        q: "¿Cómo puedo contactar al responsable de la plataforma?",
        a: (
          <span>Desde el enlace <Link to="/derechos-contacto" className="text-primary hover:underline font-medium">Derechos y Contacto</Link> en el pie de página, puede acceder al formulario de contacto directo.</span>
        ),
      },
      {
        q: "¿Mis datos de contacto son confidenciales?",
        a: "Sí, los datos recopilados a través de los formularios son tratados conforme a la Ley 1581 de 2012 de protección de datos personales de Colombia y solo se utilizan para los fines del programa.",
      },
    ],
  },
  {
    title: "Administración",
    icon: Shield,
    questions: [
      {
        q: "¿Qué configuración inicial es necesaria?",
        a: (
          <div className="space-y-2">
            <p>1) Un superadmin debe ser creado inicialmente (vía línea de comandos o base de datos directa).</p>
            <p>2) Desde el panel, el superadmin puede crear otros administradores en <AdminLink to="/admin?tab=users">Administradores</AdminLink>.</p>
            <p>3) En la pestaña <AdminLink to="/admin?tab=images">Images</AdminLink>, el administrador puede personalizar los logos que aparecen en la plataforma.</p>
            <p>4) Se recomienda configurar las regiones geográficas en <AdminLink to="/admin?tab=fichas">Fichas Gestión → Configuración de Región</AdminLink> antes de compartir los formularios.</p>
          </div>
        ),
      },
      {
        q: "¿Cómo accedo al panel de administración?",
        a: (
          <span>El acceso se realiza a través de <Link to="/admin/login" className="text-primary hover:underline font-medium">/admin/login</Link> con sus credenciales de administrador. Solo los usuarios con rol 'admin' o 'superadmin' pueden ingresar.</span>
        ),
      },
      {
        q: "¿Cuál es la diferencia entre admin y superadmin?",
        a: "El superadmin tiene acceso completo, incluyendo la gestión de otros administradores, la exportación de la base de datos, la lectura de mensajes de contacto y la creación de otros superadmins. El admin tiene acceso a la gestión de datos pero no a estas funciones críticas.",
      },
      {
        q: "¿Puedo exportar la base de datos?",
        a: "Sí, los superadmins pueden exportar un archivo SQL completo desde el botón 'Export SQL' en el encabezado del panel de administración.",
      },
    ],
  },
];

export default function FaqPage() {
  const navigate = useNavigate();
  const { isAdmin } = useAdminAuth();
  const [search, setSearch] = useState("");

  const filteredSections = useMemo(() => {
    if (!search.trim()) return faqSections;
    const q = search.toLowerCase();
    return faqSections
      .map((section) => ({
        ...section,
        questions: section.questions.filter((faq) => faq.q.toLowerCase().includes(q)),
      }))
      .filter((section) => section.questions.length > 0);
  }, [search]);

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="animate-spin w-6 h-6 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-primary text-primary-foreground py-8">
        <div className="max-w-4xl mx-auto px-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-primary-foreground/70 hover:text-primary-foreground transition-colors mb-4 text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Volver
          </button>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <HelpCircle className="w-7 h-7" />
            Preguntas Frecuentes (FAQ)
          </h1>
          <p className="mt-2 text-primary-foreground/70 text-sm">
            Guía de uso de la plataforma Liderazgo
          </p>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-foreground/50" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar pregunta..."
              className="w-full pl-10 pr-10 py-2.5 rounded-lg bg-primary-foreground/10 text-primary-foreground placeholder:text-primary-foreground/40 border border-primary-foreground/20 focus:outline-none focus:border-primary-foreground/50 text-sm"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-primary-foreground/50 hover:text-primary-foreground">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
        {filteredSections.length === 0 && (
          <p className="text-center text-muted-foreground py-8">No se encontraron preguntas para "{search}"</p>
        )}
        {filteredSections.map((section) => {
          const Icon = section.icon;
          return (
            <section key={section.title} className="space-y-3">
              <h2 className="text-lg font-semibold flex items-center gap-2 text-foreground">
                <Icon className="w-5 h-5 text-primary" />
                {section.title}
              </h2>
              <div className="bg-card border border-border rounded-lg">
                <Accordion type="multiple">
                  {section.questions.map((faq, i) => (
                    <AccordionItem key={i} value={`${section.title}-${i}`}>
                      <AccordionTrigger className="px-4 text-sm font-medium text-left">
                        {faq.q}
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed">
                        {faq.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
