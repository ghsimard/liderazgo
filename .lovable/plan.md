# Correction du téléchargement PDF (fonctionne sur Render, échoue sur Lovable)

## Ce qui se passe

Sur Render, les logos utilisés dans les PDF sont servis depuis le même domaine (fichiers statiques / `/uploads`). Dans l'aperçu Lovable, les mêmes logos proviennent d'un stockage externe (URLs `.../storage/v1/object/public/app-images/...`), donc en cross-origin.

Le générateur PDF convertit chaque logo en base64 via un `<canvas>` et charge l'image avec `crossOrigin = "anonymous"`. Or ces mêmes fichiers ont déjà été affichés dans la page par des `<img>` sans attribut `crossOrigin` : le navigateur réutilise alors la réponse mise en cache, qui ne porte pas les en-têtes CORS, et le chargement échoue. `loadImageAsBase64` rejette, la promesse `Promise.all` échoue, et comme l'appel n'est ni attendu ni protégé par un `try/catch`, rien ne se passe et aucun message n'est affiché.

Note : le diagnostic repose sur la lecture du code et des requêtes réseau ; il sera confirmé par le message d'erreur console une fois le traitement d'erreur ajouté.

## Ce qu'on corrige

1. **Chargement des images robuste** (`src/utils/pdfLogoHelper.ts`)
   - Charger d'abord avec `crossOrigin = "anonymous"` **et** un paramètre anti-cache (`?cors=1`) pour forcer une requête CORS propre.
   - En cas d'échec, réessayer sans `crossOrigin` et, si le canvas est « teinté », retomber sur le logo statique embarqué dans l'application (`src/assets/...`).
   - Ne jamais laisser la génération PDF échouer à cause d'un logo : en dernier recours, le PDF est produit sans ce logo.

2. **Traitement d'erreur visible** aux endroits qui déclenchent un PDF de ficha
   - `src/components/admin/AdminFichasTab.tsx` : attendre la génération, envelopper dans `try/catch`, afficher un toast en cas d'échec.
   - Même traitement pour le bouton PDF de `src/pages/FichaRLT.tsx`.

3. **Vérification** : reproduire le téléchargement dans l'aperçu et confirmer que le PDF contient bien les logos.

## Détails techniques

- Seul `src/utils/pdfLogoHelper.ts` change côté logique de chargement ; tous les générateurs PDF (ficha, 360, rúbricas, ambiente) en bénéficient automatiquement puisqu'ils importent `loadImageAsBase64` / `getImageNaturalSize` depuis ce fichier.
- Aucun changement de schéma ni d'API.

## Actions requises après approbation

- 🖥️ **Site statique (Frontend)** : republier l'application (les fichiers modifiés sont uniquement côté client).
- ⚙️ **Web Service (Express)** : rien à faire.
- 🗄️ **Base de données** : rien à faire.
