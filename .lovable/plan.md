

# Plan: Rendre la purge des regions optionnelle via checkbox

## Changement

**Fichier** : `src/components/admin/AdminPurgeDataTab.tsx`

1. **Séparer les tables de régions** de `TABLES_TO_PURGE` dans une constante dédiée `REGION_TABLES`.

2. **Ajouter un state `includeRegions`** (boolean, `false` par défaut).

3. **Ajouter un checkbox** dans le dialog de confirmation, avant le champ de texte, demandant : *"¿También eliminar las regiones?"* avec une note explicative (les ET/municipios/instituciones restent intactes).

4. **Dans `handlePurge`**, concaténer `REGION_TABLES` à la liste de purge uniquement si `includeRegions` est coché.

5. **Dans la liste visuelle** des tables à vaciar, afficher les 4 tables de régions avec un style conditionnel (grisées si non cochées, rouges si cochées) pour que l'admin voie clairement ce qui sera purgé.

6. **Mettre à jour `TABLES_PRESERVED`** pour afficher dynamiquement les régions comme préservées ou non selon le checkbox.

## Detail technique

```text
TABLES_TO_PURGE (toujours)     REGION_TABLES (optionnel)
─────────────────────────      ─────────────────────────
informe_modulo_equipo          region_instituciones
informe_directivo              region_municipios
...                            region_entidades
operator_permissions           regiones
```

- Import `Checkbox` depuis `@/components/ui/checkbox`
- Le checkbox reset à `false` quand le dialog se ferme (via `onOpenChange`)

