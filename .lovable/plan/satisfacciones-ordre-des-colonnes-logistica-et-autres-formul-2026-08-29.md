# Satisfacciones — Ordre des colonnes LOGISTICA (et autres formulaires)

## Diagnostic (vérifié)
- Le code par défaut (`src/data/satisfaccionData.ts`, `LIKERT4_AGREEMENT`) a déjà été corrigé : « Totalmente de acuerdo » en premier.
- **Mais** la table `satisfaccion_form_definitions` contient une définition globale du formulaire **Intensivo** enregistrée le 2026-05-20 avec l'**ancien ordre** : `Totalmente en desacuerdo, Algo en desacuerdo, Algo de acuerdo, Totalmente de acuerdo`.
- La logique de chargement (module spécifique → global → défaut) donne la priorité à la base : l'ancien ordre s'affiche donc dans l'aperçu admin et dans le formulaire public Intensivo.
- En développement, seule la définition globale `intensivo` existe. En production, il peut exister d'autres lignes (asistencia, interludio, ou par module) avec le même problème.

## Solution

### 1. Correction des données — SQL (développement + production)
Mise à jour des définitions JSONB stockées dans `satisfaccion_form_definitions` :
- **Échelle d'accord** (colonnes avec valeurs 1-4, ex. grille `logistica`) : réordonner en `4 → 3 → 2 → 1` (« Totalmente de acuerdo » en premier).
- **Échelle Sí/No** (`SINO_PARCIAL`) : réordonner en `Sí, Parcialmente, No` (validé par l'utilisateur).
- Les `value` restent identiques : **aucune réponse existante n'est affectée** — seules la position et l'étiquette d'affichage changent.
- Exécuté par moi en développement (avec vérification avant/après), puis fourni en SQL à exécuter manuellement en production.

### 2. Code par défaut
- `src/data/satisfaccionData.ts` : réordonner `SINO_PARCIAL` en `Sí, Parcialmente, No` (une ligne). `LIKERT4_AGREEMENT` et `FREQUENCY4` (Siempre → Nunca) sont déjà dans le bon ordre.
- Aucune autre modification de code : l'éditeur admin manipule l'ordre tel quel.

### 3. Vérification
- Requête SQL avant/après montrant l'ordre des colonnes de chaque définition stockée.
- Aperçu admin (mobile 393 px) : LOGISTICA affiche « Totalmente de acuerdo » en premier ; grilles Sí/No affichent Sí, Parcialmente, No.

## Actions par environnement
- 🖥️ Site statique (Frontend) : republication (changement `SINO_PARCIAL`).
- ⚙️ Web Service (Backend Express) : rien.
- 🗄️ Base de données : SQL de réordonnancement des `definition` JSONB — dev exécuté par mes soins, prod fourni à exécuter manuellement.
