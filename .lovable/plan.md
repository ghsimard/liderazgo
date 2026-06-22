Do I know what the issue is? Oui.

Ce que le Delta doit être

Le Delta doit être strictement :

```text
Δ = moyenne Evolución - moyenne Inicial
```

Mais les deux moyennes doivent venir de deux ensembles de réponses différents :

- Inicial : réponses de la même cohorte, de la même institution, avec phase réelle `linea_base`.
- Evolución : réponses de la même cohorte, de la même institution, avec phase réelle `cierre`.
- Même groupe de formulaire : docentes avec docentes, estudiantes avec estudiantes, acudientes avec acudientes.
- Même structure d’items/sections.
- On compare seulement les institutions qui ont au moins une réponse dans les deux phases.

Donc pour Institución Educativa Caracas, le calcul attendu est :

```text
promedio_cierre(Caracas) - promedio_linea_base(Caracas)
```

Pas `linea_base(Caracas) - linea_base(Caracas)`. Si N Inicial = N Evolución et que les moyennes sont exactement identiques sur toutes les institutions, cela signifie presque certainement que les mêmes lignes sont utilisées deux fois.

Pourquoi c’est devenu pire

Le problème vient de deux faiblesses dans la logique actuelle :

1. La sélection Inicial n’est pas suffisamment limitée à la cohorte choisie. Elle utilise surtout `fase = linea_base` + institution, ce qui peut mélanger des réponses d’autres cohortes si l’institution porte le même nom.
2. La sélection Evolución a été corrigée vers `fase = cierre`, mais les données disponibles montrent une incohérence importante : plusieurs campagnes 2025 ont des réponses `linea_base`, et aucune vraie réponse `cierre` visible dans la base interrogée ici. Dans ce cas, l’interface ne devrait jamais fabriquer une Evolución ni afficher les mêmes valeurs que Inicial.

Ce qu’il faut corriger

1. Filtrer les réponses par cohorte avant tout calcul
   - Ajouter `cohorte_id` dans les données chargées depuis `encuestas_ambiente_escolar`.
   - Pour Inicial et Evolución, garder seulement les réponses de `selectedCohorte`.
   - Si `cohorte_id` manque sur une ancienne ligne, utiliser la campagne comme secours, mais jamais au point de transformer une ligne `linea_base` en `cierre`.

2. Définir une phase réelle unique pour chaque réponse
   - Si la réponse contient `fase = linea_base`, elle est Inicial.
   - Si la réponse contient `fase = cierre`, elle est Evolución.
   - Si `fase` est vide seulement, utiliser la phase de la campagne comme fallback.
   - Si la réponse dit explicitement `linea_base`, elle ne doit jamais être comptée comme Evolución même si `campana_id` pointe vers une campagne de cierre.

3. Construire deux jeux séparés

```text
respuestasIniciales = cohorte sélectionnée + phase réelle linea_base
respuestasEvolucion = cohorte sélectionnée + phase réelle cierre
```

Puis :

```text
institucionesComparables = institutions présentes dans Inicial ET Evolución
```

4. Calculer tous les niveaux depuis ces deux jeux séparés
   - Global cohorte.
   - Par groupe : docentes, estudiantes, acudientes.
   - Par institution.
   - Par section.

5. Empêcher l’affichage trompeur
   - Si aucune vraie réponse Evolución n’existe, afficher `— Evolución` et ne pas montrer un Delta égal à 0.
   - Le tableau doit afficher uniquement les institutions réellement comparables.
   - Option utile : afficher un petit diagnostic des volumes : `Inicial: X respuestas · Evolución: Y respuestas · Comparables: Z instituciones`.

Actions nécessaires

🖥️ Site statique (Frontend)
- Corriger `AdminAmbienteDeltaTab.tsx` pour charger `cohorte_id` et appliquer les nouveaux filtres.
- Remplacer la logique actuelle par une fonction unique de résolution de phase.
- Corriger les compteurs et l’affichage quand Evolución est absente.

⚙️ Web Service (Backend Express)
- A priori rien à modifier si le proxy retourne déjà `cohorte_id`.
- Vérifier seulement que la colonne `cohorte_id` est bien autorisée dans les lectures de `encuestas_ambiente_escolar`.

🗄️ Base de données (Manual SQL)
- Pas de modification automatique dans ce plan.
- Si les réponses Evolución existent ailleurs mais ne sont pas marquées `fase = cierre`, il faudra ensuite un contrôle manuel des données pour identifier les lignes à corriger.
- Si aucune réponse `cierre` n’existe réellement, l’interface doit l’assumer et ne pas afficher de Delta.

Résultat attendu

Après correction, Caracas ne pourra plus afficher Inicial = Evolución à cause d’un recyclage des mêmes lignes. Soit elle aura un vrai Delta basé sur des réponses `cierre`, soit elle disparaîtra du tableau comparatif / affichera absence de données Evolución.