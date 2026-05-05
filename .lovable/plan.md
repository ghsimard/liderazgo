## Plan — Stabiliser le backend Render (502 généralisés)

### Diagnostic mis à jour

Les nouveaux logs montrent que **les 502 ne sont pas localisés** à quelques routes lentes : ils touchent en cascade `/api/auth/login`, `/api/auth/me`, `/api/images`, `/api/db/app_settings`, `/api/db/regiones`, `/api/db/users`, `/api/db/rubrica_evaluadores`, `/api/db/operator_permissions`, `/api/rpc/check_cedula_role`, `/api/db/informe_modulo_equipo`, et même certains `OPTIONS` (CORS preflight).

Quand un preflight `OPTIONS` (qui ne touche pas la base de données) renvoie 502, ce n'est plus une requête SQL lente isolée — c'est **le worker Express lui-même qui est saturé** ou redémarre. Confirmé par :
- `informe_modulo_equipo` (table minuscule : `id, informe_id, nombre, rol`) qui prend **8949 ms / 9065 ms / 10229 ms** → impossible sans saturation des connexions PG
- vagues alternant 502 puis 200 → typique d'un worker qui crash et redémarre

### Cause racine — trois problèmes cumulés

**1. Pool PG sans timeout** (`server/db.ts`)

```ts
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: ...,
});
```

Aucune limite, aucun timeout :
- `connectionTimeoutMillis` non défini → attente infinie pour obtenir une connexion
- `statement_timeout` non défini → une requête peut bloquer indéfiniment

Conséquence : une requête lente garde sa connexion, le pool (max 10 par défaut) se sature, **toutes** les requêtes suivantes attendent ou crashent → 502.

**2. Index manquants** sur `informe_modulo_equipo`, `informe_directivo`, `informe_asistencia` → full scans qui aggravent (1).

**3. Plan Render Free** (probable) : 512 MB RAM, CPU partagé. Quand le worker sature, Render le tue → 502 sur tout, y compris OPTIONS, le temps qu'il redémarre.

### Correctifs

#### 1. Durcir le pool PG (`server/db.ts`)

```ts
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,    // fail-fast si pool saturé
  statement_timeout: 15_000,          // tue toute requête > 15s côté PG
  query_timeout: 15_000,              // protection côté node-pg
});

// Empêche un crash de connexion idle de tuer le worker
pool.on("error", (err) => {
  console.error("[pg pool] idle client error:", err);
});
```

Bénéfice : plus aucune requête ne peut bloquer plus de 15s ; les erreurs PG remontent comme 500 propres au lieu de 502 opaques ; le worker ne crashe plus sur erreurs idle.

#### 2. Ajouter les index manquants (à exécuter en prod par toi)

```sql
CREATE INDEX IF NOT EXISTS idx_informe_modulo_equipo_informe_id
  ON public.informe_modulo_equipo (informe_id);

CREATE INDEX IF NOT EXISTS idx_informe_directivo_module_cedula
  ON public.informe_directivo (module_number, directivo_cedula);

CREATE INDEX IF NOT EXISTS idx_informe_directivo_informe_id
  ON public.informe_directivo (informe_id);

CREATE INDEX IF NOT EXISTS idx_informe_asistencia_module_cedula
  ON public.informe_asistencia (module_number, directivo_cedula);
```

#### 3. Sync `server/schema.sql` (documenter les index pour les futures réinits)

#### 4. Diagnostic immédiat — vérifier le plan Render

À regarder dans le dashboard Render → `liderazgo-api` → **Metrics** :
- Pic de **CPU > 100%** ? → besoin d'upgrade
- Pic de **RAM proche de 512 MB** (free) ? → besoin d'upgrade
- **Restarts** récents du service ? → confirme la saturation

Si oui, **upgrader le Render Web Service au plan Starter ($7/mois)** pour passer à 512 MB → 2 GB RAM et CPU dédié. Aucune action côté Lovable ne peut compenser un worker qui manque de RAM.

### Ordre de déploiement recommandé

1. **Maintenant** (correctifs code Lovable, gratuits) :
   - Durcir `server/db.ts`
   - Documenter les index dans `server/schema.sql`
   - → push, Render redéploie automatiquement
2. **Toi en prod immédiatement** : exécuter le bloc `CREATE INDEX` sur la base Render
3. **Vérifier** les logs Render dans les 10 min suivantes :
   - Si plus de 502 → c'était bien le pool + index, terminé
   - Si encore 502 → problème de plan Render, upgrade requis

### Récap déploiement

| Cible | Action |
|---|---|
| 🖥️ Site statique (Frontend) | ❌ Aucune |
| ⚙️ Web Service (Backend Express) | ✅ Modifier `server/db.ts` + `server/schema.sql` — redéploiement auto Render |
| 🗄️ Base de données (Render) | ✅ **Toi** : exécuter `CREATE INDEX` ci-dessus en prod |
| ☁️ Plan Render Web Service | ⚠️ **Toi** : vérifier Metrics, upgrade Starter si CPU/RAM saturés |

### Hors-scope (à confirmer plus tard si besoin)

- Investiguer pourquoi `informe_modulo_equipo` (table de jointure simple) prenait 8s+ : possible verrouillage par une transaction longue. Les correctifs proposés masquent le symptôme ; si ça persiste après les index, ouvrir un ticket dédié pour analyser les locks PG.
