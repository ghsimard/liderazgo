
# Une seule source de vérité : `fichas_rlt`

## Principe retenu

- **Seule `fichas_rlt` définit** quelles IE existent dans quel cohorte.
- L'appartenance ficha ↔ cohorte est déterminée par la correspondance `fichas_rlt.region = ae_cohortes.nombre` (déjà utilisée aujourd'hui).
- La table `ae_cohorte_instituciones` **cesse d'alimenter** le combobox et les monitoreos (elle reste en base comme historique, non touchée).

## Impact attendu

Pour Oriente 2026 : le combobox listera **22 IE** (celles réellement présentes dans `fichas_rlt`), plus les 16 canoniques ne s'ajoutent plus. Résultat identique en pratique puisque les 16 canoniques sont toutes déjà dans les 22 fichas.

Pour Quibdó 2026, Rionegro 2025, Itagüí 2025, Medellín 2025 : seuls les IE avec au moins une Ficha RLT apparaîtront.

## Modifications

### 🗄️ Base de données (Manual SQL — Render + Lovable Cloud)

Redéfinir la vue en supprimant le `UNION` avec `ae_cohorte_instituciones` :

```sql
CREATE OR REPLACE VIEW public.v_ae_instituciones_por_cohorte AS
SELECT c.id AS cohorte_id, f.nombre_ie AS institucion_educativa
FROM public.ae_cohortes c
JOIN public.fichas_rlt f ON f.region = c.nombre
GROUP BY c.id, f.nombre_ie;

GRANT SELECT ON public.v_ae_instituciones_por_cohorte TO PUBLIC;
```

À exécuter :
- **Render** : ajouter un fichier `server/migrations/2026-XX-XX_v_ae_instituciones_solo_fichas.sql` et l'appliquer manuellement via `psql` sur la base Render.
- **Lovable Cloud** : appliquer la même redéfinition via l'outil de migration Supabase.

Aucune donnée n'est supprimée. `ae_cohorte_instituciones` reste en place (historique), mais n'alimente plus rien.

### ⚙️ Web Service (Backend Express)

Aucun changement. Le proxy `dbClient` lit la vue telle quelle.

### 🖥️ Site statique (Frontend)

Aucun changement fonctionnel obligatoire. Nettoyages recommandés :

1. **`src/components/admin/AdminAmbienteMonitorTab.tsx`** ligne 174 : supprimer le commentaire et la logique de fallback « IE Name - Municipio » qui existait uniquement à cause de `ae_cohorte_instituciones` :
   ```text
   Remplacer findDirectivo() par un simple match exact sur nombre_ie
   (puisque les IE viennent désormais toutes de fichas_rlt et sont
   forcément identiques à fichas_rlt.nombre_ie).
   ```

2. **`src/components/AmbienteEscolarForm.tsx`** : aucun changement, la logique de dédoublonnage par nom fonctionne toujours.

3. Documentation : mettre à jour l'en-tête de `server/schema.sql` (ligne 1014) et de `server/migrations/2026-07-07_v_ae_instituciones_por_cohorte.sql` pour retirer la mention « legacy ae_cohorte_instituciones ».

## Contrôle qualité en amont

Puisque `fichas_rlt` devient la seule source, la qualité du champ `region` devient critique. Les 6 IE parasites d'Oriente 2026 seront **conservées** (elles viennent de fichas réelles avec `region='Oriente 2026'`). Si l'équipe terrain confirme qu'elles sont hors périmètre, il faudra corriger leur `region` en SQL manuel — mais c'est une décision séparée à prendre au cas par cas.

## Résumé actions par plateforme

| Plateforme | Action |
|---|---|
| 🗄️ Base de données | Redéfinir la vue (SQL manuel sur Render + Lovable Cloud) |
| ⚙️ Web Service | — |
| 🖥️ Site statique | Nettoyage du fallback `findDirectivo` + commentaires |
