

# Plan: Ajouter les régions à la purge (sans toucher ET/Municipios/Instituciones)

## Modification

**Fichier** : `src/components/admin/AdminPurgeDataTab.tsx`

1. Ajouter 4 tables de régions à `TABLES_TO_PURGE` (enfants FK d'abord) :
   - `region_instituciones` — Institutions assignées aux régions
   - `region_municipios` — Municipios assignés aux régions
   - `region_entidades` — Entidades assignées aux régions
   - `regiones` — Régions elles-mêmes

2. Mettre à jour `TABLES_PRESERVED` :
   - Retirer la ligne combinée `regiones / region_entidades / region_municipios / region_instituciones`
   - Conserver `entidades_territoriales / municipios / instituciones` comme ligne préservée

Les entidades territoriales, municipios et instituciones ne sont **pas** touchées et restent intactes après la purge.

