

## Plan: Caractérisation des Fichas dans le Tablero de Control

Ajouter une nouvelle carte KPI "Caracterización" dans le dashboard qui affiche les statistiques de caractérisation des directivos à partir des données de `fichas_rlt`.

### Données à afficher

Toutes les statistiques seront calculées sur les fichas filtrées (respect des filtres cascade existants).

| Indicateur | Champ source | Calcul |
|---|---|---|
| % Hombres / Mujeres | `genero` | Distribution par genre |
| % Rango de edades | `fecha_nacimiento` | Tranches (20-30, 31-40, 41-50, 51-60, 60+) |
| % Enfermedades de base | `enfermedad_base` | % "Sí" vs "No" |
| % Discapacidad | `discapacidad` | % "Sí" vs "No" |
| % Tipo de formación | `tipo_formacion` | Distribution (Normalista, Licenciado/a, etc.) |
| % Especialización | `titulo_especializacion` | % non-null/non-vide |
| % Maestría | `titulo_maestria` | % non-null/non-vide |
| % Doctorado | `titulo_doctorado` | % non-null/non-vide |
| # Escuelas por municipio | `nombre_ie` + table municipios | Compte distinct par municipio |
| % Rol (cargo) | `cargo_actual` | Distribution (existe déjà comme `fichasByCargo`) |
| % Tipo de vinculación | `tipo_vinculacion` | Distribution |
| % Estatuto | `estatuto` | Distribution |
| % Sede principal (zona) | `zona_sede` | Distribution (Urbana/Rural) |
| % Jornadas | `jornadas` | Distribution (array → éclater) |
| % Grupos étnicos | `grupos_etnicos` | Distribution (string CSV → éclater) |
| Total personal IE | `num_docentes + num_coordinadores + num_orientadores + num_administrativos` | Somme |
| Total estudiantes por nivel | `estudiantes_preescolar/primaria/basica_secundaria/media/ciclo_complementario` | Sommes par niveau |

### Modifications

**Fichier** : `src/components/admin/AdminDashboardTab.tsx`

1. **Étendre la requête fichas** (ligne 54) : ajouter les champs nécessaires au `select` :
   ```
   genero, fecha_nacimiento, enfermedad_base, discapacidad, tipo_formacion,
   titulo_especializacion, titulo_maestria, titulo_doctorado, tipo_vinculacion,
   estatuto, zona_sede, jornadas, grupos_etnicos, num_docentes, num_coordinadores,
   num_orientadores, num_administrativos, estudiantes_preescolar, estudiantes_primaria,
   estudiantes_basica_secundaria, estudiantes_media, estudiantes_ciclo_complementario,
   entidad_territorial
   ```

2. **Ajouter les calculs `useMemo`** pour chaque indicateur à partir de `filteredFichas`

3. **Ajouter une nouvelle carte KPI large** (pleine largeur ou `col-span-2/3`) avec des sous-sections :
   - Section "Demografía" : genre (pie), âges (bar), enfermedades, discapacidad
   - Section "Formación" : tipo_formacion (pie), barres pour Especialización/Maestría/Doctorado
   - Section "Institucional" : vinculación, estatuto, zona sede, jornadas, grupos étnicos
   - Section "Estadísticas IE" : totaux personnel et étudiants

4. **Visualisations** : Réutiliser `MiniPie` pour les distributions, barres horizontales `Progress` pour les pourcentages simples, petites tables pour les données tabulaires (municipios, étudiants par niveau)

### Fichier modifié

- `src/components/admin/AdminDashboardTab.tsx`

