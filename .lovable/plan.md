## Objectif

Dans l'onglet **Admin → Ambiente Escolar → Delta**, permettre à l'utilisateur de choisir **une, plusieurs, ou toutes les régions** à inclure dans le rapport (affichage à l'écran + PDF cohorte + PDFs par institution + ZIP). Par défaut : toutes les régions (comportement actuel).

## UX

Ajouter à côté du sélecteur de cohorte un **sélecteur multi-régions** (popover avec cases à cocher) :

```text
[Cohorte ▾]  [Regiones: Todas ▾]   Inicial: 120 · Evolución: 98 · Comparables: 14 IE
                                     ────────────────
                                     [x] Todas
                                     [x] Oriente 2026
                                     [ ] Quibdó 2026
```

- Chip "Todas" quand rien n'est coché (ou tout coché).
- Sinon afficher le nombre : "Regiones: 2 seleccionadas".
- Bouton **Limpiar** pour revenir à Todas.

Le filtre s'applique **avant** tous les calculs (splits par phase, agrégats, deltas par institution) donc toutes les cartes, la table Δ par institution, le PDF cohorte et les PDFs par institution reflètent uniquement les IE des régions sélectionnées.

Le nom des régions sélectionnées apparaît discrètement dans le PDF cohorte sous le titre (ex. `Regiones: Oriente 2026, Quibdó 2026` ou `Regiones: Todas`) pour tracer le périmètre.

## Implémentation technique

### `src/components/admin/AdminAmbienteDeltaTab.tsx`
1. Importer `useGeographicData` pour obtenir `regionNames` et `getInstitucionesForRegion`.
2. Nouveau state `selectedRegions: string[]` (vide = toutes).
3. Calculer `allowedInstitutionsSet: Set<string> | null` :
   - `null` si `selectedRegions` est vide → aucun filtre.
   - sinon union des `getInstitucionesForRegion(r)` pour chaque région sélectionnée.
4. Dans `phaseSplit`, après le filtre cohorte/phase, appliquer aussi `!allowedInstitutionsSet || allowedInstitutionsSet.has(s.institucion_educativa)`.
5. Reset `analysisHtml` quand `selectedRegions` change (comme pour la cohorte).
6. Ajouter le composant multi-select (Popover + Checkbox shadcn déjà dispo) à côté du Select cohorte.
7. Passer `regionesLabel` (string) au générateur PDF cohorte.

### `src/utils/ambienteDeltaPdfGenerator.ts`
- Ajouter champ optionnel `regionesLabel?: string` au type d'entrée.
- L'afficher sous le sous-titre de la page de couverture s'il est présent.

### Pas de changements
- Backend / DB / Express : rien.
- Autres onglets, autres PDFs (rapport par institution reste identique ; le filtre change juste la liste des IE incluses dans le ZIP).

## Détails techniques (résumé)

- Fichiers modifiés : `AdminAmbienteDeltaTab.tsx`, `ambienteDeltaPdfGenerator.ts`.
- Aucune dépendance ajoutée.
- Comportement rétro-compatible : sans sélection = toutes les régions = résultat identique à aujourd'hui.
