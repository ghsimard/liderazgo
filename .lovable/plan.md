

## Appliquer le Title Case immédiatement dans le modal de vérification des noms

### Changement

**Fichier** : `src/pages/FichaRLT.tsx`, fonction `handleConfirmNames` (lignes 594-598)

Appliquer `toTitleCase` aux valeurs saisies dans le modal avant de les injecter dans le formulaire :

```typescript
const handleConfirmNames = () => {
  setValue("nombres", toTitleCase(modalNombres.trim()), { shouldValidate: true });
  setValue("apellidos", toTitleCase(modalApellidos.trim()), { shouldValidate: true });
  setShowNameModal(false);
};
```

Ainsi, dès que l'utilisateur confirme ses noms dans le modal, les champs du formulaire affichent immédiatement le format correct (ex: "Juan Carlos" au lieu de "JUAN CARLOS").

La transformation dans `onSubmit` reste en place comme filet de sécurité.

### Déploiement

- **🖥️ Site statique** : Oui — rebuild sur Render
- **⚙️ Web Service** : Non
- **🗄️ Base de données** : Non

