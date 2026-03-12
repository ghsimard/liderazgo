

## Plan : Augmenter l'espacement entre l'en-tête et le contenu

**Problème** : L'en-tête (logos + ligne séparatrice) se termine à y=24 et le contenu commence à y=28, soit seulement 4mm d'espace.

**Solution** : Modifier la fonction `drawHeader()` pour retourner une valeur y plus grande, créant plus d'espace entre la ligne séparatrice et le début du contenu.

### Modification dans `satisfaccionPdfGenerator.ts`

- Ligne 126 : changer `return 28;` → `return 34;` (ajoute 6mm d'espace supplémentaire, passant de 4mm à 10mm sous la ligne)

C'est la seule modification nécessaire — toutes les pages (couverture, résumé exécutif, contenu) utilisent `drawHeader()` donc l'espacement sera cohérent partout.

