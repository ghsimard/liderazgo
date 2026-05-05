# Plan de correction

## Diagnostic confirmé
Les logs montrent un problème important côté backend Render :

- le process Node atteint la limite mémoire (`FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory`)
- juste après, le service redémarre
- pendant ce crash, des utilisateurs reçoivent des erreurs 502 en production

Donc ce n’est pas un simple warning : c’est un vrai crash du worker backend.

## Ce que je vais corriger

### 1. Instrumenter le backend pour identifier précisément la route fautive
Le log partagé ne contient pas l’URL complète sur toutes les lignes, donc je vais ajouter un logging léger côté serveur pour capturer :
- méthode
- route
- table ciblée pour `/api/db/:table`
- temps de réponse
- taille de réponse
- mémoire utilisée avant/après sur les réponses lourdes

Objectif : confirmer noir sur blanc quelle route provoque le pic mémoire en production.

### 2. Sécuriser la route proxy base de données
Dans `server/routes/db.ts`, je vais ajouter des garde-fous pour éviter qu’une lecture générique consomme trop de mémoire :
- limite par défaut sur certaines lectures sans pagination
- logs sur les requêtes les plus volumineuses
- retour plus défensif sur les tables potentiellement lourdes
- meilleure visibilité sur les `select("*")` et les appels sans `limit`

Objectif : empêcher qu’une requête générique fasse exploser le worker.

### 3. Optimiser les écrans du module Informe qui multiplient les requêtes
J’ai déjà repéré plusieurs appels liés à `informe_modulo` et `informe_modulo_equipo`, notamment dans :
- `src/pages/InformeModulo.tsx`
- `src/components/admin/AdminInformeModuloForm.tsx`
- `src/components/admin/AdminInformeReportTab.tsx`

Je vais réduire la charge en :
- remplaçant certains `select("*")` par des sélections ciblées
- regroupant les lectures `informe_modulo_equipo` en une seule requête batch au lieu de boucles requête-par-requête
- évitant les rechargements inutiles si les mêmes données sont déjà en mémoire

Objectif : diminuer le nombre d’appels backend et la taille des réponses.

### 4. Vérifier et alléger la route d’export serveur
La route `server/routes/export.ts` construit actuellement un très gros dump SQL en mémoire dans une seule string.
Même si ce n’est pas forcément l’unique cause, c’est une route à risque élevé pour un OOM.

Je vais la rendre plus sûre en :
- évitant l’accumulation complète en mémoire si possible
- limitant ou segmentant les exports lourds
- gardant un comportement stable pour les administrateurs

Objectif : éliminer une autre source probable de crash mémoire.

### 5. Ajouter un correctif temporaire de stabilité pour la production
En parallèle du correctif code, je prévois une mesure de stabilisation côté Render :
- définir `NODE_OPTIONS=--max-old-space-size=512` ou `768` selon la marge disponible

Important : ce sera un filet de sécurité, pas la vraie solution.
La vraie solution reste la réduction de la consommation mémoire dans le code.

## Résultat attendu
Après ce correctif :
- plus de crash `heap out of memory`
- plus de redémarrages du service pendant l’usage normal
- disparition des 502 liés à ce plantage
- backend plus robuste sur mobile et desktop

## Détail technique
Fichiers que je modifierai probablement :
- `server/routes/db.ts`
- `server/routes/export.ts`
- `src/pages/InformeModulo.tsx`
- `src/components/admin/AdminInformeModuloForm.tsx`
- `src/components/admin/AdminInformeReportTab.tsx`

Point important : le screenshot précédent montrait une erreur sur une requête `informe_modulo_equipo`, mais les logs texte seuls ne donnent pas encore la route exacte à 100 %. Je vais donc d’abord instrumenter proprement, puis corriger la ou les routes réellement responsables dans le même passage.