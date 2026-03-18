

## Flow de la Rúbrica — Confirmation et Indicateurs

### Le cycle complet par module

Pour chaque module (1 à 4), le cycle est le suivant :

```text
┌─────────────────────────────────────────────────────────────┐
│  MODULE N                                                   │
│                                                             │
│  1. Directivo soumet "autoevaluacion"                       │
│     → submission_type = "autoevaluacion"                    │
│                                                             │
│  2. Évaluateur soumet "evaluacion" (évaluation d'équipe)    │
│     → submission_type = "evaluacion"                        │
│                                                             │
│  3. Évaluateur soumet "nivel_acordado" (accord)             │
│     → submission_type = "nivel_acordado"                    │
│                                                             │
│  → Module N+1 se déverrouille pour le Directivo             │
└─────────────────────────────────────────────────────────────┘
```

### Les 3 `submission_type` dans `rubrica_submission_dates`

| submission_type    | Qui soumet  | Signification                        |
|--------------------|-------------|--------------------------------------|
| `autoevaluacion`   | Directivo   | Auto-évaluation soumise              |
| `evaluacion`       | Évaluateur  | Évaluation d'équipe soumise          |
| `nivel_acordado`   | Évaluateur  | Niveau accordé (consensus) soumis    |

### Badges indicateurs à afficher sur la liste des directivos

Pour chaque directivo, on regarde le **module le plus avancé non complété** (le premier module N sans `nivel_acordado`) :

| Condition                                                         | Badge                          | Couleur        |
|-------------------------------------------------------------------|--------------------------------|----------------|
| Module N : pas de `autoevaluacion`                                | "Esperando autoevaluación"     | Gris           |
| Module N : `autoevaluacion` ✓, pas de `evaluacion`                | "Su turno — Evaluar"           | Vert pulsant   |
| Module N : `evaluacion` ✓, pas de `nivel_acordado`                | "Su turno — Acordar nivel"     | Bleu pulsant   |
| Tous les 4 modules ont `nivel_acordado`                           | "Completado"                   | Émeraude       |

### Plan d'implémentation

**Fichier** : `src/pages/RubricaEvaluacion.tsx`

1. **Fetch** : Après le chargement des `asignaciones`, récupérer toutes les `rubrica_submission_dates` pour les cédulas assignées en une seule requête. Stocker dans un state `allSubmissionDates` groupé par `directivo_cedula`.

2. **Fonction helper** `getDirectivoStatus(cedula)` : Parcourir les modules 1→4, trouver le premier module incomplet, retourner le statut approprié parmi les 4 ci-dessus.

3. **UI** : Dans le bloc de sélection des directivos (lignes 894-906), ajouter un `Badge` coloré à droite de chaque bouton directivo selon le statut calculé. Ajouter un point pulsant (`animate-pulse`) pour les statuts "Su turno".

Aucun changement backend requis — `rubrica_submission_dates` est déjà dans `PUBLIC_READ_TABLES`.

