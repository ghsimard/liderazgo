

## Plan : Formulaire unifié de gestion de comptes

### Probleme actuel
Les 3 onglets gèrent des personnes identifiées par cédula, mais de manière isolée. Pour une même personne, il faut saisir nom/cédula/email 3 fois dans 3 formulaires différents.

### Solution proposée
Remplacer les 3 sous-onglets par une **vue unifiée par personne** :

1. **Liste unique de personnes** : Agréger toutes les cédulas connues (depuis `users`/`admin_cedulas`, `rubrica_evaluadores`, `operator_permissions`) dans une seule table avec colonnes : Cédula, Nombre, Rôles (badges: Admin, Evaluador, Operador).

2. **Dialogue "Agregar/Editar persona"** : Un seul formulaire avec :
   - Champs communs : Cédula, Nombre, Email
   - Section **Administrador** (toggle) : email de connexion, mot de passe, rôle (admin/superadmin)
   - Section **Evaluador** (toggle) : se crée dans `rubrica_evaluadores`, gestion des assignations accessible via un bouton secondaire
   - Section **Operador** (toggle) : liste de permissions de sections avec filtres (région, entidad, etc.)

3. **Auto-remplissage** : Quand on saisit une cédula existante, le nom/email se pré-remplissent depuis les données existantes (fichas_rlt, rubrica_evaluadores, etc.)

### Fichiers impactés

| Fichier | Action |
|---------|--------|
| `src/pages/AdminPage.tsx` | Remplacer les 3 sous-onglets par le composant unifié |
| `src/components/admin/AdminGestionCuentasTab.tsx` | **Nouveau** — Vue unifiée : liste + dialogue multi-rôle |
| `src/components/admin/AdminUsersTab.tsx` | Conservé tel quel (utilisé en interne par le nouveau composant ou gardé comme fallback) |
| `src/components/admin/AdminEvaluadoresTab.tsx` | Conservé (les assignations de directivos restent complexes, accessibles via un lien depuis la vue unifiée) |
| `src/components/admin/AdminOperadoresTab.tsx` | Conservé en interne pour la logique CRUD |

### Approche technique

Le nouveau `AdminGestionCuentasTab` :
- Charge en parallèle : `admin_cedulas` + users (via API), `rubrica_evaluadores`, `operator_permissions`
- Fusionne par cédula en une liste dédupliquée
- Le dialogue de création/édition affiche 3 sections activables (accordéons ou toggles)
- Chaque section appelle les mêmes APIs/endpoints existants (pas de changement backend)
- Le bouton "Ver asignaciones" pour les évaluateurs ouvre le dialogue existant `AdminEvalDetailDialog` ou bascule vers l'onglet détaillé

### Pas de migration DB nécessaire
Tout repose sur les tables existantes. Seul le frontend change.

