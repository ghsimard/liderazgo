

# Plan: Corriger l'import de RegionPdfPicker pour Render

## Problème

Le composant `RegionPdfPicker.tsx` (ligne 7) importe directement depuis `@/integrations/supabase/client` au lieu de `@/utils/dbClient`. Sur Render, toutes les requêtes DB passent par le proxy Express (shim), donc cet import direct échoue car il tente de se connecter directement à Supabase sans les credentials appropriées en mode Render.

## Correction

**Fichier** : `src/components/admin/RegionPdfPicker.tsx`

- Changer l'import ligne 7 de :
  ```ts
  import { supabase } from "@/integrations/supabase/client";
  ```
  à :
  ```ts
  import { supabase } from "@/utils/dbClient";
  ```

C'est une correction d'une seule ligne. Aucun autre changement nécessaire.

