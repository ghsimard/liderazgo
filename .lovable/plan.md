# Plan : corriger les builds Render qui crashent (status 134)

## Diagnostic confirmé

Les deux derniers déploiements ont échoué avec **status 134 (SIGABRT)** pendant la phase build, juste après `vite build ... transforming...`.

Cause : la variable `NODE_OPTIONS=--max-old-space-size=768` ajoutée sur Render s'applique **aussi** au process Node qui exécute `vite build`. Or 768 MB ne suffisent pas pour bundler le frontend (jsPDF, recharts, mermaid, framer-motion, tiptap, supabase, etc.). Vite plante en plein milieu de la transformation des modules.

Avant cet ajout, le build passait — c'est donc bien la variable elle-même qui casse le build.

## Ce que je vais faire

### 1. Modifier `package.json`

Inscrire la limite mémoire **directement dans le script de build**, pour qu'elle s'applique uniquement à Vite et pas au runtime serveur :

```text
"build": "cross-env NODE_OPTIONS=--max-old-space-size=4096 vite build"
```

En réalité, comme Render tourne sous Linux, on peut se passer de `cross-env` et écrire :

```text
"build": "NODE_OPTIONS=--max-old-space-size=4096 vite build"
```

4096 MB est large mais sans risque : Render alloue plus de mémoire **pendant le build** que pendant le runtime, donc Vite aura la marge nécessaire pour bundler.

### 2. Action côté toi sur Render

Une fois le code poussé, tu devras **supprimer** la variable d'environnement `NODE_OPTIONS` sur le service `liderazgo-api` :

- Render → liderazgo-api → Environment
- Trouver la ligne `NODE_OPTIONS = --max-old-space-size=768`
- Cliquer la corbeille pour la supprimer
- Save

Pourquoi : laisser le runtime Node utiliser sa valeur par défaut (≈1.5 Go sur instance Starter). Mes garde-fous de la dernière passe (cap 5000 lignes sur `/api/db`, export streaming, batch query Informe) suffisent à éviter l'OOM runtime sans avoir besoin de cette variable.

### 3. Vérification après déploiement

Logs Render attendus (onglet Logs) :
```text
🚀 Server running on port 10000
```

Et plus aucun `==> Build failed 😞` ni `Exited with status 134`.

## Résultat attendu

- Le build Vite passe (4 Go disponibles pendant la phase build)
- Le runtime serveur démarre correctement
- Plus de crash OOM grâce aux corrections déjà déployées dans le code
- Plus de variable `NODE_OPTIONS` côté Render à maintenir

## Fichier modifié

- `package.json` (ligne 8 uniquement)

## Détail technique

La syntaxe `VAR=value cmd` fonctionne nativement sur Linux/macOS (utilisée par Render). Pour la compatibilité Windows en dev local, il faudrait `cross-env`, mais comme tu es sur Mac et que le build de prod tourne sur Linux Render, c'est inutile. Si plus tard un dev Windows rejoint le projet, on ajoutera `cross-env` en devDependency.
