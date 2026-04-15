

# Plan : Aligner ae_rectores_2025 sur Render et vérifier l'ensemble

## Contexte
La table `ae_rectores_2025` existe sur Lovable Cloud (99 lignes, 57 colonnes TEXT) mais pas sur Render. L'utilisateur accepte sa création sur prod.

## Actions

### 1. 🗄️ Base de données (Render) — Manuel
Exécuter le script SQL ci-dessus pour créer `ae_rectores_2025` sur Render.
Puis insérer les 99 lignes de données (export CSV depuis Cloud, import via `\copy` ou INSERT).

### 2. ⚙️ Web Service (Render) — Code
Ajouter `ae_rectores_2025` dans `PUBLIC_READ_TABLES` de `server/routes/db.ts` pour que le frontend puisse lire cette table via le proxy.

### 3. 🖥️ Frontend — Aucun changement
Le composant `AdminAmbiente2025Tab.tsx` lit déjà `ae_rectores_2025` — il fonctionnera dès que la table sera accessible via le proxy.

### 4. Script de vérification complet
Générer et fournir un script SQL "env-aware" qui vérifie l'existence et le contenu des 7 tables AE sur n'importe quel environnement (Cloud ou Render) :
- `ae_rectores_2025` (99 lignes attendues)
- `ae_docentes_submissions_2025` (2 715)
- `ae_estudiantes_submissions_2025` (7 201)
- `ae_acudientes_submissions_2025` (8 029)
- `ae_cohortes` (3)
- `ae_cohorte_instituciones` (86)
- `encuestas_ambiente_escolar` (17 615) + colonnes `cohorte_id`, `entidad_territorial`

### 5. Export des données pour insertion Render
Exécuter un script dans le sandbox pour exporter les 99 lignes de `ae_rectores_2025` depuis Cloud en fichier CSV téléchargeable, que tu pourras importer sur Render via `\copy`.

### Détails techniques
- Fichier modifié : `server/routes/db.ts` (ajout d'une entrée dans `PUBLIC_READ_TABLES`)
- Fichier généré : `/mnt/documents/ae_rectores_2025.csv` (export des données)
- Fichier généré : `/mnt/documents/verify_ae_tables.sql` (script de vérification)

