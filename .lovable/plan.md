# Plan: excluir "Estudiante" 360° para Centros Educativos

## Objectif

Pour les institutions de type **Centro Educativo (CE)** (élèves trop jeunes), le formulaire `estudiante` (Entrada et Salida) ne doit jamais être :
- proposé au directeur,
- comptabilisé comme attendu / manquant dans le suivi admin,
- affiché comme groupe d'observateurs dans les rapports 360°.

Détection CE via `isCentroEducativo(nombre_ie)` existant (préfixes "CE " ou "Centro Educativo", insensible à la casse).

En complément, purge des éventuelles réponses/invitations "estudiante" déjà saisies pour un CE sur la **DB de production Render**.

---

### 🖥️ Site statique (Frontend)

1. **`src/pages/Encuesta360Hub.tsx`** — ✅ déjà fait (bouton Estudiante masqué pour les CE).

2. **`src/components/admin/AdminEncuestaMonitor.tsx`**
   - Construire dynamiquement `roleKeysFor(nombreIe)` qui retire `"estudiante"` de `ROLE_KEYS` quand `isCentroEducativo(nombreIe)` est vrai.
   - Utiliser ce tableau dans :
     - le calcul `incomplete` (~ligne 104) — un CE sans réponse "estudiante" n'est plus marqué Pendiente.
     - l'affichage de la table HTML.
     - la génération PDF (~lignes 298–309) — la cellule Estudiante affiche `"—"` (n/a) pour les CE au lieu de `"Pend."`.

3. **`src/utils/reporte360PdfGenerator.ts`**
   - Détecter CE via `nombre_ie` du rapport.
   - Texte d'intro (~ligne 26) : pour un CE, mention "acudientes" uniquement (sans "estudiantes").
   - Légendes des deux graphiques (lignes 373 et 540) : `"Acudiente y estudiante"` → `"Acudiente"` quand CE.

4. **`src/utils/reporte360Calculator.ts`** — aucun changement requis. `externosScore` ignore déjà gracieusement un rôle sans réponses.

### Hors portée (laissé tel quel)

- `AdminEncuestas360Tab.tsx`, `AdminInvitacionesTab.tsx`, `AdminReviewsTab.tsx` : libellés d'affichage des réponses existantes — pas de perte d'information.
- `ShareEncuestaDialog.tsx` : ne peut plus s'ouvrir pour "estudiante" sur un CE (bouton masqué dans le Hub).
- `EvaluadorEncuestasView.tsx` : ne référence pas `estudiante`.

### ⚙️ Web Service (Backend Express)

Aucune modification.

### 🗄️ Base de données — **DB Render (production)** — SQL manuel

À exécuter directement sur la base Postgres de Render (les données ne sont pas sur la DB Supabase Lovable, qui est vide).

**Étape 1 — Audit (lecture, à exécuter avant suppression) :**

```sql
-- Combien de réponses "estudiante" pour des CE ?
SELECT institucion_educativa, fase, COUNT(*) AS n
FROM public.encuestas_360
WHERE tipo_formulario = 'estudiante'
  AND (
    LOWER(TRIM(institucion_educativa)) LIKE 'ce %'
    OR LOWER(TRIM(institucion_educativa)) LIKE 'centro educativo%'
  )
GROUP BY institucion_educativa, fase
ORDER BY institucion_educativa, fase;

-- Combien d'invitations "estudiante" pour des CE ?
SELECT institucion, fase, COUNT(*) AS n
FROM public.encuesta_invitaciones
WHERE tipo_formulario = 'estudiante'
  AND (
    LOWER(TRIM(institucion)) LIKE 'ce %'
    OR LOWER(TRIM(institucion)) LIKE 'centro educativo%'
  )
GROUP BY institucion, fase
ORDER BY institucion, fase;
```

**Étape 2 — Suppression (dans une transaction, après validation des comptes) :**

```sql
BEGIN;

DELETE FROM public.encuestas_360
WHERE tipo_formulario = 'estudiante'
  AND (
    LOWER(TRIM(institucion_educativa)) LIKE 'ce %'
    OR LOWER(TRIM(institucion_educativa)) LIKE 'centro educativo%'
  );

DELETE FROM public.encuesta_invitaciones
WHERE tipo_formulario = 'estudiante'
  AND (
    LOWER(TRIM(institucion)) LIKE 'ce %'
    OR LOWER(TRIM(institucion)) LIKE 'centro educativo%'
  );

-- Vérifier les compteurs renvoyés par psql avant de valider
COMMIT;
-- (ROLLBACK; si les comptes ne correspondent pas à l'audit)
```

Requête idempotente : ré-exécutable sans risque (supprimera 0 ligne après le premier passage).

---

## Validation

- **Directeur CE** sur le Hub 360° → bouton Estudiante absent (déjà OK).
- **Admin → Encuestas 360 → Monitor** : un CE sans réponse "estudiante" n'apparaît plus en "Pendiente" ; cellule "—". PDF cohérent.
- **PDF Reporte 360° d'un CE** : légendes affichent "Acudiente" (sans "y estudiante") ; intro sans "estudiantes".
- **PDF d'une IE classique** : comportement inchangé.
- **DB Render** : les deux requêtes d'audit renvoient 0 ligne après la purge.
