

## Plan: Corriger le PDF « Campos y reglas »

### Problème
En comparant le schéma Zod (source de vérité, lignes 42-117 de `FichaRLT.tsx`) avec le fichier `fichaFieldsPdfGenerator.ts`, plusieurs champs sont marqués « No » (optionnel) alors qu'ils ont `.min(1)` dans le schéma (donc obligatoires). De plus, les règles descriptives de certains champs ne reflètent pas le schéma actuel.

### Corrections à appliquer dans `src/utils/fichaFieldsPdfGenerator.ts`

**Champs à passer de « No » à « Sí » (obligatoires selon le schéma Zod) :**

| Campo | Actuel | Corrigé | Règle mise à jour |
|-------|--------|---------|-------------------|
| genero | No | **Sí** | Selección obligatoria |
| numero_cedula | No | **Sí** | Texto obligatorio |
| tipo_formacion | No | **Sí** | Selección obligatoria |
| tipo_vinculacion | No | **Sí** | Selección obligatoria |
| codigo_dane | No | **Sí** | Obligatorio, exactamente 12 dígitos numéricos |
| entidad_territorial | No | **Sí** | Selección obligatoria (cascada desde región) |
| zona_sede | No | **Sí** | Selección obligatoria (Urbana / Rural) |
| sedes_rural | No | **Sí** | Número entero ≥ 0, obligatorio |
| sedes_urbana | No | **Sí** | Número entero ≥ 0, obligatorio |

**Champ `grupos_etnicos`** : le schéma le définit comme `z.array(z.string()).optional()` — actuellement listé comme simple « Selección opcional », mettre à jour la règle en « Selección múltiple opcional (checkbox) » pour refléter que c'est un array.

### Fichier modifié
- `src/utils/fichaFieldsPdfGenerator.ts` — mise à jour des 9 lignes concernées

