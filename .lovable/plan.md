

## Plan — Migration SQL pour aligner les régions

### Diagnostic confirmé (production)

| `satisfaccion_responses.region` | Total | Form type | Dropdown attendu |
|---|---|---|---|
| `Oriente` | 28 | intensivo | `Oriente 2026` |
| `Quibdó` | 20 | intensivo | `Quibdó 2026` |

→ Mismatch unique : suffixe ` 2026` manquant. L'accent et la casse sont déjà corrects.

### Correctif — 1 seule requête SQL en production

```sql
UPDATE satisfaccion_responses 
SET region = region || ' 2026' 
WHERE region IN ('Oriente', 'Quibdó');
```

### Vérification post-migration

```sql
SELECT region, COUNT(*) 
FROM satisfaccion_responses 
GROUP BY region 
ORDER BY region;
```

Résultat attendu : `Oriente 2026` (28), `Quibdó 2026` (20). Le filtre dropdown fonctionnera immédiatement.

### Action de fond (optionnelle, suivi séparé)

Identifier le composant qui INSERT dans `satisfaccion_responses` avec `region` sans suffixe (probablement `SatisfaccionIntensivo.tsx` qui lit `fichas_rlt.region` mais perd le suffixe quelque part, ou source hardcodée). À corriger pour éviter la régression sur les futures soumissions. Si tu veux, je peux investiguer dans une étape ultérieure.

### Récap déploiement

| Cible | Action |
|---|---|
| 🖥️ Site statique (Frontend) | Aucune |
| ⚙️ Web Service (Backend Express) | Aucune |
| 🗄️ Base de données (Render) | **Toi** : exécuter le UPDATE ci-dessus en prod, puis le SELECT de vérification |

