

## Plan: Endpoints check-orphans et purge-orphans

### Contexte
La table `app_images` contient des entrées qui pointent vers des fichiers physiques supprimés du Persistent Disk. Le frontend fait des requetes HEAD qui retournent 404 (le fallback fonctionne mais pollue la console).

### Modifications

**1. `server/routes/images.ts`** -- Ajouter 2 endpoints admin :

- **`GET /api/images/check-orphans`** (admin) : Lit toutes les entrées de `app_images`, vérifie pour chacune si le fichier physique existe sur le disque (`fs.existsSync`). Retourne la liste des entrées orphelines (clé + chemin).

- **`POST /api/images/purge-orphans`** (admin) : Même logique de détection, puis supprime les lignes orphelines de la table `app_images` via `DELETE`. Retourne le nombre d'entrées purgées.

Note : ces 2 routes doivent etre déclarées **avant** la route `/:imageKey` pour eviter que Express les interprète comme un paramètre dynamique.

**2. `src/components/admin/` (optionnel, panneau admin)** -- Ajouter un bouton dans la section Images du panneau admin pour appeler check-orphans puis purge-orphans, avec un toast de confirmation.

### Implementation details

```typescript
// GET /api/images/check-orphans
router.get("/check-orphans", requireAuth, requireAdmin, async (_req, res) => {
  const rows = await query("SELECT image_key, storage_path FROM app_images");
  const orphans = rows.filter(r => {
    const abs = path.resolve(UPLOAD_DIR, path.basename(r.storage_path));
    return !fs.existsSync(abs);
  });
  res.json({ orphans, count: orphans.length });
});

// POST /api/images/purge-orphans  
router.post("/purge-orphans", requireAuth, requireAdmin, async (_req, res) => {
  const rows = await query("SELECT image_key, storage_path FROM app_images");
  const orphans = rows.filter(r => {
    const abs = path.resolve(UPLOAD_DIR, path.basename(r.storage_path));
    return !fs.existsSync(abs);
  });
  for (const o of orphans) {
    await query("DELETE FROM app_images WHERE image_key = $1", [o.image_key]);
  }
  res.json({ purged: orphans.length, keys: orphans.map(o => o.image_key) });
});
```

Pas de migration DB nécessaire -- on utilise la table `app_images` existante.

