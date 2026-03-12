

## Plan : Hub Satisfacciones (3 formulaires, cedula uniquement en arriere-plan)

### Resume

Creer 3 formulaires de satisfaction (Asistencia, Interludio, Intensivo) remplis 4 fois (modules 1-4), avec cedula captee silencieusement via `sessionStorage`. L'admin controle la disponibilite. Les directivos y accedent via Mi Panel.

---

### 1. Migration DB -- 2 tables

**`satisfaccion_config`** -- controle admin de disponibilite :
- `id` uuid PK, `form_type` text (asistencia|interludio|intensivo), `module_number` int (1-4), `region` text, `is_active` boolean default false, `available_from` timestamptz, `available_until` timestamptz, `created_at`/`updated_at` timestamptz
- UNIQUE(form_type, module_number, region)

**`satisfaccion_responses`** -- reponses :
- `id` uuid PK, `form_type` text, `module_number` int, `region` text, `cedula` text NOT NULL, `respuestas` jsonb NOT NULL default '{}', `created_at` timestamptz

RLS : INSERT public (true), SELECT/UPDATE/DELETE admin only (`has_admin_access`). Unique constraint sur (form_type, module_number, cedula) pour empecher double soumission.

---

### 2. Fichier de donnees -- `src/data/satisfaccionData.ts`

Definit les 3 formulaires avec leurs sections et questions extraites des Google Forms :

- **Asistencia** : date, activite (radio 2 choix), groupe (radio 3), 2 questions Likert-4 (objectif + valeur), commentaires
- **Interludio** : top 3 activites (checkbox max 3, 7 options), grille Si/No/Parcialmente (5 questions), grille frequence facilitateur 4-niveaux (4 questions), grille frequence coach (3 questions), grille auto-evaluation frequence (4 questions), commentaire ouvert
- **Intensivo** : top 3 activites (checkbox max 3, 12 options), grille Si/No/Parcialmente (5 questions), grille frequence equipe (5 questions), grille logistique Likert-4 (6 questions), grille auto-evaluation frequence (4 questions), commentaire thematique structure

---

### 3. Pages formulaires -- 3 composants React

`SatisfaccionAsistencia.tsx`, `SatisfaccionInterludio.tsx`, `SatisfaccionIntensivo.tsx`

Chaque page :
- Recoit `?module=N` en query param
- Recupere la cedula depuis `sessionStorage.getItem("user_cedula")` silencieusement (aucun champ visible)
- Recupere la region depuis `fichas_rlt` via cedula pour le titre et les logos dynamiques
- Verifie disponibilite via `satisfaccion_config` (is_active + plage horaire)
- Verifie double soumission (cedula + form_type + module)
- Affiche uniquement les questions de satisfaction (pas d'identite)
- Titre dynamique : "Encuesta de Satisfaccion [Type] [N] - [Region]"
- Enregistre dans `satisfaccion_responses` avec cedula en arriere-plan

Routes dans `App.tsx` : `/satisfaccion-asistencia`, `/satisfaccion-interludio`, `/satisfaccion-intensivo`

---

### 4. Integration Mi Panel

Dans `MiPanel.tsx`, ajouter un bouton **"Satisfaccion"** (icone ThumbsUp) pour les directivos :
- Au clic, affiche une sous-vue listant les 3 types de formulaires x module actif
- Lookup `satisfaccion_config` filtre par region du directivo + is_active + plage horaire
- Indicateur "deja rempli" via check dans `satisfaccion_responses` par cedula
- Navigation vers la page du formulaire avec `?module=N`

---

### 5. Admin -- `AdminSatisfaccionesTab.tsx`

Remplace le placeholder actuel :
- Tableau par region x module x type avec toggle is_active + champs date/heure debut/fin
- Compteur de reponses recues par combinaison
- Vue detail des reponses (avec cedula visible pour l'admin)

---

### Ordre d'implementation

1. Migration DB (2 tables + RLS + contrainte unique)
2. `satisfaccionData.ts` (donnees des 3 formulaires)
3. 3 pages formulaires + routes dans App.tsx
4. Integration Mi Panel (bouton Satisfaccion)
5. `AdminSatisfaccionesTab.tsx` (remplace placeholder)

