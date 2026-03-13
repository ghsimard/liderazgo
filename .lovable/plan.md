

## Integration de RLT-Stats dans Ambiente Escolar

### Contexte
L'application RLT-Stats (GitHub) offre deux vues principales :
1. **MonitoringSurvey** : tableau de bord montrant le nombre de soumissions (docentes/estudiantes/acudientes) par ecole, avec indicateurs colores et dialog de contact du directivo.
2. **FrequencyChart** : analyse des frequences de reponses (Siempre/Casi siempre/A veces/Casi nunca/Nunca) par question et par section, avec filtre par ecole, graphiques et classement.

L'ancienne app utilisait la table `rectores` (equivalente a `fichas_rlt`) et des tables `docentes_form_submissions`, etc. (equivalentes a `encuestas_ambiente_escolar`). Aucune migration de base de donnees n'est necessaire.

### Plan d'implementation

#### 1. Transformer "Ambiente Escolar" en Hub a onglets
**Fichier** : `src/pages/AdminPage.tsx`
- Remplacer le cas simple `ambiente-escolar` par un Hub a onglets (pattern identique a MEL/360), avec :
  - **Monitoreo** : onglet par defaut
  - **Estadísticas** : analyse des frequences
  - **Enlaces** : les liens existants des enquetes (ce qui est la actuellement)
- Ajouter les sous-routes `ambiente-monitoreo`, `ambiente-estadisticas` au `titleMap` et au `switch`

#### 2. Creer `AdminAmbienteMonitorTab.tsx`
**Fichier** : `src/components/admin/AdminAmbienteMonitorTab.tsx`

Reproduit le MonitoringSurvey en Shadcn/Tailwind :
- Charge `fichas_rlt` (directivos) et `encuestas_ambiente_escolar` (soumissions)
- Tableau listant chaque institution avec le nombre de soumissions par type (docentes/estudiantes/acudientes)
- Badges colores : rouge=0, jaune=1-24, vert=25+
- Ligne de totaux en haut
- Legende avec decompte par categorie
- Dialog de contact affichant les coordonnees du directivo depuis `fichas_rlt` (correo_personal, correo_institucional, celular_personal, telefono_ie, prefiere_correo)
- Calculs entierement cote client, pas d'edge function

#### 3. Creer `AdminAmbienteStatsTab.tsx`
**Fichier** : `src/components/admin/AdminAmbienteStatsTab.tsx`

Reproduit le FrequencyChart en Shadcn/Recharts :
- Combobox de filtre par institution (depuis `fichas_rlt.nombre_ie`)
- Charge `encuestas_ambiente_escolar` et calcule les frequences cote client depuis `respuestas` JSONB
- Pour chaque type (docentes/estudiantes/acudientes), affiche un tableau par section (Comunicacion/Practicas Pedagogicas/Convivencia) avec les pourcentages pour chaque option Likert (Siempre/Casi siempre/A veces/Casi nunca/Nunca)
- Utilise les definitions de questions de `ambienteEscolarData.ts` (ACUDIENTES_LIKERT, ESTUDIANTES_LIKERT, DOCENTES_LIKERT)
- Graphiques avec Recharts (deja installe) : barres empilees pour les frequences par section

#### 4. Mettre a jour la sidebar
**Fichier** : `src/components/admin/AdminSidebar.tsx`
- La section "Ambiente Escolar" reste un item unique dans la sidebar (comme actuellement), mais le hub interne gere les sous-onglets

### Details techniques
- Toutes les donnees proviennent de `fichas_rlt` et `encuestas_ambiente_escolar` (aucune reference a `rectores`)
- Les calculs de frequences se font en iterant `respuestas` JSONB cote client
- Les composants utilisent Shadcn (Table, Badge, Dialog, Tabs) et Recharts
- Le pattern de hub suit exactement celui de MEL (TabsList sticky avec style primaire)

