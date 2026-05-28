
## 🗄️ Base de données (Manual SQL via pgAdmin) — Import `_stg_einv`

Le problème : `\copy` est une méta-commande **psql uniquement**, elle ne fonctionne pas dans l'éditeur SQL de pgAdmin (d'où `syntax error at or near "\"`). L'assistant Import/Export graphique de pgAdmin, lui, supporte l'option `NULL string`.

### Étapes

**1. Vider la table de staging** (onglet Query) :
```sql
TRUNCATE public._stg_einv;
```

**2. Lancer l'assistant Import** :
- Dans l'arbre de gauche : `Databases` → `cosmo_rlt` → `Schemas` → `public` → `Tables` → clic droit sur **`_stg_einv`** → **Import/Export Data...**

**3. Onglet "General"** :
- **Import/Export** : `Import` (toggle)
- **Filename** : `/Users/ghsimard/Desktop/einv_estudiante_CE.csv`
- **Format** : `csv`
- **Encoding** : `UTF8`

**4. Onglet "Options"** :
- **Header** : ✅ ON
- **Delimiter** : `,`
- **Quote** : `"`
- **Escape** : `"`
- **NULL String** : taper exactement `NULL` ← **clé du fix**

**5. Onglet "Columns"** :
- Sélectionner uniquement les 12 colonnes dans cet ordre (sans `created_at`) :
  `id, token, directivo_cedula, directivo_nombre, institucion, email_destinatario, tipo_formulario, fase, sent_at, last_reminder_at, responded_at, access_count`

**6. Cliquer "OK"** → l'import doit passer (lignes attendues = nombre de lignes du CSV - 1).

### Vérification

```sql
SELECT COUNT(*) AS stg_einv FROM public._stg_einv;
SELECT COUNT(*) FILTER (WHERE last_reminder_at IS NULL) AS nulls_reminder,
       COUNT(*) FILTER (WHERE responded_at IS NULL)     AS nulls_responded
FROM public._stg_einv;
```

### Étape suivante (après succès des deux staging)

Merge des deux `_stg_*` vers les tables prod `encuestas_360` et `encuesta_invitaciones` avec `INSERT ... ON CONFLICT DO NOTHING` — je te fournirai le script une fois `_stg_einv` rempli.

### Note

🖥️ Site statique (Frontend) : aucune modification.
⚙️ Web Service (Backend Express) : aucune modification.
