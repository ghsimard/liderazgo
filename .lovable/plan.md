

## Plan: Ajouter les mindmaps détaillés au SPECIFICATIONS.md

**Quoi**: Ajouter une nouvelle section **8. Mindmaps Détaillés par Hub** à la fin du fichier `SPECIFICATIONS.md` (après la ligne 365), contenant 10 mindmaps Mermaid — un général + un par hub admin.

**Contenu à ajouter** (environ 250 lignes):

1. **Mindmap Général** — Vue d'ensemble de toute l'application (pages publiques, panel admin, rôles)
2. **Mindmap Enlaces** — Links et PDFs en blanco
3. **Mindmap Fichas RLT** — Lista, filtres, géographie, export
4. **Mindmap Rúbricas** — Résultats, informes, évaluateurs, assignations
5. **Mindmap Encuesta 360°** — Cycle complet entrada/salida, invitations, configuration (dominios/competencias/ítems/ponderaciones)
6. **Mindmap Informe de Módulo** — Asistencia, informe, evaluación individual, PDFs
7. **Mindmap Ambiente Escolar** — Monitoreo, estadísticas, enlaces
8. **Mindmap Satisfacciones** — Respuestas, estadísticas, PDF, formularios, configuración
9. **Mindmap MEL** — KPIs, grupos, comparación entrada/salida, informe global
10. **Mindmap Sistema** — Cuentas, actividad, papelera, sections superadmin

**Implémentation**: Ajout en fin de fichier via `line_replace` après la ligne 365.

