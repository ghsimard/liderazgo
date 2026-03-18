

## Plan: Afficher toutes les institutions d'une région dans l'onglet Entrada/Salida

### Problème
La liste principale n'affiche que les institutions ayant **déjà soumis** des encuestas 360. Si l'admin active la visibilité d'une région mais qu'aucune encuesta n'a été soumise, la liste reste vide. L'admin s'attend à voir toutes les institutions de la région sélectionnée.

### Solution
Quand une région est sélectionnée, fusionner les institutions ayant des encuestas avec les institutions de la région (issues de la hiérarchie géographique) pour afficher aussi celles sans soumission.

### Changement unique : `src/components/admin/AdminEncuestas360Tab.tsx`

1. **Charger les institutions par région** : Dans `loadRegiones`, récupérer aussi les tables `region_instituciones` et `instituciones` pour construire un mapping `région → liste d'institutions`.

2. **Fusionner dans la liste affichée** : Dans le `useMemo` de `regionFiltered` (ligne ~203), quand une région spécifique est sélectionnée, ajouter les institutions de cette région qui n'ont pas encore de soumissions comme des `InstitutionGroup` avec un tableau `encuestas` vide.

3. **Affichage des institutions sans encuestas** : Ces institutions apparaîtront dans la liste avec un compteur à 0 et leur badge de visibilité (Visible/No visible), permettant à l'admin de voir et gérer la visibilité de toutes les institutions de la région.

### Résultat
- Sélectionner une région affiche **toutes** ses institutions, y compris celles sans soumissions
- Le badge de visibilité reste interactif sur chaque institution
- "Todas las regiones" continue à n'afficher que les institutions avec des encuestas (comportement actuel)

### Actions RENDER
- **Frontend** : Redéployer le build (`dist`)
- **Backend / DB** : Aucune action requise

