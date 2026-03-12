

## Plan: Deux nouveaux onglets dans Satisfacciones

### Contexte
La section Satisfacciones possède actuellement 3 onglets : Configuración, Respuestas, Estadísticas. L'utilisateur demande 2 onglets supplémentaires.

### Onglet 1 : "Rapport PDF"
Permet de générer un rapport PDF de satisfaction avec :
- **Filtres** : Région, Module, Type de formulaire (comme dans Estadísticas)
- **Logos fixes** : RLT, CLT, Cosmo (comme les autres rapports, avec gestion `mostrar_logo_rlt` / `mostrar_logo_clt` par région)
- **Logos supplémentaires** : Zone d'upload permettant d'ajouter 1-3 logos partenaires sur la page titre (upload temporaire via input file, pas stocké en DB)
- **Contenu PDF** : Page titre avec logos + ficha técnica + graphiques/statistiques recalculés (reprend la logique de `AdminSatisfaccionStats`)

**Fichiers créés/modifiés :**
- `src/components/admin/AdminSatisfaccionReportTab.tsx` — Nouveau composant avec filtres, zone d'upload de logos extra, bouton de génération
- `src/utils/satisfaccionPdfGenerator.ts` — Générateur PDF jsPDF avec page titre (logos programme + logos extra), ficha técnica, graphiques horizontaux, tableau récapitulatif
- `src/components/admin/AdminSatisfaccionesTab.tsx` — Ajout de l'onglet "Rapport PDF" dans le TabsList

### Onglet 2 : "Formulaires"
Affiche les 3 formulaires (Asistencia, Interludio, Intensivo) tels que les recteurs les verront, avec possibilité d'édition.

**Approche base de données :**
- Nouvelle table `satisfaccion_form_definitions` stockant les définitions de formulaires personnalisés (JSON) :
  - `id`, `form_type` (asistencia/interludio/intensivo), `definition` (jsonb — sections et questions), `updated_at`, `updated_by`
- Les données de `satisfaccionData.ts` servent de fallback si aucune entrée en DB
- RLS : lecture publique, écriture admin uniquement

**Interface admin :**
- Sélecteur de formulaire (Asistencia / Interludio / Intensivo)
- Aperçu en lecture seule du formulaire tel que le recteur le verra (réutilise `SatisfaccionForm` en mode `readOnly`)
- Mode édition : pouvoir modifier le titre/description des sections, modifier les questions existantes, ajouter de nouvelles questions (text, textarea, radio, likert4, checkbox-max3, grid), supprimer des questions, réordonner par drag-and-drop
- Bouton "Guardar" pour persister en DB, bouton "Restablecer" pour revenir au formulaire par défaut

**Fichiers créés/modifiés :**
- `src/components/admin/AdminSatisfaccionFormsTab.tsx` — Nouveau composant éditeur de formulaires
- `src/data/satisfaccionData.ts` — Ajout d'un hook ou fonction utilitaire pour charger la définition depuis DB ou fallback statique
- `src/components/SatisfaccionForm.tsx` et pages de satisfaction — Modifiés pour charger les définitions depuis DB plutôt que statiquement
- Migration SQL — Création de la table `satisfaccion_form_definitions`
- `src/components/admin/AdminSatisfaccionesTab.tsx` — Ajout de l'onglet "Formulaires"

### Résumé des modifications

```text
Onglets Satisfacciones :
┌──────────────┬────────────┬──────────────┬─────────────┬──────────────┐
│ Configuración│ Respuestas │ Estadísticas │ Rapport PDF │ Formulaires  │
└──────────────┴────────────┴──────────────┴─────────────┴──────────────┘
```

**Nouveaux fichiers (4) :**
1. `src/components/admin/AdminSatisfaccionReportTab.tsx`
2. `src/utils/satisfaccionPdfGenerator.ts`
3. `src/components/admin/AdminSatisfaccionFormsTab.tsx`
4. Migration SQL pour `satisfaccion_form_definitions`

**Fichiers modifiés (3) :**
1. `src/components/admin/AdminSatisfaccionesTab.tsx` — 2 nouveaux onglets
2. `src/data/satisfaccionData.ts` — Fonction de chargement DB
3. `src/components/SatisfaccionForm.tsx` + pages — Utiliser les définitions DB

