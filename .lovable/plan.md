

## Correction du mapping Comunicación — Estudiantes `com_4`

**Problème** : Dans `src/data/ambienteEscolarReportData.ts` ligne 75, l'item "Los docentes de la IE se comunican de manera asertiva" a `estudiantes: undefined` alors que la question estudiantes `com_4` ("La comunicación entre mis profesores es respetuosa y clara") couvre exactement le même concept.

**Changement** :
- Fichier : `src/data/ambienteEscolarReportData.ts`, ligne 75
- Remplacer `estudiantes: undefined` par `estudiantes: "com_4"`

Cela réduira les cases structurellement vides de 4 à 3 dans le rapport.

