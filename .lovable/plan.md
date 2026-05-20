# Désactiver la 360 Estudiante pour les Centros Educativos

## Objectif

Lorsqu'une institución est un **Centro Educativo (CE)** — détecté par le préfixe de `nombre_ie` — le formulaire **« Estudiante »** de la Encuesta 360° ne doit pas apparaître dans le Hub du directif (`/encuesta-360`). Les autres rôles (Autoevaluación, Directivo Par, Docente, Administrativo, Acudiente) restent inchangés. Les IE (Instituciones Educativas) conservent tous les formulaires.

## Règle de détection

Un `nombre_ie` est considéré **Centro Educativo** si son nom (insensible à la casse, après trim) commence par :
- `CE ` (ex: « CE La Esperanza »)
- `Centro Educativo` (ex: « Centro Educativo Rural Bellavista »)

Sinon → considéré comme IE (Institución Educativa).

Pas de changement de schéma BDD : la règle est dérivée du nom existant.

## Portée

- **Masquer uniquement le bouton « Estudiante »** dans le Hub 360 (`Encuesta360Hub.tsx`).
- Aucun changement au formulaire lui-même, ni aux URLs, ni aux rapports, ni au monitoring admin (un directif d'IE qui aurait été reclassée garde l'accès via URL existante).

## Changements

### 🖥️ Site statique (Frontend) — uniquement

1. **Nouveau utilitaire** — `src/utils/institutionType.ts`
   - Exporter `isCentroEducativo(nombreIe: string): boolean` avec la règle de préfixe ci-dessus.

2. **Hub 360** — `src/pages/Encuesta360Hub.tsx`
   - Importer `isCentroEducativo`.
   - Calculer `const esCE = isCentroEducativo(directivoInfo?.institucion ?? "")`.
   - Dans le `.map(formsBase)` ligne ~282, filtrer : `if (form.tipo === "estudiante" && esCE) return null;` (ou `formsBase.filter(...)` en amont).

### ⚙️ Web Service (Backend Express)

Aucun changement.

### 🗄️ Base de données (SQL manuel)

Aucun changement.

## Impact

- Les directifs des CE ne verront plus le bouton « Estudiante » dans le Hub 360 (Entrada et Salida).
- Les réponses estudiante déjà enregistrées (s'il y en a) restent dans la BDD et continuent d'apparaître dans les rapports / monitor.
- Si un CE est reclassé en IE plus tard (ou inversement), il suffit de renommer `nombre_ie` — aucune migration nécessaire.
- Aucun risque pour les IE : la règle n'affecte que les noms commençant explicitement par « CE » ou « Centro Educativo ».
