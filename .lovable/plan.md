

# Plan : Implémenter les cohortes dans Ambiente Escolar Monitoreo

## Contexte

Actuellement, le moniteur (`AdminAmbienteMonitorTab`) utilise le système géographique (régions → institutions via `useGeographicData`) pour filtrer. Or, les données AE 2025 sont structurées par **cohortes** (`ae_cohortes` + `ae_cohorte_instituciones`).

### État actuel des cohortes
- **Medellín 2025 G1** : 64 institutions, 12 679 soumissions
- **Rionegro 2025 G1** : 15 institutions, 2 513 soumissions
- **Itagüí 2025 G1** : 7 institutions, 2 423 soumissions
- **Quibdó** : Pas de cohorte créée (institutions dans `institucionesPorRegion` statique, 25 IE)
- **Oriente** : Pas de cohorte créée (institutions dans `institucionesPorRegion` statique, 16 IE)

Toutes les 17 615 soumissions ont un `cohorte_id` (aucune orpheline).

## Modifications

### 1. Créer les cohortes manquantes (migration SQL)

Insérer dans `ae_cohortes` :
- **Quibdó 2024 G1** (ET: Quibdó, year: 2024, is_baseline: true)
- **Oriente 2024 G1** (ET: Antioquia, year: 2024, is_baseline: true)

Puis insérer les 25 + 16 institutions correspondantes dans `ae_cohorte_instituciones` en utilisant les noms exacts de `institucionesPorRegion`.

### 2. Refactorer AdminAmbienteMonitorTab

Remplacer le filtre par **région géographique** par un filtre par **cohorte** :

- **Charger les cohortes** depuis `ae_cohortes` + `ae_cohorte_instituciones` au lieu de `useGeographicData`
- **Filtre "Cohorte"** : dropdown listant toutes les cohortes (ex: "Medellín 2025 G1", "Quibdó 2024 G1", etc.)
- **Liste d'institutions** : pour chaque cohorte sélectionnée, afficher uniquement les IE de `ae_cohorte_instituciones`
- **Comptage des soumissions** : filtrer `encuestas_ambiente_escolar` par `cohorte_id` au lieu de matcher par nom d'institution
- Conserver les filtres existants (statut, recherche texte)

### 3. Détails techniques

```text
Flux de données :
  ae_cohortes ──→ dropdown filtre
       │
  ae_cohorte_instituciones ──→ liste des IE attendues
       │
  encuestas_ambiente_escolar (WHERE cohorte_id = X) ──→ comptage par tipo_formulario
       │
  fichas_rlt (JOIN par nombre_ie) ──→ info contact directivo
```

- Le `SELECT` sur `encuestas_ambiente_escolar` inclura `cohorte_id` pour grouper
- Les institutions sans soumissions apparaîtront avec badges rouges (0)
- La pagination (boucle while > 1000) reste en place mais filtrée par cohorte

### Fichier modifié
- `src/components/admin/AdminAmbienteMonitorTab.tsx` — réécriture du chargement et des filtres

