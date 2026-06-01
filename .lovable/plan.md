## Fix pagination instable — Monitor Ambiente Escolar

### Cause
Pagination par pages de 1000 sans `ORDER BY` → PostgreSQL renvoie un ordre arbitraire entre pages, des lignes sont sautées/dupliquées. Résultat : Los Gómez et Galán Sarmiento affichent 0/0/0 alors que les données existent.

### Changements

🖥️ **Frontend** — `src/components/admin/AdminAmbienteMonitorTab.tsx`
- Ajouter `.order("id")` à la requête paginée `encuestas_ambiente_escolar` pour garantir un ordre stable.

⚙️ **Backend Express** — `server/routes/db.ts`
- Filet de sécurité : si une requête arrive avec `from`/`to` (pagination) mais sans `ORDER BY`, ajouter automatiquement `ORDER BY id` (fallback `ctid` si la table n'a pas d'`id`). Évite que d'autres écrans tombent dans le même piège.

🗄️ **Base de données** : aucune action.

### Vérification attendue
- Itagüí 2025 + Inicial : 1 928 → **2 423** respuestas
- Los Gómez : **47 / 166 / 240**
- Galán Sarmiento : **33 / 72 / 267**
- Total global : 17 546 → **17 615**
