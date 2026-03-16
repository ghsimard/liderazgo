

## Plan : Modal d'alerte pour la saisie des noms (certificats)

### Concept

Au lieu d'une simple alerte statique, un **AlertDialog modal** s'affichera automatiquement lorsque l'utilisateur arrive à la section "Datos Personales" (après vérification de la cédula). Le modal :

1. **Explique l'importance** — message clair indiquant que les noms saisis apparaîtront sur le certificat, avec exemple visuel (bon vs mauvais)
2. **Contient les deux champs** `nombres` et `apellidos` directement dans le modal — l'utilisateur saisit ses noms dans le modal même
3. **Bouton "Confirmar"** — ferme le modal et pré-remplit les champs du formulaire avec les valeurs saisies

### Flux utilisateur

```text
Cédula vérifiée → Modal s'ouvre automatiquement
  ┌─────────────────────────────────────────┐
  │  ⚠️ Importante                          │
  │                                         │
  │  Escriba sus nombres y apellidos        │
  │  exactamente como desea que aparezcan   │
  │  en su certificado, respetando          │
  │  mayúsculas, minúsculas y tildes.       │
  │                                         │
  │  ✅ María Carolina Rodríguez Pérez      │
  │  ❌ MARIA CAROLINA RODRIGUEZ PEREZ      │
  │  ❌ maria carolina rodriguez perez      │
  │                                         │
  │  Nombre(s): [___________________]       │
  │  Apellido(s): [___________________]     │
  │                                         │
  │         [ Confirmar nombres ]           │
  └─────────────────────────────────────────┘
  → Valeurs copiées dans le formulaire
  → Champs nombres/apellidos restent éditables après
```

### Détails techniques

- **Fichier** : `src/pages/FichaRLT.tsx`
- **Composant** : `AlertDialog` (non fermable par clic extérieur — force la lecture)
- **Déclenchement** : état `showNameModal` mis à `true` quand `cedulaVerificada` passe à `true` ET que les champs `nombres`/`apellidos` sont vides (ne pas re-montrer si pré-remplis par une ficha existante)
- **Au clic "Confirmar"** : `setValue("nombres", ...)` et `setValue("apellidos", ...)` puis ferme le modal
- **Validation** : le bouton Confirmar est désactivé tant que les deux champs sont vides

