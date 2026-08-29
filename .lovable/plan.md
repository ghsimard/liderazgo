# Satisfacciones — Sélection des options sur mobile/tablette

## Problème
Dans `src/components/SatisfaccionForm.tsx`, les questions de type grille (`grid-sino`, `grid-frequency`, `grid-logistic`) sont rendues comme un tableau `<table>` enveloppé dans `overflow-x-auto`. Sur cellulaire et tablette, les colonnes d'options (3 à 5 colonnes + la colonne de libellé `min-w-[200px]`) dépassent la largeur de l'écran : l'usager doit défiler horizontalement pour voir et cocher les options — peu intuitif.

Les questions `likert4` (radio en `flex-wrap`) passent déjà correctement à la ligne ; seules les grilles posent problème.

## Solution
Rendu responsive à double affichage dans `GridQuestion` (même pattern que `AmbienteEscolarForm.tsx`) :

### 1. Desktop (`md` et plus) — inchangé
- Le tableau actuel reste tel quel : `hidden md:block`.

### 2. Mobile / tablette (`< md`) — cartes empilées
- Chaque ligne de la grille (`q.rows`) devient une **carte** (`Card`/`CardContent`) affichant le libellé de la ligne en entier.
- Sous le libellé, les options (colonnes) sont affichées comme des **boutons-radio empilés verticalement** (`RadioGroup` + `RadioGroupItem`, une option par ligne), libellés complets visibles, zone tactile confortable (≥ 44 px conforme aux règles UI du projet).
- Aucun défilement horizontal ; tout tient dans la largeur de l'écran.
- En mode `disabled` (aperçu admin), le groupe est désactivé avec opacité réduite.

### Détails
- Fichier modifié : `src/components/SatisfaccionForm.tsx` (fonction `GridQuestion` uniquement).
- Aucune logique de données modifiée : `onGridChange(rowKey, value)` reste identique — réponses, validation et PDF inchangés.
- Vérification : typecheck + aperçu visuel sur viewport mobile (375 px) et tablette (834 px) des trois formulaires (Asistencia, Interludio, Intensivo).

## Actions par environnement
- 🖥️ Site statique (Frontend) : republier l'application.
- ⚙️ Web Service (Backend Express) : rien.
- 🗄️ Base de données : rien.
