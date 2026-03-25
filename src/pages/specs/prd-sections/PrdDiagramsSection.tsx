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
    title: "Flujo Rúbricas — Directivo ↔ Evaluador",
    description: "Ciclo completo de evaluación por rúbrica a través de 4 módulos.",
    chart: `sequenceDiagram
    participant D as Directivo
    participant E as Evaluador

    rect rgb(219,234,254)
    Note over D,E: Modulo 1
    D->>D: 1. Autoevaluacion M1
    E->>D: 2. Evaluacion M1
    E->>D: 3. Reunion - Nivel Acordado M1
    end

    Note over D,E: Modulo 2 desbloqueado

    rect rgb(220,252,231)
    Note over D,E: Modulo 2
    D->>D: 5. Autoevaluacion M2
    E->>D: 6. Evaluacion M2
    Note right of E: 7. Puede reevaluar M1
    E->>D: 8. Reunion - Nivel Acordado M2
    end

    Note over D,E: Modulo 3 desbloqueado

    rect rgb(254,249,195)
    Note over D,E: Modulo 3
    D->>D: 10. Autoevaluacion M3
    E->>D: 11. Evaluacion M3
    Note right of E: 12. Puede reevaluar M1-M2
    E->>D: 13. Reunion - Nivel Acordado M3
    end

    Note over D,E: Modulo 4 desbloqueado

    rect rgb(254,226,226)
    Note over D,E: Modulo 4
    D->>D: 15. Autoevaluacion M4
    E->>D: 16. Evaluacion M4
    Note right of E: 17. Puede reevaluar M1-M2-M3
    E->>D: 18. Reunion - Nivel Acordado M4
    end

    Note over D,E: 19. Todos los modulos bloqueados - Read-only`,
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
    title: "Flujo de Sesión Simplificado",
    description: "Vista simplificada del flujo de inicio de sesión.",
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

export function PrdDiagramsSection() {
  return (
    <div className="space-y-8 my-8">
      {diagrams.map((d, i) => (
        <section key={i} className="border border-border rounded-lg p-6 bg-card">
          <h4 className="text-lg font-semibold text-foreground mb-1">{d.title}</h4>
          <p className="text-sm text-muted-foreground mb-4">{d.description}</p>
          <MermaidDiagram chart={d.chart} id={`prd-diag-${i}`} />
        </section>
      ))}
    </div>
  );
}
