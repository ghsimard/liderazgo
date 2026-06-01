## Problème

Dans **Admin → Ambiente Escolar → Monitoreo**, seules les cohortes de **Quibdó 2026** et **Oriente 2026** apparaissent. Les cohortes **Rionegro 2025, Itagüí 2025 et Medellín 2025** sont absentes alors que la base de données contient bien leurs réponses :

| Cohorte | Docentes | Estudiantes | Acudientes |
|---|---|---|---|
| Rionegro 2025 | 456 | 1 087 | 970 |
| Itagüí 2025 | 255 | 668 | 1 500 |
| Medellín 2025 | 1 967 | 5 285 | 5 427 |

## Cause

`src/components/admin/AdminAmbienteMonitorTab.tsx` charge les cohortes avec un filtre `.gte("year", 2026)`, ce qui exclut explicitement toutes les cohortes 2025.

```ts
supabase.from("ae_cohortes")
  .select("...")
  .gte("year", 2026)   // ← exclut 2025
```

## Correctif (frontend uniquement)

1. **`AdminAmbienteMonitorTab.tsx`** — retirer le filtre `.gte("year", 2026)` pour charger toutes les cohortes (tri déjà fait par `year DESC` puis `nombre`, donc 2026 apparaîtra en haut du sélecteur).
2. **Mapping région → entidad territorial** (`etMap`) — étendre pour que les opérateurs régionaux 2025 voient leurs cohortes :
   ```ts
   const etMap: Record<string, string> = {
     "Oriente 2026": "Antioquia",
     "Quibdó 2026": "Quibdó",
     "Rionegro 2025": "Rionegro",
     "Itagüí 2025": "Itagüí",
     "Medellín 2025": "Medellín",
   };
   ```
3. **Aucun changement SQL / backend.** Les données sont déjà présentes dans `ae_cohortes`, `ae_cohorte_instituciones` et `encuestas_ambiente_escolar`.

## Vérification

Après le correctif, le sélecteur "Cohorte" doit lister les 5 cohortes et afficher les compteurs correspondants (≈ 1 500 / 2 400 / 12 700 réponses pour Rionegro / Itagüí / Medellín).

## Actions par environnement

- 🖥️ **Site statique (Frontend)** : modifier `AdminAmbienteMonitorTab.tsx` (filtre + `etMap`).
- ⚙️ **Web Service (Backend Express)** : aucune action.
- 🗄️ **Base de données (SQL manuel)** : aucune action — les cohortes et réponses 2025 existent déjà.
