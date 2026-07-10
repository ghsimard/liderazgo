## Diagnostic

Audit du code delta terminé. **L'arithmétique est correcte** (Nunca=1…Siempre=5, ΔS/ΔN = post−base, chaînes de matching exactes, aucun item négativement formulé). Mais **trois failles font mécaniquement baisser les deltas affichés** — donc sous-estiment l'efficacité du programme :

### Faille 1 — Perte silencieuse de soumissions
`AdminAmbienteDeltaTab.tsx:147-177`
```ts
const fase = s.fase || (s.campana_id ? campFaseById.get(s.campana_id) ?? null : null);
```
Si `fase IS NULL` **ET** `campana_id IS NULL`, la soumission est **jetée** des deux buckets — elle n'apparaît ni dans la base ni dans le post, mais elle existe dans la BD. Chaque soumission jetée = potentiellement une IE incomparable en moins.

### Faille 2 — Appariement d'institutions par chaîne brute
`AdminAmbienteDeltaTab.tsx:185-188` — le join base↔post se fait par égalité stricte sur `institucion_educativa`. La moindre différence d'accent, d'espace ou de casse (« INEM » vs « I.N.E.M. », « José » vs « Jose ») **exclut l'IE de l'agrégat MEL** → dénominateur artificiellement gonflé, % qui cumplen artificiellement bas.

### Faille 3 — Moyenne des moyennes (biais statistique)
`AdminAmbienteDeltaTab.tsx:219-226` — la « lectura complementaria » Likert calcule une moyenne de moyennes de sections (sections de 6/7/8 items sur-pondérées). Le vrai delta par item est légèrement écrasé.

## Corrections proposées (Frontend seul)

### 🖥️ Site statique

**1. `AdminAmbienteDeltaTab.tsx` — récupérer les soumissions orphelines**
- Modifier `campFaseById` pour aussi indexer par `cohorte_id` : si toutes les campagnes d'une cohorte partagent la même `fase`, propager cette phase aux soumissions sans `campana_id`.
- Fallback ultime : si toujours indéterminé, afficher un compteur « N soumissions sans phase identifiée » dans le bloc MEL pour transparence, plutôt que silence.

**2. `AdminAmbienteDeltaTab.tsx` — normaliser le nom d'institution pour l'appariement**
- Créer `normalizeInst(name)` = trim + lowercase + suppression d'accents (NFD/regex diacritiques) + collapse d'espaces.
- Bâtir un `Map<normalized, canonicalName>` à partir de `phaseSplit.inicial` puis remapper les soumissions `evolucion` sur le même canonical avant de calculer `commonInsts` et `computeInstitucionesMel`.
- Afficher dans le bloc MEL : « N IE appariées par normalisation » quand ça se produit, pour audit.

**3. `AdminAmbienteDeltaTab.tsx` — moyenne à plat par item (Lectura complementaria)**
- Remplacer `secAvgIni = SECTIONS.map(avgScore).mean()` par un unique `avgScore` calculé sur **l'union des item IDs** de toutes les sections. Le calcul MEL (`computePctSN`) est déjà à plat, seule la table Likert complémentaire est concernée.

**4. Panneau de diagnostic (petit, replié par défaut)**
Ajouter en bas du bloc MEL un accordéon « Diagnóstico de datos » listant :
- soumissions sans phase (avec cédules / id pour investigation),
- IE présentes seulement en base (candidats "salida" manquants),
- IE présentes seulement en post (candidats "base" manquants),
- IE appariées après normalisation (paires `originalBase` ↔ `originalPost`).

Ce panneau permet à un admin d'agir sur la BD (via un autre outil) sans qu'on masque un problème derrière un joli chiffre.

### ⚙️ Web Service (Backend Express)
Aucune action.

### 🗄️ Base de données (SQL manuel)
Aucune action **automatique** — mais le panneau diagnostic ci-dessus révélera si des correctifs manuels (UPDATE `fase`, normalisation `institucion_educativa`) sont nécessaires. Décision au cas par cas.

## Vérification
1. Ouvrir une cohorte connue → le compteur « soumissions sans phase » devrait être 0 ou minime ; sinon, la liste des cédules apparaît dans le diagnostic.
2. Comparer avant/après le nombre d'IE incluses dans l'agrégat MEL : il devrait augmenter (moins d'exclusions par mismatch de nom).
3. Le % MEL global devrait rester stable ou augmenter — pas baisser.
4. La « Lectura complementaria » ΔGlobal devrait bouger légèrement (correction du biais de moyenne).

## Ce que ce plan **ne fait pas**
- Ne modifie pas le seuil MEL (5 pp, 2/3, 80 %) — c'est la méthodologie officielle.
- Ne « gonfle » aucun résultat : corrige seulement des pertes de données qui pénalisaient à tort le programme.
- Ne touche pas au backend ni à la BD.
