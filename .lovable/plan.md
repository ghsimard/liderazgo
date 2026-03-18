

## Pourquoi le nom ne change pas partout

Le probleme est la **denormalisation des donnees**. Quand une encuesta 360 est soumise, le nom du directivo est **copie en texte brut** dans la colonne `nombre_directivo` de la table `encuestas_360`. Ce n'est pas une reference (foreign key) vers `fichas_rlt` --- c'est une copie figee au moment de la soumission.

Donc quand on modifie le nom dans la ficha, les enregistrements existants dans `encuestas_360` conservent l'ancien nom.

Tables affectees (stockent le nom en texte brut) :
- `encuestas_360.nombre_directivo` / `nombre_completo`
- `rubrica_asignaciones.directivo_nombre`
- `encuesta_invitaciones.directivo_nombre`

Le dropdown de selection des directivos lors d'une **nouvelle** soumission utilise `get_directivos_por_institucion()` qui lit depuis `fichas_rlt` --- donc les nouvelles encuestas utiliseront le bon nom. Mais les anciennes gardent l'ancien.

---

### Solution proposee

Ajouter une **cascade de mise a jour** dans la page d'edition de ficha (`AdminEditFicha.tsx`) : quand le champ `nombres_apellidos` est modifie, executer des `UPDATE` sur les tables dependantes pour propager le nouveau nom.

**Fichier** : `src/pages/AdminEditFicha.tsx`

Dans la fonction de sauvegarde, apres le `UPDATE` sur `fichas_rlt`, ajouter :

```typescript
// Si le nom a change, propager aux tables denormalisees
if (oldName !== newName) {
  await supabase.from("encuestas_360")
    .update({ nombre_directivo: newName })
    .eq("nombre_directivo", oldName)
    .eq("institucion_educativa", institucion);

  await supabase.from("encuestas_360")
    .update({ nombre_completo: newName })
    .eq("nombre_completo", oldName)
    .eq("tipo_formulario", "autoevaluacion")
    .eq("institucion_educativa", institucion);

  await supabase.from("rubrica_asignaciones")
    .update({ directivo_nombre: newName })
    .eq("directivo_nombre", oldName);

  await supabase.from("encuesta_invitaciones")
    .update({ directivo_nombre: newName })
    .eq("directivo_nombre", oldName);
}
```

### Etapes

1. Lire `AdminEditFicha.tsx` pour identifier la fonction de sauvegarde et capturer l'ancien nom avant modification.
2. Ajouter la propagation du nom dans les 4 tables apres sauvegarde reussie de la ficha.
3. Faire la meme chose dans le backend Express (`server/routes/db.ts` ou route dediee) pour Render.

### Deploiement

- **Site statique** : Oui
- **Web Service** : Oui (si la sauvegarde passe par Express sur Render)
- **Base de donnees** : Non

