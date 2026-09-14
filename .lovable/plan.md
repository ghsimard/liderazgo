# Afficher les erreurs d'import géographique et éviter l'échec silencieux

## Diagnostic

L'import CSV géographique (`AdminGeographyTab.tsx`) envoie les données par lots à Lovable Cloud. Si une ligne échoue (contrainte d'unicité, type incorrect, etc.), l'erreur est actuellement avalée : l'utilisateur ne voit qu'un toast générique de succès ou un message vide, sans savoir quelle ligne a posé problème ni pourquoi.

## Ce que je propose

### Étape 1 — Backend : rendre les erreurs exploitables

Modifier la route d'import Express (ou le traitement côté `dbClient`) pour :
- Tenter l'insertion en lot comme aujourd'hui.
- Si le lot échoue, repasser en insertion ligne par ligne pour sauver ce qui peut l'être.
- Retourner une liste structurée des lignes en erreur avec : numéro de ligne, champ concerné, motif (ex. « Ya existe un municipio con ese nombre en la entidad »).

### Étape 2 — Frontend : afficher le récapitulatif détaillé

Dans `AdminGeographyTab.tsx`, après l'import :
- Conserver le message de succès avec éléments **créés** et **réutilisés**.
- Ajouter, uniquement s'il y en a, une section « Errores » listant les lignes problématiques.
- Empêcher le toast de disparaître trop vite ou ajouter un bouton pour copier le rapport d'erreurs.

### Étape 3 — Validation sur l'import actuel

Relancer l'import du CSV corrigé pour vérifier que :
- Les créations/réutilisations s'affichent correctement.
- Aucune erreur n'est masquée.

## Actions par service

- ⚙️ Web Service (Backend Express) : retour structuré des erreurs + fallback ligne par ligne.
- 🖥️ Site statique (Frontend) : affichage du récapitulatif créés/réutilisés/erreurs.
- 🗄️ Base de données : aucune action (pas de modification de données, sauf si un nouvel import est demandé).

## À savoir

Ce correctif s'applique à RLT Ficha. Pour E360 Insights, il faut toujours ouvrir le projet séparé et y coller la demande.
