

## Plan: Onglet "Comentarios" dans Satisfacciones

### Objectif
Ajouter un sous-onglet **"Comentarios"** dans l'onglet Satisfacciones admin, affichant uniquement les commentaires textuels des recteurs, filtrable par région.

### Composant à créer

**`src/components/admin/AdminSatisfaccionCommentsTab.tsx`**

Un composant autonome qui :
1. Charge les réponses `satisfaccion_responses` et les enrichit avec les données de `fichas_rlt` (nom, institution, cargo)
2. Filtre pour ne garder que les **recteurs** (`cargo_actual = 'Rector/a'`)
3. Extrait les champs commentaires de chaque réponse : `comentarios` (asistencia), `oportunidades_mejora` (interludio), `comentarios_generales` (intensivo)
4. Affiche une liste de cartes avec : nom du recteur, institution, région, type de formulaire, module, date, et le texte du commentaire
5. Filtre par **région** (Select dropdown) + type de formulaire + module

### Modification existante

**`src/components/admin/AdminSatisfaccionesTab.tsx`** (lignes 364-371)
- Ajouter un `TabsTrigger` "Comentarios" et le `TabsContent` correspondant qui rend `<AdminSatisfaccionCommentsTab />`
- Positionner l'onglet après "Respuestas" : Respuestas, **Comentarios**, Estadísticas, Informe PDF, Formularios, Configuración

### Logique de filtrage

```text
1. Fetch satisfaccion_responses (toutes)
2. Fetch fichas_rlt pour les cédulas → obtenir cargo_actual, nom, IE, région de la ficha
3. Filtrer : cargo_actual === 'Rector/a'
4. Extraire le commentaire du champ textarea selon le form_type
5. Exclure les réponses sans commentaire (vide/null)
6. Appliquer filtre région via Select
```

### UI
- Select pour la région (avec option "Todas las regiones")
- Select pour le type de formulaire
- Select pour le module
- Compteur de commentaires affichés
- Liste de cartes avec badge région, badge type formulaire, nom/IE du recteur, date, et texte du commentaire en italique

### Aucune migration nécessaire
Les données existent déjà dans `satisfaccion_responses.respuestas` (champ JSONB).

