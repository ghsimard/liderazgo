# PRD — Plataforma de Gestión RLT / CLT

> **Producto:** Sistema Integral de Gestión para los programas Rectores Líderes Transformadores (RLT) y Coordinadores Líderes Transformadores (CLT)  
> **Versión:** 1.0  
> **Fecha:** Marzo 2026  
> **Estado:** En producción  

---

## 1. Resumen Ejecutivo

### 1.1 Visión

Crear la plataforma digital de referencia para la gestión integral de los programas de formación de directivos docentes en Colombia, centralizando la recolección de datos, la evaluación por competencias, el seguimiento MEL (Monitoreo, Evaluación y Aprendizaje) y la generación automatizada de informes.

### 1.2 Problema

Los programas RLT y CLT operan en múltiples regiones de Colombia con cientos de directivos docentes. Antes de esta plataforma:

- Los datos de los participantes se recolectaban en hojas de cálculo dispersas
- Las encuestas 360° se administraban en papel, dificultando el análisis agregado
- Los informes de módulo requerían semanas de consolidación manual
- No existía un sistema de seguimiento longitudinal (entrada vs. salida) para medir el impacto del programa
- La trazabilidad de las evaluaciones por rúbrica era inexistente

### 1.3 Propuesta de Valor

| Antes | Después |
|-------|---------|
| Fichas en Excel dispersas | Formulario digital centralizado con ~60 campos |
| Encuestas 360° en papel | 12 formularios digitales con ponderaciones configurables |
| Informes manuales en Word | Generación de PDF automatizada con narrativas asistidas por IA |
| Sin seguimiento MEL | Comparación automática entrada/salida con KPIs configurables |
| Sin control de acceso | 5 roles diferenciados con permisos granulares |

---

## 2. Contexto y Antecedentes

### 2.1 El Programa

**Rectores Líderes Transformadores (RLT)** y **Coordinadores Líderes Transformadores (CLT)** son programas de formación y acompañamiento para directivos docentes en Colombia, operados regionalmente. Cada programa se estructura en módulos presenciales (intensivos) seguidos de períodos de acompañamiento (interludios).

### 2.2 Actores del Ecosistema

- **Ministerio de Educación Nacional (MEN)** — Financiador y rector de política
- **Entidades Territoriales Certificadas (ETC)** — Secretarías de educación departamentales y municipales
- **Instituciones Educativas (IE)** — Colegios donde ejercen los directivos
- **Equipo de acompañamiento** — Evaluadores y formadores regionales
- **Operadores regionales** — Entidades que ejecutan el programa en cada región

### 2.3 Necesidad de Digitalización

El programa requiere una plataforma que:

1. Centralice la información de todos los participantes
2. Permita la aplicación estandarizada de instrumentos de evaluación
3. Genere informes consolidados por módulo, región y a nivel nacional
4. Facilite el seguimiento longitudinal del impacto del programa
5. Garantice la seguridad y trazabilidad de los datos

---

## 3. Objetivos del Producto

| ID | Objetivo | Métrica | Meta |
|----|----------|---------|------|
| O-01 | Digitalizar la recolección de fichas de directivos | % de fichas digitales vs. total de participantes | 100% |
| O-02 | Automatizar encuestas 360° | Tiempo de consolidación por encuesta | < 1 minuto |
| O-03 | Habilitar seguimiento MEL | Cobertura de evaluaciones entrada y salida | > 80% |
| O-04 | Reducir tiempo de generación de informes | Tiempo promedio por informe de módulo | < 30 minutos |
| O-05 | Garantizar trazabilidad completa | % de acciones registradas en log de actividad | 100% |

---

## 4. Usuarios y Personas

### 4.1 Directivo Docente

| Atributo | Detalle |
|----------|---------|
| **Rol** | Rector o Coordinador de una Institución Educativa |
| **Autenticación** | Número de cédula (sin contraseña) |
| **Motivación** | Completar los instrumentos requeridos por el programa |
| **Frustración** | Formularios largos, falta de retroalimentación visual |
| **Acciones principales** | Diligenciar Ficha RLT, responder autoevaluación 360°, consultar rúbricas |
| **Dispositivo típico** | Móvil o tablet |

### 4.2 Evaluador / Formador

| Atributo | Detalle |
|----------|---------|
| **Rol** | Miembro del equipo de acompañamiento regional |
| **Autenticación** | Cédula → Mi Panel |
| **Motivación** | Evaluar a los directivos asignados con instrumentos estandarizados |
| **Frustración** | Gestionar múltiples directivos sin visión consolidada |
| **Acciones principales** | Aplicar rúbricas, generar informes de módulo, administrar encuestas 360° |
| **Dispositivo típico** | Laptop |

### 4.3 Operador Regional

| Atributo | Detalle |
|----------|---------|
| **Rol** | Gestor operativo de una región específica |
| **Autenticación** | Cédula → Panel Operador |
| **Motivación** | Monitorear avances de su región con acceso restringido |
| **Frustración** | No tener visibilidad de los datos de su región |
| **Acciones principales** | Consultar secciones asignadas (fichas, encuestas, etc.) |
| **Dispositivo típico** | Laptop |

### 4.4 Administrador

| Atributo | Detalle |
|----------|---------|
| **Rol** | Gestor general del programa |
| **Autenticación** | Email + contraseña (JWT) |
| **Motivación** | Tener control completo sobre los datos y la configuración |
| **Frustración** | Complejidad de gestión multi-regional |
| **Acciones principales** | Gestionar fichas, rúbricas, encuestas, reportes, geografía, usuarios |
| **Dispositivo típico** | Desktop |

### 4.5 Superadmin

| Atributo | Detalle |
|----------|---------|
| **Rol** | Administrador técnico con privilegios máximos |
| **Autenticación** | Email + contraseña (JWT) |
| **Motivación** | Mantener la integridad y seguridad del sistema |
| **Acciones principales** | Gestión de cuentas, purga de datos, configuración avanzada |
| **Dispositivo típico** | Desktop |

---

## 5. Alcance del Producto

### 5.1 En Alcance (In-Scope)

- Recolección de datos vía formularios web (Ficha RLT, Encuestas 360°, Ambiente Escolar, Satisfacción)
- Evaluación por rúbricas con 4 niveles y seguimiento por módulo
- Generación de informes en PDF (client-side)
- Sistema de invitaciones por email para encuestas 360°
- Panel de administración con 9 hubs funcionales
- Sistema MEL con KPIs configurables
- Gestión geográfica jerárquica (Región → Entidad → Municipio → Institución)
- Log de actividad y sistema de papelera (soft delete)

### 5.2 Fuera de Alcance (Out-of-Scope)

- Aplicación móvil nativa
- Integración con sistemas del MEN (SIMAT, SINEB)
- Módulo de certificaciones y diplomas (roadmap futuro)
- Chat o mensajería interna entre usuarios
- Soporte multilingüe (solo español)

### 5.3 Fases de Entrega

| Fase | Módulos | Estado |
|------|---------|--------|
| **MVP** | Ficha RLT, Identificación por cédula, Panel Admin básico | ✅ Completado |
| **Fase 2** | Encuestas 360°, Rúbricas, Informes de Módulo | ✅ Completado |
| **Fase 3** | MEL, Satisfacciones, Ambiente Escolar, Operadores | ✅ Completado |
| **Fase 4** | Configuración avanzada (ponderaciones, KPI groups, formularios dinámicos) | ✅ Completado |
| **Fase 5** | Certificaciones, integraciones externas | 🔜 Planificado |

---

## 6. Requisitos Funcionales

### RF-01: Identificación por Cédula y Enrutamiento por Rol

**Descripción:** La página de inicio solicita el número de cédula del usuario. El sistema consulta la función `check_cedula_role` y enruta al usuario según sus roles detectados.

**Reglas de negocio:**
- Si la cédula tiene múltiples roles → mostrar diálogo de selección
- Si es operador → `/operador`
- Si es admin → `/admin/login` (requiere email + contraseña)
- Si es evaluador/directivo → `/mi-panel`
- Si no existe → confirmar cédula y redirigir a `/ficha`

**Validaciones:**
- Longitud: 6-10 dígitos
- Solo caracteres numéricos
- Persistencia en `sessionStorage` para auto-fill downstream

---

### RF-02: Ficha RLT

**Descripción:** Formulario extenso (~60 campos) para recopilar información personal, profesional e institucional de cada directivo.

**Secciones:**
1. Datos personales (nombres, apellidos, fecha de nacimiento, género, cédula)
2. Datos de contacto (celular, correo, contacto de emergencia)
3. Información profesional (cargo, estatuto, escalafón, vinculación)
4. Institución educativa (nombre, DANE, dirección, jornadas, niveles)
5. Datos académicos (títulos de pregrado, especialización, maestría, doctorado)
6. Información institucional (número de docentes, coordinadores, estudiantes por nivel)
7. Datos adicionales (discapacidad, enfermedad base, grupo étnico, lengua materna)
8. Aceptación de datos personales

**Tabla:** `fichas_rlt`  
**Restricción:** Upsert por `numero_cedula` (un directivo = una ficha)

---

### RF-03: Encuesta 360°

**Descripción:** Sistema de evaluación multi-perspectiva con 6 tipos de formulario × 2 fases (entrada y salida) = 12 formularios.

**Tipos de formulario:**
| Tipo | Evaluador | Evaluado |
|------|-----------|----------|
| Autoevaluación | El directivo mismo | El directivo |
| Docente | Un docente de la IE | El directivo |
| Estudiante | Un estudiante | El directivo |
| Acudiente | Un padre/acudiente | El directivo |
| Administrativo | Personal administrativo | El directivo |
| Directivo | Otro directivo | El directivo |

**Configuración dinámica:**
- **Dominios** (`domains_360`) → **Competencias** (`competencies_360`) → **Ítems** (`items_360`)
- Cada ítem tiene textos diferenciados por tipo de formulario (`item_texts_360`)
- **Ponderaciones** (`competency_weights`) por competencia × rol observador, totalizando 1.000 por rol
- Tipos de respuesta: Likert 1-4, Likert 1-5, Sí/No

**Sistema de invitaciones:**
- Generación de links únicos con token
- Envío por email vía edge function `send-email`
- Tracking de accesos y respuestas
- Recordatorios automáticos

**Tabla:** `encuestas_360`  
**Tabla auxiliar:** `encuesta_invitaciones`

---

### RF-04: Rúbricas de Evaluación

**Descripción:** Instrumento de evaluación por rúbrica con 4 niveles de desempeño, organizado por módulos.

**Estructura:**
- **Módulos** (`rubrica_modules`) — Agrupación temática con número y objetivo
- **Ítems** (`rubrica_items`) — Criterios evaluables con descriptores por nivel
- **Niveles:** Sin evidencia, Básico, Intermedio, Avanzado

**Columnas de evaluación:**
1. **Equipo** — Evaluación del equipo de acompañamiento
2. **Directivo** — Autoevaluación del directivo
3. **Acordado** — Nivel consensuado entre ambos

**Seguimiento longitudinal:**
- `rubrica_evaluaciones` — Evaluación inicial (entrada)
- `rubrica_seguimientos` — Seguimiento por módulo posterior

**Actores:**
- Evaluadores registrados en `rubrica_evaluadores`
- Asignaciones directivo↔evaluador en `rubrica_asignaciones`

---

### RF-05: Informe de Módulo

**Descripción:** Informe consolidado por módulo y región, con asistencia, novedades, estrategias y narrativas asistidas por IA.

**Componentes:**
1. **Asistencia** (`informe_asistencia`) — Registro día a día, sesión AM/PM, con razón de inasistencia
2. **Informe del directivo** (`informe_directivo`) — Avances y retos por dimensión (personal, pedagógica, administrativa)
3. **Informe de módulo** (`informe_modulo`) — Consolidado regional con equipo, sesiones, estrategias, articulación
4. **Evaluación individual** — Valoración cualitativa por directivo

**Generación de narrativas IA:**
- Edge function `generate-section-text` para textos asistidos
- Edge function `generate-executive-summary` para resumen ejecutivo
- Modelo: Gemini 2.5 Flash (vía Lovable AI)

**Generación de PDF:** Client-side con jsPDF, incluyendo logos dinámicos por región

---

### RF-06: Ambiente Escolar

**Descripción:** Tres encuestas de percepción del ambiente escolar, dirigidas a diferentes actores de la comunidad educativa.

**Formularios:**
1. Encuesta para Estudiantes
2. Encuesta para Docentes
3. Encuesta para Acudientes

**Tabla:** `encuestas_ambiente_escolar`  
**Administración:** Monitoreo de respuestas y estadísticas agregadas

---

### RF-07: Satisfacción

**Descripción:** Encuestas de satisfacción configurables por región, módulo y tipo de formulario.

**Tipos:**
1. Satisfacción de Asistencia
2. Satisfacción de Intensivo
3. Satisfacción de Interludio

**Configuración:**
- `satisfaccion_config` — Activación por (región, módulo, tipo) con fechas de disponibilidad
- `satisfaccion_form_definitions` — Definición dinámica de preguntas por tipo
- `satisfaccion_report_content` — Contenido editorial para informes por (región, módulo, tipo)

**Tabla de respuestas:** `satisfaccion_responses`  
**Generación de PDF:** Informe con gráficos Recharts exportados como imagen

---

### RF-08: MEL (Monitoreo, Evaluación y Aprendizaje)

**Descripción:** Sistema de indicadores (KPIs) que compara datos de entrada y salida para medir el impacto del programa.

**Estructura:**
- `mel_kpi_config` — Definición de cada KPI con fórmula, meta, nivel requerido
- `mel_kpi_groups` — Agrupación de KPIs para asignación regional
- `mel_kpi_group_items` — Relación grupo↔KPI con meta opcional override
- Cada región (`regiones`) se asocia a un `kpi_group_id`

**Tipos de fórmula:**
| Tipo | Descripción |
|------|-------------|
| `rubrica_level` | % de directivos que alcanzan un nivel en un ítem de rúbrica |
| `rubrica_delta` | Variación de nivel entre módulos |
| `encuesta_360_avg` | Promedio de respuestas 360° |
| `encuesta_360_delta` | Delta entre fases entrada y salida |
| `satisfaccion_avg` | Promedio de satisfacción |
| `asistencia_rate` | Tasa de asistencia |
| `fichas_complete` | % de fichas completadas |

**Reportes:**
- Informe MEL por rúbrica (comparación entrada/salida por ítem)
- Informe MEL global (todos los KPIs de un grupo)

---

### RF-09: Panel de Administración

**Descripción:** Interface de administración organizada en 9 hubs accesibles desde un sidebar lateral.

**Hubs:**
1. **Enlaces** — Links a formularios públicos y PDFs en blanco
2. **Fichas** — Listado, búsqueda, filtros, exportación de fichas RLT
3. **Rúbricas** — Resultados, informes, evaluadores, asignaciones, configuración
4. **Encuesta 360°** — Monitoreo, reporte 360°, configuración de dominios/competencias/ítems/ponderaciones
5. **Informe de Módulo** — Asistencia, informes por módulo, evaluación individual
6. **Ambiente Escolar** — Monitoreo de respuestas, estadísticas
7. **Satisfacciones** — Respuestas, estadísticas, formularios, configuración
8. **MEL** — KPIs, grupos, informes globales
9. **Sistema** — Cuentas, actividad, papelera, purga, changelog

---

### RF-10: Sistema

**Descripción:** Herramientas de administración del sistema.

**Componentes:**
- **Gestión de cuentas** — CRUD de usuarios admin con roles (admin/superadmin), badges visuales
- **Log de actividad** — Registro automático de acciones con cédula, tipo, detalle, timestamp, IP, user-agent
- **Papelera** — Recuperación de registros eliminados (soft delete → `deleted_records`)
- **Purga de datos** — Eliminación masiva por tabla/región (solo superadmin, requiere confirmación por texto)
- **Changelog** — Registro de cambios y versiones

---

### RF-11: Panel Operador

**Descripción:** Vista restringida del panel de administración para operadores regionales.

**Tabla:** `operator_permissions`  
**Campos de segmentación:** región, entidad, institución, sección, módulo  
**Principio:** El operador solo ve las secciones y datos que le han sido asignados por un administrador.

---

### RF-12: Mi Panel (Directivo/Evaluador)

**Descripción:** Panel self-service para directivos y evaluadores, accesible por cédula.

**Funcionalidades:**
- Consultar y editar su propia ficha RLT
- Ver rúbricas y evaluaciones asignadas
- Acceder a encuestas 360° pendientes
- Generar informes de módulo para sus directivos asignados
- Gestionar invitaciones de encuestas

---

### RF-13: Generación de PDFs

**Descripción:** Generación de documentos PDF completamente client-side usando jsPDF.

**Tipos de PDF:**
| PDF | Generador |
|-----|-----------|
| Ficha RLT completada | `pdfGenerator.ts` |
| Ficha RLT en blanco | `blankFichaPdfGenerator.ts` |
| Rúbrica completada | `melRubricaPdfGenerator.ts` |
| Rúbrica en blanco | `blankRubricaPdfGenerator.ts` |
| Encuesta 360° en blanco | `blankEncuesta360PdfGenerator.ts` |
| Reporte 360° | `reporte360PdfGenerator.ts` |
| Reporte 360° MEL | `reporte360MelPdfGenerator.ts` |
| Informe de Módulo | `informeModuloPdfGenerator.ts` |
| Informe Rúbrica por Módulo | `rubricaModulePdfGenerator.ts` |
| Informe Rúbrica Regional | `rubricaRegionalPdfGenerator.ts` |
| Ambiente Escolar | `ambienteEscolarReportPdfGenerator.ts` |
| Ambiente Escolar en blanco | `blankAmbienteEscolarPdfGenerator.ts` |
| Satisfacción | `satisfaccionPdfGenerator.ts` |
| MEL Global | `melGlobalPdfGenerator.ts` |

**Logos dinámicos:** Cada región configura qué logos mostrar (`mostrar_logo_rlt`, `mostrar_logo_clt`). Los logos se cargan desde `app_images`.

---

### RF-14: Invitaciones por Email

**Descripción:** Sistema de invitaciones para encuestas 360° vía email.

**Flujo:**
1. Evaluador genera link de invitación con token único
2. Sistema envía email vía edge function `send-email`
3. Destinatario accede al formulario con el token (sin necesidad de cédula)
4. Sistema registra accesos y respuesta
5. Evaluador puede enviar recordatorios

**Tabla:** `encuesta_invitaciones`

---

### RF-15: Geografía Configurable

**Descripción:** Sistema jerárquico de geografía completamente configurable desde el panel de administración.

**Jerarquía:**
```
Región
├── Entidad Territorial (ETC)
│   └── Municipio
│       └── Institución Educativa
```

**Tablas:**
- `regiones` — Con configuración de logos y grupo MEL
- `entidades_territoriales`
- `municipios`
- `instituciones`
- `region_entidades`, `region_municipios`, `region_instituciones` — Tablas de relación

---

## 7. Requisitos No Funcionales

### RNF-01: Rendimiento
- Tiempo de carga inicial: < 3 segundos
- Generación de PDF: < 10 segundos para informes complejos
- Consultas de base de datos: < 500ms para operaciones CRUD

### RNF-02: Seguridad
- **Autenticación dual:** Cédula (público) + Email/JWT (admin)
- **Row Level Security (RLS)** en todas las tablas sensibles
- **Funciones `SECURITY DEFINER`** para verificación de roles sin recursión
- **Roles en tabla separada** (`user_roles`) — nunca en tabla de perfiles
- Tokens JWT con expiración de 24 horas
- Nunca almacenar claves privadas en el código

### RNF-03: Disponibilidad
- Uptime objetivo: 99.5%
- Tolerancia a fallos: degradación graceful si servicios de IA no disponibles

### RNF-04: Usabilidad
- Responsive design (mobile-first para directivos)
- Interfaz en español colombiano
- Feedback visual inmediato (toasts, estados de carga, badges)
- Formularios con auto-guardado y validación en tiempo real

### RNF-05: Accesibilidad
- Contraste adecuado (WCAG AA)
- Navegación por teclado
- Labels semánticos en formularios

### RNF-06: Mantenibilidad
- Componentes reutilizables (shadcn/ui)
- Separación de lógica de negocio y presentación
- Generadores de PDF modulares
- Logging centralizado de actividad

---

## 8. Arquitectura Técnica

### 8.1 Stack Tecnológico

| Capa | Tecnología |
|------|------------|
| **Frontend** | React 18 + TypeScript + Vite |
| **Estilos** | Tailwind CSS + shadcn/ui |
| **Estado** | TanStack Query (caché + sincronización) |
| **Animaciones** | Framer Motion |
| **Gráficos** | Recharts |
| **PDF** | jsPDF (client-side) |
| **Rich Text** | TipTap |
| **Drag & Drop** | @hello-pangea/dnd |
| **Backend** | Supabase (PostgreSQL + Auth + Storage + Edge Functions) |
| **IA** | Lovable AI (Gemini 2.5 Flash) |

### 8.2 Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────┐
│                   FRONTEND                       │
│  React + Vite + Tailwind + shadcn/ui            │
│                                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
│  │ Páginas  │ │Componentes│ │  Generadores PDF │ │
│  │ públicas │ │  Admin    │ │  (jsPDF)         │ │
│  └────┬─────┘ └────┬─────┘ └────────┬─────────┘ │
│       │             │                │           │
│       └─────────────┼────────────────┘           │
│                     │                            │
│              ┌──────┴──────┐                     │
│              │  dbClient   │ (dual mode)         │
│              └──────┬──────┘                     │
└─────────────────────┼────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
   ┌────▼────┐  ┌─────▼─────┐ ┌────▼────┐
   │Supabase │  │  Edge      │ │ Storage │
   │PostgreSQL│  │ Functions  │ │ (logos) │
   │ + RLS   │  │ (email,IA) │ │         │
   └─────────┘  └───────────┘  └─────────┘
```

### 8.3 Modo Dual (dbClient)

La plataforma soporta dos modos de operación:
- **Modo Supabase** (producción): Conexión directa al cliente Supabase
- **Modo Express** (desarrollo/alternativo): Proxy a través de API REST Express con PostgreSQL directo

El módulo `dbClient.ts` abstrae ambos modos con una API compatible con Supabase.

---

## 9. Modelo de Datos

### 9.1 Tablas Principales

| Grupo | Tablas | Descripción |
|-------|--------|-------------|
| **Identidad** | `fichas_rlt`, `admin_cedulas` | Datos de participantes y cédulas admin |
| **Encuestas 360°** | `encuestas_360`, `encuesta_invitaciones`, `domains_360`, `competencies_360`, `items_360`, `item_texts_360`, `competency_weights` | Instrumentos y respuestas 360° |
| **Rúbricas** | `rubrica_modules`, `rubrica_items`, `rubrica_evaluaciones`, `rubrica_seguimientos`, `rubrica_evaluadores`, `rubrica_asignaciones`, `rubrica_submission_dates`, `rubrica_regional_analyses` | Evaluación por rúbrica |
| **Informes** | `informe_modulo`, `informe_modulo_equipo`, `informe_directivo`, `informe_asistencia` | Informes de módulo |
| **Ambiente** | `encuestas_ambiente_escolar` | Encuestas de clima escolar |
| **Satisfacción** | `satisfaccion_responses`, `satisfaccion_config`, `satisfaccion_form_definitions`, `satisfaccion_report_content` | Encuestas de satisfacción |
| **MEL** | `mel_kpi_config`, `mel_kpi_groups`, `mel_kpi_group_items` | Indicadores de monitoreo |
| **Geografía** | `regiones`, `entidades_territoriales`, `municipios`, `instituciones`, `region_entidades`, `region_municipios`, `region_instituciones` | Estructura geográfica |
| **Sistema** | `users`, `user_roles`, `user_activity_log`, `deleted_records`, `app_settings`, `app_images`, `contact_messages`, `site_reviews`, `operator_permissions` | Administración |

### 9.2 Relaciones Clave

```
fichas_rlt.numero_cedula ←──→ rubrica_asignaciones.directivo_cedula
                         ←──→ encuestas_360.cedula_directivo
                         ←──→ informe_directivo.directivo_cedula
                         ←──→ informe_asistencia.directivo_cedula
                         ←──→ satisfaccion_responses.cedula

rubrica_evaluadores ──1:N──→ rubrica_asignaciones ──N:1──→ fichas_rlt
rubrica_modules ──1:N──→ rubrica_items ──1:N──→ rubrica_evaluaciones
                                       ──1:N──→ rubrica_seguimientos

domains_360 ──1:N──→ competencies_360
items_360 ──1:N──→ item_texts_360

regiones ──M:N──→ entidades_territoriales (via region_entidades)
         ──M:N──→ municipios (via region_municipios)
         ──M:N──→ instituciones (via region_instituciones)

regiones ──N:1──→ mel_kpi_groups ──1:N──→ mel_kpi_group_items ──N:1──→ mel_kpi_config
```

---

## 10. Flujos de Usuario Principales

### 10.1 Flujo del Directivo

```
Ingresa cédula → check_cedula_role →
  ├── Sin ficha → Confirmar cédula → Diligenciar Ficha RLT
  ├── Con ficha (directivo) → Mi Panel
  │   ├── Ver/editar ficha
  │   ├── Responder autoevaluación 360°
  │   └── Consultar rúbricas
  └── Múltiples roles → Seleccionar rol → Panel correspondiente
```

### 10.2 Flujo del Evaluador

```
Ingresa cédula → check_cedula_role → Mi Panel →
  ├── Rúbricas
  │   ├── Seleccionar directivo asignado
  │   ├── Evaluar ítems (equipo + acordado)
  │   └── Generar PDF de rúbrica
  ├── Informe de Módulo
  │   ├── Registrar asistencia
  │   ├── Completar informe
  │   ├── Generar narrativa IA
  │   └── Exportar PDF
  └── Encuestas 360°
      ├── Compartir enlace de invitación
      ├── Monitorear respuestas
      └── Generar reporte 360°
```

### 10.3 Flujo del Administrador

```
Ingresa cédula → Detecta rol admin → /admin/login →
  Email + contraseña → JWT → Panel Admin →
  Sidebar con 9 hubs → Seleccionar hub → Gestionar datos
```

---

## 11. Criterios de Aceptación (Selección)

### CA-01: Identificación por Cédula

| # | Dado | Cuando | Entonces |
|---|------|--------|----------|
| 1 | Un directivo con ficha existente | Ingresa su cédula | Es redirigido a Mi Panel |
| 2 | Una cédula nueva | Ingresa la cédula | Se muestra diálogo de confirmación y se redirige a formulario de ficha |
| 3 | Un usuario con rol admin y evaluador | Ingresa su cédula | Se muestra diálogo de selección de rol |
| 4 | Una cédula con menos de 6 dígitos | Intenta continuar | Se muestra error de validación |

### CA-02: Encuesta 360°

| # | Dado | Cuando | Entonces |
|---|------|--------|----------|
| 1 | Un evaluador con directivos asignados | Genera link de invitación | Se crea token único y se envía email |
| 2 | Un destinatario con token válido | Accede al link | Ve el formulario pre-rellenado con datos del directivo |
| 3 | Un formulario completado | Se envía la respuesta | Se registra en `encuestas_360` y se marca la invitación como respondida |

### CA-03: Rúbricas

| # | Dado | Cuando | Entonces |
|---|------|--------|----------|
| 1 | Un evaluador evalúa un ítem | Selecciona nivel "Intermedio" | Se guarda en `rubrica_evaluaciones` con timestamp |
| 2 | Un administrador genera reporte regional | Selecciona región y módulo | Se genera PDF con distribución de niveles por ítem |

---

## 12. Riesgos y Mitigaciones

| # | Riesgo | Probabilidad | Impacto | Mitigación |
|---|--------|-------------|---------|------------|
| R-01 | Acceso no autorizado por cédula adivinada | Media | Alto | La cédula solo da acceso a datos propios; acciones admin requieren JWT |
| R-02 | Pérdida de datos por eliminación accidental | Baja | Alto | Sistema de papelera (soft delete) con recuperación |
| R-03 | Indisponibilidad del servicio de IA | Media | Bajo | Narrativas IA son opcionales; formularios funcionan sin IA |
| R-04 | Formularios incompletos por complejidad | Media | Medio | Auto-guardado, validación progresiva, indicadores de progreso |
| R-05 | Escalabilidad con múltiples regiones | Baja | Medio | Arquitectura basada en regiones con filtros; índices DB apropiados |
| R-06 | Dependencia de generación PDF client-side | Baja | Medio | jsPDF es maduro y sin dependencias server; PDFs se generan offline |

---

## 13. Métricas de Éxito del Producto

| Métrica | Definición | Meta |
|---------|------------|------|
| Tasa de completitud de fichas | Fichas completas / Directivos registrados | > 95% |
| Cobertura de encuestas 360° | Directivos con ≥ 3 tipos de evaluador | > 80% |
| Tiempo de generación de informes | Desde inicio hasta PDF generado | < 30 min |
| Adopción de rúbricas | Directivos con evaluación entrada completa | > 90% |
| Satisfacción del usuario | Rating promedio en encuestas de satisfacción | ≥ 4.0 / 5.0 |
| Uptime del sistema | Disponibilidad mensual | > 99.5% |

---

## 14. Roadmap

| Trimestre | Entregables |
|-----------|------------|
| **T1 2025** | MVP: Ficha RLT, identificación por cédula, panel admin básico |
| **T2 2025** | Encuestas 360°, rúbricas, invitaciones por email |
| **T3 2025** | Informes de módulo, ambiente escolar, satisfacciones |
| **T4 2025** | MEL, KPI groups, configuración avanzada, panel operador |
| **T1 2026** | Optimizaciones, reportes regionales, changelog, purga de datos |
| **T2 2026** | Certificaciones digitales, integraciones externas (planificado) |

---

## Apéndices

### A. Referencia de Documentación

- **SPECIFICATIONS.md** — Documentación operativa detallada con mindmaps por hub
- **server/schema.sql** — Esquema completo de base de datos
- **server/MIGRATION_GUIDE.md** — Guía de migración entre modos (Supabase ↔ Express)

### B. Edge Functions

| Función | Propósito |
|---------|-----------|
| `send-email` | Envío de invitaciones 360° y notificaciones |
| `create-user` | Creación de usuarios admin |
| `manage-users` | Gestión CRUD de usuarios |
| `generate-section-text` | Generación de narrativas IA para informes |
| `generate-executive-summary` | Resumen ejecutivo IA para informes de módulo |
| `rubrica-analysis` | Análisis IA de resultados de rúbrica |
| `github-commits` | Consulta de commits para changelog |
| `export-database` | Exportación de datos |

### C. Generadores de PDF

Todos los PDFs se generan client-side con `jsPDF`. Los generadores se encuentran en `src/utils/` y siguen un patrón común:

1. Carga de logos desde `app_images` (con caché)
2. Construcción del documento con cabecera y paginación
3. Renderizado de tablas, gráficos y textos formateados
4. Descarga automática del archivo

---

*Documento generado como referencia retrospectiva del producto. Para detalles operativos, consultar [SPECIFICATIONS.md](./SPECIFICATIONS.md).*
