

## Analyse des dépendances entre hubs et répartition proportionnelle des coûts

### Les 8 hubs fonctionnels (items du menu)

| # | Hub | Heures directes |
|---|-----|----------------|
| 1 | Ficha de Información | 280h |
| 2 | Encuesta 360° | 350h |
| 3 | Informe de Módulo | 120h |
| 4 | Rúbricas | 300h |
| 5 | Ambiente Escolar | 200h |
| 6 | Satisfacciones | 150h |
| 7 | MEL | 180h |
| 8 | Certificaciones | 40h |

**Total heures directes des hubs : 1 620h**

### Modules partagés (support / infrastructure)

Ces modules ne sont pas des hubs commerciaux autonomes mais sont nécessaires au fonctionnement des hubs :

| Module partagé | Heures | Utilisé par |
|---------------|--------|-------------|
| Infrastructure (routing, UI, utils, dbClient) | 250h | Tous (8/8) |
| Sistema (Auth, RBAC, comptes, activité) | 200h | Tous (8/8) |
| Dashboard (Tablero de Control) | 80h | Tous (8/8) |
| Email (invitations, notifications) | 50h | 360, Satisfacciones, Certificaciones (3/8) |
| PDF Engine (jsPDF, logos, mise en page) | 120h | Ficha, 360, Rúbricas, Ambiente, MEL, Informe (6/8) |
| Géographie (régions, ET, municipios) | 100h | Ficha, 360, Rúbricas, Ambiente, MEL, Informe (6/8) |

**Total partagé : 800h**
**Grand total : 2 420h**

### Matrice de dépendances

```text
                    Infra  Sistema  Dashboard  Email  PDF   Géo
                    250h   200h     80h        50h    120h  100h
Ficha               X       X        X                 X     X
Encuesta 360         X       X        X         X       X     X
Informe Módulo       X       X        X                 X     X
Rúbricas             X       X        X                 X     X
Ambiente Escolar     X       X        X                 X     X
Satisfacciones       X       X        X         X
MEL                  X       X        X                 X     X
Certificaciones      X       X        X         X
```

### Calcul de la quote-part par hub

Chaque module partagé est divisé équitablement entre les hubs qui l'utilisent :

| Module | Coût/hub (8 users) | Coût/hub (6 users) | Coût/hub (3 users) |
|--------|-------------------|-------------------|-------------------|
| Infra 250h | 31,25h | — | — |
| Sistema 200h | 25h | — | — |
| Dashboard 80h | 10h | — | — |
| Email 50h | — | — | 16,67h |
| PDF 120h | — | 20h | — |
| Géo 100h | — | 16,67h | — |

### Heures totales par hub (directes + quote-part)

| Hub | Direct | Infra | Sistema | Dashboard | Email | PDF | Géo | **Total** | **%** |
|-----|--------|-------|---------|-----------|-------|-----|-----|-----------|-------|
| Ficha | 280 | 31,25 | 25 | 10 | — | 20 | 16,67 | **382,9** | **15,8%** |
| Encuesta 360 | 350 | 31,25 | 25 | 10 | 16,67 | 20 | 16,67 | **469,6** | **19,4%** |
| Informe Módulo | 120 | 31,25 | 25 | 10 | — | 20 | 16,67 | **222,9** | **9,2%** |
| Rúbricas | 300 | 31,25 | 25 | 10 | — | 20 | 16,67 | **402,9** | **16,6%** |
| Ambiente Escolar | 200 | 31,25 | 25 | 10 | — | 20 | 16,67 | **302,9** | **12,5%** |
| Satisfacciones | 150 | 31,25 | 25 | 10 | 16,67 | — | — | **232,9** | **9,6%** |
| MEL | 180 | 31,25 | 25 | 10 | — | 20 | 16,67 | **282,9** | **11,7%** |
| Certificaciones | 40 | 31,25 | 25 | 10 | 16,67 | — | — | **122,9** | **5,1%** |
| **TOTAL** | **1 620** | **250** | **200** | **80** | **50** | **120** | **100** | **2 420** | **100%** |

### Dépendances inter-hubs spécifiques

Au-delà des modules partagés, certains hubs dépendent directement d'autres hubs :

- **MEL** → dépend de **Encuesta 360** (MEL 360° compare Entrada/Salida) ET de **Rúbricas** (MEL Rúbricas compare modules)
- **Informe de Módulo** → dépend de **Ficha** (données directivos) et de **Rúbricas** (données d'asistencia)
- **Encuesta 360** → dépend de **Ficha** (identification des directivos et institutions)
- **Rúbricas** → dépend de **Ficha** (identification des directivos) et des **Evaluadores** (assignations)
- **Ambiente Escolar** → dépend de **Ficha** (institutions et directivos)
- **Satisfacciones** → autonome (seule dépendance : infrastructure)
- **Certificaciones** → dépend de **Ficha** (données des directivos)

### Ce que je propose de générer

Un PDF mis à jour (`Valoracion_Aplicacion_RLT.pdf`) avec :
1. Le tableau de ventilation incluant les quotes-parts des modules partagés
2. Le graphe de dépendances mis à jour (inter-hubs + modules partagés)
3. Les scénarios de packages recalculés avec les coûts réels (incluant les dépendances)
4. Calibration maintenue sur la base de 25M COP pour le module 360 + ses dépendances

