

## Plan: Ajouter la date de création dans le détail d'évaluation

Ajouter une colonne "Fecha" dans le tableau du détail d'évaluation (Rúbricas > Resultados) qui affiche la date de création (`created_at`) de chaque évaluation.

### Modifications

**Fichier** : `src/components/admin/AdminRubricasTab.tsx`

1. Ajouter un `<TableHead>` "Fecha" après la colonne "Ítem" (ligne 289)
2. Ajouter un `<TableCell>` qui affiche `ev.created_at` formaté en date courte (ex: `dd/mm/yyyy`) après la cellule de l'ítem (ligne 305)

Le champ `created_at` est déjà récupéré dans le `select("*")` de `rubrica_evaluaciones`. Aucune modification de requête nécessaire.

