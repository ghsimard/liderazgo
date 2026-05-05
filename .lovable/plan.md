## Plan — Corriger l’erreur Render `ENOENT ... /server/dist/index.html`

### Diagnostic confirmé

La nouvelle capture montre une cause différente des timeouts SQL précédents :

```text
Error: ENOENT: no such file or directory, stat '/opt/render/project/src/server/dist/index.html'
```

Le backend démarre bien (`Server running on port 3001`), mais il essaie de servir le frontend depuis un mauvais dossier.

### Cause racine

Dans `server/index.ts`, Express sert actuellement :

```ts
app.use(express.static(path.resolve(__dirname, "../dist")));
res.sendFile(path.resolve(__dirname, "../dist/index.html"));
```

Or sur Render, avec le start command actuel :

```text
cd server && node dist/index.js
```

le fichier compilé tourne depuis :

```text
/opt/render/project/src/server/dist/index.js
```

Donc `../dist/index.html` devient :

```text
/opt/render/project/src/server/dist/index.html
```

mais le build Vite du frontend est en réalité généré à la racine du repo :

```text
/opt/render/project/src/dist/index.html
```

Il manque donc **un niveau de remontée**. Le bon chemin est `../../dist`, pas `../dist`.

### Correctif proposé

#### 1. Corriger le chemin du frontend dans `server/index.ts`

Remplacer le chemin statique et le fallback SPA par une résolution robuste vers le vrai build Vite :

- définir une constante dédiée du type `FRONTEND_DIST_DIR`
- pointer vers `path.resolve(__dirname, "../../dist")`
- réutiliser cette constante pour :
  - `express.static(...)`
  - `sendFile(.../index.html)`

Cela évite que le serveur cherche le frontend dans `server/dist/`.

#### 2. Ajouter une protection explicite sur le fallback SPA

Si `index.html` est absent, renvoyer une erreur serveur claire dans les logs au lieu d’un échec implicite difficile à diagnostiquer.

Objectif : si le build frontend manque vraiment un jour, le log dira clairement quel fichier est attendu.

#### 3. Vérifier qu’aucune autre hypothèse de déploiement n’est codée en dur

Je relirai les références au dossier `dist` côté serveur pour m’assurer qu’il n’y a pas d’autre chemin relatif cassé par le `cd server && node dist/index.js`.

### Résultat attendu

Après redéploiement Render :

- `/` ne doit plus renvoyer 502
- les routes frontend servies par Express doivent fonctionner normalement
- l’erreur `ENOENT ... /server/dist/index.html` doit disparaître des logs

### Détail technique

Chemins actuels vs attendus :

```text
Exécutable serveur:
/opt/render/project/src/server/dist/index.js

Chemin actuel résolu par ../dist:
/opt/render/project/src/server/dist

Chemin réel du build frontend:
/opt/render/project/src/dist
```

### Impact par cible

| Cible | Action |
|---|---|
| Frontend React | Aucune logique métier à changer |
| Backend Express | Corriger `server/index.ts` |
| Base de données | Aucune |
| Render config | Optionnel : si tu veux, définir `/api/health` comme health check dédié, mais le correctif code suffit déjà |

### Hors-scope

- Les optimisations PG/index déjà traitées précédemment
- Toute refonte du pipeline de build Render
- Migration vers un déploiement séparé frontend/backend
