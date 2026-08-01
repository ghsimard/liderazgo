# e360 autonome — version simple

Objectif, en une phrase : **prendre le Hub Encuesta 360 tel qu'il existe déjà dans RLT, le copier dans le nouveau projet, lui donner sa propre base de données et ses propres tables, et le publier sur liderazgo360.co.**

Rien de partagé avec RLT : ni base, ni tables, ni vues, ni schéma `e360` dans la base RLT. Les deux applications ne se voient pas.

## Pourquoi c'était devenu compliqué

Les échanges précédents partaient sur une base *partagée* (schéma `e360` dans la base RLT + vues de configuration + synchronisation bidirectionnelle). C'est ça qui a créé la confusion. On abandonne cette piste.

Deuxième source de confusion : le nouveau projet **E360 Insights** a été construit avec un contenu inventé (compétences génériques d'entreprise : Autoconocimiento, jefe/par/colaborador) au lieu du vrai modèle RLT. Il faut le remplacer par une copie du vrai.

## Le découpage, une fois pour toutes

Il y aura deux mondes complètement séparés :

```text
RLT (actuel)                        e360 (nouveau)
rltficha.lovable.app                liderazgo360.co
  |                                   |
Express liderazgo-api               Express e360-api (nouveau service)
  |                                   |
Base Postgres RLT                   Base Postgres e360 (nouvelle)
```

## Ce qui compose le Hub 360 dans RLT (à copier)

Formulaires et hub : `Encuesta360Hub`, `Encuesta360Form`, les 10 pages `Encuesta360*` (entrada et salida, 5 rôles), `src/data/encuesta360Data.ts`.
Rapports : `reporte360Calculator.ts`, `reporte360PdfGenerator.ts`, `src/data/reporte360Phrases.ts`, `AdminReporte360Viewer`.
Administration 360 : `AdminEncuestas360Tab`, `AdminEncuestaMonitor`, `AdminCompetenciesManager`, `AdminDomainsManager`, `AdminItemsManager`, `AdminWeightsTab`, `AdminCompetencyWizard`, `AdminEvalIndividualTab`, `ShareEncuestaDialog`, `EvaluadorEncuestasView`.
Tables correspondantes : `domains_360`, `competencies_360`, `items_360`, `item_texts_360`, `competency_weights`, `encuestas_360`, `encuesta_invitaciones`, `encuesta_360_visibility`, plus le minimum d'identité (directivos / institutions) nécessaire au formulaire.

## Étapes

### 🗄️ Base de données (nouvelle base, SQL manuel)
1. Créer une **nouvelle base PostgreSQL** sur Render, dédiée à e360.
2. Y créer les tables 360 listées ci-dessus, dans le schéma `public` de cette nouvelle base (structure identique à RLT — export de structure depuis RLT, sans les données).
3. Y ajouter les tables de licences : `licencias_contrato`, `licencias_tarifas`, `licencias`, `licencias_transacciones` (le script déjà écrit sera réutilisé, sans le préfixe `e360.`).
4. Charger une copie **ponctuelle** de la configuration 360 depuis RLT (dominios, competencias, ítems, ponderaciones). Copie figée : plus aucune synchronisation ensuite.

### ⚙️ Web Service (nouveau service Express)
5. Créer un **second Web Service** sur Render pour e360, avec sa propre `DATABASE_URL` pointant sur la nouvelle base, et le code Express repris de RLT (routes `db`, `rpc`, `auth`, `licencias`).
6. Retirer de l'API RLT actuelle les routes e360 ajoutées récemment (`/api/e360app`, `/api/licencias`) : elles n'ont plus lieu d'être ici.

### 🖥️ Site statique (projet E360 Insights — à faire depuis l'autre onglet)
7. Supprimer le contenu inventé (`src/lib/e360-content.ts`) et le remplacer par le vrai modèle copié de RLT.
8. Copier les composants du Hub 360 listés plus haut.
9. Faire pointer `VITE_API_URL` vers la **nouvelle** API e360.
10. Ajouter le panel superadmin Licencias / Tarifas / Transacciones / Contrato.

### RLT actuel
Aucun changement fonctionnel : le Hub 360 y reste tel quel tant que tu n'as pas décidé de le retirer.

## Point important sur le partage du travail

Je peux **lire** le projet E360 Insights depuis ici, mais je ne peux pas y écrire. Concrètement :
- Étapes 1 à 6 (base + API) : je les prépare **ici**, tu exécutes le SQL et crées les services sur Render.
- Étapes 7 à 10 (frontend) : à me demander depuis l'onglet **E360 Insights**, où je pourrai lister précisément le code à reprendre.

## Question ouverte avant de démarrer

La copie de la configuration 360 est-elle bien **figée** (une seule fois, puis les deux applications évoluent séparément) ? Si tu veux au contraire que modifier une compétence dans RLT la modifie aussi dans e360, il faut revenir à une base partagée — et on retombe dans la complexité précédente.
