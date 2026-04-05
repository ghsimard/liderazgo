

## Plan: Logos PDF selon la région filtrée

### Problème
Le PDF affiche toujours les deux logos (RLT + CLT) quel que soit le filtre région. Chaque région a des flags `mostrar_logo_rlt` / `mostrar_logo_clt` dans la table `regiones` qui devraient piloter l'affichage.

### Solution

**Fichier** : `src/components/admin/AdminEncuestaMonitor.tsx`

1. **Charger les flags régionaux** : Dans `generatePdf`, quand `regionFilter !== "__all__"`, faire un `supabase.from("regiones").select("mostrar_logo_rlt, mostrar_logo_clt").eq("nombre", regionFilter).single()` pour récupérer les flags.

2. **Passer les flags à `loadPdfLogos`** : Remplacer le `loadPdfLogos(..., true, true)` actuel (ligne 148) par `loadPdfLogos(..., showRlt, showClt)` où les valeurs viennent de la requête (ou `true` par défaut si "Todas las regiones").

### Impact
- Un seul fichier modifié
- Aucune migration nécessaire

