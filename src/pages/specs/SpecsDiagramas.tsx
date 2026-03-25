import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MermaidDiagram from "@/components/MermaidDiagram";

const diagrams = [
  {
    title: "Flujo del Directivo",
    description: "Recorrido del directivo docente desde la identificación hasta sus acciones en Mi Panel.",
    chart: `flowchart TD
    A[Pagina de inicio] --> B{Tiene cedula?}
    B -->|Si| C[Ingresa cedula]
    C --> D{Cedula registrada?}
    D -->|Si| E[Mi Panel]
    D -->|No| F[Llenar Ficha RLT]
    F --> G[Envio exitoso]
    G --> E
    E --> H[Consultar ficha]
    E --> I[Responder Encuesta 360]
    E --> J[Ver rubricas]
    E --> K[Responder satisfaccion]
    B -->|No| L[Contacto / FAQ]`,
  },
  {
    title: "Flujo del Evaluador",
    description: "Proceso de evaluación por rúbrica que sigue el evaluador para cada directivo asignado.",
    chart: `flowchart TD
    A[Login con cedula] --> B[Panel de evaluacion]
    B --> C[Seleccionar directivo asignado]
    C --> D[Evaluar rubrica por modulo]
    D --> E[Guardar evaluacion]
    E --> F{Mas directivos?}
    F -->|Si| C
    F -->|No| G[Fin]`,
  },
  {
    title: "Flujo del Operador",
    description: "Acciones disponibles para el operador regional desde su panel segmentado.",
    chart: `flowchart TD
    A[Login con cedula] --> B[Panel de operador]
    B --> C[Ver fichas de su region]
    B --> D[Gestionar asistencia]
    B --> E[Crear informe de modulo]
    B --> F[Ver resultados de encuestas]`,
  },
  {
    title: "Flujo del Administrador",
    description: "Estructura del panel de administración con los 9 hubs principales.",
    chart: `flowchart TD
    A[Login email + password] --> B[Panel de administracion]
    B --> C[Sidebar con secciones]
    C --> D[Enlaces]
    C --> E[Fichas RLT]
    C --> F[Rubricas]
    C --> G[Encuesta 360]
    C --> H[Informe de Modulo]
    C --> I[Ambiente Escolar]
    C --> J[Satisfacciones]
    C --> K[MEL]
    C --> L[Sistema]`,
  },
  {
    title: "Flujo de Sesion Simplificado",
    description: "Vista simplificada del flujo de inicio de sesion, pensada para audiencias no tecnicas.",
    chart: `graph TD
    INICIO["Pantalla de Inicio -- Ingresar numero de cedula"]
    VERIFICAR{"El sistema verifica la cedula"}
    INICIO --> VERIFICAR

    NO_EXISTE["Cedula no encontrada -- Llenar formulario Ficha"]
    VERIFICAR -->|"No registrado"| NO_EXISTE
    NO_EXISTE --> FIN_FICHA["Formulario enviado -- Datos guardados"]

    EXISTE{"Cedula encontrada -- Revisar perfil"}
    VERIFICAR -->|"Registrado"| EXISTE

    UN_ROL["Un solo perfil detectado"]
    VARIOS_ROLES["Varios perfiles -- Elegir uno"]
    EXISTE -->|"1 perfil"| UN_ROL
    EXISTE -->|"2+ perfiles"| VARIOS_ROLES
    VARIOS_ROLES --> UN_ROL

    DESTINO{"Redirigir segun el perfil"}
    UN_ROL --> DESTINO

    ADMIN_LOGIN["Pantalla de login -- Correo y contrasena"]
    MI_PANEL["Mi Panel -- Ficha, encuestas, rubricas"]
    OPERADOR["Panel de Operador -- Datos de su region"]

    DESTINO -->|"Administrador"| ADMIN_LOGIN
    DESTINO -->|"Evaluador o Directivo"| MI_PANEL
    DESTINO -->|"Operador"| OPERADOR

    ADMIN_LOGIN --> ADMIN_OK{"Credenciales correctas?"}
    ADMIN_OK -->|"Si"| PANEL_ADMIN["Panel de Administracion"]
    ADMIN_OK -->|"No"| ADMIN_LOGIN`,
  },
];

export default function SpecsDiagramas() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/specs")}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Documentación
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 md:px-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Diagramas</h1>
        <p className="text-muted-foreground mb-8">Diagramas de flujo de los principales procesos de la plataforma.</p>

        <div className="space-y-10">
          {diagrams.map((d, i) => (
            <section key={i} className="border border-border rounded-lg p-6 bg-card">
              <h2 className="text-xl font-semibold text-foreground mb-1">{d.title}</h2>
              <p className="text-sm text-muted-foreground mb-4">{d.description}</p>
              <MermaidDiagram chart={d.chart} id={`diag-${i}`} />
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
