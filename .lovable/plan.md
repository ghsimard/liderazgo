

# Plan : Import des 4 tables Ambiente Escolar (RLT-Stats) dans Lovable Cloud

## Résumé des données

| Table | Lignes | Colonnes |
|-------|--------|----------|
| `rectores` | 99 | 59 (id, excel_id, consentement, nom, cédula, genre, dates, formation, IE, cargo, géographie, stats élèves...) |
| `docentes_form_submissions` | 2 715 | 10 (id, created_at, institucion_educativa, anos_como_docente, grados_asignados, jornada, retroalimentacion_de, comunicacion, practicas_pedagogicas, convivencia) |
| `estudiantes_form_submissions` | 7 201 | 9 (id, created_at, institucion_educativa, anos_estudiando, grado_actual, jornada, comunicacion, practicas_pedagogicas, convivencia) |
| `acudientes_form_submissions` | 8 029 | 7 (id, created_at, institucion_educativa, grados_estudiantes, comunicacion, practicas_pedagogicas, convivencia) |

Les colonnes `comunicacion`, `practicas_pedagogicas` et `convivencia` contiennent des objets JSON (clé=question, valeur=réponse Likert).

---

## Etape 1 — Migration : Créer les 4 tables dans Lovable Cloud

Migration SQL pour créer les tables miroir avec le préfixe `ae_` et suffixe `_2025` :

### `ae_rectores_2025`
- `id` serial PRIMARY KEY
- `excel_id` integer
- 57 colonnes TEXT correspondant exactement aux en-têtes du CSV (noms longs avec underscores)
- `created_at` timestamptz DEFAULT now()

### `ae_docentes_submissions_2025`
- `id` serial PRIMARY KEY
- `created_at` timestamptz
- `institucion_educativa` text NOT NULL
- `anos_como_docente` text
- `grados_asignados` text (stocké comme texte brut du format PostgreSQL array)
- `jornada` text
- `retroalimentacion_de` text
- `comunicacion` jsonb NOT NULL DEFAULT '{}'
- `practicas_pedagogicas` jsonb NOT NULL DEFAULT '{}'
- `convivencia` jsonb NOT NULL DEFAULT '{}'

### `ae_estudiantes_submissions_2025`
- `id` serial PRIMARY KEY
- `created_at` timestamptz
- `institucion_educativa` text NOT NULL
- `anos_estudiando` text
- `grado_actual` text
- `jornada` text
- `comunicacion` jsonb NOT NULL DEFAULT '{}'
- `practicas_pedagogicas` jsonb NOT NULL DEFAULT '{}'
- `convivencia` jsonb NOT NULL DEFAULT '{}'

### `ae_acudientes_submissions_2025`
- `id` serial PRIMARY KEY
- `created_at` timestamptz
- `institucion_educativa` text NOT NULL
- `grados_estudiantes` text
- `comunicacion` jsonb NOT NULL DEFAULT '{}'
- `practicas_pedagogicas` jsonb NOT NULL DEFAULT '{}'
- `convivencia` jsonb NOT NULL DEFAULT '{}'

### RLS Policies (pour les 4 tables)
- SELECT : `has_admin_access(auth.uid())` pour les admins
- INSERT/UPDATE/DELETE : `has_admin_access(auth.uid())`
- SELECT supplémentaire pour `has_read_access(auth.uid())`

---

## Etape 2 — Import des données CSV

Script Python exécuté dans le sandbox qui :
1. Copie les 4 fichiers uploadés dans `/tmp/`
2. Parse chaque CSV avec pandas (séparateur tab `\t` pour les submissions, virgule pour rectores)
3. Convertit les colonnes `comunicacion`, `practicas_pedagogicas`, `convivencia` de format PostgreSQL JSONB string vers JSON valide
4. Insère les données via `psql COPY` ou insertions SQL par lots dans Lovable Cloud

Volume total : ~18 000 lignes, gérable en insertions directes.

---

## Etape 3 — Sous-onglet "Ambiente Escolar 2025" dans l'admin

### Frontend
- Nouveau composant `AdminAmbiente2025Tab.tsx` ajouté sous le menu "Ambiente Escolar"
- Mise à jour de `rbacSections.ts` : ajouter `ambiente-escolar.ae-2025` (label: "Línea Base 2025")
- Mise à jour de `AdminPage.tsx` : routing vers le nouveau composant

### Contenu initial du composant
- Compteurs : nombre de recteurs, soumissions docentes/estudiantes/acudientes
- Filtre par institution (dropdown des IE depuis `ae_rectores_2025`)
- Tableau récapitulatif des moyennes Likert par catégorie (comunicacion, practicas, convivencia) et par type de répondant

---

## Etape 4 — Mémoire projet

Sauvegarder `mem://features/ambiente-escolar/baseline-2025` documentant les 4 tables importées, leur structure, et le lien avec le module comparatif futur.

---

## Ordre d'exécution

1. Migration SQL (4 tables + RLS)
2. Script d'import des CSV (exec sandbox)
3. Composant admin + routing
4. Mémoire

## Actions requises de votre part
Aucune — tout sera fait dans Lovable Cloud avec les fichiers CSV déjà uploadés.

