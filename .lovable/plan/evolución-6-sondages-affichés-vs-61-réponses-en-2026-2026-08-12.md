# Evolución : 6 sondages affichés vs 61 réponses en 2026

## Cause confirmée par la requête de production

Les 61 réponses de 2026 ne sont pas toutes de la phase Evolución :

| fase | cohorte | docentes | estudiantes | acudientes | total |
|---|---|---|---|---|---|
| `cierre` (= Evolución) | Rionegro 2025 (`1724cd6d…`) | 3 | 1 | 2 | **6** |
| `linea_base` (= Inicial) | Oriente 2026 (`d1a2b3c4-0002…`) | 33 | 8 | 14 | **55** |

L'écran affiche donc **6** en Evolución parce que seules 6 réponses portent `fase = 'cierre'`. Les 55 autres, saisies en 2026, sont enregistrées comme **línea base / Inicial** et rattachées à la cohorte **Oriente 2026**, pas à Rionegro 2025.

L'application est donc cohérente avec la base. Le vrai problème est en amont : le formulaire a étiqueté ces 55 réponses comme `linea_base` (cohorte Oriente 2026) alors qu'il s'agit vraisemblablement de la mesure d'évolution de cette école.

## Point à trancher avant tout correctif

Deux lectures possibles, à confirmer par vous :

1. **Les 55 réponses sont bien des réponses d'évolution** mal étiquetées → il faut les corriger en base (`fase = 'cierre'`, cohorte correcte) et corriger la campagne active qui a produit cette étiquette.
2. **Il existe réellement deux cohortes distinctes pour cette école** (une línea base Oriente 2026 + un cierre Rionegro 2025) → rien à corriger, seul l'affichage doit clarifier la répartition.

## Correctifs prévus

### A. Clarification de l'affichage (dans tous les cas)
Dans **Ambiente Escolar → Informes** :
- Afficher, pour chaque institution, la répartition par phase **et par cohorte** (ex. « Inicial 55 · Oriente 2026 | Evolución 6 · Rionegro 2025 ») au lieu d'un simple total par phase.
- Signaler visuellement une école dont les réponses sont réparties sur plusieurs cohortes, pour repérer immédiatement ce type d'anomalie.

### B. Correction des données (si option 1)
- SQL manuel de production : requalifier les 55 réponses concernées (`fase` et `cohorte_id`), après contrôle du périmètre exact (institution + plage de dates).
- Vérification de la campagne active (`ae_campanas`) qui détermine la phase enregistrée par le formulaire, afin que les prochaines réponses portent la bonne valeur.

## Détails techniques

- Fichier front concerné : `src/components/admin/AdminAmbienteStatsTab.tsx` (mapping `FASE_DB : inicial → linea_base`, `evolucion → cierre` ; regroupement par institution ligne ~660).
- La phase enregistrée provient de la campagne active dans `AmbienteEscolarForm.tsx`, pas d'un choix de l'utilisateur.
- Aucun changement de schéma nécessaire.

## Actions Render

- 🖥️ Site statique (Frontend) : republier après le correctif d'affichage
- ⚙️ Web Service (Backend Express) : rien
- 🗄️ Base de données (SQL manuel) : uniquement si l'option 1 est retenue (requalification des 55 réponses)
