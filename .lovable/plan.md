## Objectif

Copier (dupliquer, sans supprimer) les encuestas Ambiente Escolar 2025 des tables détaillées vers `encuestas_ambiente_escolar` pour que le Monitor affiche les bons compteurs pour **Bello Horizonte**, **El Diamante**, **Ciudad Don Bosco** et **Manuel Uribe Ángel**.

## Volumes attendus (source Cloud, à re-vérifier sur prod avant exécution)

| Institution | Docentes | Estudiantes | Acudientes |
|---|---|---|---|
| Bello Horizonte | 23 | 128 | 81 |
| El Diamante | 13 | 33 | 48 |
| Ciudad Don Bosco | 0 | 0 | 1 |
| Manuel Uribe Ángel | 29 | 40 | 35 |
| **Total** | **65** | **201** | **165** |

Soit ~431 lignes à insérer dans `encuestas_ambiente_escolar`.

## Actions requises

### 🗄️ Base de données (Manual SQL) — uniquement

Aucune modification frontend ni backend Express n'est nécessaire — le Monitor lit déjà `encuestas_ambiente_escolar`.

**Étape 1 — Vérification préalable (prod)**

Compter sur prod, par IE et par type, le nombre de lignes présentes dans les 3 tables `ae_*_submissions_2025`, et le nombre déjà présent dans `encuestas_ambiente_escolar` (pour confirmer qu'il n'y a pas déjà des doublons partiels).

**Étape 2 — Insertion (idempotente)**

Trois `INSERT INTO encuestas_ambiente_escolar (...) SELECT ... FROM ae_<type>_submissions_2025 WHERE institucion_educativa ILIKE ANY (...) AND NOT EXISTS (...)` — un par type de formulaire.

Champs remplis :
- `tipo_formulario` = `'docente'` / `'estudiante'` / `'acudiente'` selon la table source
- `institucion_educativa` = valeur source (normalisée si besoin pour Manuel Uribe Ángel)
- `cohorte_id` = `c25708c1-...` (Medellín 2025)
- `campana_id`, `entidad_territorial`, `fase` = valeurs Medellín 2025
- `respuestas` (JSONB) = agrégat des champs de la submission source
- `created_at` = préservé depuis la source

Clause anti-doublon : `NOT EXISTS` sur (`tipo_formulario`, `institucion_educativa`, `cohorte_id`, `created_at`) — ou sur un identifiant stable si disponible dans la table source.

Les lignes restent aussi dans `ae_*_submissions_2025` (duplication, pas déplacement).

**Étape 3 — Contrôle post-insertion**

Recompter `encuestas_ambiente_escolar` par IE / type pour confirmer que les totaux correspondent au tableau ci-dessus, puis rafraîchir le Monitor (Ctrl+Shift+R) pour vérifier visuellement.

### 🖥️ Site statique (Frontend) — rien
### ⚙️ Web Service Express — rien

## Points à confirmer avant que j'écrive le SQL final

1. Le libellé exact à utiliser dans `encuestas_ambiente_escolar.institucion_educativa` pour chaque IE (dois-je reprendre tel quel le libellé des tables 2025, ou normaliser en `Institución Educativa <Nom>` comme pour Manuel Uribe Ángel) ?
2. Confirmez-vous que je peux exécuter directement sur **prod** après vérification des comptes, ou préférez-vous un dry-run (SELECT seul) d'abord pour validation visuelle ?
