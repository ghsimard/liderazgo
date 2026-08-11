# Evolución : 6 sondages affichés vs 61 en base (production)

## Ce qui est confirmé

Dans `AdminAmbienteStatsTab.tsx`, une réponse n'est comptée en « Evolución » que si les trois conditions suivantes sont vraies :

1. `fase = 'cierre'` exactement (mapping `inicial → linea_base`, `evolucion → cierre`)
2. `cohorte_id` est renseigné **et** correspond à une cohorte existante dans `ae_cohortes` (les lignes sans cohorte sont écartées au chargement)
3. `institucion_educativa` correspond **caractère pour caractère** au nom d'école issu de `fichas_rlt` / vue des cohortes (un suffixe « - Municipio » suffit à exclure la ligne)

La base de développement ne contient aucune donnée 2026 pour cette école, donc la cause exacte en production ne peut pas être confirmée d'ici : elle doit être identifiée par une requête avant tout correctif.

## Étape 1 — Diagnostic en production

```sql
SELECT fase,
       cohorte_id,
       institucion_educativa,
       tipo_formulario,
       count(*)
FROM encuestas_ambiente_escolar
WHERE institucion_educativa ILIKE '%Normal Superior de Mar%'
  AND created_at >= '2026-01-01'
GROUP BY 1,2,3,4
ORDER BY 3,1,4;

-- cohortes valides
SELECT id, nombre, year FROM ae_cohortes ORDER BY year, nombre;
```

Lecture du résultat :
- `fase` ≠ `cierre` (ex. `evolucion`, `seguimiento`, NULL) → problème de valeur de phase
- `cohorte_id` NULL ou absent de `ae_cohortes` → lignes écartées au chargement
- Variantes du nom d'école (suffixe, accents, espaces) → échec d'appariement

## Étape 2 — Correctifs selon le diagnostic

| Cause trouvée | Action |
|---|---|
| Valeurs de phase hétérogènes | 🗄️ SQL manuel : normaliser `fase` vers `linea_base` / `cierre` ; 🖥️ frontend : accepter les alias de phase (`cierre`, `evolucion`, `final`) au lieu d'une égalité stricte |
| `cohorte_id` manquant | 🗄️ SQL manuel : rattacher les réponses à la bonne cohorte via institution + année ; 🖥️ frontend : ne plus écarter silencieusement les réponses sans cohorte quand aucun filtre de cohorte n'est actif |
| Nom d'école divergent | 🖥️ frontend : appariement normalisé (trim, accents, suffixe « - Municipio ») dans le regroupement par institution, comme déjà fait dans le calcul MEL |

## Étape 3 — Garde-fou d'affichage

Ajouter, dans l'onglet Informes, un compteur discret « X réponses ignorées (phase ou cohorte inconnue) » pour que ce type d'écart soit visible immédiatement plutôt que silencieux.

## Détails techniques

- Fichier concerné : `src/components/admin/AdminAmbienteStatsTab.tsx` (constantes `FASE_DB`, filtre `filteredSubs` ligne ~222, `baseFiltered`, `perIERows`).
- Le même mapping de phase est utilisé par les PDF (individuels, consolidés et ZIP) : la correction se propage automatiquement.
- Aucune modification du backend Express n'est nécessaire.

## Actions Render

- 🖥️ Site statique (Frontend) : republier après correctif
- ⚙️ Web Service (Backend Express) : rien
- 🗄️ Base de données (SQL manuel) : seulement si le diagnostic montre des phases ou cohortes incohérentes
