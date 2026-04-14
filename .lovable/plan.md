

## Plan: Générer un PDF de valorisation de l'application

### Objectif
Créer un document PDF professionnel contenant :
1. Tableau de ventilation par hub (%, heures, complexité)
2. Graphe de dépendances entre hubs (diagramme visuel)
3. Scénarios de packages avec prix par combinaison

### Approche technique
- Script Python avec **reportlab** (Platypus pour la mise en page)
- Graphe de dépendances dessiné via canvas (boîtes + flèches)
- Tableau de prix paramétré avec un taux horaire configurable (75 USD/h par défaut)
- Output : `/mnt/documents/Valorisation_Application_RLT.pdf`

### Contenu du PDF

**Page 1 — Couverture**
- Titre, date, mention "Document confidentiel"

**Page 2 — Ventilation par Hub**
- Tableau : Hub | Lignes de code | Heures estimées | % du total | Complexité

**Page 3 — Graphe de dépendances**
- Diagramme visuel montrant les relations entre hubs (Ficha comme racine, flèches vers 360, Rúbricas, etc.)

**Page 4 — Scénarios de packages**
- 6 packs avec composition, heures cumulées, % et prix
- Tableau comparatif

**Page 5 — Notes méthodologiques**
- Base de calcul, multiplicateurs de complexité, disclaimer

### Fichiers
- Script temporaire : `/tmp/gen_valorisation.py`
- Output : `/mnt/documents/Valorisation_Application_RLT.pdf`

