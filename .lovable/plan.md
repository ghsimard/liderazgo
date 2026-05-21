# Cosa 4 — Ajouter « Jornada Nocturna » dans le nombre d'étudiants

## Objectif

Ajouter une nouvelle ligne **« Jornada Nocturna »** dans la section *Estudiantes por nivel educativo* de la ficha RLT, à côté de Preescolar, Primaria, Básica Secundaria, Media, Ciclo Complementario.

## Changements

### 🗄️ Base de données (SQL manuel sur Render)

Ajouter une nouvelle colonne à la table `fichas_rlt` :

```sql
ALTER TABLE fichas_rlt
  ADD COLUMN IF NOT EXISTS estudiantes_jornada_nocturna integer DEFAULT 0;
```

Aucune RLS, aucun schéma — simple `ALTER TABLE`.

### 🖥️ Site statique (Frontend)

1. **`src/pages/FichaRLT.tsx`**
   - Schéma Zod (~ligne 119) : ajouter `estudiantes_jornada_nocturna: z.string().optional()`.
   - Chargement (~ligne 549) : ajouter le mapping depuis `data.estudiantes_jornada_nocturna`.
   - Soumission (~ligne 742) : `estudiantes_jornada_nocturna: toInt(...)`.
   - Liste des niveaux (lignes 1664-1669 et 1685-1690) : ajouter `{ nivel: "Jornada Nocturna", label: "Jornada Nocturna", field: "estudiantes_jornada_nocturna" }`.

2. **`src/pages/AdminEditFicha.tsx`** — mêmes 4 ajustements (schéma, chargement, soumission, listes lignes 1272-1296).

3. **`src/utils/pdfGenerator.ts`** (ligne 283) — ajouter `"estudiantes_jornada_nocturna"` au tableau `nivelesKeys` pour qu'il s'affiche dans le PDF rempli.

4. **`src/utils/blankFichaPdfGenerator.ts`** — ajouter la ligne « Jornada Nocturna » dans le tableau vierge (à vérifier lors de l'édition).

5. **`src/utils/fichaFieldsPdfGenerator.ts`** — ajouter le champ dans la documentation des règles.

6. **`src/components/admin/AdminCaracterizacionTab.tsx`** — inclure `estudiantes_jornada_nocturna` dans le SELECT et dans les totaux d'étudiants (carte « Total Estudiantes por Nivel »).

### ⚙️ Web Service (Backend Express)

Aucun changement de code. Le proxy `dbClient` relaie automatiquement les nouveaux champs.

## Actions Render

- 🗄️ **Base de données** : exécuter manuellement le `ALTER TABLE` ci-dessus.
- 🖥️ **Site statique (Frontend)** : redeploy automatique après merge.
- ⚙️ **Web Service (Backend Express)** : aucun.

## Hors-scope

- Pas de modification des `jornadas` (déjà traité dans Cosa 3).
- Pas de migration de données existantes (DEFAULT 0 suffit).
