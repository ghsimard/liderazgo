

## Plan: Create SPECIFICATIONS.md

**What**: Create a single `SPECIFICATIONS.md` file at the project root with complete documentation of the application, written in simple Spanish for non-programmers.

**Content structure**:

1. **Overview** — Purpose, target audience (Colombian educational leadership program RLT/CLT)
2. **User Roles** — Directivo, Evaluador, Operador, Administrador (+ Superadmin)
3. **User Flow Diagrams** — Mermaid diagrams for each role's journey
4. **Public Pages** — Landing, Ficha RLT, 360° Hub, Rubrica, Satisfaction forms, Ambiente Escolar forms
5. **Admin Panel — Sidebar Structure** — All sidebar entries
6. **Admin Panel — Hub Details** (one section per hub):
   - **Enlaces** — Links to all forms with copy/blank PDF buttons
   - **Fichas RLT** — Sub-tabs: Lista, Enlace y PDF, Configuración (Geography)
   - **Rúbricas** — Sub-tabs: Resultados, Informes por módulo, Informe regional, Configuración (Evaluadores y asignaciones)
   - **Encuesta 360°** — Sub-tabs: Formularios, Entrada, Salida, Invitaciones, Informes Entrada, Informes Salida, Configuración (Dominios/Competencias/Ítems/Ponderaciones)
   - **Informe de Módulo** — Sub-tabs: Asistencia, Informe de Módulo, Evaluación Individual, Reportes PDF
   - **Ambiente Escolar** — Sub-tabs: Monitoreo, Estadísticas, Enlaces
   - **Satisfacciones** — Sub-tabs: Respuestas, Estadísticas, Informe PDF, Formularios, Configuración
   - **Certificaciones** — En construction
   - **MEL** — Sub-tabs: MEL 360°, MEL Rúbricas, Configuración
   - **Sistema**: Gestión de Cuentas, Registro de Actividad, Papelera, Apreciaciones*, Mensajes*, Changelog*, Purgar datos* (*superadmin only)
7. **Technical Notes** — Authentication, PDF generation, activity logging, data recovery

**Implementation**: Single file write of `SPECIFICATIONS.md` (~300-400 lines of markdown with Mermaid diagrams).

