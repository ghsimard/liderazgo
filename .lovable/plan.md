

# Plan : Lien institution → cohorte automatique

## Résumé
Au lieu d'envoyer des URLs paramétrées par cohorte, on envoie **3 liens simples** (un par type de formulaire). Quand l'usager choisit son institution, le système retrouve automatiquement la cohorte associée via `ae_cohorte_instituciones` et insère `cohorte_id` + `entidad_territorial` dans la soumission.

## Flux simplifié

```text
3 liens fixes :
  /encuesta-ambiente-docentes
  /encuesta-ambiente-estudiantes
  /encuesta-ambiente-acudientes

Usager choisit IE → lookup ae_cohorte_instituciones → cohorte_id + ET auto-injectés
```

## Étapes

### 1. Modifier `InstitutionCombobox` dans `AmbienteEscolarForm.tsx`
- Au lieu de charger depuis la table `instituciones` (toutes les IE du programme), charger depuis `ae_cohorte_instituciones` jointe à `ae_cohortes` pour ne proposer **que les IE participant au module AE**.
- Retourner aussi le `cohorte_id` et `entidad_territorial` associés à l'institution sélectionnée.

### 2. Modifier le `handleSubmit`
- Ajouter `cohorte_id` et `entidad_territorial` dans l'objet inséré dans `encuestas_ambiente_escolar`, déterminés automatiquement par l'institution choisie.

### 3. Admin Monitor — Bouton "Copiar enlaces"
- Ajouter un petit bouton dans `AdminAmbienteMonitorTab.tsx` qui copie les 3 liens fixes dans le presse-papier pour faciliter l'envoi aux recteurs.

## Détails techniques

| Fichier | Modification |
|---|---|
| `src/components/AmbienteEscolarForm.tsx` | `InstitutionCombobox` charge depuis `ae_cohorte_instituciones` + `ae_cohortes`, expose `cohorte_id`/`entidad_territorial` ; `handleSubmit` les inclut dans l'insert |
| `src/components/admin/AdminAmbienteMonitorTab.tsx` | Bouton "Copiar enlaces" avec les 3 URLs |

### Rétrocompatibilité
Les soumissions existantes (sans `cohorte_id`) restent inchangées. Le monitor les associe déjà par nom d'institution.

