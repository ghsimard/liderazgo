

## Décisions intégrées

1. **Hors fenêtre** → Bloquer avec message clair en espagnol : *"La campaña [nombre] está [programada para iniciar el DD/MM/YYYY | cerrada desde el DD/MM/YYYY]. No se aceptan respuestas en este momento."*
2. **Pas de rappels email** automatiques.
3. **Archivage** automatique après 3 ans (vue séparée filtrée par défaut).

## Terminologie — propositions pour remplacer Entrada/Salida

| Option | Phase 1 | Phase 2 | Notes |
|---|---|---|---|
| **A. Diagnóstico / Impacto** | Diagnóstico | Impacto | Évoque l'état initial puis l'effet du programme |
| **B. Línea Base / Cierre** | Línea Base | Cierre | Cohérent avec "Línea Base 2025" déjà utilisé |
| **C. Antes / Después** | Antes | Después | Simple, naturel pour les répondants |
| **D. Inicial / Evolución** | Inicial | Evolución | Souligne la dimension de progression |

Je recommande **B (Línea Base / Cierre)** pour la cohérence avec la nomenclature existante du projet (onglet "Línea Base 2025"), mais à valider.

## Concept "Campaña"

Une campagne = fenêtre temporelle de collecte définie par :
- **Cohorte** (région/ET, ex: Oriente 2026)
- **Fase** (línea_base ou cierre)
- **Fecha inicio + fecha fin** (obligatoires)
- **Estado auto-calculé** : Programada / Activa / Cerrada / Archivada (>3 ans)

Une seule campagne par (cohorte, fase) — contrainte unique.

## Flux usager

```text
Usager ouvre /encuesta-ambiente-docentes
  → choisit institución
  → système cherche campaña Activa pour (institución, hoy entre fechas)
  → si trouvée : injecte cohorte_id + fase + entidad_territorial
  → si Programada : "La campaña inicia el DD/MM/YYYY"
  → si Cerrada : "La campaña terminó el DD/MM/YYYY"
  → si aucune : "No hay campaña activa para tu institución"
```

## Changements base de données

**Nouvelle table `ae_campanas`**
| Colonne | Type | Description |
|---|---|---|
| id | uuid PK | |
| cohorte_id | uuid → ae_cohortes | |
| fase | text | 'linea_base' ou 'cierre' |
| fecha_inicio | date NOT NULL | |
| fecha_fin | date NOT NULL | check fin ≥ inicio |
| nombre | text | auto: "Oriente 2026 — Línea Base" |
| created_at | timestamptz | now() |

UNIQUE (cohorte_id, fase)

**Modification `encuestas_ambiente_escolar`**
- Ajouter colonne `fase` (text, nullable rétrocompatible)
- Ajouter colonne `campana_id` (uuid, nullable) pour traçabilité directe

## Interface Admin — nouvel onglet "Campañas"

Dans la section Ambiente Escolar (à côté de Monitoreo / Enlaces / Estadísticas / Delta) :

- **Tableau** : Cohorte | Fase | Inicio | Fin | Estado (badge) | Respuestas | Acciones
- **Bouton "Nueva campaña"** : sélection cohorte + fase + dates avec validation
- **Filtres** : región, fase, estado (Programada/Activa/Cerrada/Archivada)
- **Toggle "Mostrar archivadas"** : par défaut masquées
- **Édition/Suppression** : suppression bloquée si réponses existent

## Onglet Delta — enrichissement

Sous l'onglet Delta existant, ajouter sous-onglet **"Análisis por Campaña"** :
- Sélection cohorte + comparaison Línea Base vs Cierre
- Calcul Δ par dimension (Convivencia, Comunicación, Prácticas Pedagógicas) et par grupo (docentes/estudiantes/acudientes)
- Visualisation : barres horizontales avec flèche ▲▼ et delta en points

## Monitoreo — adaptation

Ajouter filtre **Fase** (Todas / Línea Base / Cierre) pour distinguer visuellement les deux vagues dans le tableau de comptage.

## Fichiers impactés

| Fichier | Action |
|---|---|
| Migration SQL | Créer `ae_campanas` + colonnes `fase`/`campana_id` sur `encuestas_ambiente_escolar` |
| `src/components/AmbienteEscolarForm.tsx` | Lookup campagne active après sélection IE ; injection auto + messages d'erreur fenêtre |
| `src/components/admin/AdminAmbienteCampanasTab.tsx` | NOUVEAU — CRUD campagnes |
| `src/components/admin/AdminAmbienteMonitorTab.tsx` | Ajouter filtre Fase |
| `src/components/admin/AdminAmbienteDeltaTab.tsx` | NOUVEAU — Analyse Δ par campagne |
| `src/pages/AdminPage.tsx` | Nouvel onglet "Campañas" + sous-onglet Delta |

## Actions de déploiement

- 🗄️ **Base de données** (Manual SQL) : table `ae_campanas` + 2 colonnes ajoutées
- 🖥️ **Site statique (Frontend)** : redéploiement Render — nouvel onglet Admin + logique formulaires publics + analyse Delta
- ⚙️ **Web Service (Backend Express)** : aucun changement — proxy DB existant suffit

## À confirmer avant codage

1. **Terminologie** : valides-tu **Línea Base / Cierre** (option B) ou préfères-tu une autre option (A, C, D) ?
2. **Suppression d'une campagne avec réponses** : interdite totalement, ou autorisée pour Superadmin uniquement ?

