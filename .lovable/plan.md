# Icône œil manquante dans Ambiente Escolar / Monitoreo / Contacto

## Diagnostic

Dans `src/components/admin/AdminAmbienteMonitorTab.tsx` (ligne 384), l'œil ne s'affiche que si `r.directivo` est trouvé :

```ts
const findDirectivo = (ie: string) => directivos.find(d => d.nombre_ie === ie);
```

Match **strictement exact** (`===`) entre `ae_cohorte_instituciones.institucion_educativa` et `fichas_rlt.nombre_ie`. Deux causes possibles :

1. **Aucune ficha remplie** par le directivo → aucun contact en base.
2. **Mismatch de casse/accents** entre les deux tables (comme Manuel Uribe Ángel).

Le nombre d'encuestas (0, faible ou suffisant) n'a **aucun impact** sur l'affichage de l'œil.

## Plan

### 🖥️ Site statique (Frontend)

Modifier `src/components/admin/AdminAmbienteMonitorTab.tsx` :

1. Rendre `findDirectivo` **tolérant à casse + accents** via normalisation JS (`.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim()`) pour attraper les mismatch de casse/accents.
2. Quand aucun directivo n'est trouvé, remplacer le tiret `—` par une **icône œil grisée + tooltip** « Sin ficha diligenciada » (au lieu de rien afficher) pour distinguer clairement le cas « pas encore de fiche ».

Ctrl+Shift+R après déploiement.

### ⚙️ Web Service (Backend Express)

Aucun changement.

### 🗄️ Base de données (SQL manuel)

Aucun changement structurel. Requête de diagnostic optionnelle (sans `unaccent` qui n'est pas installé sur Render) pour lister les institutions du monitoring sans ficha :

```sql
SELECT DISTINCT ci.institucion_educativa
FROM public.v_ae_instituciones_por_cohorte ci
LEFT JOIN public.fichas_rlt f
  ON lower(f.nombre_ie) = lower(ci.institucion_educativa)
WHERE f.id IS NULL
ORDER BY 1;
```

Note : la normalisation d'accents se fait côté frontend (JS `NFD`) puisque l'extension `unaccent` n'est pas disponible sur la base Render.

## Question ouverte

Pour les institutions sans ficha diligenciada, préférez-vous :
- **(A)** Garder le tiret `—` (comportement actuel).
- **(B)** Afficher une icône œil grisée + tooltip « Sin ficha diligenciada » (recommandé).

Par défaut je pars sur **(B)** + normalisation casse/accents du matching.
