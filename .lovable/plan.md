# Écoles de Quibdó : liste vide dans le formulaire, 64 écoles au lieu de 25

## Diagnostic confirmé (production)

Les résultats SQL donnent deux causes distinctes, toutes deux vérifiées :

**1. Le lien région → ville est vide.** La table de liaison entre les régions et les villes ne contient **aucune ligne** (0), ni pour « Quibdó 2026 » ni pour « Oriente 2026 ». Le formulaire de ficha part de la région, descend vers la ville reliée, puis vers les écoles de cette ville : sans ce lien, la liste déroulante est vide pour **toutes** les régions. L'écran d'administration, lui, affiche la liste complète des écoles sans tenir compte de ce lien : d'où la divergence entre les deux écrans.

**2. Une importation massive a pollué le référentiel.** La production contient **22 380 écoles et 1 170 villes**. Les écoles d'origine datent du 21 février 2026; toutes les autres ont été créées le **3 août 2026 à 09:46** (liste nationale : Bogotá, Medellín, Cúcuta, académies privées, etc.). Pour la ville de Quibdó, cela donne 64 écoles au lieu des 25 attendues, avec des doublons proches :

- « Centro Educativo José Melanio Tunay del 21 » (origine) vs « Centro Educativo Indigena Jose Melanio Tunay Del 21 » (import)
- « Centro Educativo Munguido » (import) vs « Centro Educativo Rural Mixto Munguido » (origine)
- « Centro Educativo Jesús Antonio Velásquez del 20 » (origine) alors que les fichas utilisent « Centro Educativo **José** Antonio Velásquez del 20 » — cette école des fichas n'existe pas au référentiel.

À noter aussi : une école a été renommée le 4 septembre (« Centro Educativo Jorge Valencia Lozano » → « Institución Educativa MIA Jorge Valencia Lozano ») et six écoles ont été supprimées le même jour; ces opérations sont tracées et réversibles.

## Étape 1 — Rétablir les liens région → ville (🗄️ Base de données)

SQL avec sauvegarde et undo, qui recrée les liaisons manquantes :

- « Quibdó 2026 » → ville de Quibdó;
- « Oriente 2026 » → les 11 villes du Oriente (El Retiro, La Ceja, El Carmen de Viboral, Marinilla, El Santuario, San Rafael, San Carlos, San Luis, El Peñol, Granada, San Vicente), en ciblant les villes rattachées à Antioquia.

Effet immédiat : les listes déroulantes des formulaires redeviennent fonctionnelles.

## Étape 2 — Restreindre chaque région à ses écoles officielles (🗄️ Base de données)

Comme les villes contiennent désormais des centaines d'écoles importées, relier la ville seule ne suffit pas : la liste afficherait 64 écoles pour Quibdó. On utilise la restriction région → écoles (aujourd'hui vide) pour ne conserver que les écoles du programme :

- insérer les 25 écoles de référence de Quibdó et les 16 du Oriente dans cette table de restriction, par correspondance de nom exacte;
- lister les noms de référence qui ne trouvent pas de correspondance, pour traitement manuel.

Le code existant respecte déjà cette restriction : dès qu'elle est renseignée, seules ces écoles apparaissent dans les formulaires et les filtres.

## Étape 3 — Corriger les écarts de noms (🗄️ Base de données)

- « Centro Educativo Jesús Antonio Velásquez del 20 » → « Centro Educativo José Antonio Velásquez del 20 » (le nom utilisé dans les fichas), via le mécanisme de renommage existant qui propage partout;
- supprimer les doublons issus de l'import qui font double emploi avec une école officielle, après sauvegarde en corbeille;
- vérifier que le renommage du 4 septembre est bien reflété dans la liste de référence.

Chaque bloc est sauvegardé au préalable et réversible.

## Étape 4 — Nettoyage optionnel de l'import du 3 août (🗄️ Base de données)

Une fois les étapes 1 à 3 validées, proposer un SQL de suppression des écoles et villes créées le 3 août 2026 à 09:46 **qui ne sont référencées nulle part** (aucune ficha, aucune enquête, aucune restriction régionale). À exécuter seulement sur votre accord, avec sauvegarde complète et undo. Cela ramène le référentiel à sa taille utile et accélère les écrans.

## Étape 5 — Robustesse et prévention (🖥️ Site statique)

- Lire écoles, villes et liaisons par pages successives : avec 22 380 écoles, la lecture est aujourd'hui coupée au plafond de 1000 lignes, ce qui rend l'affichage imprévisible même une fois les liens rétablis.
- Charger uniquement les écoles des régions concernées plutôt que tout le référentiel national.
- Afficher un message explicite dans le formulaire quand aucune école n'est disponible (« No hay instituciones configuradas para esta región ») au lieu d'un menu vide et muet.
- Dans « Fichas de Información / Configuración », marquer les villes et écoles non reliées à une région : ce sont exactement celles invisibles dans les formulaires.

## Détails techniques

- Nouveaux fichiers SQL sous `server/migrations/` : rétablissement des liaisons, restriction régionale, corrections de noms, nettoyage optionnel — chacun avec table de sauvegarde `_undo_*` et bloc undo.
- Liste de référence : `src/data/instituciones.ts` (25 Quibdó, 16 Oriente).
- `src/hooks/useGeographicData.ts` : pagination `range` et filtrage par région au chargement.
- `src/pages/FichaRLT.tsx`, `src/pages/AdminEditFicha.tsx` : état vide explicite.
- `src/components/admin/AdminGeographyTab.tsx` : badge « sin región ».
- Aucune modification du Web Service Express.

## Déploiement

1. 🗄️ Étape 1 puis vérification immédiate du formulaire en production.
2. 🗄️ Étapes 2 et 3.
3. 🖥️ Republier le site statique, puis Ctrl+Shift+R.
4. 🗄️ Étape 4 (nettoyage) seulement après votre validation.
