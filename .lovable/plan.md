# Restreindre l'exclusion « Estudiante » aux CE de Quibdó

Actuellement, le formulaire **Estudiante** (Encuesta 360°) est masqué pour **tous** les Centros Educativos (CE), peu importe la région. La règle correcte : exclure uniquement les CE de la région **Quibdó**. Les CE d'Oriente (ex. « Centro Educativo Rural Monseñor… ») doivent à nouveau voir/recevoir le formulaire Estudiante.

## 🖥️ Site statique (Frontend) — seuls changements requis

### 1. `src/utils/institutionType.ts` — nouvelle fonction
Ajouter un helper qui combine le test CE + région :
```ts
export function isQuibdoCentroEducativo(
  nombreIe: string | null | undefined,
  regionOrEntidad: string | null | undefined
): boolean {
  if (!isCentroEducativo(nombreIe)) return false;
  const r = (regionOrEntidad ?? "").toLowerCase();
  return r.includes("quibdó") || r.includes("quibdo");
}
```
On garde `isCentroEducativo` inchangé (utilisé ailleurs pour des libellés/rôles).

### 2. `src/pages/Encuesta360Hub.tsx` — hub directivo
- Étendre `DirectivoInfo` avec `region: string`.
- Lire `ficha.region` lors du `setDirectivoInfo` (ligne ~116).
- Remplacer la condition d'exclusion (ligne 285) :
  ```ts
  if (form.tipo === "estudiante"
      && isQuibdoCentroEducativo(directivoInfo?.institucion, directivoInfo?.region)) {
    return null;
  }
  ```

### 3. `src/components/admin/AdminEncuestaMonitor.tsx` — monitoring admin
La ligne 39 utilise déjà `institucion` ; la `region` est déjà chargée par ligne dans `rows`. Modifier :
```ts
const roleKeysFor = (institucion: string, region: string): string[] =>
  isQuibdoCentroEducativo(institucion, region)
    ? ROLE_KEYS.filter((k) => k !== "estudiante")
    : ROLE_KEYS;
```
Et adapter les 2 appels (`roleKeysFor(d.institucion, d.region)` ligne 110, `roleKeysFor(r.institucion, r.region)` ligne 303).

### 4. `src/utils/reporte360PdfGenerator.ts` — texte d'intro du PDF
Ligne 169 : remplacer `isCentroEducativo(data.directivo.institucion)` par
```ts
isQuibdoCentroEducativo(data.directivo.institucion, data.directivo.entidadTerritorial)
```
(et mettre à jour l'import). `entidadTerritorial` vaut « Quibdó » pour cette région.

## ⚙️ Web Service (Backend Express)
Aucun changement — la logique est 100 % côté frontend (pas de filtre serveur sur le tipo « estudiante »).

## 🗄️ Base de données
Aucun changement — pas de migration, pas de SQL manuel. Les données existantes (réponses Estudiante déjà saisies pour des CE d'Oriente, s'il y en a) restent valides.

## Vérification après implémentation
1. Connecté comme directif d'un CE d'**Oriente** → l'option « Estudiante » doit **réapparaître** dans le hub.
2. Connecté comme directif d'un CE de **Quibdó** → l'option « Estudiante » reste masquée.
3. Monitor admin filtré par région : les CE d'Oriente doivent à nouveau compter la ligne Estudiante dans les quotas ; ceux de Quibdó non.
4. PDF Reporte 360° d'un CE d'Oriente : le paragraphe d'intro mentionne à nouveau « estudiantes ».
