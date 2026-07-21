## Objectif

Dans l'onglet **Ambiente Escolar / Delta**, limiter la phase **Evolución** aux **25 réponses les plus anciennes** (par institution et par formulaire : docentes / estudiantes / acudientes), afin de mieux comparer avec la phase Inicial et réduire l'exclusion « muestra no comparable ».

## Hypothèse à valider

L'idée est que trop de réponses en Evolución (par rapport à Inicial) fait exploser la variation muestrale (> 10 %) et exclut les institutions. En plafonnant Evolución à ~25 réponses les plus anciennes par formulaire, on rapproche N_post de N_base et on garde les répondants « early » (plus représentatifs du démarrage de collecte).

## Actions

🖥️ **Site statique (Frontend) uniquement** — `src/components/admin/AdminAmbienteDeltaTab.tsx`

1. **Après le fetch** des `encuestas_ambiente_escolar`, avant de les passer à `computeInstitucionesMel` :
   - Grouper les submissions de phase `evolucion` par clé `(institucion_normalizada, tipo_formulario)`.
   - Trier chaque groupe par `created_at ASC` (les plus anciennes d'abord).
   - Conserver au maximum les **25 premières** de chaque groupe.
   - Les submissions `inicial` restent inchangées.

2. **UI** : ajouter un petit badge/note discrète sous le KPI global :
   > « Evolución limitée aux 25 plus anciennes réponses par institution et par formulaire (comparabilité muestrale) »
   
   Optionnel : un toggle « Limiter Evolución à 25 réponses/formulaire » activé par défaut, pour pouvoir comparer les deux modes.

3. **Verifier** que `created_at` est bien récupéré dans le SELECT (sinon l'ajouter à la liste des colonnes).

## Détails techniques

- Le plafond de 25 correspond au **seuil minimum** déjà utilisé pour la représentativité par formulaire.
- Aucune modification à `melAmbienteIndicator.ts` : la logique de calcul reste identique, on ne change que l'ensemble de données d'entrée.
- Aucune modification backend, aucune migration SQL.

## Question

Confirmes-tu :
- **Plafond = 25** (pas 30 ou 40) ?
- **Tri par `created_at` ASC** (plus anciennes) — ou préfères-tu les 25 plus récentes ?
- **Toggle UI on/off** ou application silencieuse par défaut ?
