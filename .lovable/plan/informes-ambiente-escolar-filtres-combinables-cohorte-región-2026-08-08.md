# Informes Ambiente Escolar — filtres combinables (cohorte, región, ET, institución, fase)

## Situation actuelle

Dans **Ambiente Escolar → Informes → Estadísticas**, les cinq filtres existent mais ne se combinent pas librement :

- Choisir une **Región** vide automatiquement les sélections **Entidad Territorial** et **Institución**; choisir une ET ou une cohorte vide aussi la liste des institutions. On ne peut donc pas partir d'une institution puis ajouter une cohorte.
- La liste **Cohorte(s)** affiche toujours toutes les cohortes, même si la région, l'ET ou l'institution choisie n'en concerne qu'une.
- La liste **Entidad Territorial** n'est restreinte que par la région, jamais par la cohorte ni par l'institution.
- La liste **Institución(es)** ne contient que les écoles ayant déjà des réponses — une école de la cohorte sans réponse est invisible.

## Ce qu'on change

### 1. Filtres réellement combinables
Chaque filtre reste sélectionnable dans n'importe quel ordre : cohorte et/ou región et/ou entidad territorial et/ou institución et/ou fase. Aucune sélection n'est effacée quand on en modifie une autre.

### 2. Options croisées
Chaque liste n'affiche que les valeurs compatibles avec les **autres** filtres actifs :

```text
Región        <- restreinte par cohorte, ET, institución
Entidad Terr. <- restreinte par cohorte, región, institución
Cohorte(s)    <- restreinte par región, ET, institución
Institución   <- restreinte par cohorte, región, ET
Fase          <- inchangée (Ambas / Inicial / Evolución)
```

### 3. Nettoyage automatique des sélections devenues invalides
Si une valeur déjà sélectionnée n'existe plus dans les options croisées (ex. institution hors de la nouvelle cohorte), elle est retirée silencieusement de la sélection, sans vider le reste.

### 4. Institutions de la cohorte, même sans réponses
La liste des institutions est construite à partir des institutions rattachées aux cohortes (vue `v_ae_instituciones_por_cohorte` + fichas), pas seulement de celles ayant des réponses. Dans la vue « Por institución », une école sans réponse dans les filtres courants reste affichée en grisé avec « Sin respuestas ».

### 5. Résumé des filtres
Le bandeau de résumé au-dessus du rapport indique les filtres actifs (cohorte(s), región, ET, nombre d'institutions, fase) et le nombre de réponses correspondantes.

## Détails techniques

- Modifications limitées à `src/components/admin/AdminAmbienteStatsTab.tsx`.
- Suppression des trois `useEffect` de réinitialisation en cascade (`setSelEntidades([])`, `setSelectedIEs([])`).
- Introduction d'un index unique `ieIndex: Map<ie, { region, entidad, cohorteIds }>` construit à partir des fichas (déjà enrichies avec les IE 2025) et de `v_ae_instituciones_por_cohorte`, servant de base commune aux quatre listes d'options.
- Une fonction utilitaire `matchesExcept(dimension)` applique tous les filtres sauf celui dont on calcule les options, pour produire les listes croisées.
- Un `useEffect` de réconciliation retire des sélections les valeurs absentes des options courantes.
- `baseFiltered`, `pdfPlan`, `targetIEs` et `ieRows` continuent d'utiliser la même logique de filtrage, alimentée par l'index.
- Aucun changement d'API, de requête ni de base de données.

## Actions requises après approbation

- 🖥️ **Site statique (Frontend)** : republier l'application (changement 100 % côté client).
- ⚙️ **Web Service (Backend Express)** : rien à faire.
- 🗄️ **Base de données** : rien à faire.
