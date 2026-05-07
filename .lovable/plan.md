## Import Prod → Dev — 5 tables

CSVs reçus et validés visuellement :

| Fichier | Lignes (approx.) | Notes |
|---|---|---|
| `fichas_rlt.csv` | ~231 fiches | Contient les 25 directivos Quibdó attendus + Oriente |
| `informe_modulo.csv` | 2 informes | En-tête confirme alignement colonnes Dev |
| `informe_modulo_equipo.csv` | 1 ligne | ESTEFANIA HINCAPIE MACIAS — Coach educativa |
| `informe_directivo.csv` | ~30-50 informes (champs multi-lignes) | Lié via `informe_id` |
| `informe_asistencia.csv` | ~283 entrées | Lié via `directivo_cedula` |

### Plan d'exécution (mode build)

**Étape 1 — Vérifications préalables**
- Copier les 5 CSVs vers `/tmp/` via `code--copy`
- Vérifier que `PGHOST` est dispo dans le sandbox (`test -n "$PGHOST"`)
- Comparer en-têtes CSV vs colonnes Dev avec `\d nom_table` pour détecter toute désynchro de schéma avant TRUNCATE

**Étape 2 — Migration TRUNCATE + import (transaction unique)**

```sql
BEGIN;

TRUNCATE 
  public.informe_asistencia,
  public.informe_directivo,
  public.informe_modulo_equipo,
  public.informe_modulo,
  public.fichas_rlt
RESTART IDENTITY CASCADE;

\copy public.fichas_rlt FROM '/tmp/fichas_rlt.csv' WITH (FORMAT CSV, HEADER true, NULL '');
\copy public.informe_modulo FROM '/tmp/informe_modulo.csv' WITH (FORMAT CSV, HEADER true, NULL '');
\copy public.informe_modulo_equipo FROM '/tmp/informe_modulo_equipo.csv' WITH (FORMAT CSV, HEADER true, NULL '');
\copy public.informe_directivo FROM '/tmp/informe_directivo.csv' WITH (FORMAT CSV, HEADER true, NULL '');
\copy public.informe_asistencia FROM '/tmp/informe_asistencia.csv' WITH (FORMAT CSV, HEADER true, NULL '');

COMMIT;
```

**Étape 3 — Validation post-import**

```sql
-- Doit retourner 25
SELECT COUNT(*) AS quibdo_directivos
FROM fichas_rlt
WHERE region = 'Quibdó 2026'
  AND cargo_actual IN ('Rector/a','Coordinador/a');

-- Comptages de contrôle
SELECT 'fichas_rlt' t, COUNT(*) FROM fichas_rlt
UNION ALL SELECT 'informe_modulo', COUNT(*) FROM informe_modulo
UNION ALL SELECT 'informe_modulo_equipo', COUNT(*) FROM informe_modulo_equipo
UNION ALL SELECT 'informe_directivo', COUNT(*) FROM informe_directivo
UNION ALL SELECT 'informe_asistencia', COUNT(*) FROM informe_asistencia;

-- Vérif intégrité référentielle informe_id
SELECT COUNT(*) AS orphelins
FROM informe_directivo d
LEFT JOIN informe_modulo m ON m.id = d.informe_id
WHERE m.id IS NULL;
```

**Étape 4 — Rapport au user**
- Confirmer le nombre de lignes par table
- Confirmer les 25 directivos Quibdó visibles dans `/admin?tab=informe-modulo`
- Signaler tout écart (orphelins, colonnes manquantes)

### Risques identifiés et mitigations

| Risque | Mitigation |
|---|---|
| Colonne CSV absente en Dev | Vérification `\d` avant TRUNCATE — si désynchro, je stoppe et te liste les colonnes manquantes au lieu de tronquer |
| Champs JSONB malformés (`{}` vide vs `[]`) | Le `\copy` accepte les deux formats si la colonne est `jsonb` |
| Champs texte multi-lignes (informe_directivo) | CSV utilise quotes `"..."` correctement échappées dans l'export Postgres standard — OK |
| Sandbox `PGHOST` indisponible | Fallback : utiliser `supabase--read_query` pour validation et migration tool pour exécution |
| `admin_cedulas` non importé → admins Dev cassés | Hors scope, à recréer via UI Cuentas après import |

### Hors scope (pas dans cet import)
- `admin_cedulas`, `entidades_territoriales`, `instituciones`, configs 360/MEL, rubricas — pas nécessaires pour faire fonctionner Informe de Módulo

### Critère de succès
Après import, sur `/admin?tab=informe-modulo` → Asistencia → Quibdó 2026 / Module 1 : **25 directivos affichés**, et les informes existants de Prod (Oriente module 1) sont visibles dans l'onglet Informe.

---

**Approuve avec "ok, applique"** pour que je passe en mode build et exécute.
