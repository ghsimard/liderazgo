

## 1. Diagnostic — État de RENDER

### ✅ Ce que tu as déjà appliqué sur Render
La dernière migration que tu as lancée correspond exactement à `20260416221900` (la plus récente). Elle a créé :
- Table `ae_campanas` (avec PK, FK, contraintes uniques, index)
- Colonnes `fase` + `campana_id` sur `encuestas_ambiente_escolar`
- Les 2 index (`idx_encuestas_ae_campana`, `idx_encuestas_ae_fase`)

**Aucune migration postérieure n'existe** — tu es à jour côté **structure**.

### ⚠️ Ce qui manque encore sur Render

| # | Élément | Statut Lovable Cloud | Statut Render |
|---|---|---|---|
| A | Colonne `ae_cohortes.grupo` supprimée | ✅ Supprimée (migr. 20260416040709) | ❌ Probablement encore présente |
| B | 3 campagnes "Inicial" 2025 (Itagüí, Medellín, Rionegro) | ✅ Insérées | ❌ Table vide |
| C | Backfill `campana_id` + `fase = 'linea_base'` sur 17 615 réponses existantes | ✅ Fait (17 615 / 17 615 lignes liées) | ❌ Pas fait |

---

## 2. Vérifications à exécuter sur Render (3 requêtes SELECT)

Connecte-toi à la DB Render via psql/pgAdmin et lance dans l'ordre :

### 🗄️ Vérif 1 — La colonne `grupo` existe-t-elle encore ?
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'ae_cohortes' AND column_name = 'grupo';
```
- **0 ligne** → déjà supprimée, saute le bloc A ci-dessous
- **1 ligne** → exécute le bloc A

### 🗄️ Vérif 2 — Les 3 campagnes Inicial existent-elles ?
```sql
SELECT cohorte_id, fase, nombre FROM ae_campanas ORDER BY nombre;
```
- **3 lignes (Itagüí/Medellín/Rionegro — Inicial)** → saute le bloc B
- **0 ligne** → exécute le bloc B

### 🗄️ Vérif 3 — Le backfill est-il fait ?
```sql
SELECT COUNT(*) AS total, COUNT(campana_id) AS lies, COUNT(fase) AS avec_fase
FROM encuestas_ambiente_escolar;
```
- Si `lies = 0` ou `lies < total` → exécute le bloc C
- Si `lies = total` → c'est bon

---

## 3. SQL de synchronisation — à exécuter sur Render

### 🗄️ Bloc A — Supprimer la colonne `grupo` (si vérif 1 retourne 1 ligne)
```sql
ALTER TABLE public.ae_cohortes DROP COLUMN IF EXISTS grupo;
```

### 🗄️ Bloc B — Créer les 3 campagnes Inicial 2025
```sql
INSERT INTO public.ae_campanas (cohorte_id, fase, fecha_inicio, fecha_fin, nombre)
SELECT id, 'linea_base', DATE '2025-05-15', DATE '2025-10-14', nombre || ' — Inicial'
FROM public.ae_cohortes
WHERE nombre IN ('Itagüí 2025', 'Medellín 2025', 'Rionegro 2025')
ON CONFLICT (cohorte_id, fase) DO NOTHING;
```

### 🗄️ Bloc C — Backfill des réponses existantes
```sql
UPDATE public.encuestas_ambiente_escolar e
SET campana_id = camp.id,
    fase = 'linea_base'
FROM public.ae_cohorte_instituciones ci
JOIN public.ae_campanas camp
  ON camp.cohorte_id = ci.cohorte_id AND camp.fase = 'linea_base'
WHERE e.institucion_educativa = ci.institucion_educativa
  AND e.campana_id IS NULL;
```

### 🗄️ Bloc D — Vérification finale (post-exécution)
```sql
SELECT
  (SELECT COUNT(*) FROM ae_campanas) AS nb_campanas,
  (SELECT COUNT(*) FROM encuestas_ambiente_escolar WHERE campana_id IS NOT NULL) AS reponses_liees,
  (SELECT COUNT(*) FROM encuestas_ambiente_escolar) AS total_reponses;
```
Résultat attendu : `nb_campanas = 3`, `reponses_liees = total_reponses` (≈ 17 615).

---

## 4. Récapitulatif des actions de déploiement

| Cible | Action requise |
|---|---|
| 🖥️ **Site statique (Frontend)** | Aucune — code déjà déployé, lit `ae_campanas` via `dbClient` |
| ⚙️ **Web Service (Backend Express)** | Aucune — proxy générique, pas de route spécifique campañas |
| 🗄️ **Base de données (Render — SQL manuel)** | Lance les 3 vérifs, puis applique les blocs A/B/C nécessaires, puis bloc D pour valider |

---

## 5. Après synchro — comportement attendu

- Onglet **Admin → Ambiente Escolar → Campañas** : 3 lignes "Cerrada" avec leur compteur de réponses (255 docentes Itagüí, etc.)
- Onglet **Análisis por Campaña** : sélecteur de cohorte fonctionnel, scores Inicial affichés, "Sin datos comparables" pour Evolución (jusqu'à création des campagnes 2026)
- Suppression d'une campagne Inicial : **bloquée** (réponses associées)

