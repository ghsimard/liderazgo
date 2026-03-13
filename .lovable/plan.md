

## Afficher les pourcentages au-dessus de la barre (à l'extérieur)

**Fichier** : `src/utils/ambienteEscolarReportPdfGenerator.ts`, lignes 750-770

**Changement** : Au lieu d'afficher le pourcentage en blanc **à l'intérieur** du segment (centré verticalement dans la barre), l'afficher **au-dessus** de la barre en texte noir, avec une ligne de rappel vers le segment si nécessaire.

1. **Supprimer** le texte blanc à l'intérieur du segment (lignes 760-766).
2. **Ajouter un premier passage** avant le dessin de la barre : calculer les positions X de chaque segment, puis afficher le pourcentage (`≥ 1%`) au-dessus de la barre (`y - 1`) en noir, centré sur chaque segment. Pour les segments très petits, afficher en diagonale ou décalé pour éviter le chevauchement.
3. **Ajuster `y`** : démarrer la barre un peu plus bas pour laisser de la place au texte au-dessus (~4mm supplémentaires).

Résultat : les valeurs sont toujours lisibles, même pour les segments très petits, comme dans l'ancien rapport.

