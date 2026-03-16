

## Plan : Générer un PDF « Champs et règles de validation – Ficha de Información »

### Approche
Créer une fonction utilitaire qui génère un PDF côté client (jsPDF + autoTable) listant tous les champs du formulaire Ficha de Información avec leurs règles de validation, puis ajouter un bouton pour le déclencher depuis la page MiPanel ou AdminDashboard.

### Fichier à créer

**`src/utils/fichaFieldsPdfGenerator.ts`**

Fonction `generateFichaFieldsPdf()` qui :
1. Crée un document jsPDF A4
2. Ajoute un titre « Ficha de Información – Champs et règles de validation »
3. Ajoute la date de génération
4. Utilise `autoTable` pour rendre un tableau avec 4 colonnes :
   - **#** (numéro)
   - **Campo** (nom du champ)
   - **Obligatorio** (Sí / No)
   - **Reglas de validación** (description des règles)
5. Les 53 champs du schéma Zod seront listés avec leurs règles extraites statiquement (min length, format, regex, etc.)
6. Déclenche le téléchargement `ficha-campos-validacion.pdf`

### Données du tableau (extraites du schéma Zod lignes 42-117)

Les champs seront groupés par section :
- **Datos personales** : acepta_datos (obligatoire, doit être true), nombres/apellidos (min 2 car.), genero, numero_cedula, fecha_nacimiento (18-70 ans), etc.
- **Contacto** : celular_personal (10 dígitos), correo_personal (email valide), etc.
- **Formación** : tipo_formacion, titulo_pregrado (obligatoire), titres optionnels
- **Información institucional** : codigo_dane (12 dígitos numériques), jornadas/niveles_educativos/tipo_bachillerato (min 1 sélection), statistiques du personnel (obligatoires)
- **Estadísticas estudiantiles** : champs optionnels

### Déclenchement

Ajouter un bouton « Descargar campos y reglas (PDF) » dans la page d'admin ou directement appeler la fonction depuis la console. Option la plus simple : ajouter un petit bouton dans `AdminFichasTab.tsx` à côté des actions existantes.

### Fichier modifié
- `src/components/admin/AdminFichasTab.tsx` — ajout d'un bouton pour déclencher le PDF

