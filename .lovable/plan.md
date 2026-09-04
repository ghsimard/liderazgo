# Renommer une institution et propager le changement partout

## Problème constaté

Dans Fichas de Información > Configuración, changer le nom d'une école ne modifie que la liste `instituciones` (une seule ligne). Tout le reste de l'application stocke le nom de l'école en texte copié, donc les fiches, les enquêtes, les rubriques, les invitations et les permissions continuent d'afficher l'ancien nom. Résultat : l'école apparaît en double (ancien + nouveau nom) dans les filtres, les rapports et le suivi.

## Recommandation

Transformer le changement de nom en une opération "renommer et propager", avec confirmation préalable.

### 1. Dialogue de confirmation avec aperçu

Lors de l'enregistrement du nouveau nom, avant toute application, afficher :

- Ancien nom -> nouveau nom
- Nombre d'enregistrements concernés par domaine : fiches, enquêtes 360, invitations, rubriques (assignations), Ambiente Escolar, cohortes, formulaires 2025, permissions des opérateurs
- Avertissement si le nouveau nom existe déjà dans la liste (fusion de deux écoles) : demander une confirmation explicite, car les données seront regroupées
- Boutons : Annuler / Renommer partout

### 2. Propagation

Après confirmation, mettre à jour le nom dans toutes les tables qui le stockent en texte, et sauvegarder une copie de sécurité du changement dans la Corbeille (`deleted_records`, type `rename_institucion`) pour pouvoir revenir en arrière.

### 3. Annulation

Dans la Corbeille, l'enregistrement de renommage permet de revenir au nom précédent en appliquant la même opération en sens inverse.

## Détails techniques

Fichier principal : `src/components/admin/AdminGeographyTab.tsx` (ligne ~174, `handleEditSave`), qui ne fait aujourd'hui qu'un `update({ nombre })` sur `instituciones`.

Nouvelle utilité `src/utils/renameInstitucion.ts` :

- `countInstitucionReferences(oldName)` — comptages par table pour l'aperçu
- `renameInstitucionEverywhere(oldName, newName)` — met à jour successivement :

```text
instituciones.nombre
fichas_rlt.nombre_ie
encuestas_360.institucion_educativa
encuesta_invitaciones.institucion
rubrica_asignaciones.institucion
encuestas_ambiente_escolar.institucion_educativa
ae_cohorte_instituciones.institucion_educativa
ae_docentes_submissions_2025.institucion_educativa
ae_estudiantes_submissions_2025.institucion_educativa
ae_acudientes_submissions_2025.institucion_educativa
ae_rectores_2025.nombre_de_la_institucion_educativa_en_la_actualmente_desempena_
operator_permissions.institucion
```

Tout passe par le proxy `@/utils/dbClient` (aucun accès direct). Avant d'implémenter, il faut vérifier dans le proxy Express (`server/routes/db.ts`) que ces tables acceptent un PATCH administrateur ; les tables `ae_*_2025` sont aujourd'hui en lecture publique, il faudra peut-être les ajouter explicitement à la liste d'écriture administrative. Si nécessaire, ce changement concerne le Web Service.

Enregistrement dans `deleted_records` avec `record_type: "rename_institucion"` et `deleted_data: { old_name, new_name, counts }`, et prise en charge du bouton d'annulation dans `AdminTrashManager.tsx`.

## Actions de déploiement

- Site statique (Frontend) : nouvelle utilité + dialogue de confirmation + annulation dans la Corbeille.
- Web Service (Backend Express) : uniquement s'il faut étendre la liste des tables avec écriture administrative (`ae_*_2025`).
- Base de données : aucune migration. Les données existantes avec l'ancien nom seront corrigées depuis l'interface lors du renommage.
