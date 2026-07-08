
# Plan — Toutes les encuestas comptabilisées dans les bonnes cohortes

## Diagnostic (audit terminé)

- **86 IE** dans les submissions sont déjà correctement rattachées.
- **4 anomalies** empêchent le comptage complet :

| IE (submissions) | Encuestas | Problème | Cible |
|---|---|---|---|
| Institución Educativa Bello Horizonte | 232 | Absente de `ae_cohorte_instituciones` et de `ae_rectores_2025` | Medellín 2025 |
| Institución Educativa El Diamante | 94 | Absente de `ae_cohorte_instituciones` (existe dans rectores mais ET=NULL) | Medellín 2025 |
| Institución Educativa Ciudad Don Bosco | 1 | Absente partout | Medellín 2025 |
| `institución Educativa Manuel Uribe Angel` (sans tilde) | 2 | Typo — la vraie IE `…Ángel` existe déjà | Fusion vers la forme correcte |

Séparément : `Medellín/Itagüí/Rionegro 2025` n'ont aucune `fichas_rlt` → le monitor doit lire aussi `ae_cohorte_instituciones` pour les afficher.

## 🗄️ Base de données (Manual SQL sur Cloud)

**Migration unique** avec 4 blocs :

### Bloc 1 — Compléter `ae_cohorte_instituciones` (Medellín 2025)
Insérer 3 lignes pour la cohorte Medellín 2025 (`c25708c1-…`) si absentes :
- Bello Horizonte
- El Diamante
- Ciudad Don Bosco

### Bloc 2 — Corriger `ae_rectores_2025`
- Mettre `entidad_territorial = 'Medellín'` pour la ligne `El Diamante` (actuellement NULL).

### Bloc 3 — Corriger le typo dans les submissions
Remap `institución Educativa Manuel Uribe Angel` → `institución Educativa Manuel Uribe Ángel` dans les 3 tables :
- `ae_docentes_submissions_2025`
- `ae_estudiantes_submissions_2025`
- `ae_acudientes_submissions_2025`

Supprimer aussi la ligne aberrante `institucion_educativa = 'César Fernando Trujillo Múnera'` (1 docente, nom d'une personne dans un champ IE).

### Bloc 4 — Rétablir la vue hybride
Recréer `v_ae_instituciones_por_cohorte` en UNION :
- IE issues de `fichas_rlt` (cohortes 2026 : Oriente, Quibdó)
- IE issues de `ae_cohorte_instituciones` (cohortes 2025 : Medellín, Itagüí, Rionegro)

`GRANT SELECT` à `PUBLIC`.

### Vérification post-migration
```sql
-- Doit renvoyer 65 IE (64 + Bello Horizonte + El Diamante + Ciudad Don Bosco = 67 - doublons)
SELECT COUNT(*) FROM v_ae_instituciones_por_cohorte
WHERE cohorte_nombre = 'Medellín 2025';

-- Doit renvoyer 0 orpheline
SELECT DISTINCT s.institucion_educativa FROM ae_docentes_submissions_2025 s
LEFT JOIN ae_cohorte_instituciones c ON c.institucion_educativa = s.institucion_educativa
WHERE c.cohorte_id IS NULL;
```

## ⚙️ Web Service (Backend Express Render)

**Aucune modification de code**. Le fichier SQL de la vue hybride doit être appliqué manuellement sur la DB Render (fichier existant `server/migrations/2026-07-07_v_ae_instituciones_por_cohorte.sql` — à ré-exécuter tel quel après ce plan).

## 🖥️ Site statique (Frontend)

**Aucune modification de code**. Le composant `AdminAmbiente2025Tab` lit déjà via `cloudClient` et détectera automatiquement les 3 IE ajoutées et les submissions remappées.

Après déploiement, un simple **Ctrl+Shift+R** dans le monitor suffit.

## Hors périmètre

- N'ajoute PAS de `fichas_rlt` placeholder pour les IE 2025 (rejeté précédemment).
- N'importe PAS de table externe supplémentaire depuis prod (la rectores actuelle suffit pour l'analyse).
- N'ajoute PAS de rectores pour Bello Horizonte / Ciudad Don Bosco (aucune donnée disponible ; l'IE apparaîtra dans le monitor sans rector inscrit, ce qui est factuel).
