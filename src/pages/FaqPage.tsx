import { useNavigate } from "react-router-dom";
import { ArrowLeft, HelpCircle, FileText, ClipboardList, BarChart3, Mail, Shield } from "lucide-react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { RefreshCw } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface FaqSection {
  title: string;
  icon: React.ElementType;
  questions: { q: string; a: string }[];
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
        q: "¿Qué campos son obligatorios?",
        a: "Los campos obligatorios incluyen: nombre completo, fecha de nacimiento, cédula, género, celular, correo personal, región, institución educativa, cargo actual, tipo de formación, título de pregrado, tipo de vinculación, código DANE (12 dígitos), entidad territorial, municipio, tipo de bachillerato, zona de sede, sedes (rural/urbana), jornadas, niveles educativos, y los datos del personal y estudiantes por nivel.",
      },
      {
        q: "¿Puedo editar una ficha ya enviada?",
        a: "Solo los administradores pueden editar las fichas desde el panel de administración, en la pestaña 'Fichas Gestión'.",
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
        q: "¿Cuántos formularios existen?",
        a: "Existen 6 formularios diferentes según el perfil del evaluador: Acudiente, Administrativo, Autoevaluación, Directivo, Docente y Estudiante.",
      },
      {
        q: "¿Cómo se calculan los resultados?",
        a: "Los resultados se calculan aplicando ponderaciones específicas por competencia y por tipo de evaluador. Estas ponderaciones son configurables por el administrador desde la pestaña 'Config 360°'.",
      },
      {
        q: "¿Dónde puedo ver los informes?",
        a: "Los informes 360° están disponibles en el panel de administración bajo la pestaña 'Informes 360°'. Se pueden generar reportes individuales en PDF.",
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
        q: "¿Quién evalúa con la rúbrica?",
        a: "La rúbrica es utilizada por evaluadores asignados por el administrador. Cada evaluador tiene directivos asignados para evaluar.",
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
        q: "¿Cómo puedo enviar una sugerencia?",
        a: "Puede acceder al formulario de sugerencias desde el enlace 'Sugerencias' en el pie de página del sitio. Allí podrá evaluar la plataforma con estrellas y dejar sus comentarios.",
      },
      {
        q: "¿Cómo puedo contactar al responsable de la plataforma?",
        a: "Desde el enlace 'Derechos y Contacto' en el pie de página, puede acceder al formulario de contacto directo con Ghislain Simard.",
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
        q: "¿Cómo accedo al panel de administración?",
        a: "El acceso se realiza a través de /admin/login con sus credenciales de administrador. Solo los usuarios con rol 'admin' o 'superadmin' pueden ingresar.",
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
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
        {faqSections.map((section) => {
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
