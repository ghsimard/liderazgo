

## Plan: Déplacer Visibilidad sous Configuration et afficher icônes dans Entrada/Salida

### Problème
La visibilité est actuellement un onglet de premier niveau séparé dans Encuesta 360°. L'utilisateur veut :
1. La déplacer sous **Configuración** comme sous-onglet "Visibilidad"
2. Garder les icônes Eye/EyeOff dans les onglets **Entrada** et **Salida** (AdminEncuestaMonitor) — ceux-ci sont déjà implémentés correctement

### Changements

**1. `src/pages/AdminPage.tsx`**
- Retirer le `TabsTrigger value="visibilidad"` de premier niveau (ligne 300)
- Retirer le `TabsContent value="visibilidad"` de premier niveau (lignes 363-365)
- Dans le sous-Tabs de Configuración (lignes 334-345), ajouter un nouveau sous-onglet "Visibilidad" à côté de Dominios, Competencias, Items, Pesos
- Ajouter le `TabsContent` correspondant qui rend `AdminEncuesta360VisibilityTab`

**2. Aucun autre changement requis**
- Les icônes de visibilité dans AdminEncuestaMonitor (Entrada/Salida) restent en place — c'est exactement ce que l'utilisateur demande
- Le composant `AdminEncuesta360VisibilityTab` reste inchangé

### Résultat
- **Configuración** aura 5 sous-onglets : Dominios, Competencias, Ítems, Ponderaciones, **Visibilidad**
- **Entrada** et **Salida** afficheront les icônes Eye/EyeOff à côté de chaque directivo/institution

