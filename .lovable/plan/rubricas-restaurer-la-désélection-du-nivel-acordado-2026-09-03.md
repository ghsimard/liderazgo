# Rubricas : restaurer la désélection du nivel acordado

## Objectif
Revenir au comportement d'avant : l'évaluateur peut cliquer sur le niveau déjà sélectionné pour le désélectionner (toggle). On conserve uniquement le correctif qui **vérifie que la soumission a réussi** (contrôle d'erreur Supabase + relecture de la valeur persistée + message d'erreur si échec).

## Changement
`src/pages/RubricaEvaluacion.tsx` (section « Nivel acordado », ~ligne 1654) :

```text
Avant (correctif publié)          Après (restauration)
------------------------          --------------------
clic sur niveau actif = rien      clic sur niveau actif = désélection (null)
clic sur autre niveau = change    clic sur autre niveau = change (inchangé)
```

- Le `onClick` redevient un toggle : `acordado_nivel === n.value ? null : n.value`.
- Sécurité conservée : la validation dans `handleSave` exige déjà un `acordado_nivel` et un commentaire non vides avant soumission — un item désélectionné ne peut donc pas être soumis.
- Sécurité conservée : la vérification d'écriture (erreur Supabase interceptée, valeur relue après sauvegarde, toast d'erreur si l'écriture n'a pas abouti).

## Ce qui ne change pas
- Seguimiento (montée de niveau des modules passés, commentaire obligatoire, historique) : inchangé.
- Rapport régional (colonne « Sin registro ») : inchangé.
- Trigger d'audit `updated_at` en production : inchangé.

## Actions de déploiement
- 🖥️ Site statique (Frontend) : republier après la modification.
- ⚙️ Web Service (Backend Express) : rien à faire.
- 🗄️ Base de données : rien à faire.
