

## Plan: Afficher le total d'étudiants (admin seulement) dans AdminEditFicha

### Modification

**Fichier** : `src/pages/AdminEditFicha.tsx`

Après la boucle `.map()` des niveaux éducatifs (ligne ~1307), insérer une ligne récapitulative affichant la somme dynamique des 5 champs étudiants via `watch()`. Ce total n'apparaît que dans `AdminEditFicha.tsx` — aucune modification à `FichaRLT.tsx` (le formulaire directivo).

```tsx
{/* Après ligne 1307, dans le div existant */}
<div className="flex items-center justify-between pt-2 border-t mt-2">
  <span className="font-semibold text-sm">Total estudiantes</span>
  <span className="font-bold text-base w-20 text-center">
    {["estudiantes_preescolar","estudiantes_primaria","estudiantes_basica_secundaria","estudiantes_media","estudiantes_ciclo_complementario"]
      .reduce((s, f) => s + (parseInt(watch(f as any)) || 0), 0)}
  </span>
</div>
```

### Impact

- Un seul fichier modifié : `AdminEditFicha.tsx`
- `FichaRLT.tsx` (formulaire directivo) reste inchangé — le total est invisible pour les directivos

