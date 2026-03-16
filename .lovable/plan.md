

# Plan : Fallback automatique + endpoint purge images orphelines

## 1. Modifier `src/hooks/useAppImages.ts`

Ajouter une fonction `imageExists(url)` qui fait un `fetch HEAD` pour vérifier l'accessibilité de chaque image uploadée. Dans `fetchImages()`, après avoir construit l'URL pour chaque entrée de la DB, vérifier son existence. Si 404 → conserver le fallback statique de `FALLBACK_MAP`.

```ts
async function imageExists(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "HEAD" });
    return res.ok;
  } catch {
    return false;
  }
}
```

Dans la boucle Express (lignes 60-65), remplacer l'affectation directe par une vérification :
```ts
for (const row of data.images) {
  const src = row.storage_path.startsWith("/uploads/") && apiBase
    ? `${apiBase}${row.storage_path}`
    : row.storage_path;
  const exists = await imageExists(src);
  if (exists) {
    result[row.image_key] = src;
  }
  // sinon on garde FALLBACK_MAP[key] déjà dans result
}
```

Même logique pour la branche Cloud/Supabase (lignes 72-76) : vérifier les URLs qui pointent vers `/uploads/` ou vers du storage externe.

## 2. Ajouter endpoint `GET /api/images/check-orphans` dans `server/routes/images.ts`

Nouvel endpoint admin qui :
1. Lit toutes les entrées de `app_images`
2. Pour chaque entrée, vérifie si le fichier existe sur le disque (`fs.existsSync`)
3. Retourne la liste des entrées orphelines (fichier manquant)

## 3. Ajouter endpoint `DELETE /api/images/purge-orphans` dans `server/routes/images.ts`

Endpoint admin qui :
1. Lit toutes les entrées de `app_images`
2. Supprime de la DB celles dont le fichier n'existe plus sur le disque
3. Retourne le nombre d'entrées purgées

Ces deux endpoints utilisent `requireAuth` + `requireAdmin`.

### Fichiers modifiés
- `src/hooks/useAppImages.ts` — ajout `imageExists()` + vérification dans `fetchImages()`
- `server/routes/images.ts` — ajout 2 endpoints (`check-orphans`, `purge-orphans`)

