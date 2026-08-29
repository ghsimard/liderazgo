# Satisfacciones — Orden de escala Likert (Intensivo y Asistencia)

## Objectif
Dans les formulaires **Asistencia** et **Intensivo**, afficher l'option la plus positive **« Totalmente de acuerdo »** en première position dans l'échelle Likert 4 niveaux.

## Changement

Inverser l'ordre d'affichage du tableau `LIKERT4_AGREEMENT` dans `src/data/satisfaccionData.ts` :

```text
Avant :
1. Totalmente en desacuerdo
2. Algo en desacuerdo
3. Algo de acuerdo
4. Totalmente de acuerdo

Après :
1. Totalmente de acuerdo      (valeur 4)
2. Algo de acuerdo            (valeur 3)
3. Algo en desacuerdo         (valeur 2)
4. Totalmente en desacuerdo   (valeur 1)
```

Les valeurs sous-jacentes (`1` à `4`) restent inchangées ; seul l'ordre d'affichage change.

## Périmètre impacté

- **Asistencia** : questions `objetivo_cumplido` et `valor_sesion`.
- **Intensivo** : grille `logistica` (section « Logística »).
- **Non impacté** : Interludio (utilise `SINO_PARCIAL` et `FREQUENCY4`), Encuesta 360 (échelles séparées dans `encuesta360Data.ts`).

## Fichier modifié

- `src/data/satisfaccionData.ts` : réordonner les 4 entrées de `LIKERT4_AGREEMENT`.

## Vérification

- Ouvrir le formulaire Asistencia et vérifier que « Totalmente de acuerdo » apparaît en premier.
- Ouvrir le formulaire Intensivo, section Logística, et vérifier le même ordre.
- Confirmer que les réponses enregistrées conservent leur valeur numérique correcte.

## Déploiement

🖥️ **Site statique (Frontend)** : republier après modification.
⚙️ **Web Service (Backend Express)** : aucune action.
🗄️ **Base de données (SQL manuel)** : aucune action.
