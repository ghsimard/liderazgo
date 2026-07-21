## Contexte

En production, 24 IE sont exclues « muestra no comparable » parce que la fase **Salida** vient à peine de commencer (N post = 1, 4, 6…). Résultat : 0/0 cumplen, 0.0 %. Le calcul est mathématiquement correct mais **prématuré** — la règle des ±10 % est faite pour évaluer un programme *terminé*, pas une collecte *en cours*.

## Corrections proposées (Frontend uniquement)

### 🖥️ Site statique (Frontend)

**Fichier principal : `src/components/admin/AdminAmbienteDeltaTab.tsx`**
**Fichier secondaire : `src/utils/melAmbienteIndicator.ts`** (signatures étendues)

#### 1. Seuil de comparabilité configurable (au lieu de 10 % en dur)
- Nouveau state `variacionMaxPct` (default 10, options rapides : 10 / 25 / 50 / ∞).
- Remplacer le `comparable = variacion <= 10` en dur dans `computeInstitucionesMel` par un paramètre `variacionMaxPct` passé explicitement.
- Petit contrôle UI à côté de la checkbox actuelle : « Tolerancia muestral : [10 %] [25 %] [50 %] [Sin límite] ».

#### 2. Seuil N minimum par phase
- Nouveau state `nMinPorFase` (default 10 ; options 5 / 10 / 20 / 30).
- Dans `InstitucionMel`, ajouter `recoleccionEnCurso: boolean` = `nBase < min || nPost < min`.
- Ces IE ne sont ni comptées « cumplen » ni « exclues muestra » : elles vont dans un **3ᵉ compartiment** « Recolección en curso ».
- Le badge « muestra no comparable » devient « recolección en curso » quand la raison est un N insuffisant plutôt qu'une variation > seuil.

#### 3. Mode d'affichage « Preliminar »
- Nouveau toggle radio à côté des autres : `Modo : [Oficial] [Preliminar]`.
- **Oficial** = logique actuelle (exclut incomparables et recolección en curso).
- **Preliminar** = calcule ΔS/ΔN et « cumple » sur **toutes** les IE qui ont au moins 1 réponse dans chaque phase ; ajoute un bandeau bien visible orange :
  > ⚠️ Modo Preliminar — resultados provisorios mientras la fase Salida está en curso. No usar como indicador oficial MEL.
- Le KPI principal affiche alors « X % (preliminar) » et le compartiment « Excluidas » devient informationnel seulement.

#### 4. Amélioration des explications UI
- Sous le titre « Indicador MEL — Ambiente Escolar », remplacer la phrase actuelle par un texte plus explicite avec un icône info :
  > Regla oficial: una componente cumple si ΔS ≥ +5 pp o ΔN ≤ -5 pp. Una institución cumple si ≥ 2 de 3 componentes cumplen. **Meta: 80 %.**
  > *Requisitos de validez:* comparabilidad muestral (variación ≤ [X %] entre fases) y N mínimo por fase (≥ [Y] respuestas). Las instituciones que aún no cumplen estos requisitos aparecen como *recolección en curso* y no penalizan el indicador.
- Tooltip sur le badge « muestra no comparable » : « La cantidad de respuestas varió {var}% entre Entrada (N={nBase}) y Salida (N={nPost}). Umbral configurado: {umbral}%. »
- Tooltip sur « recolección en curso » : « N insuficiente en al menos una fase (mínimo configurado: {min}). Entrada: {nBase}, Salida: {nPost}. »

#### 5. Compartiment « Excluidas » remanié (carte de droite)
Actuellement : `24 por muestra no comparable / 0 sin datos suficientes`. Deviendra :
```
Excluidas del cálculo
  ↳ 12  recolección en curso   (N < mínimo)
  ↳ 12  muestra no comparable  (variación > umbral)
  ↳  0  sin datos suficientes  (< 2 componentes evaluables)
```

#### 6. Persistance des préférences
- Sauver `variacionMaxPct`, `nMinPorFase`, `modo` dans `localStorage` (clé `mel-ambiente-prefs`) pour que l'admin retrouve sa vue.

### ⚙️ Web Service (Backend Express)
Aucune action.

### 🗄️ Base de données (SQL manuel)
Aucune action.

## Détails techniques

Extension de `melAmbienteIndicator.ts` :

```ts
// Nouvelle signature (rétrocompatible avec defaults)
export function computeInstitucionesMel(
  institucion: string,
  subsBase: Submission[],
  subsPost: Submission[],
  itemIdsByComponent: Record<string, string[]>,
  opts: { variacionMaxPct?: number; nMinPorFase?: number } = {}
): InstitucionMel  // + recoleccionEnCurso: boolean

export function aggregateMel(
  rows: InstitucionMel[],
  opts: { ignorarComparabilidad?: boolean; modo?: "oficial" | "preliminar" } = {}
): MelGlobal  // + nRecoleccionEnCurso: number, esPreliminar: boolean
```

Le mode Preliminar dans `aggregateMel` :
- `included` = IE avec ≥ 2 componentes evaluables (ignore comparable + recoleccionEnCurso).
- `esPreliminar = true` porté dans le retour pour que l'UI affiche le bandeau.

## Ce que ce plan ne fait pas
- Ne modifie pas les seuils **méthodologiques** MEL (±5 pp, 2/3, 80 %).
- Ne modifie pas le calcul des Δ eux-mêmes ni la logique de matching (déjà corrigée précédemment).
- Ne touche pas au backend ni à la BD.
- Le PDF « oficial » (générateur existant) reste inchangé ; il ne reflète que le mode Oficial.

## Vérification
1. Avec les valeurs par défaut (10 %, N≥10, Oficial) : comportement identique à aujourd'hui → 0/0 sur la capture.
2. Passer à Preliminar → les 24 IE actuellement exclues alimentent un pourcentage indicatif avec bandeau orange.
3. Passer tolérance à 50 % → la plupart des IE réintègrent le calcul officiel.
4. Le compartiment Excluidas ventile correctement recolección vs no comparable.
