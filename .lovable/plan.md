

# Plan : Renommer les cohortes et supprimer la colonne `grupo`

## Résumé
Deux actions combinées : (1) renommer les 5 cohortes existantes dans `ae_cohortes` en retirant "G1" et en mettant à jour l'année pour Quibdó/Oriente, (2) supprimer la colonne `grupo` devenue inutile.

**Important** : Les clés dans `instituciones.ts` ("Oriente", "Quibdó") et les références dans `FichaRLT.tsx`/`AdminEditFicha.tsx` concernent la table `regiones` (géographie), PAS les cohortes — elles ne changent pas.

## Étapes

### 1. 🗄️ Données — Renommer les cohortes (outil insert)
```sql
UPDATE ae_cohortes SET nombre = 'Medellín 2025' WHERE id = 'c25708c1-54f7-4044-96bc-7d15bf449d4f';
UPDATE ae_cohortes SET nombre = 'Rionegro 2025' WHERE id = '1724cd6d-c72d-49b2-94e0-6d96948c3a1e';
UPDATE ae_cohortes SET nombre = 'Itagüí 2025' WHERE id = '2ca48e5d-2c62-4576-a341-a158474fa088';
UPDATE ae_cohortes SET nombre = 'Quibdó 2026', year = 2026 WHERE id = 'd1a2b3c4-0001-4000-8000-000000000001';
UPDATE ae_cohortes SET nombre = 'Oriente 2026', year = 2026 WHERE id = 'd1a2b3c4-0002-4000-8000-000000000002';
```

### 2. 🗄️ Schéma — Supprimer la colonne `grupo` (migration)
```sql
ALTER TABLE ae_cohortes DROP COLUMN grupo;
```

### 3. 🖥️ Frontend — Nettoyer `AdminAmbienteMonitorTab.tsx`
- Retirer `grupo` de l'interface `Cohorte` (ligne 16)
- Retirer `grupo` du `.select()` (ligne 65) : `"id, nombre, entidad_territorial, year"`

### Fichiers modifiés
- `src/components/admin/AdminAmbienteMonitorTab.tsx` — 2 lignes

