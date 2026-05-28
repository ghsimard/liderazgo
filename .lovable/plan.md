## 🗄️ Base de données — Merge staging → prod via pgAdmin

**Vérifié** : Les 12 colonnes de `encuesta_invitaciones` correspondent exactement à `_stg_einv`. Counts actuels : `stg_e360=13`, `stg_einv=2`, `prod_e360=554`, `prod_einv=148`.

### SQL à exécuter dans pgAdmin (COSMO_RLT_Prod)

```sql
BEGIN;

-- 1) Merge encuestas_360 (13 lignes staging)
INSERT INTO public.encuestas_360
SELECT * FROM public._stg_e360
ON CONFLICT (id) DO NOTHING;

-- 2) Merge encuesta_invitaciones (2 lignes staging)
INSERT INTO public.encuesta_invitaciones (
  id, token, directivo_cedula, directivo_nombre, institucion,
  email_destinatario, tipo_formulario, fase, sent_at,
  last_reminder_at, responded_at, access_count
)
SELECT
  id, token, directivo_cedula, directivo_nombre, institucion,
  email_destinatario, tipo_formulario, fase, sent_at,
  last_reminder_at, responded_at, access_count
FROM public._stg_einv
ON CONFLICT (id) DO NOTHING;

-- 3) Vérification post-merge (attendu : 567 et 150 si aucun doublon)
SELECT 'prod_e360' AS t, COUNT(*) FROM public.encuestas_360
UNION ALL SELECT 'prod_einv', COUNT(*) FROM public.encuesta_invitaciones;

COMMIT;
```

**Note** : `ON CONFLICT (id) DO NOTHING` n'ajoute que les `id` manquants, ne remplace rien. Si tu préfères revoir les counts avant de valider, remplace `COMMIT;` par `ROLLBACK;` au premier essai.

### Après validation (optionnel)

```sql
-- Nettoyer les tables staging une fois confirmé
DROP TABLE public._stg_e360;
DROP TABLE public._stg_einv;
```

### 🖥️ Site statique (Frontend) / ⚙️ Web Service (Backend Express)
Aucun changement.
