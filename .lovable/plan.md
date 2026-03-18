

## Plan : 4 améliorations du module Rúbricas

---

### 1. Filtre par région dans Rúbricas/Resultados

**Fichier** : `src/components/admin/AdminRubricasTab.tsx`

- Charger `regiones` et `fichas_rlt` (avec `numero_cedula, region`) dans `loadData`.
- Construire un mapping `cedulaToRegion: Record<string, string>`.
- Ajouter un `<Select>` "Todas las regiones" / liste des régions au-dessus de la liste des directivos.
- Filtrer `filteredCedulas` par la région sélectionnée en plus du `searchTerm`.

---

### 2. Suppression d'autoevaluations (Admin + Évaluateur)

**Fichier** : `src/components/admin/AdminRubricasTab.tsx` (onglet Resultados)
- Quand un directivo est sélectionné, ajouter un bouton "Borrar autoevaluación" (par module) visible pour l'admin.
- L'action supprime les lignes de `rubrica_evaluaciones` (colonnes `directivo_nivel` mises à null ou lignes supprimées), la `rubrica_submission_dates` correspondante (type `autoevaluacion`), et les évaluations équipe/acordado associées le cas échéant pour ce module.

**Fichier** : `src/pages/RubricaEvaluacion.tsx`
- Pour le rôle évaluateur, ajouter un bouton similaire "Borrar autoevaluación del directivo" quand la soumission `autoevaluacion` existe pour le module actif.
- La suppression efface `rubrica_evaluaciones` (directivo_nivel, directivo_comentario → null ou suppression des lignes) et la `rubrica_submission_dates` (type `autoevaluacion`) pour le module, permettant au directivo de recommencer.

---

### 3. Bouton "Mi Rúbrica" conditionnel dans Mi Panel

**Fichier** : `src/pages/MiPanel.tsx`

Actuellement le bouton "Mi Rúbrica de Evaluación" s'affiche dès que `roleInfo.is_directivo && roleInfo.exists_ficha`. Il faut ajouter une condition : le directivo doit avoir une entrée dans `rubrica_asignaciones`.

- Dans le `useEffect` de `fetchRole`, ajouter une requête :
  ```typescript
  const { count: asigCount } = await supabase
    .from("rubrica_asignaciones")
    .select("id", { count: "exact", head: true })
    .eq("directivo_cedula", cedula);
  ```
- Stocker dans un state `rubricaEnabled` (true si `asigCount > 0`).
- Conditionner l'affichage du bouton sur `rubricaEnabled` au lieu de `exists_ficha` seul.

Cela signifie que l'admin active la rúbrica en assignant le directivo à un évaluateur dans Rúbricas/Configuración, ce qui crée l'entrée dans `rubrica_asignaciones`.

---

### 4. Noms des directivos depuis `fichas_rlt` (source de vérité)

**Fichier** : `src/components/admin/AdminRubricasTab.tsx`

Actuellement (lignes 83-86), les noms de `fichas_rlt` sont chargés d'abord, puis **écrasés** par ceux de `rubrica_asignaciones`. Il faut inverser la priorité :

```typescript
// Charger asignaciones d'abord (fallback), puis fichas_rlt (source de vérité)
asignaciones?.forEach((a: any) => { if (a.directivo_nombre?.trim()) map[a.directivo_cedula] = a.directivo_nombre; });
fichas?.forEach((f: any) => { if (f.nombres_apellidos?.trim()) map[f.numero_cedula] = f.nombres_apellidos; });
```

Simplement inverser les deux lignes : `fichas_rlt` aura la priorité sur `rubrica_asignaciones`.

---

### Déploiement

- **🖥️ Site statique** : Oui (3 fichiers modifiés)
- **⚙️ Web Service** : Non
- **🗄️ Base de données** : Non

