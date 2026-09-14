# Encuestas 360 : minimums réalistes et rapport toujours consultable

## Ce que dit Maribel

1. Tous les minimums doivent être **1** (aujourd'hui Directivo Par, Docente et Administrativo sont à 2).
2. Certaines écoles ne peuvent pas atteindre ce 1 :
   - **Estudiantes** : les centros educativos n'ont pas d'élèves assez grands.
   - **Administrativos** : beaucoup de centros educativos, et même certaines IE (ex. Tagachi, Quibdó), n'ont pas de personnel administratif.
3. La ficha ne doit **pas** piloter la 360 : ce sont deux usages différents.
4. Le rapport doit rester consultable même si les minimums ne sont pas atteints.

## Le point non tranché, et ce que je propose

Il n'existe aucune source fiable, hors ficha, qui dise « cette école n'a pas d'administratifs ». Donc plutôt que de deviner, je propose deux niveaux :

- **Règle automatique** : toute école dont le nom commence par « CE » ou « Centro Educativo » n'a ni Estudiante ni Administrativo dans ses exigences. Cela généralise la règle qui existe déjà, mais seulement pour Quibdó et seulement pour Estudiante.
- **Exception manuelle** : un petit écran dans l'admin où l'on coche, école par école, « sin administrativos » et/ou « sin estudiantes ». C'est ainsi qu'on couvre les cas comme Tagachi, sans lier la 360 à la ficha. Tant qu'une école n'est pas cochée, elle garde le minimum 1 — et, comme il n'y a pas de mécanisme sûr, l'affichage reste un simple avertissement, jamais un blocage.

## Ce qui change concrètement

**Moniteur de collecte 360 (admin)**
- Minimums affichés : 1 pour tous les rôles.
- Les rôles « non applicables » (règle automatique ou exception cochée) s'affichent « N/A » et ne comptent plus dans l'état « incomplet », à l'écran comme dans le PDF de suivi.

**Hub des encuestas (école)**
- Les quotas passent à 1 partout. Rien n'est bloqué : seule l'autoevaluación reste limitée à une réponse, comme aujourd'hui.

**Rapport 360**
- Un bandeau « Informe parcial » en haut du rapport à l'écran et sur le PDF, listant les rôles qui n'ont pas atteint le minimum. Le rapport reste entièrement consultable et téléchargeable.

**Nouvel écran admin « Excepciones 360 »**
- Liste des institutions, avec deux cases par école : sin estudiantes / sin administrativos, plus un champ de recherche. Sauvegarde immédiate.

## Détails techniques

- `ROLE_LIMITS` dans `AdminEncuestaMonitor.tsx` : tous les `min` à 1 ; la fonction de sélection des rôles applicables prend en entrée les exceptions chargées depuis la base au lieu du seul test Quibdó.
- `FORM_QUOTAS` dans `Encuesta360Hub.tsx` : tous à 1.
- `isCentroEducativo` (déjà présent dans `src/utils/institutionType.ts`) devient la règle générale pour estudiante + administrativo ; `isQuibdoCentroEducativo` n'est plus utilisé pour ce calcul.
- Nouvelle table `encuesta_360_excepciones` : `institucion` (unique), `sin_estudiantes`, `sin_administrativos`, horodatages. Lecture par toute l'app, écriture réservée aux admins.
- Le bandeau du rapport s'appuie sur les compteurs déjà calculés par `calcularReporte360`, sans changer les calculs de scores.

## Actions par environnement

- 🗄️ **Base de données** : créer la table `encuesta_360_excepciones` (script SQL à exécuter aussi en production).
- ⚙️ **Web Service (Express)** : ajouter la table à la liste blanche du proxy pour la lecture et l'écriture, puis redéployer.
- 🖥️ **Site statique (Frontend)** : les changements de minimums, l'écran d'exceptions et le bandeau du rapport, puis Publish et Ctrl+Shift+R.

Ordre : SQL → redéploiement Express → publication du frontend.
