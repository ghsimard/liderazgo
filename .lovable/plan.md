

# Plan: Créer un PRD (Product Requirements Document) complet

## Objectif

Créer un fichier `PRD.md` à la racine du projet, rédigé en espagnol professionnel (langue du programme), structuré comme un vrai PRD qui aurait servi de base pour construire cette application. Le document sera basé sur l'analyse complète du code, du schéma de base de données, des routes, des composants et du SPECIFICATIONS.md existant.

## Structure du PRD

Le document contiendra les sections suivantes :

1. **Resumen Ejecutivo** — Vision, mission, problème résolu, proposition de valeur
2. **Contexto y Antecedentes** — Programme RLT/CLT en Colombie, besoin de digitalisation
3. **Objetivos del Producto** — Objectifs mesurables (collecte de données, suivi MEL, reporting)
4. **Usuarios y Personas** — 5 personas détaillées (Directivo, Evaluador, Operador, Admin, Superadmin) avec motivations, frustrations, parcours
5. **Alcance del Producto (Scope)** — In-scope vs out-of-scope, phases de livraison
6. **Requisitos Funcionales** — Organisés par module :
   - RF-01: Identificación por cédula et routage par rôle
   - RF-02: Ficha RLT (formulaire extensif ~60 champs)
   - RF-03: Encuesta 360° (6 types × 2 phases, configuration dynamique)
   - RF-04: Rúbricas de evaluación (4 niveaux, 3 colonnes, modules)
   - RF-05: Informe de Módulo (asistencia, évaluation individuelle, AI-assisted)
   - RF-06: Ambiente Escolar (3 formulaires)
   - RF-07: Satisfacción (3 types, configuration par région/module)
   - RF-08: MEL (KPIs, groupes, comparaison entrada/salida)
   - RF-09: Panel de Administración (sidebar, 9 hubs)
   - RF-10: Sistema (cuentas, actividad, papelera, purga)
   - RF-11: Panel Operador (permisos segmentados)
   - RF-12: Mi Panel (directivo self-service)
   - RF-13: Generación de PDFs (client-side jsPDF)
   - RF-14: Invitaciones por email
   - RF-15: Geografía configurable (regiones, entidades, municipios, instituciones)
7. **Requisitos No Funcionales** — Performance, sécurité (RLS, SECURITY DEFINER), accessibilité, responsive, i18n (espagnol uniquement)
8. **Arquitectura Técnica** — Stack (React/Vite/Tailwind/shadcn/Supabase), schéma DB simplifié, diagramme d'architecture
9. **Modelo de Datos** — Tables principales avec relations (diagramme ER Mermaid)
10. **Flujos de Usuario** — Diagrammes Mermaid pour chaque persona (repris/enrichis du SPECIFICATIONS.md)
11. **Criterios de Aceptación** — Par module, format Given/When/Then
12. **Riesgos y Mitigaciones** — Sécurité cédula, scalabilité, dépendance AI
13. **Métricas de Éxito** — KPIs du produit lui-même
14. **Roadmap** — Phases livrées + futures (Certificaciones)

## Implémentation

- Créer un seul fichier `PRD.md` à la racine (~400-500 lignes)
- Rédigé en espagnol professionnel
- Inclut des diagrammes Mermaid (architecture, ER, flows)
- Référence le SPECIFICATIONS.md pour les détails opérationnels

