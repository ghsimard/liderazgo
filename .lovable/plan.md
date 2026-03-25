

# Ajouter les écrans live à chaque Hub

## Résumé

Ajouter une preview iframe en direct de l'écran principal de chaque hub, directement dans la section accordion de `/specs/hubs`. Le même pattern que les wireframes sera réutilisé mais sans le filtre sketchy — les écrans apparaîtront tels quels.

## Changements

### Fichier modifié : `src/pages/specs/SpecsHubs.tsx`

1. **Ajouter un champ `previewPath`** à l'interface `HubSpec` — le chemin de la route à afficher en iframe pour chaque hub.

2. **Renseigner `previewPath`** pour chaque hub :
   - Inicio → `/`
   - Ficha RLT → `/ficha`
   - Mi Panel (Directivo/Evaluador) → `/mi-panel`
   - Hub Encuesta 360° → `/encuesta-360`
   - Panel Operador → `/operador`
   - Admin (tous) → `/admin`
   - Contacto/FAQ → `/contacto`

3. **Ajouter un bloc iframe** dans chaque `AccordionContent`, entre les routes/rôles et le tableau de fonctionnalités. L'iframe :
   - Charge la page réelle de l'app (`window.location.origin + previewPath`)
   - Est mise à l'échelle 0.5 pour tenir dans un cadre compact (~350px de haut)
   - Est `pointer-events-none` (non interactive)
   - A un spinner de chargement
   - Lazy loading activé

4. **Ajouter un state `loadedMap`** avec `useState` pour gérer les spinners de chargement.

Aucun autre fichier n'est modifié.

