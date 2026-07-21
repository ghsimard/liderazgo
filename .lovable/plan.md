## Plan révisé

1. **Conserver les labels flottants**
   - Ne pas convertir `Lengua materna`, `Región`, `Cargo actual` ni les autres champs en labels fixes.
   - Garder le comportement actuel : label centré quand le champ est vide, label réduit en haut quand il y a une valeur ou le focus.

2. **Corriger le chevauchement à la source CSS**
   - Ajuster uniquement `src/index.css` pour redonner assez d’espace vertical entre le label flottant et la valeur affichée.
   - Le problème visible sur la capture vient surtout des `<select>` : la valeur sélectionnée remonte trop haut et passe sous le label.

3. **Traitement spécifique des listes déroulantes**
   - Ajouter une règle dédiée pour `select.form-input.floating-input` afin de mieux contrôler :
     - hauteur minimale,
     - padding haut réel,
     - line-height,
     - rendu natif du select.
   - Éviter que le texte de l’option sélectionnée puisse se dessiner dans la zone du label.

4. **Ajuster le label flottant sans changer son concept**
   - Garder le label réduit en haut, mais le positionner légèrement plus haut et/ou réduire son occupation verticale.
   - Garder l’ellipsis et la protection contre la flèche du select.

5. **Appliquer globalement aux composants existants**
   - Corriger le composant partagé via CSS, pour que le fix s’applique aux deux formulaires :
     - `FichaRLT.tsx`
     - `AdminEditFicha.tsx`
   - Ne pas modifier la logique React ni les données.

6. **Validation visuelle**
   - Vérifier sur la route admin de ta capture que `Lengua materna` affiche bien : label flottant au-dessus, valeur `Español` en dessous, sans chevauchement.
   - Vérifier aussi `Región`, `Cargo actual`, `Entidad Territorial` et `Municipio`.