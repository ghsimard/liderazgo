# Retirer le plafond de 25 réponses dans Delta

## Objectif
Rétablir le comportement d'origine de **Ambiente Escolar → Informes → Delta** : les rapports doivent tenir compte de **toutes** les réponses d'Evolución, sans plafond.

## Fichier modifié
`src/components/admin/AdminAmbienteDeltaTab.tsx`

## Changements

1. **Supprimer l'état et la constante** (l. 99-100)
   - Retirer `const [capEvolucion, setCapEvolucion] = useState(true);`
   - Retirer `const CAP_EVO_N = 25;`

2. **Supprimer le bloc de plafonnement** (l. 277-297)
   - Supprimer tout le bloc `if (capEvolucion) { ... }` qui regroupe par `(institución, tipo_formulario)`, trie par `created_at` et coupe à `CAP_EVO_N`.
   - Remplacer `let evolucion = remap(evoRaw, "cierre");` par `const evolucion = remap(evoRaw, "cierre");` (plus de réassignation).

3. **Retirer la dépendance du `useMemo`** (l. 325)
   - Enlever `capEvolucion` du tableau de dépendances.

4. **Retirer la case à cocher dans l'UI** (l. 926-936)
   - Supprimer le `<label>` complet contenant la checkbox « Limitar Evolución a las 25 respuestas más antiguas… ».

## Ce qu'on ne touche pas
- Aucune autre logique de Delta (comparabilité muestrale, `melAmbienteIndicator`, exclusions MEL, KPI 80 %, etc.) — elles restent telles qu'avant l'ajout du toggle.
- Aucun autre onglet (Estadísticas, Campañas, Monitoreo, MEL) — le plafond n'y a jamais été appliqué.
- Aucune modification SQL ni Render.

## Vérification
1. Ouvrir Ambiente Escolar → Informes → Delta : plus de case à cocher visible.
2. Le compteur « Evolución: N resp » affiche le total réel (pas capé à 25).
3. Les résultats du KPI 80 % et les deltas par composante correspondent à ce qu'ils étaient avant l'introduction du plafond.
