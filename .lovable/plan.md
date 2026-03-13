

## Probleme actuel

Le panneau d'administration affiche **12+ onglets** dans une seule barre `TabsList` horizontale avec `flex-wrap`. C'est une masse de boutons qui deborde sur plusieurs lignes, sans hierarchie logique. L'utilisateur doit scanner tous les onglets pour trouver ce qu'il cherche.

## Proposition : Sidebar avec sections groupees

Remplacer la barre d'onglets horizontale par une **sidebar collapsible** (utilisant le composant `Sidebar` de shadcn deja present dans le projet) avec des sections logiques groupees.

### Structure proposee

```text
┌──────────────────┬──────────────────────────────────┐
│  SIDEBAR         │  CONTENU                         │
│                  │                                  │
│  ▼ Formularios   │                                  │
│    Enlaces       │                                  │
│                  │                                  │
│  ▼ Fichas RLT    │                                  │
│    Lista         │                                  │
│    Regiones      │                                  │
│                  │                                  │
│  ▼ Encuesta 360° │                                  │
│    Config        │                                  │
│    Inicial       │                                  │
│    Final         │                                  │
│    Informes Ini. │                                  │
│    Informes Fin. │                                  │
│                  │                                  │
│  ▼ Analisis      │                                  │
│    MEL           │                                  │
│    Rubricas      │                                  │
│                  │                                  │
│  ▼ Sistema       │                                  │
│    Admins        │                                  │
│    Apreciaciones*│                                  │
│    Mensajes*     │                                  │
│    Changelog*    │                                  │
│                  │  (* = superadmin only)            │
└──────────────────┴──────────────────────────────────┘
```

### Modifications

1. **Creer `src/components/admin/AdminSidebar.tsx`** : composant Sidebar avec les 5 groupes ci-dessus, utilisant `SidebarGroup`, `SidebarMenuItem`, et `SidebarMenuButton`. La navigation se fait via le parametre URL `?tab=` (meme mecanisme actuel). Le groupe contenant l'onglet actif reste ouvert via `defaultOpen`. Les items superadmin sont masques conditionnellement.

2. **Modifier `src/pages/AdminPage.tsx`** :
   - Envelopper le layout dans `SidebarProvider`
   - Remplacer le `TabsList` par le nouveau `AdminSidebar`
   - Conserver tous les `TabsContent` existants mais les afficher conditionnellement selon `activeTab` (sans Radix Tabs, juste un `if/switch`)
   - Ajouter un `SidebarTrigger` dans le header pour le mode mobile
   - La sidebar est collapsible en mode "icon" (icones visibles quand fermee)

3. **Supprimer le panneau flottant "Mensajes"** : l'integrer comme un onglet normal dans la section "Sistema" de la sidebar au lieu du toggle dans le header.

### Points techniques

- Reutilise les composants `Sidebar` de `src/components/ui/sidebar.tsx` deja installes
- Le parametre URL `?tab=` est conserve pour les liens directs et le rafraichissement
- Les sous-onglets internes (fichas: lista/geography, config 360: dominios/competencias/etc.) restent en tabs horizontaux dans leur contenu respectif
- Aucune modification aux composants enfants (AdminFichasTab, AdminMelTab, etc.)

