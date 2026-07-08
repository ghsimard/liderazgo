## Diagnostic

En **production (Render)**, la vue `v_ae_instituciones_por_cohorte` contient encore l'ancienne définition qui fait un `UNION` avec la table héritée `ae_cohorte_instituciones`. Cette table contient des variantes suffixées type `"Centro Educativo Rural Guamito - San Luis"`, tandis que `fichas_rlt.nombre_ie` a la version courte `"Centro Educativo Rural Guamito"`. Résultat : deux lignes pour la même institution dans le tableau Monitoreo.

Sur Lovable Cloud (staging), les données sont propres — une seule ligne par institution. Le problème est **strictement côté Render** : les deux migrations SQL de 2026-07-08 n'ont pas encore été exécutées sur la base de production.

## Actions

### 🖥️ Site statique (Frontend)
Aucun changement. `AdminAmbienteMonitorTab.tsx` est déjà correct (déduplication via `Set` sur la vue). Le doublon vient de la vue elle-même.

### ⚙️ Web Service (Backend Express)
Aucun changement.

### 🗄️ Base de données (Manual SQL sur Render)
Exécuter dans l'ordre, en psql sur la base Render :

1. **`server/migrations/2026-07-08_normaliser_ae_institucion_educativa.sql`**  
   Retire le suffixe `" - Municipio"` dans `ae_docentes_submissions_2025`, `ae_estudiantes_submissions_2025`, `ae_acudientes_submissions_2025` quand la version courte existe dans `fichas_rlt.nombre_ie`. Transaction sûre et idempotente.

2. **`server/migrations/2026-07-08_v_ae_instituciones_solo_fichas.sql`**  
   Recrée `v_ae_instituciones_por_cohorte` avec `fichas_rlt` comme source unique (suppression du `UNION` avec la table legacy). C'est ce qui fait disparaître les doublons dans Monitoreo.

3. Vérification (avec GROUP BY, contrairement à la requête ayant échoué) :
   ```sql
   SELECT institucion_educativa, count(*)
   FROM v_ae_instituciones_por_cohorte
   WHERE institucion_educativa ILIKE '%guamito%'
   GROUP BY institucion_educativa;
   ```
   → doit retourner une seule ligne par institution.

Puis **Ctrl+Shift+R** dans le navigateur pour recharger.

## Détails techniques

Vue actuelle en prod (fautive) :
```sql
SELECT c.id, f.nombre_ie FROM ae_cohortes c JOIN fichas_rlt f ON f.region = c.nombre
UNION
SELECT cohorte_id, institucion_educativa FROM ae_cohorte_instituciones;
```
La table `ae_cohorte_instituciones` reste en base (legacy) mais n'est plus référencée par la nouvelle vue.
