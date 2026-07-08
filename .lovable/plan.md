## Diagnostic

Erreur de ma part hier : j'ai supprimé le `UNION` avec `ae_cohorte_instituciones` en pensant qu'il ne servait qu'à créer des doublons. En réalité c'est la **seule source** pour rattacher les IE de Medellín 2025, Itagüí 2025 et Rionegro 2025 à leur cohorte (leur `fichas_rlt.region` ne contient pas d'année, donc la jointure `f.region = c.nombre` retourne 0).

Le vrai problème initial des doublons était que `ae_cohorte_instituciones` contenait des noms suffixés (`"Guamito - San Luis"`) alors que `fichas_rlt.nombre_ie` a la version courte (`"Guamito"`) — donc le `UNION` les voyait comme distincts.

## Solution

Restaurer le `UNION` avec `ae_cohorte_instituciones`, mais normaliser les noms suffixés côté `ae_cohorte_instituciones` pour qu'ils s'alignent avec `fichas_rlt.nombre_ie`. Le `UNION` dédupliquera ensuite naturellement. **`fichas_rlt` n'est jamais modifiée.**

## Actions

### 🖥️ Site statique (Frontend)
Aucun changement.

### ⚙️ Web Service (Backend Express)
Aucun changement.

### 🗄️ Base de données (Manual SQL sur Render)

**Étape 1 — Normaliser `ae_cohorte_instituciones` (DATA, pas schéma) :**
Retirer le suffixe `" - Municipio"` lorsqu'une version courte identique existe déjà dans `fichas_rlt.nombre_ie` :
```sql
BEGIN;
UPDATE ae_cohorte_instituciones aci
SET institucion_educativa = regexp_replace(aci.institucion_educativa, '\s+-\s+[^-]+$', '')
WHERE EXISTS (
  SELECT 1 FROM fichas_rlt f
  WHERE f.nombre_ie = regexp_replace(aci.institucion_educativa, '\s+-\s+[^-]+$', '')
);
COMMIT;
```

**Étape 2 — Recréer la vue avec `UNION` restauré :**
```sql
CREATE OR REPLACE VIEW public.v_ae_instituciones_por_cohorte AS
SELECT c.id AS cohorte_id, f.nombre_ie AS institucion_educativa
FROM public.ae_cohortes c
JOIN public.fichas_rlt f ON f.region = c.nombre
UNION
SELECT cohorte_id, institucion_educativa
FROM public.ae_cohorte_instituciones;

GRANT SELECT ON public.v_ae_instituciones_por_cohorte TO PUBLIC;
```

**Étape 3 — Vérifications :**
```sql
-- Doit afficher un nombre plausible pour chaque cohorte
SELECT c.nombre, count(*) AS n
FROM v_ae_instituciones_por_cohorte v
JOIN ae_cohortes c ON c.id = v.cohorte_id
GROUP BY c.nombre ORDER BY c.nombre;

-- Doit retourner 0 ligne (aucun doublon Guamito)
SELECT institucion_educativa, count(*)
FROM v_ae_instituciones_por_cohorte
WHERE institucion_educativa ILIKE '%guamito%'
GROUP BY institucion_educativa HAVING count(*) > 1;
```

Puis **Ctrl+Shift+R** dans le navigateur.

## Détails techniques

- `regexp_replace(..., '\s+-\s+[^-]+$', '')` retire uniquement le dernier segment ` - X` en fin de nom.
- Le `WHERE EXISTS` garantit qu'on ne strippe le suffixe **que si** une IE identique existe déjà dans `fichas_rlt` — évite de casser des noms légitimes qui contiendraient un tiret.
- Le `UNION` (pas `UNION ALL`) déduplique automatiquement les paires `(cohorte_id, institucion_educativa)` identiques.
- `fichas_rlt` reste intacte.
