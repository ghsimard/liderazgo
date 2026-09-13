# Reporter les correctifs Géographie sur E360 Insights

## Ce que j'ai vérifié dans E360 Insights

J'ai lu le code réel du projet E360 Insights (onglet « Geografía » des fichas et son backend Express). Résultat :

- **Le problème des 1000 lignes n'existe pas là-bas.** E360 lit la liste des entités, municipes et écoles directement en base via son propre serveur, sans plafond. Rien à corriger.
- **La casse et les accents sont déjà gérés.** Le serveur compare les noms sans tenir compte des majuscules, des accents ni des espaces multiples avant de créer une ligne. Un « Medellín » et un « MEDELLIN » ne feront pas deux entrées.

Donc les deux correctifs demandés sont, pour l'essentiel, déjà en place sur E360.

## Ce qui manque réellement (les vraies différences)

Trois écarts subsistent par rapport à ce qu'on vient de faire ici :

1. **Lecture du fichier CSV trop fragile.** E360 découpe les lignes sur la virgule ou le point-virgule uniquement : pas de tabulation, pas de gestion du caractère invisible que Excel place en début de fichier, et un nom d'école contenant une virgule entre guillemets est coupé en deux.
2. **Le message de fin d'import ne dit pas ce qui a été réutilisé.** Il annonce seulement les créations. Si tout existe déjà, on lit « 0, 0, 0 » et on croit que l'import a échoué.
3. **Les lignes en erreur passent inaperçues.** Si une ligne du fichier pose problème, l'import s'arrête sur un message générique sans indiquer laquelle.

## Ce que je propose de faire

### Étape 1 — Lecture du CSV robuste (côté écran E360)
Accepter virgule, point-virgule et tabulation, retirer le caractère invisible d'Excel en tête de fichier, et respecter les guillemets pour qu'un nom contenant une virgule reste entier.

### Étape 2 — Message de fin d'import complet
Afficher, pour chaque niveau (entités, municipes, écoles) : combien ont été créées et combien existaient déjà et ont été réutilisées.

### Étape 3 — Erreurs visibles
Si une ligne échoue, continuer les suivantes et indiquer à la fin combien de lignes ont échoué, avec le numéro et la raison des premières d'entre elles.

## Actions par service (E360 Insights)

- 🖥️ Site statique (Frontend) : lecture du CSV et message de fin d'import — publication du projet E360, puis Ctrl+Shift+R.
- ⚙️ Web Service (Backend Express) : comptage des réutilisations et remontée des lignes en erreur dans la réponse d'import — redéploiement du service E360.
- 🗄️ Base de données : aucune action, aucune donnée modifiée.

Ordre de mise en production : backend d'abord, puis publication du frontend, puis rafraîchissement forcé.

## Point important avant de démarrer

E360 Insights est un projet séparé. Depuis ici je peux **lire** son code, mais pas le modifier. Pour appliquer ces changements il faut ouvrir le projet [E360 Insights](/projects/756c507c-a422-4eb8-a40f-4f7daff95338) et m'y redonner ce plan — je le retrouverai et l'exécuterai là-bas.
