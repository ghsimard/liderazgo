

## Clarification : Granularité des permissions RBAC

### Réponse à ta question

Dans le plan initial, **"section"** correspondait aux 9 entrées de la sidebar (`fichas-rlt`, `encuesta360`, `mel`, `sistema`, etc.) — un niveau assez haut.

**Oui, on peut aller plus granulaire.** En regardant la structure actuelle, chaque section sidebar contient des sous-onglets (hubs internes). Par exemple :

```text
sistema/
  ├── gestion-cuentas    (Cuentas)
  ├── activity-log       (Actividad)
  ├── papelera           (Papelera)
  ├── reviews            (Apreciaciones)  [superadmin]
  ├── mensajes           (Mensajes)       [superadmin]
  ├── changelog          (Changelog)      [superadmin]
  ├── specs              (Especificaciones)[superadmin]
  └── purge-data         (Purgar datos)   [superadmin]

encuesta360/
  ├── formularios
  ├── inicial
  ├── final
  ├── invitaciones
  ├── informes-inicial
  ├── informes-final
  └── configuracion

ambiente-escolar/
  ├── monitoreo
  ├── estadisticas
  └── enlaces

mel/
  ├── mel-360
  ├── mel-rubricas
  └── mel-config
```

### Proposition révisée : Permissions à deux niveaux

La table `role_permissions` utilise une clé **section** qui peut être soit un niveau haut (`fichas-rlt`) soit un sous-onglet (`sistema.gestion-cuentas`, `sistema.papelera`). Si un rôle a une permission sur `sistema` sans sous-clé, il hérite l'accès à tous les sous-onglets. Si des sous-clés existent, elles prennent priorité.

```sql
-- Exemples de permissions granulaires :
INSERT INTO role_permissions (role_id, section, can_create, can_read, can_update, can_delete) VALUES
  (role_coordinador, 'sistema.gestion-cuentas', false, true, false, true),  -- lire + supprimer seulement
  (role_coordinador, 'sistema.papelera', false, true, false, false),         -- lecture seule
  (role_coordinador, 'encuesta360', true, true, true, false);                -- tout sauf supprimer (tous sous-onglets)
```

### Catalogue complet des sections possibles

| Section key | Sous-sections |
|---|---|
| `fichas-rlt` | `fichas-rlt.fichas`, `fichas-rlt.geography`, `fichas-rlt.campos` |
| `encuesta360` | `encuesta360.formularios`, `encuesta360.inicial`, `encuesta360.final`, `encuesta360.invitaciones`, `encuesta360.informes-inicial`, `encuesta360.informes-final`, `encuesta360.configuracion` |
| `rubricas` | *(pas de sous-sections)* |
| `informe-modulo` | *(pas de sous-sections)* |
| `ambiente-escolar` | `ambiente-escolar.monitoreo`, `ambiente-escolar.estadisticas`, `ambiente-escolar.enlaces` |
| `satisfacciones` | *(sous-sections gérées en interne)* |
| `certificaciones` | *(pas de sous-sections)* |
| `mel` | `mel.mel-360`, `mel.mel-rubricas`, `mel.mel-config` |
| `sistema` | `sistema.gestion-cuentas`, `sistema.activity-log`, `sistema.papelera`, `sistema.reviews`, `sistema.mensajes`, `sistema.changelog`, `sistema.specs`, `sistema.purge-data` |

### Logique de résolution

```typescript
function can(section: string, action: 'create'|'read'|'update'|'delete'): boolean {
  // 1. Cherche permission exacte (ex: "sistema.gestion-cuentas")
  // 2. Si pas trouvée, remonte au parent (ex: "sistema")
  // 3. Si rien, refusé
}
```

### Impact sur l'UI de gestion des rôles

La matrice de permissions afficherait un **arbre dépliable** :

```text
☑ Sistema                          [C] [R] [U] [D]
  ├── ☑ Cuentas                    [ ] [✓] [ ] [✓]  ← lire + supprimer seulement
  ├── ☑ Actividad                  [ ] [✓] [ ] [ ]
  ├── ☐ Papelera                   [ ] [ ] [ ] [ ]
  ...
```

Cocher le parent applique les mêmes CRUD à tous les enfants. Décocher un enfant crée une exception.

### Schema DB (mis à jour)

Aucun changement par rapport au plan initial — la colonne `section TEXT` accepte déjà les valeurs avec point (`sistema.gestion-cuentas`). La seule addition est de seeder le catalogue des sections valides dans une table de référence optionnelle ou en constante côté code.

### Résumé

Oui, `sistema/cuentas` avec "supprimer seulement" est parfaitement possible avec cette approche. La granularité va du niveau sidebar (9 sections) jusqu'aux sous-onglets individuels (~25 clés),

avec permissions CRUD indépendantes sur chacun.

