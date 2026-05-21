# Cosa 3 — Ajouter la jornada « Sabatina » à la Ficha RLT

## Constat

Les options actuelles de **Jornadas de la IE** dans la ficha sont : Mañana, Tarde, **Nocturna**, Única.
→ « Nocturna » existe déjà. Il ne reste qu'à ajouter **Sabatina**.

## Changements

1. **Formulaire directivo** — `src/pages/FichaRLT.tsx` (ligne 1579)
   Ajouter l'option `{ value: "Sabatina", label: "Sabatina" }`.

2. **Formulaire admin** — `src/pages/AdminEditFicha.tsx` (ligne 1193)
   Ajouter la même option.

3. **PDF rempli (Rapport ficha)** — `src/utils/pdfGenerator.ts`
   Aucun changement nécessaire : il imprime déjà le tableau `jornadas` joint par des virgules. « Sabatina » apparaîtra automatiquement.

4. **PDF vierge** — `src/utils/blankFichaPdfGenerator.ts`
   Vérifier si les options sont listées ; si seule une case vide est laissée, aucun changement n'est nécessaire. (À confirmer lors de l'édition.)

5. **Documentation des champs** — `src/utils/fichaFieldsPdfGenerator.ts` (ligne 70)
   Mettre à jour la règle : `Mañana / Tarde / Nocturna / Sabatina / Única`.

## Hors-scope

- BDD : le champ `jornadas` est de type `text[]`, il n'y a pas d'enum à migrer. 🗄️ Aucun changement SQL.
- ⚙️ Backend Express : aucun changement.
- 🖥️ Frontend : les 5 ajustements listés ci-dessus.

## Actions Render

- 🖥️ **Site statique (Frontend)** : redeploy automatique après merge.
- ⚙️ **Web Service (Backend Express)** : aucun changement.
- 🗄️ **Base de données (SQL manuel)** : aucun.
