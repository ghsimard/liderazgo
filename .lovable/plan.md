# Satisfacciones — Ordre des colonnes LOGISTICA (et autres formulaires)

## Diagnostic (vérifié)
- Le code par défaut (`src/data/satisfaccionData.ts`, `LIKERT4_AGREEMENT`) a déjà été corrigé : « Totalmente de acuerdo » en premier.
- **Mais** la table `satisfaccion_form_definitions` contient une définition globale du formulaire **Intensivo** enregistrée le 2026-05-20 avec l'**ancien ordre** : `Totalmente en desacuerdo, Algo en desacuerdo, Algo de acuerdo, Totalmente de acuerdo`.
- La logique de chargement (module spécifique → global → défaut) donne la priorité à la base : l'ancien ordre s'affiche donc dans l'aperçu admin et dans le formulaire public Intensivo.
- En développement, seule la définition globale `intensivo` existe. En production, il peut exister d'autres lignes (asistencia, interludio, ou par module) avec le même problème.

## Solution

### 1. Correction des données — SQL (développement + production)
Mise à jour des définitions stockées pour réordonner les colonnes de la grille `logistica` (et toute question utilisant l'échelle d'accord) : `4 → 3 → 2 → 1` (Totalmente de acuerdo en premier), les `value` restent identiques (aucune réponse existante n'est affectée — seules l'étiquette et la position changent).

Script : parcourir toutes les lignes de `satisfaccion_form_definitions`, et pour chaque question dont les colonnes correspondent à l'échelle d'accord (valeurs 1-4 avec ces libellés), réécrire le tableau `columns` dans le bon ordre.

- Exécuté par moi en développement (vérification).
- Fourni à l'utilisateur en SQL à exécuter manuellement en production (🗄️).

### 2. Même logique pour les autres formulaires
- **Asistencia** et **Interludio** : si des définitions sont stockées en base (prod), elles seront corrigées par le même script SQL. Les échelles `FREQUENCY4` (Siempre → Nunca) sont déjà dans l'ordre positif → négatif, rien à changer.
- **Grilles Sí/No (`SINO_PARCIAL`)** : ordre actuel `Sí, No, Parcialmente`. Par cohérence « du plus favorable au moins favorable », proposition : `Sí, Parcialmente, No` (code + données stockées). À confirmer — voir question ci-dessous.

### 3. Garde-fou admin (optionnel, recommandé)
Dans `AdminSatisfaccionFormsTab`, lors de la sauvegarde, ne rien changer : l'éditeur manipule l'ordre tel quel. Pas de modification de code nécessaire hors données.

## Fichiers / actions
- 🗄️ Base de données : SQL de réordonnancement des `definition` JSONB (dev exécuté, prod fourni).
- 🖥️ Frontend : uniquement si l'ordre `Sí, Parcialmente, No` est validé (une ligne dans `satisfaccionData.ts`) + republication.
- ⚙️ Backend Express : rien.

## Vérification
- Requête SQL avant/après montrant l'ordre des colonnes.
- Aperçu admin (mobile 393 px) : LOGISTICA affiche « Totalmente de acuerdo » en premier.
