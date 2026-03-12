

## Diagnostic: Les boutons "+ Texto", "+ Gráfico" fonctionnent mais la nouvelle section s'ajoute en bas

Le code est structurellement correct — `addSection` ajoute bien une nouvelle section au state. Le problème le plus probable est l'un des deux suivants :

1. **Scroll** : La section est ajoutée en bas de la liste (après ~12 sections par défaut) et la page ne scrolle pas automatiquement vers elle → l'utilisateur ne la voit pas.
2. **Re-fetch parasite** : Si la requête DB échoue silencieusement, un re-render pourrait écraser la section ajoutée.

### Corrections à appliquer

**Fichier : `src/components/admin/AdminSatisfaccionReportTab.tsx`**

1. **Auto-scroll vers la nouvelle section** : Ajouter un `useRef` + `scrollIntoView` quand une section est ajoutée via les boutons.

2. **Feedback visuel** : Afficher un toast "Sección agregada" pour confirmer l'action et guider l'utilisateur vers le bas.

3. **Protéger contre les erreurs DB** : Encapsuler la query `loadReportContent` dans un try/catch pour garantir que `setLoading(false)` est toujours appelé même en cas d'erreur réseau.

```text
Changements dans addSection():
  1. Après setReportContent → setTimeout(() => scrollRef.scrollIntoView())
  2. toast({ title: "Sección agregada" })
  
Changements dans loadReportContent():
  1. try/catch autour de la query
  2. finally { setLoading(false) }
```

### Fichiers modifiés
- `src/components/admin/AdminSatisfaccionReportTab.tsx` — 3 petites modifications

