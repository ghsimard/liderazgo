# Rapports ad hoc en langage naturel

Nouvel onglet admin **"Reportes Ad Hoc"** où Admin/Superadmin écrivent une question en espagnol. Grok-3 reçoit le **schéma annoté** des tables autorisées (introspecté dynamiquement), déduit lui-même les colonnes pertinentes, génère un `SELECT` validé, Express l'exécute en lecture seule. Le frontend affiche **tableau interactif + export CSV + PDF**.

## Principe clé : zéro hardcoding sémantique

Aucune liste métier (synonymes, mappings champs) dans le code. Toute la connaissance vient de deux sources dynamiques injectées dans chaque prompt :

1. **Introspection live PostgreSQL** (cache mémoire 10 min) :
   - `information_schema.columns` → nom, type, nullable.
   - `pg_description` → `COMMENT ON COLUMN` métier.
   - `pg_enum` → valeurs des types énum.
   - Colonnes texte faible cardinalité : `SELECT DISTINCT col LIMIT 20` si `COUNT(DISTINCT) < 50` (permet au LLM de voir *"Quibdó"*, *"Rector/a"*, *"Ninguna"*, etc.).
2. **3 lignes-échantillon par table** avec cédulas et emails masqués.

Conséquences : *"directivos enfermos de Quibdó"* → le LLM trouve seul `enfermedades`, `municipio`, `cargo_actual`. *"Nombre de directivos pour Quibdó"* → `COUNT(*) WHERE municipio ILIKE 'quibd%' AND cargo_actual IN (...)`. Si la base évolue, l'introspection capture le changement à la prochaine requête — **rien à modifier dans le code**.

## Portée des données (phase 1)

**Whitelist** : `fichas_rlt`, `rubrica_*`, `encuestas_360`, `competencies_360`, `items_360`, `domains_360`, `competency_weights`, `mel_kpi_*`, `satisfaccion_responses`, `satisfaccion_config`, `satisfaccion_form_definitions`, `informe_modulo`, `informe_modulo_equipo`, `informe_directivo`, `informe_asistencia`, `encuestas_ambiente_escolar`, `ae_*_submissions_2025`, `ae_rectores_2025`, `ae_cohortes`, `ae_campanas`, `regiones`, `entidades_territoriales`, `municipios`, `instituciones`, `region_*`.

**Interdites** : `admin_cedulas`, `custom_roles`, `user_custom_roles`, `role_permissions`, `operator_permissions`, `contact_messages`, `user_activity_log`, `app_settings`, `deleted_records`, `_backup_*`.

## Actions par composant (déploiement Render)

### 🖥️ Site statique (Frontend)

1. Nouvel onglet `AdminAdHocReportTab.tsx` dans `AdminPage.tsx` (visible Admin/Superadmin).
2. UI :
   - `Textarea` pour la question + chips d'exemples cliquables.
   - Bouton **"Generar reporte"** → POST `/api/adhoc-report` via `apiFetch`.
   - Bloc pliable **"SQL generado"** + `explanation` du LLM (audit visuel).
   - Tableau shadcn avec tri/recherche/pagination.
   - Boutons **Exportar CSV** (blob client) et **Exportar PDF** (jsPDF + autoTable : logo, date DD/MM/YYYY, question, SQL, nombre de lignes).
   - Erreurs : SQL rejeté, 0 résultat, timeout 15s — toasts en espagnol.
3. Log fire-and-forget dans `user_activity_log` (action `adhoc_report`).

### ⚙️ Web Service (Backend Express)

1. Nouvelle route `server/routes/adhoc-report.ts` sous `requireAuth + requireAdmin`, montée dans `server/index.ts`.
2. Nouveau helper `server/utils/schemaIntrospection.ts` (cache 10 min en mémoire).
3. Pipeline `POST /api/adhoc-report` :
   - **Validation Zod** : `question: string(5..500)`.
   - **Schema discovery** depuis cache ou refresh.
   - **Appel Grok-3** (`XAI_API_KEY` déjà présent, même client que `rubrica-analysis.ts`) — system prompt :
     - "Générateur de SQL PostgreSQL **lecture seule**."
     - Schéma annoté + échantillons.
     - Règles : SELECT uniquement ; tables ∈ whitelist fournie ; pas de DML/DDL/`pg_*`/`information_schema`/`;` multiples/commentaires/`COPY`/`dblink` ; toujours `LIMIT 1000` ; agrégats (`COUNT`, `GROUP BY`, `AVG`) autorisés.
     - Si la question est ambiguë → renvoyer `{ needs_clarification: true, question: "..." }` au lieu de SQL.
     - Sortie JSON : `{ sql, explanation, columns_human_labels }`.
   - **Validation SQL serveur** (défense en profondeur) :
     - Regex blocklist : `INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|GRANT|REVOKE|CREATE|COPY|;\s*\S`.
     - Extraction `FROM`/`JOIN` → chaque identifiant vérifié contre la whitelist.
     - `EXPLAIN <sql>` dry-run ; rejet si erreur syntaxe.
     - Injection `LIMIT 1000` si absent.
   - **Exécution** via `pool.query` (le `statement_timeout` 15s du pool protège).
   - **Réponse** : `{ sql, explanation, columns, rows, row_count, truncated }`.

### 🗄️ Base de données (Manual SQL)

**Aucune migration obligatoire.** Tout en lecture seule sur tables existantes.

**Optionnel** (à ajouter au fil de l'eau pour améliorer la qualité des SQL générés sans toucher au code) :

```sql
COMMENT ON COLUMN fichas_rlt.enfermedades IS 'Texto libre. "Ninguna"/"N/A"/vacío = sin enfermedad.';
COMMENT ON COLUMN fichas_rlt.cargo_actual IS 'Cargo: Rector/a, Coordinador/a, Docente, etc.';
COMMENT ON COLUMN fichas_rlt.municipio IS 'Municipio de la IE (ej. Quibdó).';
COMMENT ON COLUMN fichas_rlt.edad IS 'Edad en años del directivo.';
```

Ces commentaires sont lus automatiquement par l'introspection. Seul "tuning" possible — et il vit dans la DB, pas dans le code.

## Sécurité — couches

1. Auth Express (`requireAuth + requireAdmin`).
2. Whitelist tables revalidée serveur.
3. Regex blocklist mots-clés dangereux.
4. `EXPLAIN` dry-run avant exécution.
5. `LIMIT 1000` forcé.
6. `statement_timeout` 15s du pool PG existant.
7. Cédulas/emails masqués dans les échantillons LLM.
8. SQL affiché à l'admin pour audit visuel.
9. Activity log de chaque requête.

## Limitations annoncées dans l'UI

- Lecture seule, max 1000 lignes, timeout 15s.
- Le LLM peut se tromper → **toujours vérifier le bloc "SQL generado"** avant de citer les chiffres.

## Exemples couverts (validation par anticipation)

| Question | Mécanisme |
|---|---|
| "Directivos de 40+ años" | `WHERE edad >= 40` |
| "Directivos con enfermedades" | LLM voit colonne `enfermedades` + valeurs distinctes → filtre approprié |
| "Directivos de 45+ de Quibdó 2026 enfermos" | Combinaison `edad >= 45 AND municipio ILIKE 'quibd%' AND enfermedades ...` |
| "Número de directivos de Quibdó" | `SELECT COUNT(*) ... WHERE municipio ILIKE 'quibd%' AND cargo_actual IN (...)` |
| "Evaluaciones rúbrica módulo 2 por región" | JOIN `rubrica_evaluaciones` × `fichas_rlt` × `region_instituciones` + `GROUP BY` |

## Fichiers

**Créer**
- `server/routes/adhoc-report.ts`
- `server/utils/schemaIntrospection.ts`
- `src/components/admin/AdminAdHocReportTab.tsx`
- `src/utils/adhocReportPdfGenerator.ts`
- `src/utils/adhocReportCsvExporter.ts`

**Modifier**
- `server/index.ts` (monter la route)
- `src/pages/AdminPage.tsx` (nouvel onglet)
- `src/components/admin/AdminSidebar.tsx` (entrée menu Admin/Superadmin)
