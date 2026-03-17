

## Rediriger "Rellenar otra ficha" vers la page d'accueil

### Problème
Le bouton "Rellenar otra ficha" appelle `handleNuevaFicha` qui réinitialise le formulaire sur place. L'utilisateur souhaite être redirigé vers la page d'accueil (splash page `/`).

### Modification

**Fichier** : `src/pages/FichaRLT.tsx` (ligne 910)

Remplacer `onClick={handleNuevaFicha}` par `onClick={() => navigate("/")}` pour rediriger vers la page d'accueil.

