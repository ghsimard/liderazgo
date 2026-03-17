

## Plan: Afficher le % de complétion par directivo dans la liste

**Contexte** : La donnée `submissionDates` est déjà chargée (ligne 89-134) — elle contient les modules complétés (submission_type === "nivel_acordado") par cédula. Il y a 4 modules au total (variable `modules`).

**Changement unique** dans `AdminRubricaModuleReport.tsx` (lignes 287-298) :

Dans le bouton de chaque directivo, calculer le pourcentage de modules complétés et l'afficher comme un petit badge à côté du nom :

```tsx
filteredAsignaciones.map(a => {
  const completed = submissionDates[a.directivo_cedula]?.size || 0;
  const total = modules.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  return (
    <button ...>
      <div className="flex items-center justify-between">
        <span className="font-medium">{a.directivo_nombre}</span>
        <Badge variant={pct === 100 ? "default" : "outline"} 
               className={pct === 100 ? "bg-emerald-100 text-emerald-800 text-[10px]" : "text-[10px]"}>
          {pct}%
        </Badge>
      </div>
      <div className="text-muted-foreground">CC: {a.directivo_cedula} — {a.institucion}</div>
    </button>
  );
})
```

Un seul fichier modifié, aucun appel backend supplémentaire.

