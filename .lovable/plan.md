## Objectif
SQL déjà passé sur Render (contrainte unique + colonnes d'audit). On adapte maintenant le frontend pour :
1. remplir les nouvelles colonnes d'audit à chaque écriture,
2. journaliser qui-fait-quoi-quand,
3. tirer parti de la garantie 1-1 pour simplifier l'affichage,
4. gérer proprement l'erreur d'unicité à l'assignation.

## 🖥️ Site statique — changements frontend

### 1) `src/pages/RubricaEvaluacion.tsx`

**a. `handleSubmit` (l. 606-617)** — remplir l'audit et enrichir le log
- Récupérer `evaluadorId` déjà présent dans le state (ou `ev.id` pour le rôle evaluador ; pour le directivo, utiliser sa propre `cedula`).
- Résoudre la cédula de l'évaluateur : si `role === "equipo"`, faire un lookup `rubrica_evaluadores.cedula` par `evaluadorId` une seule fois au chargement et le garder en state (`evaluadorCedula`). Pour `role === "directivo"`, utiliser `directivoInfo.cedula`.
- À l'INSERT : ajouter `evaluador_cedula: authorCedula` + `updated_by: authorCedula`.
- À l'UPDATE : ajouter uniquement `updated_by: authorCedula` (ne pas écraser `evaluador_cedula`).
- Enrichir `logActivity` (l. 644) : `\`Módulo ${n}, ${submissionType}, rol=${role}\``.

**b. `handleSaveSeguimiento` (l. 686)** — ajouter `evaluador_cedula: authorCedula` à l'INSERT + `logActivity(authorCedula, 'rubrica_submit', \`Seguimiento M${n}, item ${itemId}\`, '/rubrica-evaluacion')`.

**c. En-tête « Evaluadora asignada » (l. 299-312)**
- Puisque la contrainte garantit 1 ligne max, remplacer `.limit(1)` par `.maybeSingle()`.
- Aucun autre changement de comportement — la logique de fallback devient inutile mais reste inoffensive ; on la retire.

### 2) `src/components/admin/AdminEvaluadoresTab.tsx` (l. 141-171)
- Après le `.insert(rows)` : si `error.code === '23505'` ou `error.message` contient `rubrica_asignaciones_directivo_unique`, afficher un toast dédié :
  > « Uno o más directivos ya están asignados a otro evaluador. Use el botón **Transferir** para reasignar. »
- Sinon garder le comportement actuel.

### 3) `src/pages/MiPanel.tsx`
- La requête récemment passée à `.some()` peut redevenir `.maybeSingle()` sur la ligne unique. Comportement identique, code plus simple.

### 4) `src/components/admin/AdminEvalDetailDialog.tsx` (audit visible côté admin)
- Ajouter deux petites colonnes dans la table de détail : **Última edición** (`updated_at` formaté `DD/MM/YYYY HH:mm` en UTC-5 Bogotá) et **Editado por** (nom résolu via `rubrica_evaluadores.cedula = updated_by`, avec fallback sur la cédula brute si non trouvé).

## Ce qu'on ne change pas
- `TransferDirectivosDialog` — fonctionne déjà.
- `fichas_rlt`, aucune RLS, aucun renommage.
- Le journal d'activité existant (`user_activity_log`) — on ajoute juste des entrées.

## Vérification
1. Soumettre un module en tant que coach → row de `rubrica_evaluaciones` contient `evaluador_cedula` + `updated_by` = cédula du coach ; entrée dans `user_activity_log`.
2. Modifier un item déjà noté → `updated_by` change, `evaluador_cedula` inchangée.
3. Saisir un seguimiento → `evaluador_cedula` peuplée, entrée d'activité présente.
4. Tenter d'assigner un directivo déjà pris via Admin → Evaluadores → toast pointant vers Transferir.
5. `AdminEvalDetailDialog` affiche colonnes « Última edición / Editado por » (vide pour les lignes historiques, normal).
